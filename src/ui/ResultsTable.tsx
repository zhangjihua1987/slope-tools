import { Alert, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { A1Result, SliceResult } from '../types/calc'

export type ResultsTableProps = {
  geomError?: string
  result: A1Result | null
}

const columns: ColumnsType<SliceResult> = [
  { title: '条块', dataIndex: 'index', width: 64 },
  { title: 'α (°)', dataIndex: 'alphaDeg', render: (value: number) => num(value, 3), width: 90 },
  { title: 'b (m)', dataIndex: 'b', render: (value: number) => num(value, 3), width: 90 },
  { title: 'W (kN/m)', dataIndex: 'W', render: (value: number) => num(value, 3), width: 110 },
  { title: 'Q', dataIndex: 'Q', render: (value: number) => num(value, 3), width: 90 },
  { title: 'V', dataIndex: 'V', render: (value: number) => num(value, 3), width: 90 },
  { title: 'Ub', dataIndex: 'Ub', render: (value: number) => num(value, 3), width: 90 },
  { title: 'R', dataIndex: 'R', render: (value: number) => num(value, 3), width: 100 },
  { title: 'T', dataIndex: 'T', render: (value: number) => num(value, 3), width: 100 },
  { title: 'Ψ', dataIndex: 'Psi', render: (value: number) => num(value, 4), width: 90 },
  { title: 'E', dataIndex: 'E', render: (value: number) => num(value, 3), width: 100 },
]

export function ResultsTable({ geomError, result }: ResultsTableProps) {
  if (geomError) {
    return <Alert type="error" showIcon message="几何无效，未计算 Fs" description={geomError} />
  }
  if (!result) return null
  if (!result.ok) {
    return <Alert type="error" showIcon message="稳定系数未得出" description={result.error} />
  }

  return (
    <div>
      <Typography.Title level={4} className="fs-value">
        Fs = {num(result.Fs, 4)}
        <Typography.Text type="secondary" className="fs-meta">
          隐式迭代 {result.iterations} 次
        </Typography.Text>
      </Typography.Title>
      <Table
        size="small"
        pagination={false}
        rowKey="index"
        columns={columns}
        dataSource={result.slices}
        scroll={{ x: 980 }}
      />
    </div>
  )
}

function num(value: number, digits: number): string {
  if (!Number.isFinite(value)) return ''
  return value.toFixed(digits)
}
