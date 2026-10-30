import {
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { bounds, interpolateY } from '../geometry/polyline'
import { sliceOutline } from '../geometry/slices'
import type { SliceGeom } from '../types/calc'
import type { Point, Polyline } from '../types/geometry'

export type CanvasProps = {
  ground: Polyline
  slip: Polyline
  slices: SliceGeom[]
  onChangeGround: (p: Polyline) => void
  onChangeSlip: (p: Polyline) => void
}

type Kind = 'ground' | 'slip'
type Selection = { kind: Kind; index: number }

type Frame = { minX: number; maxX: number; minY: number; maxY: number }

const VB_W = 800
const VB_H = 520

const COLOR = {
  ground: '#1f7a4d',
  slip: '#c0392b',
  slice: '#7d8794',
  fill: 'rgba(47, 109, 138, 0.14)',
  paper: '#f3f6f4',
}

export function Canvas({ ground, slip, slices, onChangeGround, onChangeSlip }: CanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const groundRef = useRef(ground)
  const slipRef = useRef(slip)
  const changeGroundRef = useRef(onChangeGround)
  const changeSlipRef = useRef(onChangeSlip)
  const frameRef = useRef<Frame>(frameOf(ground, slip))
  groundRef.current = ground
  slipRef.current = slip
  changeGroundRef.current = onChangeGround
  changeSlipRef.current = onChangeSlip

  const [selected, setSelected] = useState<Selection | null>(null)
  const [dragging, setDragging] = useState(false)

  const liveFrame = useMemo(() => frameOf(ground, slip), [ground, slip])
  const frame = dragging ? frameRef.current : liveFrame

  const toSvg = (point: Point) => project(point, frame)
  const selectedPoint = selected
    ? (selected.kind === 'ground' ? ground : slip)[selected.index]
    : undefined

  function clientToModel(event: { clientX: number; clientY: number }): Point | null {
    const svg = svgRef.current
    if (!svg) return null
    const ctm = svg.getScreenCTM()
    if (!ctm) return null
    const local = svg.createSVGPoint()
    local.x = event.clientX
    local.y = event.clientY
    const mapped = local.matrixTransform(ctm.inverse())
    return unproject({ x: mapped.x, y: mapped.y }, frameRef.current)
  }

  function updateVertex(kind: Kind, index: number, point: Point) {
    const source = kind === 'ground' ? groundRef.current : slipRef.current
    const next = source.map((vertex, vertexIndex) => (vertexIndex === index ? point : vertex))
    if (kind === 'ground') changeGroundRef.current(next)
    else changeSlipRef.current(next)
  }

  function onVertexPointerDown(kind: Kind, index: number, event: ReactPointerEvent<SVGCircleElement>) {
    event.preventDefault()
    event.stopPropagation()
    svgRef.current?.focus()
    frameRef.current = frameOf(groundRef.current, slipRef.current)
    setSelected({ kind, index })
    setDragging(true)

    const move = (pointer: globalThis.PointerEvent) => {
      const model = clientToModel(pointer)
      if (model) updateVertex(kind, index, model)
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      setDragging(false)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  function onDoubleClick(event: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current
    if (!svg) return
    const ctm = svg.getScreenCTM()
    if (!ctm) return
    const local = svg.createSVGPoint()
    local.x = event.clientX
    local.y = event.clientY
    const mapped = local.matrixTransform(ctm.inverse())
    const hit = { x: mapped.x, y: mapped.y }

    for (const kind of ['ground', 'slip'] as const) {
      const line = kind === 'ground' ? ground : slip
      if (line.some((point) => Math.hypot(toSvg(point).x - hit.x, toSvg(point).y - hit.y) <= 10)) {
        return
      }
    }

    let best: { kind: Kind; index: number; distance: number } | null = null
    for (const kind of ['ground', 'slip'] as const) {
      const line = kind === 'ground' ? ground : slip
      for (let index = 0; index < line.length - 1; index++) {
        const distance = distanceToSegment(hit, toSvg(line[index]), toSvg(line[index + 1]))
        if (!best || distance < best.distance) best = { kind, index, distance }
      }
    }
    if (!best || best.distance > 12) return

    const line = best.kind === 'ground' ? ground : slip
    const start = line[best.index]
    const end = line[best.index + 1]
    const midpoint = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 }
    const next = [...line.slice(0, best.index + 1), midpoint, ...line.slice(best.index + 1)]
    if (best.kind === 'ground') onChangeGround(next)
    else onChangeSlip(next)
    setSelected({ kind: best.kind, index: best.index + 1 })
    svgRef.current?.focus()
  }

  function onKeyDown(event: ReactKeyboardEvent<SVGSVGElement>) {
    if (event.key !== 'Delete' && event.key !== 'Backspace') return
    if (!selected) return
    const line = selected.kind === 'ground' ? ground : slip
    if (line.length <= 2) return
    event.preventDefault()
    const next = line.filter((_, index) => index !== selected.index)
    if (selected.kind === 'ground') onChangeGround(next)
    else onChangeSlip(next)
    setSelected(null)
  }

  const lastSlice = slices[slices.length - 1]

  return (
    <div className="canvas-wrap">
      <svg
        ref={svgRef}
        className="slope-canvas"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        role="img"
        aria-label="地面与滑面折线"
        tabIndex={0}
        onDoubleClick={onDoubleClick}
        onKeyDown={onKeyDown}
      >
        <rect width={VB_W} height={VB_H} fill={COLOR.paper} />
        {slices.map((slice) => {
          const outline = sliceOutline(ground, slip, slice.xLeft, slice.xRight)
          if (!outline) return null
          return (
            <polygon
              key={`fill-${slice.index}`}
              points={outline.map((point) => pointString(toSvg(point))).join(' ')}
              fill={COLOR.fill}
            />
          )
        })}
        {slices.map((slice) => (
          <SliceEdge key={`edge-${slice.index}`} ground={ground} slip={slip} x={slice.xLeft} toSvg={toSvg} />
        ))}
        {lastSlice && (
          <SliceEdge ground={ground} slip={slip} x={lastSlice.xRight} toSvg={toSvg} />
        )}
        <polyline
          points={ground.map((point) => pointString(toSvg(point))).join(' ')}
          fill="none"
          stroke={COLOR.ground}
          strokeWidth={2.5}
          strokeLinejoin="round"
        />
        <polyline
          points={slip.map((point) => pointString(toSvg(point))).join(' ')}
          fill="none"
          stroke={COLOR.slip}
          strokeWidth={2.5}
          strokeLinejoin="round"
        />
        <Vertices
          kind="ground"
          line={ground}
          selected={selected}
          toSvg={toSvg}
          onPointerDown={onVertexPointerDown}
        />
        <Vertices
          kind="slip"
          line={slip}
          selected={selected}
          toSvg={toSvg}
          onPointerDown={onVertexPointerDown}
        />
        <Legend selected={selectedPoint} />
      </svg>
      <p className="canvas-hint">拖拽顶点修改折线。双击边在中点插入顶点。选中顶点后按 Delete 删除（至少保留 2 个点）。坐标 x 向右、y 向上。</p>
    </div>
  )
}

function Vertices({
  kind,
  line,
  selected,
  toSvg,
  onPointerDown,
}: {
  kind: Kind
  line: Polyline
  selected: Selection | null
  toSvg: (point: Point) => Point
  onPointerDown: (kind: Kind, index: number, event: ReactPointerEvent<SVGCircleElement>) => void
}) {
  const stroke = kind === 'ground' ? COLOR.ground : COLOR.slip
  return line.map((point, index) => {
    const plotted = toSvg(point)
    const active = selected?.kind === kind && selected.index === index
    return (
      <circle
        key={`${kind}-${index}`}
        cx={plotted.x}
        cy={plotted.y}
        r={active ? 7 : 5.5}
        fill={active ? '#e0a106' : '#fff'}
        stroke={stroke}
        strokeWidth={2}
        onPointerDown={(event) => onPointerDown(kind, index, event)}
      >
        <title>
          {kind === 'ground' ? '地面' : '滑面'} {index + 1}: ({point.x.toFixed(2)}, {point.y.toFixed(2)})
        </title>
      </circle>
    )
  })
}

function SliceEdge({
  ground,
  slip,
  x,
  toSvg,
}: {
  ground: Polyline
  slip: Polyline
  x: number
  toSvg: (point: Point) => Point
}) {
  const top = interpolateY(ground, x)
  const bottom = interpolateY(slip, x)
  if (top == null || bottom == null) return null
  const a = toSvg({ x, y: top })
  const b = toSvg({ x, y: bottom })
  return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={COLOR.slice} strokeWidth={1} />
}

function Legend({ selected }: { selected?: Point }) {
  return (
    <g className="canvas-legend" fontSize={13} fontFamily="system-ui, sans-serif">
      <rect x={16} y={14} width={168} height={selected ? 78 : 58} rx={6} fill="rgba(255,255,255,0.92)" />
      <line x1={28} y1={32} x2={52} y2={32} stroke={COLOR.ground} strokeWidth={3} />
      <text x={60} y={36} fill="#243028">地面</text>
      <line x1={28} y1={54} x2={52} y2={54} stroke={COLOR.slip} strokeWidth={3} />
      <text x={60} y={58} fill="#243028">滑面</text>
      {selected && (
        <text x={28} y={80} fill="#52605a">
          {selected.x.toFixed(2)}, {selected.y.toFixed(2)}
        </text>
      )}
    </g>
  )
}

function frameOf(ground: Polyline, slip: Polyline): Frame {
  const box = bounds([ground, slip])
  const spanX = Math.max(box.maxX - box.minX, 1)
  const spanY = Math.max(box.maxY - box.minY, 1)
  const padX = spanX * 0.12
  const padY = spanY * 0.16
  return {
    minX: box.minX - padX,
    maxX: box.maxX + padX,
    minY: box.minY - padY * 0.45,
    maxY: box.maxY + padY,
  }
}

function project(point: Point, frame: Frame): Point {
  return {
    x: ((point.x - frame.minX) / (frame.maxX - frame.minX)) * VB_W,
    y: ((frame.maxY - point.y) / (frame.maxY - frame.minY)) * VB_H,
  }
}

function unproject(point: Point, frame: Frame): Point {
  return {
    x: frame.minX + (point.x / VB_W) * (frame.maxX - frame.minX),
    y: frame.maxY - (point.y / VB_H) * (frame.maxY - frame.minY),
  }
}

function pointString(point: Point): string {
  return `${point.x},${point.y}`
}

function distanceToSegment(point: Point, start: Point, end: Point): number {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const length2 = dx * dx + dy * dy
  if (length2 === 0) return Math.hypot(point.x - start.x, point.y - start.y)
  const t = Math.min(1, Math.max(0, ((point.x - start.x) * dx + (point.y - start.y) * dy) / length2))
  return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy))
}
