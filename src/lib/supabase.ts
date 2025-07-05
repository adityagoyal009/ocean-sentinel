import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our database
export interface PlasticDetection {
  id: string
  location: {
    lat: number
    lng: number
  }
  severity: 'low' | 'medium' | 'high'
  confidence: number
  image_url?: string
  thumbnail_url?: string
  detected_by?: string
  verified: boolean
  created_at: string
}

export interface CommunityReport {
  id: string
  location: {
    lat: number
    lng: number
  }
  image_url: string
  description?: string
  reporter_id?: string
  verified: boolean
  created_at: string
}
