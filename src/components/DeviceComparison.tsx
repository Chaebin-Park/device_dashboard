// components/DeviceComparison.tsx
'use client'

import { Device, Sensor } from '../lib/supabase'

interface Props {
  selectedDevices: Device[]
  deviceSensors: Record<string, Sensor[]> // device_id를 key로 하는 센서 맵
  onRemoveDevice: (deviceId: string) => void
  onClearAll: () => void
}

export default function DeviceComparison({ selectedDevices, deviceSensors, onRemoveDevice, onClearAll }: Props) {
  if (selectedDevices.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-gray-500">비교할 디바이스를 선택해주세요 (최대 4개)</p>
      </div>
    )
  }

  // 모든 센서 타입 수집
  const allSensorTypes = new Set<string>()
  selectedDevices.forEach(device => {
    const sensors = deviceSensors[device.device_id] || []
    sensors.forEach(sensor => {
      allSensorTypes.add(sensor.type_name)
    })
  })
  const sortedSensorTypes = Array.from(allSensorTypes).sort()

  // 각 디바이스별 센서 정보 맵 생성
  const getSensorInfo = (deviceId: string, sensorType: string) => {
    const sensors = deviceSensors[deviceId] || []
    const sensor = sensors.find(s => s.type_name === sensorType)
    return sensor ? { vendor: sensor.vendor, version: sensor.version } : null
  }

  return (
    <div className="space-y-6">
      {/* 하드웨어 비교 */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">
            하드웨어 비교 ({selectedDevices.length}/4)
          </h3>
          <button
            onClick={onClearAll}
            className="text-red-600 hover:text-red-800 text-sm"
          >
            모두 제거
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  항목
                </th>
                {selectedDevices.map((device) => (
                  <th key={device.id} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center justify-between">
                      <span className="truncate">{device.model}</span>
                      <button
                        onClick={() => onRemoveDevice(device.device_id)}
                        className="ml-2 text-red-500 hover:text-red-700"
                      >
                        ×
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <ComparisonRow label="제조사" values={selectedDevices.map(d => d.manufacturer)} />
              <ComparisonRow label="브랜드" values={selectedDevices.map(d => d.brand)} />
              <ComparisonRow label="Android 버전" values={selectedDevices.map(d => d.android_version)} />
              <ComparisonRow label="SDK 버전" values={selectedDevices.map(d => d.sdk_version?.toString())} />
              <ComparisonRow label="CPU 코어" values={selectedDevices.map(d => `${d.cpu_cores} cores`)} />
              <ComparisonRow 
                label="메모리" 
                values={selectedDevices.map(d => `${d.total_memory_gb} GB`)}
                highlightMax={true}
              />
              <ComparisonRow 
                label="저장공간" 
                values={selectedDevices.map(d => `${d.total_storage_gb} GB`)}
                highlightMax={true}
              />
              <ComparisonRow label="통신사" values={selectedDevices.map(d => d.carrier_name)} />
              <ComparisonRow label="등록일" values={selectedDevices.map(d => new Date(d.created_at).toLocaleDateString('ko-KR'))} />
            </tbody>
          </table>
        </div>
      </div>

      {/* 센서 비교 */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            센서 비교 ({sortedSensorTypes.length}개 센서 타입)
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            각 센서의 제조사와 버전 정보를 비교합니다
          </p>
        </div>

        {sortedSensorTypes.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    센서 타입
                  </th>
                  {selectedDevices.map((device) => (
                    <th key={device.id} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {device.model}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedSensorTypes.map((sensorType) => (
                  <tr key={sensorType}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 bg-gray-50">
                      {sensorType}
                    </td>
                    {selectedDevices.map((device) => {
                      const sensorInfo = getSensorInfo(device.device_id, sensorType)
                      return (
                        <td key={device.id} className="px-4 py-3 text-sm">
                          {sensorInfo ? (
                            <div>
                              <div className="text-green-800 font-semibold">✓ 있음</div>
                              <div className="text-gray-600 text-xs">
                                제조사: {sensorInfo.vendor}
                              </div>
                              <div className="text-gray-600 text-xs">
                                버전: {sensorInfo.version}
                              </div>
                            </div>
                          ) : (
                            <div className="text-red-600">✗ 없음</div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center">
            <p className="text-gray-500">센서 데이터가 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function ComparisonRow({ 
  label, 
  values, 
  highlightMax = false 
}: { 
  label: string
  values: (string | undefined)[]
  highlightMax?: boolean 
}) {
  const numericValues = highlightMax ? values.map(v => parseFloat(v?.replace(/[^\d.]/g, '') || '0')) : []
  const maxValue = highlightMax ? Math.max(...numericValues) : 0

  return (
    <tr>
      <td className="px-4 py-3 text-sm font-medium text-gray-900 bg-gray-50">
        {label}
      </td>
      {values.map((value, index) => {
        const isMaxValue = highlightMax && numericValues[index] === maxValue && maxValue > 0
        return (
          <td 
            key={index} 
            className={`px-4 py-3 text-sm text-gray-500 ${
              isMaxValue ? 'bg-green-50 text-green-800 font-semibold' : ''
            }`}
          >
            {value || 'N/A'}
          </td>
        )
      })}
    </tr>
  )
}