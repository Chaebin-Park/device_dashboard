'use client'

import React from 'react'
import { Device, Sensor } from '../lib/supabase'

interface Props {
  selectedDevices: Device[]
  deviceSensors: Record<string, Sensor[]> // device_id를 key로 하는 센서 맵
  onRemoveDevice: (deviceId: string) => void
  onClearAll: () => void
  compactMode?: boolean
}

export default function DeviceComparison({ 
  selectedDevices, 
  deviceSensors, 
  onRemoveDevice, 
  onClearAll, 
  compactMode = false 
}: Props) {
  if (selectedDevices.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="!text-gray-500">비교할 디바이스를 선택해주세요 (최대 4개)</p>
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

  // 모든 선택된 기기가 공통으로 가진 센서 수 계산
  const getCommonSensorCount = () => {
    const totalSensorTypes = Array.from(allSensors.values()).length
    
    // 모든 기기가 공통으로 가진 센서 수
    const commonSensors = Array.from(allSensors.values()).filter(sensor => {
      // 모든 선택된 기기가 이 센서를 가지고 있는지 확인
      return selectedDevices.every(device => {
        const deviceSensorList = deviceSensors[device.device_id] || []
        return deviceSensorList.some(ds => ds.type === sensor.type)
      })
    }).length
    
    return { common: commonSensors, total: totalSensorTypes }
  }

  // 각 디바이스별 특정 센서 정보 찾기 (type 숫자 기준)
  const getSensorInfo = (deviceId: string, sensorType: number) => {
    const sensors = deviceSensors[deviceId] || []
    const sensor = sensors.find(s => s.type === sensorType)
    return sensor ? { vendor: sensor.vendor, version: sensor.version, originalName: sensor.name } : null
  }

  if (compactMode) {
    return (
      <div className="space-y-4">
        {/* 컴팩트 모드: 간단한 요약 */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="text-lg font-semibold !text-gray-900">
              선택된 기기 ({selectedDevices.length}/4)
            </h3>
            <button
              onClick={onClearAll}
              className="!text-red-600 hover:!text-red-800 text-sm"
            >
              모두 제거
            </button>
          </div>
          
          <div className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {selectedDevices.map((device) => (
                <div key={device.id} className="bg-gray-50 rounded-lg p-3 relative">
                  <button
                    onClick={() => onRemoveDevice(device.device_id)}
                    className="absolute top-1 right-1 !text-red-500 hover:!text-red-700 text-sm"
                  >
                    ×
                  </button>
                  <div className="pr-4">
                    <div className="font-medium !text-gray-900 text-sm truncate">{device.model}</div>
                    <div className="text-xs !text-gray-600 truncate">{device.manufacturer}</div>
                    <div className="flex justify-between items-center mt-2 text-xs">
                      <span className="!text-gray-500">메모리:</span>
                      <span className="font-medium !text-gray-900">{device.total_memory_gb}GB</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="!text-gray-500">저장공간:</span>
                      <span className="font-medium !text-gray-900">{device.total_storage_gb}GB</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="!text-gray-500">센서:</span>
                      <span className="font-medium !text-blue-600">
                        {(deviceSensors[device.device_id] || []).length}개
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 간단한 비교 테이블 */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold !text-gray-900">빠른 비교</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium !text-gray-500">항목</th>
                  {selectedDevices.map((device) => (
                    <th key={device.id} className="px-4 py-2 text-left font-medium !text-gray-500 min-w-32">
                      <div className="truncate" title={device.model}>
                        {device.model.length > 12 ? `${device.model.substring(0, 12)}...` : device.model}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <CompactComparisonRow 
                  label="제조사" 
                  values={selectedDevices.map(d => d.manufacturer)} 
                />
                <CompactComparisonRow 
                  label="Android" 
                  values={selectedDevices.map(d => d.android_version)} 
                />
                <CompactComparisonRow 
                  label="메모리" 
                  values={selectedDevices.map(d => `${d.total_memory_gb}GB`)}
                  highlightMax={true}
                />
                <CompactComparisonRow 
                  label="저장공간" 
                  values={selectedDevices.map(d => `${d.total_storage_gb}GB`)}
                  highlightMax={true}
                />
                <CompactComparisonRow 
                  label="센서 수" 
                  values={selectedDevices.map(d => `${(deviceSensors[d.device_id] || []).length}개`)}
                  highlightMax={true}
                />
              </tbody>
            </table>
          </div>
        </div>

        {/* 센서 호환성 요약 */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold !text-gray-900">센서 호환성</h3>
            <p className="text-sm !text-gray-600 mt-1">
              공통 센서: <span className="font-bold !text-blue-600">
                {(() => {
                  const commonCount = getCommonSensorCount()
                  return `${commonCount.common}/${commonCount.total}`
                })()} 
              </span>
            </p>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              {sortedSensorTypes.slice(0, 8).map((sensorType) => (
                <div key={sensorType} className="bg-gray-50 rounded p-2">
                  <div className="font-medium !text-gray-900 mb-1 truncate" title={sensorType}>
                    {sensorType.length > 15 ? `${sensorType.substring(0, 15)}...` : sensorType}
                  </div>
                  <div className="flex space-x-1">
                    {selectedDevices.map((device) => {
                      const hasSensor = groupedSensors[sensorType].some(sensor => 
                        getSensorInfo(device.device_id, sensor.type)
                      )
                      return (
                        <div
                          key={device.id}
                          className={`w-3 h-3 rounded-full ${
                            hasSensor ? 'bg-green-500' : 'bg-red-300'
                          }`}
                          title={`${device.model}: ${hasSensor ? '지원' : '미지원'}`}
                        />
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
            {sortedSensorTypes.length > 8 && (
              <div className="mt-2 text-xs !text-gray-500 text-center">
                총 {sortedSensorTypes.length}개 센서 타입 중 {Math.min(8, sortedSensorTypes.length)}개 표시
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // 일반 모드 (기존 코드)
  return (
    <div className="space-y-6">
      {/* 하드웨어 비교 */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b bg-white sticky top-0 z-10 flex justify-between items-center shadow-sm">
          <h3 className="text-lg font-semibold !text-gray-900">
            하드웨어 비교 ({selectedDevices.length}/4)
          </h3>
          <button
            onClick={onClearAll}
            className="!text-red-600 hover:!text-red-800 text-sm"
          >
            모두 제거
          </button>
        </div>

        <div className="max-h-[400px] overflow-auto">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium !text-gray-500 uppercase tracking-wider bg-gray-50">
                  항목
                </th>
                {selectedDevices.map((device) => (
                  <th key={device.id} className="px-4 py-3 text-left text-xs font-medium !text-gray-500 uppercase tracking-wider bg-gray-50">
                    <div className="flex items-center justify-between">
                      <span className="truncate">{device.model}</span>
                      <button
                        onClick={() => onRemoveDevice(device.device_id)}
                        className="ml-2 !text-red-500 hover:!text-red-700"
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
              <ComparisonRow label="OS 버전" values={selectedDevices.map(d => d.android_version)} />
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
          <h3 className="text-lg font-semibold !text-gray-900">
            센서 비교 ({Array.from(allSensors.values()).length}개 센서 타입 비교)
          </h3>
          <p className="text-sm !text-gray-600 mt-1">
            공통 센서: <span className="font-bold !text-blue-600">
              {(() => {
                const commonCount = getCommonSensorCount()
                return `${commonCount.common}/${commonCount.total}`
              })()} 
            </span>
            (모든 선택된 기기가 공통으로 보유한 센서 / 전체 센서 종류)
          </p>
        </div>

        {sortedSensorTypes.length > 0 ? (
          <div className="max-h-[500px] overflow-auto">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium !text-gray-500 uppercase tracking-wider bg-gray-50">
                    센서 정보
                  </th>
                  {selectedDevices.map((device) => (
                    <th key={device.id} className="px-4 py-3 text-left text-xs font-medium !text-gray-500 uppercase tracking-wider bg-gray-50">
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
                        className="px-4 py-2 text-sm font-bold !text-blue-900 border-b border-blue-200"
                      >
                        📱 {sensorType} ({groupedSensors[sensorType].length}개)
                      </td>
                    </tr>
                    {/* 개별 센서들 */}
                    {groupedSensors[sensorType].map((sensor) => (
                      <tr key={`${sensor.type_name}-${sensor.name}`} className="hover:bg-gray-50">
                        <td className="px-6 py-3 text-sm bg-gray-50 border-l-4 border-blue-300">
                          <div className="font-medium !text-gray-900">{sensor.type_name}</div>
                          <div className="text-xs !text-gray-500">센서 타입</div>
                        </td>
                        {selectedDevices.map((device) => {
                          const sensorInfo = getSensorInfo(device.device_id, sensor.type)
                          return (
                            <td key={device.id} className="px-4 py-3 text-sm">
                              {sensorInfo ? (
                                <div className="space-y-1">
                                  <div className="flex items-center">
                                    <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                                    <span className="!text-green-800 font-semibold text-xs">사용 가능</span>
                                  </div>
                                  <div className="!text-gray-600 text-xs space-y-1">
                                    <div className="font-medium !text-gray-900">{sensorInfo.originalName}</div>
                                    <div>제조사: <span className="font-medium">{sensorInfo.vendor}</span></div>
                                    <div>버전: <span className="font-medium">{sensorInfo.version}</span></div>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center">
                                  <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                                  <span className="!text-red-600 text-xs">없음</span>
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
            <p className="!text-gray-500">센서 데이터가 없습니다.</p>
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
      <td className="px-4 py-3 text-sm font-medium !text-gray-900 bg-gray-50">
        {label}
      </td>
      {values.map((value, index) => {
        const isMaxValue = highlightMax && numericValues[index] === maxValue && maxValue > 0
        return (
          <td 
            key={index} 
            className={`px-4 py-3 text-sm !text-gray-500 ${
              isMaxValue ? 'bg-green-50 !text-green-800 font-semibold' : ''
            }`}
          >
            {value || 'N/A'}
          </td>
        )
      })}
    </tr>
  )
}

function CompactComparisonRow({ 
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
      <td className="px-4 py-2 text-sm font-medium !text-gray-900 bg-gray-50">
        {label}
      </td>
      {values.map((value, index) => {
        const isMaxValue = highlightMax && numericValues[index] === maxValue && maxValue > 0
        return (
          <td 
            key={index} 
            className={`px-4 py-2 text-sm !text-gray-500 ${
              isMaxValue ? 'bg-green-50 !text-green-800 font-semibold' : ''
            }`}
          >
            <div className="truncate" title={value || 'N/A'}>
              {value || 'N/A'}
            </div>
          </td>
        )
      })}
    </tr>
  )
}