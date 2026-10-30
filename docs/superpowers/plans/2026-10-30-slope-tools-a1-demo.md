# slope-tools A.1 Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 浏览器内实现 GB/T 38509-2020 附录 A.1 不平衡推力传递法 Demo：可拖地面/滑面折线、实时条分与 \(F_s\)，并导出顶点坐标供 Excel 对算；可打包为单个 HTML。

**Architecture:** Vite + React + Ant Design 单页应用。几何与 A.1 计算为纯 TypeScript 模块（与 UI 解耦，便于单元测试）。画布用 SVG 拖拽折线顶点；参数与成果用 Ant Design Form/Table。构建阶段用 `vite-plugin-singlefile` 打成单 HTML。

**Tech Stack:** React 18、TypeScript、Vite 5+、Ant Design 5、Vitest、vite-plugin-singlefile

## Global Constraints

- 只做附录 A.1（不做 A.2）
- 全前端计算，无后端
- 材料参数整坡统一 \(c,\varphi,\gamma\)
- 地震力 \(Q,V\) 与孔隙水压力 \(U_b\) 默认 0，可开关
- 外力 \(P_i\) 第一版固定 0
- \(F_s\) 用隐式迭代（\(\Psi\) 依赖 \(F_s\)）
- 必须能导出地面/滑面顶点坐标
- 正式 Excel/CAD 导出不做
- 文案默认中文
- 设计依据：`docs/superpowers/specs/2026-10-30-slope-tools-a1-demo-design.md`

## File map (to create)

```
package.json
vite.config.ts
tsconfig.json
tsconfig.node.json
index.html
src/main.tsx
src/App.tsx
src/App.css
src/vite-env.d.ts
src/types/geometry.ts
src/types/calc.ts
src/geometry/polyline.ts
src/geometry/slices.ts
src/calc/a1.ts
src/export/coords.ts
src/ui/Canvas.tsx
src/ui/ParamsPanel.tsx
src/ui/ResultsTable.tsx
src/demo/defaultModel.ts
src/calc/a1.test.ts
src/geometry/slices.test.ts
```

---

### Task 1: Scaffold Vite React TS + Vitest + singlefile

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/App.css`, `src/vite-env.d.ts`, `README.md` (update)

**Interfaces:**
- Produces: runnable `npm run dev` / `npm test` / `npm run build`

- [ ] **Step 1: Scaffold**

```bash
npm create vite@latest . -- --template react-ts
npm install antd @ant-design/icons
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom vite-plugin-singlefile
```

若目录非空，手动写入等价 `package.json` scripts：

```json
{
  "name": "slope-tools",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 2: Configure Vite**

`vite.config.ts`:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  build: {
    target: 'es2018',
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
  },
})
```

- [ ] **Step 3: Minimal App shell**

`src/App.tsx` 先渲染标题「滑坡稳定性 Demo（A.1）」占位。

- [ ] **Step 4: Verify**

```bash
npm test
npm run build
```

Expected: tests 0/pass or empty suite ok；`dist/index.html` 为单文件（无明显外链 js）。

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vite.config.ts tsconfig*.json index.html src README.md
git commit -m "chore: scaffold Vite React TS app with Vitest and singlefile"
```

---

### Task 2: Geometry types + polyline helpers

**Files:**
- Create: `src/types/geometry.ts`, `src/geometry/polyline.ts`, `src/geometry/polyline.test.ts`

**Interfaces:**
- Produces:
  - `export type Point = { x: number; y: number }`
  - `export type Polyline = Point[]`
  - `export function interpolateY(polyline: Polyline, x: number): number | null`
  - `export function bounds(polylines: Polyline[]): { minX: number; maxX: number; minY: number; maxY: number }`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from 'vitest'
import { interpolateY } from './polyline'

describe('interpolateY', () => {
  it('interpolates between two points', () => {
    const pl = [{ x: 0, y: 0 }, { x: 10, y: 10 }]
    expect(interpolateY(pl, 5)).toBeCloseTo(5)
  })
  it('returns null outside x-range', () => {
    const pl = [{ x: 0, y: 0 }, { x: 10, y: 10 }]
    expect(interpolateY(pl, -1)).toBeNull()
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npm test -- src/geometry/polyline.test.ts
```

- [ ] **Step 3: Implement**

在 `polyline.ts` 实现线性插值：找包含 `x` 的线段，按比例求 `y`；端点精确命中则返回端点 `y`。

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/types/geometry.ts src/geometry/polyline.ts src/geometry/polyline.test.ts
git commit -m "feat: polyline interpolateY helper"
```

---

### Task 3: Auto vertical slicing

**Files:**
- Create: `src/geometry/slices.ts`, `src/geometry/slices.test.ts`, `src/types/calc.ts` (slice geometry part)

**Interfaces:**
- Consumes: `interpolateY`, `Point`, `Polyline`
- Produces:
  - `export type SliceGeom = { index: number; xLeft: number; xRight: number; b: number; alphaDeg: number; area: number; midX: number }`
  - `export function buildSlices(ground: Polyline, slip: Polyline, opts?: { maxSlices?: number }): { ok: true; slices: SliceGeom[] } | { ok: false; error: string }`

规则：
- 在滑面 x 覆盖范围内，按滑面折线顶点的 x 以及可选均匀加密切竖条（默认：滑面相邻顶点各成一条，必要时 `maxSlices` 上限内加密）。
- 每条：顶为地面 \(y_g(x)\)，底为滑面 \(y_s(x)\)；要求区间内 \(y_g \ge y_s\)。
- \(\alpha\)：该条滑面倾角（度），由底边两端点算，逆时针向上为正（与规范图一致：坡向右下时 \(\alpha>0\)）。
- `b`：水平宽度 \(xRight-xLeft\)（对应公式中 \(b_i\)）。
- `area`：梯形/多边形近似面积，用于 \(W=\gamma\cdot area\)（单位自洽：m、kN/m³ → kN/m）。

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect } from 'vitest'
import { buildSlices } from './slices'

describe('buildSlices', () => {
  it('builds one slice for a simple trapezoid', () => {
    const ground = [{ x: 0, y: 20 }, { x: 10, y: 20 }]
    const slip = [{ x: 0, y: 10 }, { x: 10, y: 5 }]
    const r = buildSlices(ground, slip)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.slices.length).toBeGreaterThanOrEqual(1)
    expect(r.slices[0].b).toBeCloseTo(10)
    expect(r.slices[0].area).toBeGreaterThan(0)
  })

  it('rejects slip above ground', () => {
    const ground = [{ x: 0, y: 5 }, { x: 10, y: 5 }]
    const slip = [{ x: 0, y: 10 }, { x: 10, y: 10 }]
    const r = buildSlices(ground, slip)
    expect(r.ok).toBe(false)
  })
})
```

- [ ] **Step 2: Run FAIL → implement → PASS → commit**

```bash
git add src/geometry/slices.ts src/geometry/slices.test.ts src/types/calc.ts
git commit -m "feat: build vertical slices from ground and slip polylines"
```

---

### Task 4: A.1 solver (implicit Fs)

**Files:**
- Create: `src/calc/a1.ts`, `src/calc/a1.test.ts`
- Modify: `src/types/calc.ts`

**Interfaces:**
- Consumes: `SliceGeom`
- Produces:

```ts
export type Material = { c: number; phiDeg: number; gamma: number } // kPa, deg, kN/m³
export type LoadOptions = {
  seismicOn: boolean
  waterOn: boolean
  /** 水平地震综合影响系数 α_w；仅 seismicOn 时用；默认 0 */
  alphaW?: number
  /** 动力分布系数 a_i，默认 1 */
  aDyn?: number
  /** 简化：开启水压力时，每个条块 Ub = waterRatio * W * cosα（占位，默认 0） */
  waterRatio?: number
}

export type SliceResult = {
  index: number
  alphaDeg: number
  b: number
  W: number
  Q: number
  V: number
  Ub: number
  R: number
  T: number
  Psi: number
  E: number
}

export type A1Result =
  | { ok: true; Fs: number; slices: SliceResult[]; iterations: number }
  | { ok: false; error: string }

export function solveA1(
  slices: SliceGeom[],
  material: Material,
  loads?: LoadOptions,
  opts?: { fsTol?: number; maxIter?: number; fsInit?: number }
): A1Result
```

公式（规范 A.1–A.5，\(P_i=0\)）：

\[
R_i=[(W_i+V_i)\cos\alpha_i-U_{bi}-Q_i\sin\alpha_i]\tan\phi'_i+c'_i b_i\sec\alpha_i
\]
\[
T_i=(W_i+V_i)\sin\alpha_i+Q_i\cos\alpha_i
\]
\[
\Psi_i=\cos(\alpha_{i-1}-\alpha_i)-\sin(\alpha_{i-1}-\alpha_i)\tan\phi'_i/F_s
\]
（传递时注意下标：从条块 \(i-1\) 传到 \(i\) 时用 \(\Psi_i\)）

\[
F_s=\frac{\sum_{i=1}^{n-1}(R_i\prod_{j=i+1}^{n}\Psi_j)+R_n}{\sum_{i=1}^{n-1}(T_i\prod_{j=i+1}^{n}\Psi_j)+T_n}
\]

\[
E_i=T_i-R_i/F_s+\Psi_i E_{i-1},\quad E_0=0
\]

实现：给定试算 \(F_s^{(k)}\) 算全部 \(\Psi\)，再代入上式得 \(F_s^{(k+1)}\)，迭代至 `|ΔFs|<fsTol`（默认 1e-4）或 `maxIter`（默认 50）。角度用弧度进三角函数。

荷载：
- `seismicOn`：`Q_i = alphaW * aDyn * W_i`，`V_i = Q_i/3`（对应规范水平/竖向关系的简化）
- 否则 `Q=V=0`
- `waterOn`：`Ub_i = waterRatio * W_i`（默认 `waterRatio=0`，开关打开但比例 0 时仍为 0；UI 可提供比例输入）

- [ ] **Step 1: Hand-checkable unit test**

构造 2 个条块、无地震无水、已知 \(c,\varphi,\gamma\)，手工或独立脚本算出期望 \(F_s\) 量级；至少断言：

```ts
it('returns Fs > 0 for stable-looking slice set', () => {
  const slices = [
    { index: 1, xLeft: 0, xRight: 10, b: 10, alphaDeg: 30, area: 100, midX: 5 },
    { index: 2, xLeft: 10, xRight: 20, b: 10, alphaDeg: 10, area: 80, midX: 15 },
  ]
  const r = solveA1(slices, { c: 12, phiDeg: 18, gamma: 19 })
  expect(r.ok).toBe(true)
  if (!r.ok) return
  expect(r.Fs).toBeGreaterThan(0.5)
  expect(r.Fs).toBeLessThan(3)
  expect(r.slices).toHaveLength(2)
})

it('Fs increases when c increases', () => {
  const slices = [/* same as above */]
  const low = solveA1(slices, { c: 5, phiDeg: 15, gamma: 19 })
  const high = solveA1(slices, { c: 25, phiDeg: 15, gamma: 19 })
  expect(low.ok && high.ok).toBe(true)
  if (low.ok && high.ok) expect(high.Fs).toBeGreaterThan(low.Fs)
})
```

后续用用户 Excel + 顶点坐标再精校数值。

- [ ] **Step 2–5: FAIL → implement → PASS → commit**

```bash
git add src/calc/a1.ts src/calc/a1.test.ts src/types/calc.ts
git commit -m "feat: implicit A.1 transfer-coefficient Fs solver"
```

---

### Task 5: Default demo model + coord export

**Files:**
- Create: `src/demo/defaultModel.ts`, `src/export/coords.ts`, `src/export/coords.test.ts`

**Interfaces:**
- Produces:
  - `export const defaultGround: Polyline`
  - `export const defaultSlip: Polyline`
  - `export const defaultMaterial: Material`
  - `export function formatVerticesCsv(ground: Polyline, slip: Polyline): string` — 列：`kind,index,x,y`，kind=`ground|slip`
  - `export function formatSliceTableCsv(result: Extract<A1Result,{ok:true}>): string`

- [ ] **Step 1: Tests for CSV headers and row counts**

- [ ] **Step 2: Implement default polylines**（简单右倾坡：地面 4 点，滑面 4 点，全部 x 递增）

- [ ] **Step 3: Commit**

```bash
git commit -am "feat: default demo geometry and CSV export helpers"
```

---

### Task 6: Canvas UI (drag polylines)

**Files:**
- Create: `src/ui/Canvas.tsx`

**Interfaces:**
- Consumes: `Polyline`, `SliceGeom`
- Props:

```ts
type CanvasProps = {
  ground: Polyline
  slip: Polyline
  slices: SliceGeom[]
  onChangeGround: (p: Polyline) => void
  onChangeSlip: (p: Polyline) => void
}
```

行为：
- SVG 坐标系：x 右、y 上（内部翻转绘制）
- 画地面（绿）、滑面（红）、条块竖线（灰）
- 顶点可拖；拖动时调用 onChange
- 双击折线边可在该边中点插入顶点；选中顶点 Del 删除（至少保留 2 点）

- [ ] **Step 1: Implement Canvas and wire into App with local state from defaultModel**

- [ ] **Step 2: Manual check in `npm run dev`**：拖点、插点、删点

- [ ] **Step 3: Commit**

```bash
git commit -am "feat: SVG canvas with draggable ground and slip polylines"
```

---

### Task 7: Params panel + live results table

**Files:**
- Create: `src/ui/ParamsPanel.tsx`, `src/ui/ResultsTable.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- ParamsPanel：编辑 `Material` + `LoadOptions`（地震开关、`alphaW`、水压力开关、`waterRatio`）
- ResultsTable：展示 `SliceResult[]` 与 `Fs`；非法几何/不收敛显示 Alert
- App：`useMemo` 串 `buildSlices` → `solveA1`；拖拽与参数变更触发重算

- [ ] **Step 1: Layout** — Ant Design `Layout`：左侧 Canvas flex 1，右侧 Params 固定宽 ~320px，下方 Results

- [ ] **Step 2: Wire live calc**

- [ ] **Step 3: Manual check**：改 \(c\) 后 \(F_s\) 变化；开关地震后 \(Q\) 列非 0

- [ ] **Step 4: Commit**

```bash
git commit -am "feat: params panel and live A.1 results table"
```

---

### Task 8: Export vertex coords (+ optional slice CSV)

**Files:**
- Modify: `src/ui/ParamsPanel.tsx` or `src/App.tsx`

- [ ] **Step 1: Buttons**
  - 「复制顶点坐标」→ `navigator.clipboard.writeText(formatVerticesCsv(...))` + message.success
  - 「下载顶点 CSV」→ Blob download `vertices.csv`
  - 「下载条块表 CSV」（可选，计算成功时启用）

- [ ] **Step 2: Manual**：粘贴到记事本，确认 `ground`/`slip` 行列正确

- [ ] **Step 3: Commit**

```bash
git commit -am "feat: export vertex coordinates and slice CSV for Excel check"
```

---

### Task 9: Single-file build polish + README

**Files:**
- Modify: `README.md`, `vite.config.ts` if needed, `src/App.tsx` title/help text

- [ ] **Step 1: `npm run build` and open `dist/index.html` in browser offline** — 确认无外网依赖即可用（Ant Design 已打包）

- [ ] **Step 2: README** 写清：开发、`npm run build` 交付单 HTML、如何用顶点 CSV 对 Excel

- [ ] **Step 3: Commit**

```bash
git commit -am "docs: README for A.1 demo and single-file delivery"
```

---

### Task 10: Spec self-check + Excel verification note

- [ ] **Step 1:** 对照设计说明逐项勾选：A.1、拖折线、统一材料、开关荷载、条块表、Fs、顶点导出、单 HTML、非法几何提示

- [ ] **Step 2:** 用默认模型导出顶点，交给用户用其 Excel 对算；若偏差大，开 follow-up 修 `solveA1` / 条分约定（面积、α 符号）

- [ ] **Step 3: Final commit / PR**

```bash
git commit --allow-empty -m "chore: A.1 demo v1 ready for Excel cross-check"
# open PR: feat: A.1 transfer-coefficient demo (single HTML)
```

---

## Spec coverage checklist

| 设计要求 | Task |
| --- | --- |
| React+Vite+Ant Design | 1 |
| 单 HTML | 1, 9 |
| 可拖地面/滑面 | 6 |
| 自动条分 | 3 |
| 统一 c/φ/γ | 7 |
| A.1 隐式 Fs | 4 |
| 地震/水默认 0 可开关 | 4, 7 |
| 条块表 + Fs | 7 |
| 顶点坐标导出 | 5, 8 |
| 非法几何 / 不收敛提示 | 3, 4, 7 |
| 不做 Excel/CAD 正式导出、不做 A.2 | 全局约束 |

