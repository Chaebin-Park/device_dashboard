// components/DeviceTierBadge.tsx
'use client'

import { Device } from '../lib/supabase'
import { getDeviceTierInfo, DeviceTierInfo } from '../utils/deviceTierSystem'

interface Props {
  device: Device
  sensorCount: number
  showScore?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export default function DeviceTierBadge({ device, sensorCount, showScore = false, size = 'md' }: Props) {
  const tierInfo = getDeviceTierInfo(device, sensorCount)
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm', 
    lg: 'px-4 py-2 text-base'
  }
  
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-flex items-center gap-1 rounded-full font-medium ${tierInfo.bgColor} ${tierInfo.color} ${sizeClasses[size]}`}>
        <span>{tierInfo.icon}</span>
        <span>{tierInfo.label}</span>
      </span>
      {showScore && (
        <span className="text-xs !text-gray-500 font-mono">
          {tierInfo.score}점
        </span>
      )}
    </div>
  )
}

// 등급별 성능 비교 컴포넌트
export function TierComparisonCard({ tierInfo }: { tierInfo: DeviceTierInfo }) {
  const getPerformanceLevel = (score: number) => {
    if (score >= 85) return { level: '최고급', bars: 5, color: 'bg-yellow-500' }
    if (score >= 70) return { level: '고급', bars: 4, color: 'bg-purple-500' }
    if (score >= 50) return { level: '중급', bars: 3, color: 'bg-blue-500' }
    return { level: '기본', bars: 2, color: 'bg-gray-500' }
  }
  
  const performance = getPerformanceLevel(tierInfo.score)
  
  return (
    <div className={`p-4 rounded-lg ${tierInfo.bgColor} border`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{tierInfo.icon}</span>
          <div>
            <h3 className={`font-bold ${tierInfo.color}`}>{tierInfo.label}</h3>
            <p className="text-xs !text-gray-600">{performance.level} 성능</p>
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-lg !text-gray-500 font-bold">{tierInfo.score}</div>
          <div className="text-xs !text-gray-500">종합 점수</div>
        </div>
      </div>
      
      {/* 성능 바 */}
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={`h-2 flex-1 rounded ${
              i < performance.bars ? performance.color : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
      
      {/* 등급 설명 */}
      <div className="mt-3 text-xs !text-gray-600">
        {tierInfo.tier === 'flagship' && '최신 기술과 최고 성능을 자랑하는 프리미엄 기기'}
        {tierInfo.tier === 'premium' && '높은 성능과 다양한 기능을 제공하는 고급 기기'}
        {tierInfo.tier === 'mid-range' && '성능과 가격의 균형이 잘 맞는 합리적인 선택'}
        {tierInfo.tier === 'entry' && '기본적인 기능에 충실한 입문용 기기'}
      </div>
    </div>
  )
}