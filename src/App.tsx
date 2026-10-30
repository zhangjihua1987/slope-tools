import { useMemo, useState } from 'react'
import { App as AntdApp, Layout, Typography } from 'antd'
import 'antd/dist/reset.css'
import './App.css'
import { solveA1 } from './calc/a1'
import { formatSliceTableCsv, formatVerticesCsv } from './export/coords'
import { defaultGround, defaultLoads, defaultMaterial, defaultSlip } from './demo/defaultModel'
import { buildSlices } from './geometry/slices'
import { Canvas } from './ui/Canvas'
import { ParamsPanel } from './ui/ParamsPanel'
import { ResultsTable } from './ui/ResultsTable'

function App() {
  return (
    <AntdApp>
      <SlopeDemo />
    </AntdApp>
  )
}

function SlopeDemo() {
  const { message } = AntdApp.useApp()
  const [ground, setGround] = useState(defaultGround)
  const [slip, setSlip] = useState(defaultSlip)
  const [material, setMaterial] = useState(defaultMaterial)
  const [loads, setLoads] = useState(defaultLoads)

  const geom = useMemo(() => buildSlices(ground, slip), [ground, slip])
  const result = useMemo(() => {
    if (!geom.ok) return null
    return solveA1(geom.slices, material, loads)
  }, [geom, material, loads])

  const verticesCsv = useMemo(() => formatVerticesCsv(ground, slip), [ground, slip])

  async function copyVertices() {
    try {
      await navigator.clipboard.writeText(verticesCsv)
      message.success('已复制顶点坐标')
    } catch {
      message.error('复制失败，请改用下载')
    }
  }

  function downloadVertices() {
    downloadText('vertices.csv', verticesCsv)
  }

  function downloadSlices() {
    if (!result?.ok) return
    downloadText('slices.csv', formatSliceTableCsv(result))
  }

  return (
    <Layout className="app-shell">
      <Layout.Header className="app-header">
        <Typography.Title level={3}>滑坡稳定性 Demo（A.1）</Typography.Title>
        <Typography.Text>
          GB/T 38509-2020 附录 A.1 不平衡推力传递法。传递系数 Ψ 含 Fs，稳定系数用隐式迭代求解。
        </Typography.Text>
      </Layout.Header>
      <Layout className="app-body">
        <Layout.Content className="app-canvas">
          <Canvas
            ground={ground}
            slip={slip}
            slices={geom.ok ? geom.slices : []}
            onChangeGround={setGround}
            onChangeSlip={setSlip}
          />
        </Layout.Content>
        <Layout.Sider className="app-sider" width={320} theme="light">
          <ParamsPanel
            material={material}
            loads={loads}
            onMaterial={setMaterial}
            onLoads={setLoads}
            onCopyVertices={() => {
              void copyVertices()
            }}
            onDownloadVertices={downloadVertices}
            onDownloadSlices={downloadSlices}
            slicesReady={result?.ok === true}
          />
        </Layout.Sider>
      </Layout>
      <section className="app-results">
        <ResultsTable geomError={geom.ok ? undefined : geom.error} result={result} />
      </section>
    </Layout>
  )
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export default App
