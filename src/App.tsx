import { useMemo, useState } from 'react'
import { Layout, Typography } from 'antd'
import 'antd/dist/reset.css'
import './App.css'
import { solveA1 } from './calc/a1'
import { defaultGround, defaultLoads, defaultMaterial, defaultSlip } from './demo/defaultModel'
import { buildSlices } from './geometry/slices'
import { Canvas } from './ui/Canvas'
import { ParamsPanel } from './ui/ParamsPanel'
import { ResultsTable } from './ui/ResultsTable'

function App() {
  const [ground, setGround] = useState(defaultGround)
  const [slip, setSlip] = useState(defaultSlip)
  const [material, setMaterial] = useState(defaultMaterial)
  const [loads, setLoads] = useState(defaultLoads)

  const geom = useMemo(() => buildSlices(ground, slip), [ground, slip])
  const result = useMemo(() => {
    if (!geom.ok) return null
    return solveA1(geom.slices, material, loads)
  }, [geom, material, loads])

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
          />
        </Layout.Sider>
      </Layout>
      <section className="app-results">
        <ResultsTable geomError={geom.ok ? undefined : geom.error} result={result} />
      </section>
    </Layout>
  )
}

export default App
