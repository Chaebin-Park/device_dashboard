// page.tsx (Enhanced Dashboard)
'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase, Device, Sensor } from '../lib/supabase'
import AdvancedFilters from '../components/AdvancedFilters'
import DeviceComparison from '../components/DeviceComparison'
import AnalyticsCharts from '../components/AnalyticsCharts'
import DataExport from '../components/DataExport'

export const dynamic = 'force-dynamic'

interface FilterOptions {
  searchTerm: string
  manufacturers: string[]
  androidVersions: string[]
  sortBy: 'created_at' | 'model' | 'sensor_count'
  sortOrder: 'asc' | 'desc'
}

export default function Dashboard() {
  const [devices, setDevices] = useState<Device[]>([])
  const [filteredDevices, setFilteredDevices] = useState<Device[]>([])
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [comparisonDevices, setComparisonDevices] = useState<Device[]>([])
  const [comparisonSensors, setComparisonSensors] = useState<Record<string, Sensor[]>>({})
  const [sensors, setSensors] = useState<Sensor[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'list' | 'compare' | 'analytics'>('list')
  const [filters, setFilters] = useState<FilterOptions>({
    searchTerm: '',
    manufacturers: [],
    androidVersions: [],
    sortBy: 'created_at',
    sortOrder: 'desc'
  })
  const [deviceSensorCounts, setDeviceSensorCounts] = useState<Record<string, number>>({})

  // 고유 값들 추출
  const availableManufacturers = [...new Set(devices.map(d => d.manufacturer).filter(Boolean))]
  const availableAndroidVersions = [...new Set(devices.map(d => d.android_version).filter(Boolean))]

  const applyFilters = useCallback(() => {
    let filtered = [...devices]

    // 검색 필터
    if (filters.searchTerm) {
      filtered = filtered.filter(device =>
        device.model?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        device.manufacturer?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        device.brand?.toLowerCase().includes(filters.searchTerm.toLowerCase())
      )
    }

    // 제조사 필터
    if (filters.manufacturers.length > 0) {
      filtered = filtered.filter(device => 
        filters.manufacturers.includes(device.manufacturer)
      )
    }

    // Android 버전 필터
    if (filters.androidVersions.length > 0) {
      filtered = filtered.filter(device => 
        filters.androidVersions.includes(device.android_version)
      )
    }

    // 정렬
    filtered.sort((a, b) => {
      let aValue, bValue
      switch (filters.sortBy) {
        case 'model':
          aValue = a.model || ''
          bValue = b.model || ''
          break
        case 'sensor_count':
          aValue = deviceSensorCounts[a.device_id] || 0
          bValue = deviceSensorCounts[b.device_id] || 0
          break
        default:
          aValue = new Date(a.created_at).getTime()
          bValue = new Date(b.created_at).getTime()
      }

      if (filters.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    setFilteredDevices(filtered)
  }, [devices, filters, deviceSensorCounts])

  useEffect(() => {
    fetchDevices()
    
    const subscription = supabase
      .channel('devices')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'devices' 
      }, (payload) => {
        setDevices(prev => [payload.new as Device, ...prev])
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    applyFilters()
  }, [devices, filters, applyFilters])

  useEffect(() => {
    if (comparisonDevices.length > 0) {
      const deviceIds = comparisonDevices.map(d => d.device_id)
      fetchComparisonSensors(deviceIds)
    } else {
      setComparisonSensors({})
    }
  }, [comparisonDevices])

  const fetchDevices = async () => {
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setDevices(data || [])
    } catch (error) {
      console.error('Error fetching devices:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchDeviceSensorCounts = useCallback(async () => {
    try {
      const counts: Record<string, number> = {}
      
      for (const device of devices) {
        const { count, error } = await supabase
          .from('sensors')
          .select('*', { count: 'exact', head: true })
          .eq('device_id', device.device_id)

        if (error) throw error
        counts[device.device_id] = count || 0
      }
      
      setDeviceSensorCounts(counts)
    } catch (error) {
      console.error('Error fetching sensor counts:', error)
    }
  }, [devices])

  useEffect(() => {
    if (devices.length > 0) {
      fetchDeviceSensorCounts()
    }
  }, [devices, fetchDeviceSensorCounts])

  const fetchSensors = async (deviceId: string) => {
    try {
      const { data, error } = await supabase
        .from('sensors')
        .select('*')
        .eq('device_id', deviceId)
        .order('name')

      if (error) throw error
      setSensors(data || [])
    } catch (error) {
      console.error('Error fetching sensors:', error)
    }
  }

  const fetchComparisonSensors = async (deviceIds: string[]) => {
    try {
      const sensorMap: Record<string, Sensor[]> = {}
      
      for (const deviceId of deviceIds) {
        const { data, error } = await supabase
          .from('sensors')
          .select('*')
          .eq('device_id', deviceId)
          .order('name')

        if (error) throw error
        sensorMap[deviceId] = data || []
      }
      
      setComparisonSensors(sensorMap)
    } catch (error) {
      console.error('Error fetching comparison sensors:', error)
    }
  }

  const handleDeviceSelect = (device: Device) => {
    setSelectedDevice(device)
    fetchSensors(device.device_id)
  }

  const toggleDeviceComparison = (device: Device) => {
    setComparisonDevices(prev => {
      const exists = prev.find(d => d.id === device.id)
      if (exists) {
        return prev.filter(d => d.id !== device.id)
      } else if (prev.length < 4) {
        return [...prev, device]
      }
      return prev
    })
  }

  const removeFromComparison = (deviceId: string) => {
    setComparisonDevices(prev => prev.filter(d => d.device_id !== deviceId))
  }

  const clearComparison = () => {
    setComparisonDevices([])
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-3xl font-bold text-gray-900">Enhanced Device Dashboard</h1>
          <p className="text-gray-600 mt-1">
            총 {devices.length}개 디바이스 | 필터링됨 {filteredDevices.length}개
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 탭 네비게이션 */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('list')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'list'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📋 디바이스 목록
            </button>
            <button
              onClick={() => setActiveTab('compare')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'compare'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🔍 비교 분석 ({comparisonDevices.length})
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'analytics'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📊 분석 차트
            </button>
          </nav>
        </div>

        {/* 고급 필터 */}
        <AdvancedFilters
          onFilterChange={setFilters}
          availableManufacturers={availableManufacturers}
          availableAndroidVersions={availableAndroidVersions}
        />

        {/* 데이터 내보내기 */}
        {/* <div className="mb-6">
          <DataExport devices={devices} filteredDevices={filteredDevices} />
        </div> */}

        {/* 탭 컨텐츠 */}
        {activeTab === 'list' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* 디바이스 목록 */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow">
                <div className="p-4 border-b">
                  <h3 className="text-lg font-semibold text-gray-900">
                    디바이스 선택
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    상세 정보를 볼 디바이스를 선택하세요
                  </p>
                </div>
                <div className="max-h-[600px] overflow-y-auto">
                  {filteredDevices.map((device) => (
                    <div
                      key={device.id}
                      className={`p-3 border-b hover:bg-gray-50 transition-colors ${
                        selectedDevice?.id === device.id ? 'bg-blue-50 border-blue-200' : ''
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div 
                          className="flex-1 cursor-pointer"
                          onClick={() => handleDeviceSelect(device)}
                        >
                          <div className="font-medium text-gray-900 text-sm">{device.model}</div>
                          <div className="text-xs text-gray-600">{device.manufacturer}</div>
                          <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
                            <span>{new Date(device.created_at).toLocaleDateString('ko-KR')}</span>
                            <span className="text-blue-600 font-medium">
                              센서 {deviceSensorCounts[device.device_id] || 0}개
                            </span>
                          </div>
                        </div>
                        {/* <button
                          onClick={() => toggleDeviceComparison(device)}
                          disabled={!comparisonDevices.find(d => d.id === device.id) && comparisonDevices.length >= 4}
                          className={`ml-2 px-3 py-1 text-xs rounded font-medium transition-colors ${
                            comparisonDevices.find(d => d.id === device.id)
                              ? 'bg-blue-500 text-white hover:bg-blue-600'
                              : comparisonDevices.length >= 4
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {comparisonDevices.find(d => d.id === device.id) ? '선택됨' : '선택'}
                        </button> */}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 디바이스 상세 정보 */}
            <div className="lg:col-span-3">
              {selectedDevice ? (
                <div className="space-y-6">
                  {/* 기본 정보 */}
                  <div className="bg-white rounded-lg shadow">
                    <div className="p-6 border-b">
                      <h3 className="text-lg font-semibold text-gray-900">기본 정보</h3>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <InfoItem label="모델" value={selectedDevice.model} />
                      <InfoItem label="제조사" value={selectedDevice.manufacturer} />
                      <InfoItem label="브랜드" value={selectedDevice.brand} />
                      <InfoItem label="Android 버전" value={selectedDevice.android_version} />
                      <InfoItem label="SDK 버전" value={selectedDevice.sdk_version?.toString()} />
                      <InfoItem label="통신사" value={selectedDevice.carrier_name} />
                    </div>
                  </div>

                  {/* 하드웨어 정보 */}
                  <div className="bg-white rounded-lg shadow">
                    <div className="p-6 border-b">
                      <h3 className="text-lg font-semibold text-gray-900">하드웨어 정보</h3>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <InfoItem label="CPU ABI" value={selectedDevice.cpu_abis?.join(', ')} />
                      <InfoItem label="CPU 코어" value={`${selectedDevice.cpu_cores} cores`} />
                      <InfoItem label="총 메모리" value={`${selectedDevice.total_memory_gb} GB`} />
                      <InfoItem label="사용 가능 메모리" value={`${selectedDevice.available_memory_gb} GB`} />
                      <InfoItem label="총 저장공간" value={`${selectedDevice.total_storage_gb} GB`} />
                      <InfoItem label="사용 가능 저장공간" value={`${selectedDevice.available_storage_gb} GB`} />
                    </div>
                  </div>

                  {/* 센서 정보 */}
                  <div className="bg-white rounded-lg shadow">
                    <div className="p-6 border-b">
                      <h3 className="text-lg font-semibold text-gray-900">센서 정보 ({sensors.length}개)</h3>
                    </div>
                    <div className="p-6">
                      {sensors.length > 0 ? (
                        <div className="grid gap-4">
                          {sensors.map((sensor) => (
                            <div key={sensor.id} className="border border-gray-300 bg-white rounded-lg p-4 shadow-sm">
                              <h4 className="font-medium text-gray-900 mb-2">{sensor.name}</h4>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-gray-700">
                                <div><span className="text-gray-600 font-medium">Type:</span> {sensor.type_name}</div>
                                <div><span className="text-gray-600 font-medium">Vendor:</span> {sensor.vendor}</div>
                                <div><span className="text-gray-600 font-medium">Version:</span> {sensor.version}</div>
                                <div><span className="text-gray-600 font-medium">Max Range:</span> {sensor.maximum_range}</div>
                                <div><span className="text-gray-600 font-medium">Resolution:</span> {sensor.resolution}</div>
                                <div><span className="text-gray-600 font-medium">Power:</span> {sensor.power} mA</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-8">센서 정보가 없습니다.</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow h-96 flex items-center justify-center">
                  <p className="text-gray-500 text-lg">디바이스를 선택해주세요</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'compare' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* 디바이스 선택 사이드바 */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow">
                <div className="p-4 border-b">
                  <h3 className="text-lg font-semibold text-gray-900">
                    디바이스 선택
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    비교할 디바이스를 선택하세요 (최대 4개)
                  </p>
                </div>
                <div className="max-h-[600px] overflow-y-auto">
                  {filteredDevices.map((device) => (
                    <div
                      key={device.id}
                      className={`p-3 border-b hover:bg-gray-50 transition-colors ${
                        comparisonDevices.find(d => d.id === device.id) ? 'bg-blue-50 border-blue-200' : ''
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 text-sm">{device.model}</div>
                          <div className="text-xs text-gray-600">{device.manufacturer}</div>
                          <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
                            <span>{new Date(device.created_at).toLocaleDateString('ko-KR')}</span>
                            <span className="text-blue-600 font-medium">
                              센서 {deviceSensorCounts[device.device_id] || 0}개
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => toggleDeviceComparison(device)}
                          disabled={!comparisonDevices.find(d => d.id === device.id) && comparisonDevices.length >= 4}
                          className={`ml-2 px-3 py-1 text-xs rounded font-medium transition-colors ${
                            comparisonDevices.find(d => d.id === device.id)
                              ? 'bg-blue-500 text-white hover:bg-blue-600'
                              : comparisonDevices.length >= 4
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {comparisonDevices.find(d => d.id === device.id) ? '선택됨' : '선택'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 비교 결과 */}
            <div className="lg:col-span-3">
              <DeviceComparison
                selectedDevices={comparisonDevices}
                deviceSensors={comparisonSensors}
                onRemoveDevice={removeFromComparison}
                onClearAll={clearComparison}
              />
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <AnalyticsCharts devices={filteredDevices} />
        )}
      </main>
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">{value || 'N/A'}</dd>
    </div>
  )
}