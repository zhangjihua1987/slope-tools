import { Button, Form, InputNumber, Space, Switch, Typography } from 'antd'
import type { LoadOptions, Material } from '../types/calc'

export type ParamsPanelProps = {
  material: Material
  loads: LoadOptions
  onMaterial: (material: Material) => void
  onLoads: (loads: LoadOptions) => void
  onCopyVertices: () => void
  onDownloadVertices: () => void
  onDownloadSlices: () => void
  slicesReady: boolean
}

export function ParamsPanel({
  material,
  loads,
  onMaterial,
  onLoads,
  onCopyVertices,
  onDownloadVertices,
  onDownloadSlices,
  slicesReady,
}: ParamsPanelProps) {
  return (
    <div className="params-panel">
      <Typography.Title level={5}>材料（整坡统一）</Typography.Title>
      <Form layout="vertical" requiredMark={false}>
        <Form.Item label="黏聚力 c（kPa）">
          <InputNumber
            style={{ width: '100%' }}
            value={material.c}
            onChange={(value) => {
              if (value != null) onMaterial({ ...material, c: value })
            }}
          />
        </Form.Item>
        <Form.Item label="内摩擦角 φ（°）">
          <InputNumber
            style={{ width: '100%' }}
            min={-89}
            max={89}
            value={material.phiDeg}
            onChange={(value) => {
              if (value != null) onMaterial({ ...material, phiDeg: value })
            }}
          />
        </Form.Item>
        <Form.Item label="重度 γ（kN/m³）">
          <InputNumber
            style={{ width: '100%' }}
            value={material.gamma}
            onChange={(value) => {
              if (value != null) onMaterial({ ...material, gamma: value })
            }}
          />
        </Form.Item>
      </Form>

      <Typography.Title level={5}>荷载</Typography.Title>
      <Form layout="vertical" requiredMark={false}>
        <Form.Item label="地震力">
          <Switch
            checked={loads.seismicOn}
            onChange={(seismicOn) => onLoads({ ...loads, seismicOn })}
          />
        </Form.Item>
        <Form.Item label="水平地震综合影响系数 αw">
          <InputNumber
            style={{ width: '100%' }}
            min={0}
            step={0.05}
            value={loads.alphaW ?? 0}
            onChange={(value) => onLoads({ ...loads, alphaW: value ?? 0 })}
          />
        </Form.Item>
        <Form.Item label="孔隙水压力">
          <Switch checked={loads.waterOn} onChange={(waterOn) => onLoads({ ...loads, waterOn })} />
        </Form.Item>
        <Form.Item label="水压力比例 Ub / W">
          <InputNumber
            style={{ width: '100%' }}
            min={0}
            step={0.05}
            value={loads.waterRatio ?? 0}
            onChange={(value) => onLoads({ ...loads, waterRatio: value ?? 0 })}
          />
        </Form.Item>
      </Form>
      <Typography.Paragraph type="secondary" className="params-note">
        开关关闭时对应的 Q、V、Ub 为 0。外力 P 固定为 0。αw 与水压力比例只在开关打开后进入计算。
      </Typography.Paragraph>
      <Typography.Title level={5}>导出（Excel 对算）</Typography.Title>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Button block onClick={onCopyVertices}>
          复制顶点坐标
        </Button>
        <Button block onClick={onDownloadVertices}>
          下载顶点 CSV
        </Button>
        <Button block disabled={!slicesReady} onClick={onDownloadSlices}>
          下载条块表 CSV
        </Button>
      </Space>
    </div>
  )
}
