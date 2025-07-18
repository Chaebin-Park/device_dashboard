'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

// 동적 렌더링 강제 (빌드 시 prerendering 방지)
export const dynamic = 'force-dynamic'

interface StatsData {
  totalDevices: number
  androidVersions: { version: string; count: number }[]
  manufacturers: { name: string; count: number }[]
  avgMemory: number
  avgStorage: number
  topSensors: { name: string; count: number }[]
}

export default function StatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      // 총 디바이스 수
      const { count: totalDevices } = await supabase
        .from('devices')
        .select('*', { count: 'exact', head: true })

      // Android 버전별 통계
      const { data: androidData } = await supabase
        .from('devices')
        .select('android_version')
        .not('android_version', 'is', null)

      const androidVersions = androidData
        ?.reduce((acc, curr) => {
          const version = curr.android_version
          acc[version] = (acc[version] || 0) + 1
          return acc
        }, {} as Record<string, number>)

      // 제조사별 통계
      const { data: manufacturerData } = await supabase
        .from('devices')
        .select('manufacturer')
        .not('manufacturer', 'is', null)

      const manufacturers = manufacturerData
        ?.reduce((acc, curr) => {
          const manufacturer = curr.manufacturer
          acc[manufacturer] = (acc[manufacturer] || 0) + 1
          return acc
        }, {} as Record<string, number>)

      // 평균 메모리 및 저장공간
      const { data: hardwareData } = await supabase
        .from('devices')
        .select('total_memory_gb, total_storage_gb')
        .not('total_memory_gb', 'is', null)
        .not('total_storage_gb', 'is', null)

      const avgMemory = hardwareData && hardwareData.length > 0 
        ? hardwareData.reduce((sum, curr) => sum + curr.total_memory_gb, 0) / hardwareData.length 
        : 0
      const avgStorage = hardwareData && hardwareData.length > 0 
        ? hardwareData.reduce((sum, curr) => sum + curr.total_storage_gb, 0) / hardwareData.length 
        : 0

      // 센서 통계
      const { data: sensorData } = await supabase
        .from('sensors')
        .select('name')

      const sensors = sensorData
        ?.reduce((acc, curr) => {
          const name = curr.name
          acc[name] = (acc[name] || 0) + 1
          return acc
        }, {} as Record<string, number>)

      setStats({
        totalDevices: totalDevices || 0,
        androidVersions: Object.entries(androidVersions || {})
          .map(([version, count]) => ({ version, count }))
          .sort((a, b) => b.count - a.count),
        manufacturers: Object.entries(manufacturers || {})
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count),
        avgMemory: avgMemory || 0,
        avgStorage: avgStorage || 0,
        topSensors: Object.entries(sensors || {})
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="!text-gray-500">통계 데이터를 불러올 수 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-3xl font-bold !text-gray-900">통계</h1>
          <p className="!text-gray-600 mt-1">디바이스 및 센서 통계 정보</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 요약 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="총 디바이스"
            value={stats.totalDevices.toString()}
            icon="📱"
          />
          <StatsCard
            title="평균 메모리"
            value={`${stats.avgMemory.toFixed(1)} GB`}
            icon="💾"
          />
          <StatsCard
            title="평균 저장공간"
            value={`${stats.avgStorage.toFixed(1)} GB`}
            icon="💿"
          />
          <StatsCard
            title="센서 종류"
            value={stats.topSensors.length.toString()}
            icon="🔍"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Android 버전 통계 */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold !text-gray-900">Android 버전별 분포</h3>
            </div>
            <div className="p-6">
              {stats.androidVersions.map((item) => (
                <div key={item.version} className="flex items-center justify-between py-2">
                  <span className="!text-gray-700">Android {item.version}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{
                          width: `${(item.count / stats.totalDevices) * 100}%`
                        }}
                      ></div>
                    </div>
                    <span className="text-sm !text-gray-500 w-8">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 제조사 통계 */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold !text-gray-900">제조사별 분포</h3>
            </div>
            <div className="p-6">
              {stats.manufacturers.map((item) => (
                <div key={item.name} className="flex items-center justify-between py-2">
                  <span className="!text-gray-700">{item.name}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{
                          width: `${(item.count / stats.totalDevices) * 100}%`
                        }}
                      ></div>
                    </div>
                    <span className="text-sm !text-gray-500 w-8">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 센서 통계 */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold !text-gray-900">주요 센서 TOP 10</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stats.topSensors.map((sensor, index) => (
                  <div key={sensor.name} className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 !text-blue-800 text-sm font-medium">
                        {index + 1}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium !text-gray-900 truncate">
                        {sensor.name}
                      </p>
                      <p className="text-sm !text-gray-500">
                        {sensor.count}개 디바이스
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function StatsCard({ title, value, icon }: { title: string; value: string; icon: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className="text-2xl mr-3">{icon}</div>
        <div>
          <p className="text-sm font-medium !text-gray-600">{title}</p>
          <p className="text-2xl font-bold !text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  )
}
