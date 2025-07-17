// components/AdvancedFiltersWithTier.tsx
'use client'

import { useState } from 'react'
import { DeviceTier, TIER_CONFIG } from '../utils/deviceTierSystem'

interface FilterOptions {
  searchTerm: string
  manufacturers: string[]
  androidVersions: string[]
  tiers: DeviceTier[]
  sortBy: 'created_at' | 'model' | 'sensor_count' | 'tier_score'
  sortOrder: 'asc' | 'desc'
}

interface Props {
  onFilterChange: (filters: FilterOptions) => void
  availableManufacturers: string[]
  availableAndroidVersions: string[]
}

export default function AdvancedFiltersWithTier({ 
  onFilterChange, 
  availableManufacturers, 
  availableAndroidVersions 
}: Props) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [filters, setFilters] = useState<FilterOptions>({
    searchTerm: '',
    manufacturers: [],
    androidVersions: [],
    tiers: [],
    sortBy: 'tier_score',
    sortOrder: 'desc'
  })

  const updateFilter = <K extends keyof FilterOptions>(key: K, value: FilterOptions[K]) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const resetFilters = () => {
    const defaultFilters: FilterOptions = {
      searchTerm: '',
      manufacturers: [],
      androidVersions: [],
      tiers: [],
      sortBy: 'tier_score',
      sortOrder: 'desc'
    }
    setFilters(defaultFilters)
    onFilterChange(defaultFilters)
  }

  const toggleTier = (tier: DeviceTier) => {
    const newTiers = filters.tiers.includes(tier)
      ? filters.tiers.filter(t => t !== tier)
      : [...filters.tiers, tier]
    updateFilter('tiers', newTiers)
  }

  return (
    <div className="bg-white rounded-lg shadow mb-6">
      <div className="p-4 border-b">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold !text-gray-900">고급 필터</h3>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="!text-gray-600 hover:!text-gray-800"
          >
            {isExpanded ? '접기' : '펼치기'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* 검색 */}
          <div>
            <label className="block text-sm font-medium !text-gray-700 mb-2">검색</label>
            <input
              type="text"
              value={filters.searchTerm}
              onChange={(e) => updateFilter('searchTerm', e.target.value)}
              placeholder="모델명, 제조사, 브랜드..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 !text-gray-800 placeholder-gray-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 제조사 필터 */}
            <div>
              <label className="block text-sm font-medium !text-gray-700 mb-2">제조사</label>
              <select
                multiple
                value={filters.manufacturers}
                onChange={(e) => updateFilter('manufacturers', Array.from(e.target.selectedOptions, option => option.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 !text-gray-800"
                size={4}
              >
                {availableManufacturers.map(manufacturer => (
                  <option key={manufacturer} value={manufacturer}>{manufacturer}</option>
                ))}
              </select>
            </div>

            {/* Android 버전 필터 */}
            <div>
              <label className="block text-sm font-medium !text-gray-700 mb-2">Android 버전</label>
              <select
                multiple
                value={filters.androidVersions}
                onChange={(e) => updateFilter('androidVersions', Array.from(e.target.selectedOptions, option => option.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 !text-gray-800"
                size={4}
              >
                {availableAndroidVersions.map(version => (
                  <option key={version} value={version}>Android {version}</option>
                ))}
              </select>
            </div>

            {/* 등급 필터 */}
            <div>
              <label className="block text-sm font-medium !text-gray-700 mb-2">등급</label>
              <div className="space-y-2">
                {Object.entries(TIER_CONFIG).map(([tier, config]) => (
                  <label key={tier} className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.tiers.includes(tier as DeviceTier)}
                      onChange={() => toggleTier(tier as DeviceTier)}
                      className="mr-2 rounded"
                    />
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${config.bgColor} ${config.color}`}>
                      {config.icon} {config.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* 정렬 */}
            <div>
              <label className="block text-sm font-medium !text-gray-700 mb-2">정렬</label>
              <select
                value={filters.sortBy}
                onChange={(e) => updateFilter('sortBy', e.target.value as FilterOptions['sortBy'])}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2 !text-gray-800"
              >
                <option value="tier_score">등급 점수</option>
                <option value="sensor_count">센서 갯수</option>
                <option value="model">모델명</option>
                <option value="created_at">등록일</option>
              </select>
              <select
                value={filters.sortOrder}
                onChange={(e) => updateFilter('sortOrder', e.target.value as FilterOptions['sortOrder'])}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 !text-gray-800"
              >
                <option value="desc">내림차순</option>
                <option value="asc">오름차순</option>
              </select>
            </div>
          </div>

          {/* 리셋 버튼 */}
          <div className="flex justify-end">
            <button
              onClick={resetFilters}
              className="px-4 py-2 bg-gray-200 !text-gray-700 rounded-md hover:bg-gray-300"
            >
              필터 초기화
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export type { FilterOptions }