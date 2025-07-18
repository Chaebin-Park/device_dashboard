'use client'

import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter
} from 'recharts'
import { Device } from '../lib/supabase'

interface Props {
  devices: Device[]
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316']

export default function AnalyticsCharts({ devices }: Props) {
  // OS 버전별 분포
  const androidVersionData = devices.reduce((acc, device) => {
    const version = device.android_version
    if (version) {
      acc[version] = (acc[version] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)

  const androidChartData = Object.entries(androidVersionData)
    .map(([version, count]) => ({ version, count }))
    .sort((a, b) => parseFloat(b.version) - parseFloat(a.version))

  // 메모리 분포
  const memoryDistribution = devices.reduce((acc, device) => {
    const memory = device.total_memory_gb
    if (memory) {
      const range = `${Math.floor(memory / 4) * 4}-${Math.floor(memory / 4) * 4 + 3}GB`
      acc[range] = (acc[range] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)

  const memoryChartData = Object.entries(memoryDistribution)
    .map(([range, count]) => ({ range, count }))

  // 제조사별 분포 (파이 차트)
  const manufacturerData = devices.reduce((acc, device) => {
    const manufacturer = device.manufacturer
    if (manufacturer) {
      acc[manufacturer] = (acc[manufacturer] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)

  const manufacturerChartData = Object.entries(manufacturerData)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6) // 상위 6개만

  // 메모리 vs 저장공간 산점도
  const scatterData = devices
    .filter(d => d.total_memory_gb && d.total_storage_gb)
    .map(d => ({
      memory: d.total_memory_gb,
      storage: d.total_storage_gb,
      model: d.model
    }))

  return (
    <div className="space-y-8">
      {/* OS 버전별 분포 */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b bg-white sticky top-0 z-10 rounded-t-lg shadow-sm">
          <h3 className="text-lg font-semibold !text-gray-900">OS 버전별 분포</h3>
        </div>
        <div className="p-6 max-h-80 overflow-auto">
          <div style={{ width: '100%', minWidth: `${Math.max(androidChartData.length * 60, 400)}px` }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={androidChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="version" />
                <YAxis />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #ccc', 
                    borderRadius: '4px',
                    color: '#374151'
                  }}
                />
                <Bar dataKey="count" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 메모리 분포 */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b bg-white sticky top-0 z-10 rounded-t-lg shadow-sm">
            <h3 className="text-lg font-semibold !text-gray-900">메모리 분포</h3>
          </div>
          <div className="p-6 max-h-80 overflow-auto">
            <div style={{ width: '100%', minWidth: `${Math.max(memoryChartData.length * 80, 300)}px` }}>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={memoryChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #ccc', 
                      borderRadius: '4px',
                      color: '#374151'
                    }}
                  />
                  <Bar dataKey="count" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* 제조사별 분포 (파이 차트) */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b bg-white sticky top-0 z-10 rounded-t-lg shadow-sm">
            <h3 className="text-lg font-semibold !text-gray-900">제조사별 분포</h3>
          </div>
          <div className="p-6 max-h-80 overflow-auto">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={manufacturerChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {manufacturerChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #ccc', 
                    borderRadius: '4px',
                    color: '#374151'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 메모리 vs 저장공간 산점도 */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b bg-white sticky top-0 z-10 rounded-t-lg shadow-sm">
          <h3 className="text-lg font-semibold !text-gray-900">메모리 vs 저장공간 분포</h3>
        </div>
        <div className="p-6 max-h-96 overflow-auto">
          <div style={{ width: '100%', minWidth: '600px' }}>
            <ResponsiveContainer width="100%" height={350}>
              <ScatterChart data={scatterData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="memory" name="메모리(GB)" />
                <YAxis dataKey="storage" name="저장공간(GB)" />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="bg-white p-3 shadow-lg rounded border" style={{ color: '#374151' }}>
                          <p className="font-semibold !text-gray-800">{data.model}</p>
                          <p className="!text-gray-700">메모리: {data.memory}GB</p>
                          <p className="!text-gray-700">저장공간: {data.storage}GB</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Scatter name="디바이스" dataKey="storage" fill="#8B5CF6" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}