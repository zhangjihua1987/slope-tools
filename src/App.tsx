import { useMemo, useState } from 'react'
import './App.css'
import { defaultGround, defaultSlip } from './demo/defaultModel'
import { buildSlices } from './geometry/slices'
import { Canvas } from './ui/Canvas'

function App() {
  const [ground, setGround] = useState(defaultGround)
  const [slip, setSlip] = useState(defaultSlip)
  const geom = useMemo(() => buildSlices(ground, slip), [ground, slip])

  return (
    <main className="app">
      <h1>滑坡稳定性 Demo（A.1）</h1>
      <Canvas
        ground={ground}
        slip={slip}
        slices={geom.ok ? geom.slices : []}
        onChangeGround={setGround}
        onChangeSlip={setSlip}
      />
      {!geom.ok && <p className="geom-error">{geom.error}</p>}
    </main>
  )
}

export default App
