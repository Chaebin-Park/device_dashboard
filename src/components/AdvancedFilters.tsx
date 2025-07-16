// components/AdvancedFilters.tsx
'use client'

import { useState } from 'react'

interface FilterOptions {
  searchTerm: string
  manufacturers: string[]
  androidVersions: string[]
  memoryRange: [number, number]
  storageRange: [number, number]
  cpuCores: number[]
  sortBy: 'created_at' | 'model' | 'memory' | 'storage'
  sortOrder: 'asc' | 'desc'
}

interface Props {
  onFilterChange: (filters: FilterOptions) => void
  availableManufacturers: string[]
  availableAndroidVersions: string[]
}

export default function AdvancedFilters({ 
  onFilterChange, 
  availableManufacturers, 
  availableAndroidVersions 
}: Props) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [filters, setFilters] = useState<FilterOptions>({
    searchTerm: '',
    manufacturers: [],
    androidVersions: [],
    memoryRange: [0, 32],
    storageRange: [0, 1000],
    cpuCores: [],
    sortBy: 'created_at',
    sortOrder: 'desc'
  })

  const updateFilter = (key: keyof FilterOptions, value: FilterOptions[keyof FilterOptions]) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const resetFilters = () => {
    const defaultFilters: FilterOptions = {
      searchTerm: '',
      manufacturers: [],
      androidVersions: [],
      memoryRange: [0, 32],
      storageRange: [0, 1000],
      cpuCores: [],
      sortBy: 'created_at',
      sortOrder: 'desc'
    }
    setFilters(defaultFilters)
    onFilterChange(defaultFilters)
  }

  return (
    <div className="bg-white rounded-lg shadow mb-6">
      <div className="p-4 border-b">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">고급 필터</h3>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-blue-600 hover:text-blue-800"
          >
            {isExpanded ? '접기' : '펼치기'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* 검색 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">검색</label>
            <input
              type="text"
              value={filters.searchTerm}
              onChange={(e) => updateFilter('searchTerm', e.target.value)}
              placeholder="모델명, 제조사, 브랜드..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 제조사 필터 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">제조사</label>
              <select
                multiple
                value={filters.manufacturers}
                onChange={(e) => updateFilter('manufacturers', Array.from(e.target.selectedOptions, option => option.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                size={4}
              >
                {availableManufacturers.map(manufacturer => (
                  <option key={manufacturer} value={manufacturer}>{manufacturer}</option>
                ))}
              </select>
            </div>

            {/* Android 버전 필터 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Android 버전</label>
              <select
                multiple
                value={filters.androidVersions}
                onChange={(e) => updateFilter('androidVersions', Array.from(e.target.selectedOptions, option => option.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                size={4}
              >
                {availableAndroidVersions.map(version => (
                  <option key={version} value={version}>Android {version}</option>
                ))}
              </select>
            </div>

            {/* 정렬 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">정렬</label>
              <select
                value={filters.sortBy}
                onChange={(e) => updateFilter('sortBy', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
              >
                <option value="created_at">등록일</option>
                <option value="model">모델명</option>
                <option value="memory">메모리</option>
                <option value="storage">저장공간</option>
              </select>
              <select
                value={filters.sortOrder}
                onChange={(e) => updateFilter('sortOrder', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="desc">내림차순</option>
                <option value="asc">오름차순</option>
              </select>
            </div>
          </div>

          {/* 메모리 범위 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              메모리 범위: {filters.memoryRange[0]}GB - {filters.memoryRange[1]}GB
            </label>
            <input
              type="range"
              min={0}
              max={32}
              step={1}
              value={filters.memoryRange[1]}
              onChange={(e) => updateFilter('memoryRange', [filters.memoryRange[0], parseInt(e.target.value)])}
              className="w-full"
            />
          </div>

          {/* 저장공간 범위 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              저장공간 범위: {filters.storageRange[0]}GB - {filters.storageRange[1]}GB
            </label>
            <input
              type="range"
              min={0}
              max={1000}
              step={16}
              value={filters.storageRange[1]}
              onChange={(e) => updateFilter('storageRange', [filters.storageRange[0], parseInt(e.target.value)])}
              className="w-full"
            />
          </div>

          {/* 리셋 버튼 */}
          <div className="flex justify-end">
            <button
              onClick={resetFilters}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
            >
              필터 초기화
            </button>
          </div>
        </div>
      )}
    </div>
  )
}