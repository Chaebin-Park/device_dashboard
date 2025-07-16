// components/DataExport.tsx
'use client'

import { Device } from '../lib/supabase'

interface Props {
  devices: Device[]
  filteredDevices: Device[]
}

export default function DataExport({ devices, filteredDevices }: Props) {
  const exportToCSV = (data: Device[], filename: string) => {
    const headers = [
      'ID', '디바이스 ID', '모델', '제조사', '브랜드', 
      'Android 버전', 'SDK 버전', '통신사', 'CPU ABI', 
      'CPU 코어', '총 메모리(GB)', '사용가능 메모리(GB)', 
      '총 저장공간(GB)', '사용가능 저장공간(GB)', '등록일'
    ]
    
    const csvData = [
      headers.join(','),
      ...data.map(device => [
        device.id,
        device.device_id,
        device.model,
        device.manufacturer,
        device.brand,
        device.android_version,
        device.sdk_version,
        device.carrier_name,
        device.cpu_abis?.join(';'),
        device.cpu_cores,
        device.total_memory_gb,
        device.available_memory_gb,
        device.total_storage_gb,
        device.available_storage_gb,
        new Date(device.created_at).toLocaleDateString('ko-KR')
      ].map(field => `"${field || ''}"`).join(','))
    ].join('\n')

    downloadFile(csvData, `${filename}.csv`, 'text/csv')
  }

  const exportToJSON = (data: Device[], filename: string) => {
    const jsonData = JSON.stringify(data, null, 2)
    downloadFile(jsonData, `${filename}.json`, 'application/json')
  }

  const downloadFile = (content: string, filename: string, contentType: string) => {
    const blob = new Blob([content], { type: contentType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const generateReport = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalDevices: devices.length,
        filteredDevices: filteredDevices.length,
        uniqueManufacturers: [...new Set(devices.map(d => d.manufacturer))].length,
        uniqueAndroidVersions: [...new Set(devices.map(d => d.android_version))].length,
        averageMemory: devices.reduce((sum, d) => sum + (d.total_memory_gb || 0), 0) / devices.length,
        averageStorage: devices.reduce((sum, d) => sum + (d.total_storage_gb || 0), 0) / devices.length
      },
      androidVersionDistribution: devices.reduce((acc, device) => {
        const version = device.android_version
        if (version) {
          acc[version] = (acc[version] || 0) + 1
        }
        return acc
      }, {} as Record<string, number>),
      manufacturerDistribution: devices.reduce((acc, device) => {
        const manufacturer = device.manufacturer
        if (manufacturer) {
          acc[manufacturer] = (acc[manufacturer] || 0) + 1
        }
        return acc
      }, {} as Record<string, number>),
      devices: filteredDevices
    }
    
    downloadFile(JSON.stringify(report, null, 2), 'device_report.json', 'application/json')
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">데이터 내보내기</h3>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">
            필터링된 데이터: {filteredDevices.length}개
          </span>
          <div className="space-x-2">
            <button
              onClick={() => exportToCSV(filteredDevices, 'filtered_devices')}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
            >
              CSV 내보내기
            </button>
            <button
              onClick={() => exportToJSON(filteredDevices, 'filtered_devices')}
              className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
            >
              JSON 내보내기
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">
            전체 데이터: {devices.length}개
          </span>
          <div className="space-x-2">
            <button
              onClick={() => exportToCSV(devices, 'all_devices')}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
            >
              CSV 내보내기
            </button>
            <button
              onClick={() => exportToJSON(devices, 'all_devices')}
              className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
            >
              JSON 내보내기
            </button>
          </div>
        </div>

        <div className="border-t pt-3">
          <button
            onClick={generateReport}
            className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            📊 종합 분석 보고서 생성
          </button>
        </div>
      </div>
    </div>
  )
}