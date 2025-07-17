// utils/deviceTierSystem.ts
import { Device } from '../lib/supabase'

export type DeviceTier = 'flagship' | 'premium' | 'mid-range' | 'entry'

export interface DeviceTierInfo {
  tier: DeviceTier
  score: number
  label: string
  color: string
  bgColor: string
  icon: string
}

export const TIER_CONFIG: Record<DeviceTier, Omit<DeviceTierInfo, 'score'>> = {
  flagship: {
    tier: 'flagship',
    label: '플래그십',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    icon: '👑'
  },
  premium: {
    tier: 'premium', 
    label: '프리미엄',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
    icon: '💎'
  },
  'mid-range': {
    tier: 'mid-range',
    label: '가성비',
    color: 'text-blue-700', 
    bgColor: 'bg-blue-100',
    icon: '⭐'
  },
  entry: {
    tier: 'entry',
    label: '엔트리',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100', 
    icon: '📱'
  }
}

export function calculateDeviceScore(device: Device, sensorCount: number): number {
  let score = 0
  
  // 메모리 점수 (40점 만점)
  const memory = device.total_memory_gb || 0
  if (memory >= 16) score += 40
  else if (memory >= 12) score += 35
  else if (memory >= 8) score += 25
  else if (memory >= 6) score += 15
  else if (memory >= 4) score += 10
  else score += 5
  
  // 저장공간 점수 (30점 만점)
  const storage = device.total_storage_gb || 0
  if (storage >= 512) score += 30
  else if (storage >= 256) score += 25
  else if (storage >= 128) score += 20
  else if (storage >= 64) score += 15
  else if (storage >= 32) score += 10
  else score += 5
  
  // 센서 개수 점수 (20점 만점)
  if (sensorCount >= 25) score += 20
  else if (sensorCount >= 20) score += 17
  else if (sensorCount >= 15) score += 14
  else if (sensorCount >= 10) score += 10
  else if (sensorCount >= 5) score += 6
  else score += 3
  
  // Android 버전 점수 (10점 만점)
  const androidVersion = parseFloat(device.android_version || '0')
  if (androidVersion >= 14) score += 10
  else if (androidVersion >= 13) score += 8
  else if (androidVersion >= 12) score += 6
  else if (androidVersion >= 11) score += 4
  else score += 2
  
  return Math.min(score, 100) // 최대 100점
}

export function getDeviceTier(score: number): DeviceTier {
  if (score >= 85) return 'flagship'      // 85-100: 플래그십
  else if (score >= 70) return 'premium'  // 70-84: 프리미엄  
  else if (score >= 50) return 'mid-range' // 50-69: 가성비
  else return 'entry'                     // 0-49: 엔트리
}

export function getDeviceTierInfo(device: Device, sensorCount: number): DeviceTierInfo {
  const score = calculateDeviceScore(device, sensorCount)
  const tier = getDeviceTier(score)
  
  return {
    ...TIER_CONFIG[tier],
    score
  }
}

// 등급별 통계 계산
export function calculateTierStats(devices: Device[], sensorCounts: Record<string, number>) {
  const tierStats = {
    flagship: { count: 0, avgMemory: 0, avgStorage: 0, avgSensors: 0, devices: [] as Device[] },
    premium: { count: 0, avgMemory: 0, avgStorage: 0, avgSensors: 0, devices: [] as Device[] },
    'mid-range': { count: 0, avgMemory: 0, avgStorage: 0, avgSensors: 0, devices: [] as Device[] },
    entry: { count: 0, avgMemory: 0, avgStorage: 0, avgSensors: 0, devices: [] as Device[] }
  }
  
  devices.forEach(device => {
    const sensorCount = sensorCounts[device.device_id] || 0
    const tierInfo = getDeviceTierInfo(device, sensorCount)
    const tier = tierInfo.tier
    
    tierStats[tier].count++
    tierStats[tier].devices.push(device)
  })
  
  // 평균값 계산
  Object.keys(tierStats).forEach(tierKey => {
    const tier = tierKey as DeviceTier
    const stats = tierStats[tier]
    
    if (stats.count > 0) {
      stats.avgMemory = stats.devices.reduce((sum, d) => sum + (d.total_memory_gb || 0), 0) / stats.count
      stats.avgStorage = stats.devices.reduce((sum, d) => sum + (d.total_storage_gb || 0), 0) / stats.count
      stats.avgSensors = stats.devices.reduce((sum, d) => sum + (sensorCounts[d.device_id] || 0), 0) / stats.count
    }
  })
  
  return tierStats
}