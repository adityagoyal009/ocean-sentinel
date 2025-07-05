'use client'

import { useEffect, useState } from 'react'
import L from 'leaflet'
import { MapContainer, TileLayer, Circle, Popup } from 'react-leaflet'
import { supabase } from '../../lib/supabase'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
})

interface Detection {
  id: string
  location: any
  severity: string
  confidence: number
  image_url: string | null
  created_at: string
}

export default function PlasticMap() {
  const [detections, setDetections] = useState<Detection[]>([])
  const [loading, setLoading] = useState(true)
  const [mapKey, setMapKey] = useState(0)

  useEffect(() => {
    // Load immediately
    loadDetections()
    
    // Reload every 2 seconds
    const interval = setInterval(() => {
      loadDetections()
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  const loadDetections = async () => {
    try {
      // Add timestamp to prevent caching
      const { data, error } = await supabase
        .from('plastic_detections')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours only

      if (error) {
        console.error('Supabase error:', error)
        return
      }

      console.log(`Loaded ${data?.length} detections at ${new Date().toLocaleTimeString()}`)
      console.log('Latest detection:', data?.[0])

      if (data) {
        const parsed = data.map(d => ({
          ...d,
          location: parseLocation(d.location)
        }))
        
        setDetections(parsed)
        setMapKey(prev => prev + 1) // Force re-render
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const parseLocation = (geoData: any) => {
    if (typeof geoData === 'string' && geoData.includes('POINT')) {
      const matches = geoData.match(/POINT\(([^ ]+) ([^ ]+)\)/)
      if (matches) {
        return {
          lng: parseFloat(matches[1]),
          lat: parseFloat(matches[2])
        }
      }
    }
    return { lat: -6.2088, lng: 106.8456 }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase().trim()) {
      case 'high': return '#dc2626'    // Bright red
      case 'medium': return '#f59e0b'  // Orange
      case 'low': return '#22c55e'     // Green
      default: return '#6b7280'        // Gray
    }
  }

  if (loading) {
    return (
      <div className="h-[600px] w-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading map...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <MapContainer
        key={mapKey}
        center={[-6.2088, 106.8456]}
        zoom={12}
        className="h-[600px] w-full"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />

        {detections.map((detection, index) => {
          const color = getSeverityColor(detection.severity)
          // Offset overlapping markers slightly
          const offset = index * 0.0001
          
          return (
            <Circle
              key={`${detection.id}-${index}`}
              center={[
                detection.location.lat + offset,
                detection.location.lng + offset
              ]}
              radius={500}
              pathOptions={{
                fillColor: color,
                fillOpacity: 0.7,
                color: color,
                weight: 3
              }}
            >
              <Popup>
                <div className="p-3 min-w-[250px]">
                  <h4 className="font-bold text-lg mb-2" style={{ color }}>
                    {detection.severity.toUpperCase()} SEVERITY
                  </h4>
                  <p className="mb-1">
                    <strong>Confidence:</strong> {(detection.confidence * 100).toFixed(1)}%
                  </p>
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Time:</strong> {new Date(detection.created_at).toLocaleString()}
                  </p>
                  
                  {detection.image_url && (
                    <div className="mt-3 border-t pt-3">
                      <img 
                        src={detection.image_url}
                        alt="Plastic detection"
                        className="w-full rounded cursor-pointer hover:opacity-90"
                        style={{ maxHeight: '200px', objectFit: 'cover' }}
                        onClick={() => window.open(detection.image_url!, '_blank')}
                      />
                      <p className="text-xs text-gray-500 mt-1 text-center">
                        Click image to enlarge
                      </p>
                    </div>
                  )}
                </div>
              </Popup>
            </Circle>
          )
        })}
      </MapContainer>

      {/* Data status */}
      <div className="absolute top-4 right-4 bg-white p-3 rounded shadow-lg z-[1000]">
        <p className="text-sm font-semibold">{detections.length} Detections</p>
        <p className="text-xs text-gray-600">Updates every 2s</p>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white p-3 rounded shadow-lg z-[1000]">
        <h4 className="font-bold mb-2 text-sm">Severity</h4>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-600"></div>
            <span className="text-xs">High</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <span className="text-xs">Medium</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-xs">Low</span>
          </div>
        </div>
      </div>
    </div>
  )
}
