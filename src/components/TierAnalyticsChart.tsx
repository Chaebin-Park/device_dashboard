'use client'

import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts'
import { Device } from '../lib/supabase'
import { calculateTierStats, TIER_CONFIG, getDeviceTierInfo } from '../utils/deviceTierSystem'
import { TierComparisonCard } from './DeviceTierBadge'

interface Props {
  devices: Device[]
  deviceSensorCounts: Record<string, number>
}

const TIER_COLORS = {
  flagship: '#F59E0B',   // 황금색
  premium: '#8B5CF6',    // 보라색  
  'mid-range': '#3B82F6', // 파란색
  entry: '#6B7280'       // 회색
}

export default function TierAnalyticsChart({ devices, deviceSensorCounts }: Props) {
  const tierStats = calculateTierStats(devices, deviceSensorCounts)
  
  // 등급별 분포 데이터
  const tierDistributionData = Object.entries(tierStats).map(([tier, stats]) => ({
    tier: TIER_CONFIG[tier as keyof typeof TIER_CONFIG].label,
    count: stats.count,
    icon: TIER_CONFIG[tier as keyof typeof TIER_CONFIG].icon,
    color: TIER_COLORS[tier as keyof typeof TIER_COLORS]
  })).filter(item => item.count > 0)
  
  // 등급별 평균 성능 비교 데이터
  const performanceComparisonData = Object.entries(tierStats)
    .filter(([, stats]) => stats.count > 0)
    .map(([tier, stats]) => ({
      tier: TIER_CONFIG[tier as keyof typeof TIER_CONFIG].label,
      memory: Math.round(stats.avgMemory * 10) / 10,
      storage: Math.round(stats.avgStorage),
      sensors: Math.round(stats.avgSensors * 10) / 10,
      icon: TIER_CONFIG[tier as keyof typeof TIER_CONFIG].icon
    }))
  
  // 레이더 차트용 데이터 (정규화)
  const radarData = performanceComparisonData.map(item => ({
    tier: item.tier,
    메모리: Math.min((item.memory / 12) * 100, 100), // 12GB 기준으로 정규화
    저장공간: Math.min((item.storage / 256) * 100, 100), // 256GB 기준으로 정규화  
    센서: Math.min((item.sensors / 50) * 100, 100) // 50개 기준으로 정규화
  }))
  
  // 대표 기기들 (각 등급별 점수가 높은 기기)
  const representativeDevices = Object.entries(tierStats)
    .filter(([, stats]) => stats.count > 0)
    .map(([tier, stats]) => {
      const topDevice = stats.devices
        .map(device => ({
          device,
          tierInfo: getDeviceTierInfo(device, deviceSensorCounts[device.device_id] || 0)
        }))
        .sort((a, b) => b.tierInfo.score - a.tierInfo.score)[0]
      
      return {
        tier: tier as keyof typeof TIER_CONFIG,
        device: topDevice?.device,
        tierInfo: topDevice?.tierInfo
      }
    })
    .filter(item => item.device && item.tierInfo)

  return (
    <div className="space-y-8">
      {/* 등급별 분포 */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b bg-white sticky top-0 z-10 rounded-t-lg shadow-sm">
          <h3 className="text-lg font-semibold !text-gray-900">등급별 분포</h3>
        </div>
        <div className="p-6 max-h-80 overflow-auto">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={tierDistributionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="tier"
                tick={{ fontSize: 12 }}
              />
              <YAxis />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #ccc', 
                  borderRadius: '4px',
                  color: '#374151'
                }}
                formatter={(value) => [value, '디바이스 수']}
              />
              <Bar dataKey="count">
                {tierDistributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 등급별 성능 비교 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b bg-white sticky top-0 z-10 rounded-t-lg shadow-sm">
            <h3 className="text-lg font-semibold !text-gray-900">등급별 평균 성능</h3>
          </div>
          <div className="p-6 max-h-80 overflow-auto">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={performanceComparisonData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="tier" />
                <YAxis />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #ccc', 
                    borderRadius: '4px',
                    color: '#374151'
                  }}
                />
                <Bar dataKey="memory" fill="#3B82F6" name="메모리(GB)" />
                <Bar dataKey="sensors" fill="#10B981" name="센서 개수" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b bg-white sticky top-0 z-10 rounded-t-lg shadow-sm">
            <h3 className="text-lg font-semibold !text-gray-900">등급별 성능 레이더</h3>
          </div>
          <div className="p-6 max-h-80 overflow-auto">
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="tier" />
                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                <Radar
                  name="메모리"
                  dataKey="메모리"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.1}
                />
                <Radar
                  name="저장공간"
                  dataKey="저장공간"
                  stroke="#10B981"
                  fill="#10B981"
                  fillOpacity={0.1}
                />
                <Radar
                  name="센서"
                  dataKey="센서"
                  stroke="#F59E0B"
                  fill="#F59E0B"
                  fillOpacity={0.1}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #ccc', 
                    borderRadius: '4px',
                    color: '#374151'
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 등급별 대표 기기 */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b bg-white sticky top-0 z-10 rounded-t-lg shadow-sm">
          <h3 className="text-lg font-semibold !text-gray-900">등급별 대표 기기</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {representativeDevices.map(({ tier, device, tierInfo }) => (
              <div key={tier} className="space-y-3">
                <TierComparisonCard tierInfo={tierInfo!} />
                <div className="text-center">
                  <div className="font-medium !text-gray-900">{device!.model}</div>
                  <div className="text-sm !text-gray-600">{device!.manufacturer}</div>
                  <div className="text-xs !text-gray-500 mt-1">
                    {device!.total_memory_gb}GB • {deviceSensorCounts[device!.device_id] || 0}개 센서
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}