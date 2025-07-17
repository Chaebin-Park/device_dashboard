// components/DeviceComparison.tsx
'use client'

import React from 'react'
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

  // 모든 센서 수집 (sensor.type 숫자를 기준으로 중복 제거)
  const allSensors = new Map<number, { type: number; type_name: string; name: string }>()
  selectedDevices.forEach(device => {
    const sensors = deviceSensors[device.device_id] || []
    sensors.forEach(sensor => {
      // type 숫자가 같으면 같은 센서로 취급
      if (!allSensors.has(sensor.type)) {
        allSensors.set(sensor.type, { 
          type: sensor.type, 
          type_name: sensor.type_name, 
          name: sensor.name 
        })
      }
    })
  })
  
  // 타입별로 그룹화하고 정렬 (type 숫자 기준)
  const groupedSensors = Array.from(allSensors.values())
    .reduce((acc, sensor) => {
      if (!acc[sensor.type_name]) {
        acc[sensor.type_name] = []
      }
      // type 숫자가 같으면 하나만 유지
      const exists = acc[sensor.type_name].find(s => s.type === sensor.type)
      if (!exists) {
        acc[sensor.type_name].push(sensor)
      }
      return acc
    }, {} as Record<string, { type: number; type_name: string; name: string }[]>)

  // 타입별로 정렬 (type 숫자 기준)
  Object.keys(groupedSensors).forEach(typeName => {
    groupedSensors[typeName].sort((a, b) => a.type - b.type)
  })

  const sortedSensorTypes = Object.keys(groupedSensors).sort()

  // 각 디바이스별 특정 센서 정보 찾기 (type 숫자 기준)
  const getSensorInfo = (deviceId: string, sensorType: number) => {
    const sensors = deviceSensors[deviceId] || []
    const sensor = sensors.find(s => s.type === sensorType)
    return sensor ? { vendor: sensor.vendor, version: sensor.version, originalName: sensor.name } : null
  }

  return (
    <div className="space-y-6">
      {/* 하드웨어 비교 */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b bg-white sticky top-0 z-10 flex justify-between items-center shadow-sm">
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

        <div className="max-h-[400px] overflow-auto">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                  항목
                </th>
                {selectedDevices.map((device) => (
                  <th key={device.id} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
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
        <div className="p-4 border-b bg-white sticky top-0 z-10 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">
            센서 비교 ({Array.from(allSensors.values()).length}개 센서 타입)
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            센서 타입 번호가 같으면 동일한 센서로 취급하여 비교합니다
          </p>
        </div>

        {sortedSensorTypes.length > 0 ? (
          <div className="max-h-[500px] overflow-auto">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    센서 정보
                  </th>
                  {selectedDevices.map((device) => (
                    <th key={device.id} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                      <span className="truncate">{device.model}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedSensorTypes.map((sensorType) => (
                  <React.Fragment key={sensorType}>
                    {/* 센서 타입 헤더 */}
                    <tr className="bg-blue-50">
                      <td 
                        colSpan={selectedDevices.length + 1} 
                        className="px-4 py-2 text-sm font-bold text-blue-900 border-b border-blue-200"
                      >
                        📱 {sensorType} ({groupedSensors[sensorType].length}개)
                      </td>
                    </tr>
                    {/* 개별 센서들 */}
                    {groupedSensors[sensorType].map((sensor) => (
                      <tr key={`${sensor.type_name}-${sensor.name}`} className="hover:bg-gray-50">
                        <td className="px-6 py-3 text-sm bg-gray-50 border-l-4 border-blue-300">
                          <div className="font-medium text-gray-900">{sensor.type_name}</div>
                          <div className="text-xs text-gray-500">센서 타입</div>
                        </td>
                        {selectedDevices.map((device) => {
                          const sensorInfo = getSensorInfo(device.device_id, sensor.type)
                          return (
                            <td key={device.id} className="px-4 py-3 text-sm">
                              {sensorInfo ? (
                                <div className="space-y-1">
                                  <div className="flex items-center">
                                    <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                                    <span className="text-green-800 font-semibold text-xs">사용 가능</span>
                                  </div>
                                  <div className="text-gray-600 text-xs space-y-1">
                                    <div className="font-medium text-gray-900">{sensorInfo.originalName}</div>
                                    <div>제조사: <span className="font-medium">{sensorInfo.vendor}</span></div>
                                    <div>버전: <span className="font-medium">{sensorInfo.version}</span></div>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center">
                                  <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                                  <span className="text-red-600 text-xs">없음</span>
                                </div>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
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