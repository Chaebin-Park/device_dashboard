'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase, Device, Sensor } from '../lib/supabase'
import AdvancedFilters, { FilterOptions } from '../components/AdvancedFilters'
import DeviceComparison from '../components/DeviceComparison'
import AnalyticsCharts from '../components/AnalyticsCharts'
import TierAnalyticsChart from '../components/TierAnalyticsChart'
import DeviceTierBadge from '../components/DeviceTierBadge'
import { getDeviceTierInfo } from '../utils/deviceTierSystem'

export const dynamic = 'force-dynamic'

interface Notification {
  id: string
  type: 'success' | 'warning' | 'error' | 'info'
  title: string
  message: string
  timestamp: Date
  read: boolean
}

export default function Dashboard() {
  const [devices, setDevices] = useState<Device[]>([])
  const [filteredDevices, setFilteredDevices] = useState<Device[]>([])
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [comparisonDevices, setComparisonDevices] = useState<Device[]>([])
  const [comparisonSensors, setComparisonSensors] = useState<Record<string, Sensor[]>>({})
  const [sensors, setSensors] = useState<Sensor[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'list' | 'compare' | 'analytics' | 'tiers'>('list')
  const [filters, setFilters] = useState<FilterOptions>({
    searchTerm: '',
    manufacturers: [],
    androidVersions: [],
    tiers: [],
    sortBy: 'tier_score',
    sortOrder: 'desc'
  })
  const [deviceSensorCounts, setDeviceSensorCounts] = useState<Record<string, number>>({})

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1)
  const [comparisonCurrentPage, setComparisonCurrentPage] = useState(1)
  const itemsPerPage = 10

  // 삭제 및 컴팩트 모드 관련 상태
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deviceToDelete, setDeviceToDelete] = useState<Device | null>(null)
  const [compactMode, setCompactMode] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])

  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredDevices.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedDevices = filteredDevices.slice(startIndex, endIndex)

  // 비교 분석용 페이지네이션 계산
  const availableDevicesForComparison = filteredDevices
  const comparisonTotalPages = Math.ceil(availableDevicesForComparison.length / itemsPerPage)
  const comparisonStartIndex = (comparisonCurrentPage - 1) * itemsPerPage
  const comparisonEndIndex = comparisonStartIndex + itemsPerPage
  const paginatedComparisonDevices = availableDevicesForComparison.slice(comparisonStartIndex, comparisonEndIndex)

  // 고유 값들 추출
  const availableManufacturers = [...new Set(devices.map(d => d.manufacturer).filter(Boolean))]
  const availableAndroidVersions = [...new Set(devices.map(d => d.android_version).filter(Boolean))]

  // 페이지 변경 함수
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleComparisonPageChange = (page: number) => {
    setComparisonCurrentPage(page)
  }

  // 필터 변경 시 페이지 리셋
  useEffect(() => {
    setCurrentPage(1)
    setComparisonCurrentPage(1)
  }, [filters])

  // 알림 표시 함수
  const showNotification = (type: Notification['type'], title: string, message: string) => {
    const notification: Notification = {
      id: Date.now().toString(),
      type,
      title,
      message,
      timestamp: new Date(),
      read: false
    }
    setNotifications(prev => [notification, ...prev.slice(0, 49)])
  }

  // 삭제 함수들
  const handleDeleteDevice = async (device: Device) => {
    setDeviceToDelete(device)
    setShowDeleteConfirm(true)
  }

  const executeDeleteDevice = async (device: Device) => {
    try {
      // 먼저 관련 센서 데이터 삭제
      const { error: sensorsError } = await supabase
        .from('sensors')
        .delete()
        .eq('device_id', device.device_id)

      if (sensorsError) {
        console.error('센서 삭제 오류:', sensorsError)
        showNotification('error', '삭제 실패', '센서 데이터 삭제 중 오류가 발생했습니다.')
        return
      }

      // 디바이스 삭제
      const { error: deviceError } = await supabase
        .from('devices')
        .delete()
        .eq('id', device.id)

      if (deviceError) {
        console.error('디바이스 삭제 오류:', deviceError)
        showNotification('error', '삭제 실패', '디바이스 삭제 중 오류가 발생했습니다.')
        return
      }

      // 로컬 상태 업데이트
      setDevices(prev => prev.filter(d => d.id !== device.id))
      
      // 선택된 디바이스가 삭제된 경우 선택 해제
      if (selectedDevice?.id === device.id) {
        setSelectedDevice(null)
        setSensors([])
      }

      // 비교 목록에서도 제거
      setComparisonDevices(prev => prev.filter(d => d.id !== device.id))

      showNotification('success', '삭제 완료', `${device.manufacturer} ${device.model}이(가) 성공적으로 삭제되었습니다.`)
      setShowDeleteConfirm(false)
      setDeviceToDelete(null)

    } catch (error: unknown) {
      console.error('Unexpected error during deletion:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      showNotification('error', '삭제 실패', `예상치 못한 오류가 발생했습니다: ${errorMessage}`)
    }
  }

  // 컴팩트 모드 함수들
  const loadCompactMode = () => {
    const saved = localStorage.getItem('dashboard-compact-mode')
    if (saved) {
      try {
        const isCompact = JSON.parse(saved)
        setCompactMode(isCompact)
      } catch (error) {
        console.error('Error loading compact mode:', error)
      }
    }
  }

  const toggleCompactMode = () => {
    const newCompactMode = !compactMode
    setCompactMode(newCompactMode)
    localStorage.setItem('dashboard-compact-mode', JSON.stringify(newCompactMode))
  }

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

    // 등급 필터
    if (filters.tiers.length > 0) {
      filtered = filtered.filter(device => {
        const sensorCount = deviceSensorCounts[device.device_id] || 0
        const tierInfo = getDeviceTierInfo(device, sensorCount)
        return filters.tiers.includes(tierInfo.tier)
      })
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
        case 'tier_score':
          aValue = getDeviceTierInfo(a, deviceSensorCounts[a.device_id] || 0).score
          bValue = getDeviceTierInfo(b, deviceSensorCounts[b.device_id] || 0).score
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
    loadCompactMode()
    
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

  useEffect(() => {
    if (devices.length > 0) {
      fetchDeviceSensorCounts()
    }
  }, [devices, fetchDeviceSensorCounts])

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
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold !text-gray-900">Enhanced Device Dashboard</h1>
              <p className="!text-gray-600 mt-1">
                총 {devices.length}개 디바이스 | 필터링됨 {filteredDevices.length}개
              </p>
            </div>
            
            {/* 컴팩트 모드 토글 버튼 */}
            <button
              onClick={toggleCompactMode}
              className={`p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                compactMode 
                  ? 'bg-blue-100 !text-blue-700' 
                  : '!text-gray-500 hover:!text-gray-700'
              }`}
              title={compactMode ? "일반 모드로 전환" : "컴팩트 모드로 전환"}
            >
              {compactMode ? (
                // 일반 모드로 전환 가능함을 보여주는 그리드 아이콘
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              ) : (
                // 컴팩트 모드로 전환 가능함을 보여주는 리스트 아이콘
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
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
                  ? 'border-blue-500 !text-blue-600'
                  : 'border-transparent !text-gray-500 hover:!text-gray-700 hover:border-gray-300'
              }`}
            >
              📋 디바이스 목록
            </button>
            <button
              onClick={() => setActiveTab('compare')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'compare'
                  ? 'border-blue-500 !text-blue-600'
                  : 'border-transparent !text-gray-500 hover:!text-gray-700 hover:border-gray-300'
              }`}
            >
              🔍 비교 분석 ({comparisonDevices.length})
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'analytics'
                  ? 'border-blue-500 !text-blue-600'
                  : 'border-transparent !text-gray-500 hover:!text-gray-700 hover:border-gray-300'
              }`}
            >
              📊 분석 차트
            </button>
            <button
              onClick={() => setActiveTab('tiers')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'tiers'
                  ? 'border-blue-500 !text-blue-600'
                  : 'border-transparent !text-gray-500 hover:!text-gray-700 hover:border-gray-300'
              }`}
            >
              🏆 등급 분석
            </button>
          </nav>
        </div>

        {/* 고급 필터 */}
        <AdvancedFilters
          onFilterChange={setFilters}
          availableManufacturers={availableManufacturers}
          availableAndroidVersions={availableAndroidVersions}
        />

        {/* 탭 컨텐츠 */}
        {activeTab === 'list' && (
          <div className={compactMode ? "space-y-4" : "grid grid-cols-1 lg:grid-cols-4 gap-8"}>
            {/* 컴팩트 모드: 테이블 형태 */}
            {compactMode ? (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="p-3 border-b bg-gray-50">
                  <h3 className="text-base font-semibold !text-gray-900">디바이스 목록</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr className="text-xs">
                        <th className="px-3 py-2 text-left font-medium !text-gray-500">모델</th>
                        <th className="px-3 py-2 text-left font-medium !text-gray-500">제조사</th>
                        <th className="px-3 py-2 text-left font-medium !text-gray-500">등급</th>
                        <th className="px-3 py-2 text-left font-medium !text-gray-500">센서</th>
                        <th className="px-3 py-2 text-left font-medium !text-gray-500">메모리</th>
                        <th className="px-3 py-2 text-left font-medium !text-gray-500">저장공간</th>
                        <th className="px-3 py-2 text-left font-medium !text-gray-500">등록일</th>
                        <th className="px-3 py-2 text-left font-medium !text-gray-500">작업</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {paginatedDevices.map((device) => (
                        <tr
                          key={device.id}
                          className={`hover:bg-gray-50 cursor-pointer text-xs ${
                            selectedDevice?.id === device.id ? 'bg-blue-50' : ''
                          }`}
                          onClick={() => handleDeviceSelect(device)}
                        >
                          <td className="px-3 py-2 font-medium !text-gray-900">{device.model}</td>
                          <td className="px-3 py-2 !text-gray-700">{device.manufacturer}</td>
                          <td className="px-3 py-2">
                            <DeviceTierBadge 
                              device={device} 
                              sensorCount={deviceSensorCounts[device.device_id] || 0}
                              size="sm"
                            />
                          </td>
                          <td className="px-3 py-2 !text-blue-600 font-medium">
                            {deviceSensorCounts[device.device_id] || 0}개
                          </td>
                          <td className="px-3 py-2 !text-gray-700">{device.total_memory_gb}GB</td>
                          <td className="px-3 py-2 !text-gray-700">{device.total_storage_gb}GB</td>
                          <td className="px-3 py-2 !text-gray-500">
                            {new Date(device.created_at).toLocaleDateString('ko-KR')}
                          </td>
                          <td className="px-3 py-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteDevice(device)
                              }}
                              className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                              title={`${device.model} 삭제`}
                            >
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* 페이지네이션 */}
                <div className="px-4 py-3 bg-white border-t border-gray-200">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                  />
                </div>
              </div>
            ) : (
              /* 일반 모드: 기존 카드 형태 */
              <>
                {/* 디바이스 목록 */}
                <div className="lg:col-span-1">
                  <div className="bg-white rounded-lg shadow">
                    <div className="p-4 border-b">
                      <h3 className="text-lg font-semibold !text-gray-900">
                        디바이스 선택
                      </h3>
                      <p className="text-sm !text-gray-600 mt-1">
                        디바이스를 클릭하여 상세 정보를 확인하세요
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
                              <div className="flex items-center justify-between mb-1">
                                <div className="font-medium !text-gray-900 text-sm">{device.model}</div>
                                <DeviceTierBadge 
                                  device={device} 
                                  sensorCount={deviceSensorCounts[device.device_id] || 0}
                                  size="sm"
                                />
                              </div>
                              <div className="text-xs !text-gray-600">{device.manufacturer}</div>
                              <div className="flex items-center justify-between text-xs !text-gray-400 mt-1">
                                <span>{new Date(device.created_at).toLocaleDateString('ko-KR')}</span>
                                <span className="!text-blue-600 font-medium">
                                  센서 {deviceSensorCounts[device.device_id] || 0}개
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {/* 삭제 버튼 */}
                          <div className="mt-3 flex justify-end">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteDevice(device)
                              }}
                              className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors flex items-center gap-1"
                              title={`${device.model} 삭제`}
                            >
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                              </svg>
                              삭제
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* 디바이스 상세 정보 */}
            {!compactMode && (
              <div className="lg:col-span-3">
                {selectedDevice ? (
                  <div className="space-y-6">
                    {/* 기본 정보 */}
                    <div className="bg-white rounded-lg shadow">
                      <div className="p-6 border-b">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold !text-gray-900">기본 정보</h3>
                          <DeviceTierBadge 
                            device={selectedDevice} 
                            sensorCount={deviceSensorCounts[selectedDevice.device_id] || 0}
                            showScore={true}
                            size="lg"
                          />
                        </div>
                      </div>
                      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InfoItem label="모델" value={selectedDevice.model} />
                        <InfoItem label="제조사" value={selectedDevice.manufacturer} />
                        <InfoItem label="브랜드" value={selectedDevice.brand} />
                        <InfoItem label="OS 버전" value={selectedDevice.android_version} />
                        <InfoItem label="SDK 버전" value={selectedDevice.sdk_version?.toString()} />
                        <InfoItem label="통신사" value={selectedDevice.carrier_name} />
                      </div>
                    </div>

                    {/* 하드웨어 정보 */}
                    <div className="bg-white rounded-lg shadow">
                      <div className="p-6 border-b">
                        <h3 className="text-lg font-semibold !text-gray-900">하드웨어 정보</h3>
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
                        <h3 className="text-lg font-semibold !text-gray-900">센서 정보 ({sensors.length}개)</h3>
                      </div>
                      <div className="p-6">
                        {sensors.length > 0 ? (
                          <div className="grid gap-4">
                            {sensors.map((sensor) => (
                              <div key={sensor.id} className="border border-gray-300 bg-white rounded-lg p-4 shadow-sm">
                                <h4 className="font-medium !text-gray-900 mb-2">{sensor.name}</h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm !text-gray-700">
                                  <div><span className="!text-gray-600 font-medium">Type:</span> {sensor.type_name}</div>
                                  <div><span className="!text-gray-600 font-medium">Vendor:</span> {sensor.vendor}</div>
                                  <div><span className="!text-gray-600 font-medium">Version:</span> {sensor.version}</div>
                                  <div><span className="!text-gray-600 font-medium">Max Range:</span> {sensor.maximum_range}</div>
                                  <div><span className="!text-gray-600 font-medium">Resolution:</span> {sensor.resolution}</div>
                                  <div><span className="!text-gray-600 font-medium">Power:</span> {sensor.power} mA</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="!text-gray-500 text-center py-8">센서 정보가 없습니다.</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg shadow h-96 flex items-center justify-center">
                    <p className="!text-gray-500 text-lg">디바이스를 선택해주세요</p>
                  </div>
                )}
              </div>
            )}

            {/* 컴팩트 모드: 선택된 디바이스 정보를 간결하게 표시 */}
            {compactMode && selectedDevice && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* 기본 + 하드웨어 정보 통합 */}
                <div className="bg-white rounded-lg shadow">
                  <div className="p-3 border-b bg-gray-50">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold !text-gray-900">
                        {selectedDevice.manufacturer} {selectedDevice.model}
                      </h3>
                      <DeviceTierBadge 
                        device={selectedDevice} 
                        sensorCount={deviceSensorCounts[selectedDevice.device_id] || 0}
                        size="sm"
                      />
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="!text-gray-500">Android:</span>
                        <span className="font-medium !text-gray-900">{selectedDevice.android_version}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="!text-gray-500">CPU:</span>
                        <span className="font-medium !text-gray-900">{selectedDevice.cpu_cores} cores</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="!text-gray-500">메모리:</span>
                        <span className="font-medium !text-gray-900">{selectedDevice.total_memory_gb}GB</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="!text-gray-500">저장공간:</span>
                        <span className="font-medium !text-gray-900">{selectedDevice.total_storage_gb}GB</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="!text-gray-500">브랜드:</span>
                        <span className="font-medium !text-gray-900">{selectedDevice.brand}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="!text-gray-500">통신사:</span>
                        <span className="font-medium !text-gray-900">{selectedDevice.carrier_name || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 센서 정보 테이블 */}
                <div className="bg-white rounded-lg shadow">
                  <div className="p-3 border-b bg-gray-50">
                    <h3 className="text-sm font-semibold !text-gray-900">센서 정보 ({sensors.length}개)</h3>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {sensors.length > 0 ? (
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-2 py-1 text-left font-medium !text-gray-500">이름</th>
                            <th className="px-2 py-1 text-left font-medium !text-gray-500">타입</th>
                            <th className="px-2 py-1 text-left font-medium !text-gray-500">전력</th>
                            <th className="px-2 py-1 text-left font-medium !text-gray-500">범위</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {sensors.map((sensor) => (
                            <tr key={sensor.id} className="hover:bg-gray-50">
                              <td className="px-2 py-1 font-medium !text-gray-900" title={sensor.name}>
                                {sensor.name.length > 20 ? `${sensor.name.substring(0, 20)}...` : sensor.name}
                              </td>
                              <td className="px-2 py-1 !text-gray-700" title={sensor.type_name}>
                                {sensor.type_name.length > 15 ? `${sensor.type_name.substring(0, 15)}...` : sensor.type_name}
                              </td>
                              <td className="px-2 py-1 !text-gray-700">{sensor.power} mA</td>
                              <td className="px-2 py-1 !text-gray-700">{sensor.maximum_range}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-4 text-center !text-gray-500 text-xs">
                        센서 정보가 없습니다.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'compare' && (
          <div className={compactMode ? "space-y-6" : "grid grid-cols-1 lg:grid-cols-4 gap-8"}>
            {/* 디바이스 선택 사이드바 */}
            <div className={compactMode ? "" : "lg:col-span-1"}>
              <div className="bg-white rounded-lg shadow">
                <div className="p-4 border-b">
                  <h3 className="text-lg font-semibold !text-gray-900">
                    디바이스 선택
                  </h3>
                  <p className="text-sm !text-gray-600 mt-1">
                    디바이스를 클릭하여 비교하세요 (최대 4개)
                  </p>
                </div>
                
                {compactMode ? (
                  /* 컴팩트 모드: 테이블 형태 */
                  <div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead className="bg-gray-50">
                          <tr className="text-xs">
                            <th className="px-3 py-2 text-left font-medium !text-gray-500">선택</th>
                            <th className="px-3 py-2 text-left font-medium !text-gray-500">모델</th>
                            <th className="px-3 py-2 text-left font-medium !text-gray-500">제조사</th>
                            <th className="px-3 py-2 text-left font-medium !text-gray-500">등급</th>
                            <th className="px-3 py-2 text-left font-medium !text-gray-500">센서</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {paginatedComparisonDevices.map((device) => (
                            <tr
                              key={device.id}
                              className={`hover:bg-gray-50 cursor-pointer text-xs ${
                                comparisonDevices.find(d => d.id === device.id) ? 'bg-blue-50' : ''
                              } ${
                                !comparisonDevices.find(d => d.id === device.id) && comparisonDevices.length >= 4 
                                  ? 'opacity-50 cursor-not-allowed' 
                                  : ''
                              }`}
                              onClick={() => {
                                if (!comparisonDevices.find(d => d.id === device.id) && comparisonDevices.length >= 4) {
                                  return;
                                }
                                toggleDeviceComparison(device)
                              }}
                            >
                              <td className="px-3 py-2">
                                <input
                                  type="checkbox"
                                  checked={!!comparisonDevices.find(d => d.id === device.id)}
                                  onChange={() => {}}
                                  className="rounded"
                                />
                              </td>
                              <td className="px-3 py-2 font-medium !text-gray-900">{device.model}</td>
                              <td className="px-3 py-2 !text-gray-700">{device.manufacturer}</td>
                              <td className="px-3 py-2">
                                <DeviceTierBadge 
                                  device={device} 
                                  sensorCount={deviceSensorCounts[device.device_id] || 0}
                                  size="sm"
                                />
                              </td>
                              <td className="px-3 py-2 !text-blue-600 font-medium">
                                {deviceSensorCounts[device.device_id] || 0}개
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* 비교 분석용 페이지네이션 */}
                    <div className="px-4 py-3 bg-white border-t border-gray-200">
                      <Pagination
                        currentPage={comparisonCurrentPage}
                        totalPages={comparisonTotalPages}
                        onPageChange={handleComparisonPageChange}
                      />
                    </div>
                  </div>
                ) : (
                  /* 일반 모드: 기존 카드 형태 */
                  <div className="max-h-[600px] overflow-y-auto">
                    {availableDevicesForComparison.map((device) => (
                      <div
                        key={device.id}
                        className={`p-3 border-b hover:bg-gray-50 transition-colors cursor-pointer ${
                          comparisonDevices.find(d => d.id === device.id) ? 'bg-blue-50 border-blue-200' : ''
                        } ${
                          !comparisonDevices.find(d => d.id === device.id) && comparisonDevices.length >= 4 
                            ? 'opacity-50 cursor-not-allowed' 
                            : ''
                        }`}
                        onClick={() => {
                          if (!comparisonDevices.find(d => d.id === device.id) && comparisonDevices.length >= 4) {
                            return;
                          }
                          toggleDeviceComparison(device)
                        }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="font-medium !text-gray-900 text-sm">{device.model}</div>
                          <div className="flex items-center gap-2">
                            <DeviceTierBadge 
                              device={device} 
                              sensorCount={deviceSensorCounts[device.device_id] || 0}
                              size="sm"
                            />
                            {comparisonDevices.find(d => d.id === device.id) && (
                              <span className="!text-blue-600 text-xs font-medium">✓ 선택됨</span>
                            )}
                          </div>
                        </div>
                        <div className="text-xs !text-gray-600">{device.manufacturer}</div>
                        <div className="flex items-center justify-between text-xs !text-gray-400 mt-1">
                          <span>{new Date(device.created_at).toLocaleDateString('ko-KR')}</span>
                          <span className="!text-blue-600 font-medium">
                            센서 {deviceSensorCounts[device.device_id] || 0}개
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 비교 결과 */}
            <div className={compactMode ? "" : "lg:col-span-3"}>
              <DeviceComparison
                selectedDevices={comparisonDevices}
                deviceSensors={comparisonSensors}
                onRemoveDevice={removeFromComparison}
                onClearAll={clearComparison}
                compactMode={compactMode}
              />
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <AnalyticsCharts devices={filteredDevices} />
        )}

        {activeTab === 'tiers' && (
          <TierAnalyticsChart 
            devices={filteredDevices} 
            deviceSensorCounts={deviceSensorCounts}
          />
        )}
      </main>

      {/* 삭제 확인 모달 */}
      {showDeleteConfirm && deviceToDelete && (
        <DeleteConfirmModal 
          device={deviceToDelete}
          onConfirm={executeDeleteDevice}
          onClose={() => {
            setShowDeleteConfirm(false)
            setDeviceToDelete(null)
          }}
        />
      )}

      {/* 알림 토스트 */}
      <NotificationToast notifications={notifications} />
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-sm font-medium !text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm !text-gray-900">{value || 'N/A'}</dd>
    </div>
  )
}

// 페이지네이션 컴포넌트
function Pagination({ currentPage, totalPages, onPageChange }: {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}) {
  if (totalPages <= 1) return null

  const pages = []
  const showPages = 5 // 보여줄 페이지 수
  let startPage = Math.max(1, currentPage - Math.floor(showPages / 2))
  const endPage = Math.min(totalPages, startPage + showPages - 1)

  if (endPage - startPage + 1 < showPages) {
    startPage = Math.max(1, endPage - showPages + 1)
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i)
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex-1 flex justify-between sm:hidden">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md !text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          이전
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md !text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          다음
        </button>
      </div>
      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
        <div>
          <p className="text-sm !text-gray-700">
            <span className="font-medium">{(currentPage - 1) * 10 + 1}</span>
            {' - '}
            <span className="font-medium">{Math.min(currentPage * 10, totalPages * 10)}</span>
            {' / '}
            <span className="font-medium">{totalPages * 10}</span>
            {' 결과'}
          </p>
        </div>
        <div>
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium !text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="sr-only">Previous</span>
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>
            
            {startPage > 1 && (
              <>
                <button
                  onClick={() => onPageChange(1)}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium !text-gray-700 hover:bg-gray-50"
                >
                  1
                </button>
                {startPage > 2 && (
                  <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium !text-gray-700">
                    ...
                  </span>
                )}
              </>
            )}
            
            {pages.map((page) => (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                  page === currentPage
                    ? 'z-10 bg-blue-50 border-blue-500 !text-blue-600'
                    : 'bg-white border-gray-300 !text-gray-700 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}
            
            {endPage < totalPages && (
              <>
                {endPage < totalPages - 1 && (
                  <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium !text-gray-700">
                    ...
                  </span>
                )}
                <button
                  onClick={() => onPageChange(totalPages)}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium !text-gray-700 hover:bg-gray-50"
                >
                  {totalPages}
                </button>
              </>
            )}
            
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium !text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="sr-only">Next</span>
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          </nav>
        </div>
      </div>
    </div>
  )
}

// 삭제 확인 모달 컴포넌트
function DeleteConfirmModal({ device, onConfirm, onClose }: {
  device: Device
  onConfirm: (device: Device) => void
  onClose: () => void
}) {
  const [confirmText, setConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  
  const expectedText = device.model || ''
  const isConfirmValid = confirmText === expectedText

  const handleConfirm = async () => {
    if (!isConfirmValid) return
    
    setIsDeleting(true)
    try {
      await onConfirm(device)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isConfirmValid && !isDeleting) {
      handleConfirm()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 !text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold !text-gray-900">디바이스 삭제</h3>
              <p className="text-sm !text-gray-600">이 작업은 되돌릴 수 없습니다.</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-4">
            <p className="text-sm !text-gray-600 mb-2">
              다음 디바이스와 관련된 모든 센서 데이터가 영구적으로 삭제됩니다:
            </p>
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="font-medium !text-gray-900">{device.model}</div>
              <div className="text-sm !text-gray-600">{device.manufacturer}</div>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium !text-gray-700 mb-2">
              삭제를 확인하려면 모델명을 정확히 입력하세요:
            </label>
            <div className="mb-2">
              <code className="px-2 py-1 bg-gray-100 !text-gray-800 text-sm rounded font-mono">
                {expectedText}
              </code>
            </div>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="모델명을 입력하세요"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 bg-white !text-gray-900 ${
                confirmText && !isConfirmValid 
                  ? 'border-red-300 focus:ring-red-500' 
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
              autoFocus
              disabled={isDeleting}
            />
            {confirmText && !isConfirmValid && (
              <p className="mt-1 text-sm !text-red-600">
                모델명이 일치하지 않습니다.
              </p>
            )}
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 !text-gray-600 hover:!text-gray-800 disabled:opacity-50"
              disabled={isDeleting}
            >
              취소
            </button>
            <button
              onClick={handleConfirm}
              disabled={!isConfirmValid || isDeleting}
              className="px-4 py-2 bg-red-500 !text-white rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isDeleting && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              <span>{isDeleting ? '삭제 중...' : '삭제하기'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// 알림 토스트 컴포넌트
function NotificationToast({ notifications }: { notifications: Notification[] }) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.slice(0, 3).map((notification) => (
        <div
          key={notification.id}
          className={`max-w-sm w-full shadow-lg rounded-lg pointer-events-auto overflow-hidden ${
            notification.type === 'error' ? 'bg-red-500' :
            notification.type === 'warning' ? 'bg-yellow-500' :
            notification.type === 'success' ? 'bg-green-500' : 'bg-blue-500'
          }`}
        >
          <div className="p-4">
            <div className="flex items-start">
              <div className="ml-3 w-0 flex-1 pt-0.5">
                <p className="text-sm font-medium !text-white">{notification.title}</p>
                <p className="mt-1 text-sm !text-white opacity-90">{notification.message}</p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}