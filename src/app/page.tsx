'use client'

import { useEffect, useState } from 'react'
import { supabase, Device, Sensor } from '../lib/supabase'

export default function Dashboard() {
  const [devices, setDevices] = useState<Device[]>([])
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [sensors, setSensors] = useState<Sensor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchDevices()
    
    // 실시간 업데이트 구독
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

  const handleDeviceSelect = (device: Device) => {
    setSelectedDevice(device)
    fetchSensors(device.device_id)
  }

  const filteredDevices = devices.filter(device =>
    device.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    device.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    device.brand?.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
          <h1 className="text-3xl font-bold text-gray-900">Device Information Dashboard</h1>
          <p className="text-gray-600 mt-1">총 {devices.length}개의 디바이스가 등록되었습니다</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 디바이스 목록 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold text-gray-900">디바이스 목록</h2>
                <div className="mt-4">
                  <input
                    type="text"
                    placeholder="디바이스 검색..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {filteredDevices.map((device) => (
                  <div
                    key={device.id}
                    className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedDevice?.id === device.id ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                    onClick={() => handleDeviceSelect(device)}
                  >
                    <div className="font-medium text-gray-900">{device.model}</div>
                    <div className="text-sm text-gray-600">{device.manufacturer}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(device.created_at).toLocaleDateString('ko-KR')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 디바이스 상세 정보 */}
          <div className="lg:col-span-2">
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
                    <InfoItem 
                      label="총 메모리" 
                      value={`${selectedDevice.total_memory_gb} GB`} 
                    />
                    <InfoItem 
                      label="사용 가능 메모리" 
                      value={`${selectedDevice.available_memory_gb} GB`} 
                    />
                    <InfoItem 
                      label="총 저장공간" 
                      value={`${selectedDevice.total_storage_gb} GB`} 
                    />
                    <InfoItem 
                      label="사용 가능 저장공간" 
                      value={`${selectedDevice.available_storage_gb} GB`} 
                    />
                  </div>
                </div>

                {/* 센서 정보 */}
                <div className="bg-white rounded-lg shadow">
                  <div className="p-6 border-b">
                    <h3 className="text-lg font-semibold text-gray-900">
                      센서 정보 ({sensors.length}개)
                    </h3>
                  </div>
                  <div className="p-6">
                    {sensors.length > 0 ? (
                      <div className="grid gap-4">
                        {sensors.map((sensor) => (
                          <div key={sensor.id} className="border rounded-lg p-4">
                            <h4 className="font-medium text-gray-900 mb-2">{sensor.name}</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                              <div>
                                <span className="text-gray-500">Type:</span> {sensor.type_name}
                              </div>
                              <div>
                                <span className="text-gray-500">Vendor:</span> {sensor.vendor}
                              </div>
                              <div>
                                <span className="text-gray-500">Version:</span> {sensor.version}
                              </div>
                              <div>
                                <span className="text-gray-500">Max Range:</span> {sensor.maximum_range}
                              </div>
                              <div>
                                <span className="text-gray-500">Resolution:</span> {sensor.resolution}
                              </div>
                              <div>
                                <span className="text-gray-500">Power:</span> {sensor.power} mA
                              </div>
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