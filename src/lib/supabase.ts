// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 런타임에서 환경변수 검증 (개발 중 디버깅용)
if (typeof window !== 'undefined') {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase environment variables are missing!')
    console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl)
    console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set' : 'Missing')
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Device = {
  id: number
  device_id: string
  model: string
  manufacturer: string
  brand: string
  android_version: string
  sdk_version: number
  carrier_name: string
  operator_name: string
  cpu_abis: string[]
  cpu_cores: number
  total_memory_gb: number
  available_memory_gb: number
  total_storage_gb: number
  available_storage_gb: number
  created_at: string
  updated_at: string
}

export type Sensor = {
  id: number
  device_id: string
  name: string
  type: number
  type_name: string
  vendor: string
  version: number
  maximum_range: number
  resolution: number
  power: number
  min_delay: number
  max_delay: number
  created_at: string
}