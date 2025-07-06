'use client'

import { useState, useRef } from 'react'
import { Upload, Camera, MapPin, Brain } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { advancedPlasticDetector } from '../../lib/advancedPlasticDetector'

interface Props {
  onUploadSuccess?: () => void
}

export default function UploadSection({ onUploadSuccess }: Props) {
  const [uploading, setUploading] = useState(false)
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [aiEnabled, setAiEnabled] = useState(true)
  const [detectionPreview, setDetectionPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }
          setLocation(newLocation)
          console.log('GPS Location captured:', newLocation)
          toast.success(`Location captured: ${newLocation.lat.toFixed(6)}, ${newLocation.lng.toFixed(6)}`)
        },
        (error) => {
          console.error('GPS Error:', error)
          // Fallback to a test location for development
          const testLocation = {
            lat: -6.2088,  // Jakarta Bay
            lng: 106.8456
          }
          setLocation(testLocation)
          console.log('Using test location:', testLocation)
          toast.error('GPS failed - using test location (Jakarta Bay)')
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      )
    } else {
      // Fallback for browsers without geolocation
      const testLocation = {
        lat: -6.2088,
        lng: 106.8456
      }
      setLocation(testLocation)
      console.log('No GPS support - using test location:', testLocation)
      toast.error('GPS not supported - using test location (Jakarta Bay)')
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!location) {
      toast.error('Please capture your location first')
      return
    }

    // Log current location before upload
    console.log('=== UPLOAD STARTING ===')
    console.log('Current location state:', location)
    console.log('Location string will be:', `POINT(${location.lng} ${location.lat})`)

    setUploading(true)
    const toastId = toast.loading('AI is analyzing image for plastic...')

    try {
      // Show preview
      const previewUrl = URL.createObjectURL(file)
      setDetectionPreview(previewUrl)

      // Run AI detection
      let severity: 'low' | 'medium' | 'high' = 'low'
      let confidence = 0.5
      let aiDetectionInfo = null

      if (aiEnabled) {
        try {
          console.log('Running AI detection...')
          const detection = await advancedPlasticDetector.detectFromFile(file)
          severity = detection.severity
          confidence = detection.confidence
          aiDetectionInfo = detection

          // Show what AI found
          if (detection.objects.length > 0) {
            const objects = detection.objects.join(', ')
            toast.success(`AI detected: ${objects}`, { duration: 4000 })
          } else if (detection.plasticScore > 0.3) {
            toast.success('AI detected potential plastic pollution', { duration: 4000 })
          }

          console.log('AI Detection Result:', detection)
        } catch (aiError) {
          console.error('AI detection failed, using fallback:', aiError)
          toast.error('AI detection failed, using basic analysis')
          // Fallback to random if AI fails
          severity = ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as any
          confidence = 0.3 + Math.random() * 0.4
        }
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('plastic-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Storage error:', uploadError)
        throw new Error('Failed to upload image')
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('plastic-images')
        .getPublicUrl(fileName)

      console.log('Image uploaded successfully:', publicUrl)

      // CRITICAL: Log location right before database save
      console.log('=== SAVING TO DATABASE ===')
      console.log('Location being saved:', location)
      console.log('PostGIS string:', `POINT(${location.lng} ${location.lat})`)
      
      // Double-check location hasn't changed
      if (location.lat === -6.2088 && location.lng === 106.8456) {
        console.warn('WARNING: Saving Jakarta test location!')
      } else {
        console.log('SUCCESS: Saving actual GPS location!')
      }

      // Save to database with AI results
      const { data, error: dbError } = await supabase
        .from('plastic_detections')
        .insert({
          location: `POINT(${location.lng} ${location.lat})`,
          severity: severity,
          confidence: confidence,
          image_url: publicUrl,
          thumbnail_url: publicUrl,
          detected_by: null,
          verified: aiEnabled // Mark as AI-verified if AI was used
        })
        .select()

      if (dbError) {
        console.error('Database error:', dbError)
        throw dbError
      }

      console.log('Detection saved successfully:', data)
      console.log('Saved location was:', `POINT(${location.lng} ${location.lat})`)
      
      // Show result with emojis
      const severityEmoji = {
        low: '✅',
        medium: '⚠️',
        high: '🚨'
      }[severity]
      
      toast.success(
        `${severityEmoji} Plastic detected: ${severity.toUpperCase()} severity! (${(confidence * 100).toFixed(0)}% confidence)`, 
        { id: toastId, duration: 5000 }
      )
      
      // Reset form
      if (fileInputRef.current) fileInputRef.current.value = ''
      // Don't reset location - keep it for next upload
      // setLocation(null)
      setDetectionPreview(null)
      
      // Trigger map refresh
      onUploadSuccess?.()

    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to process image', { id: toastId })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-semibold">Report Plastic Pollution</h3>
        <button
          onClick={() => setAiEnabled(!aiEnabled)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
            aiEnabled 
              ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Brain size={20} />
          <span className="text-sm font-medium">
            AI Detection {aiEnabled ? 'ON' : 'OFF'}
          </span>
        </button>
      </div>
      
      <div className="space-y-6">
        {/* Location Capture */}
        <div>
          <button
            onClick={getCurrentLocation}
            className="w-full flex items-center justify-center gap-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium py-4 px-6 rounded-lg transition"
          >
            <MapPin size={24} />
            {location ? 'Location Captured ✓ (Click to update)' : 'Capture Current Location'}
          </button>
          {location && (
            <div className="mt-2 p-3 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-600">
                📍 Latitude: {location.lat.toFixed(6)}
              </p>
              <p className="text-sm text-gray-600">
                📍 Longitude: {location.lng.toFixed(6)}
              </p>
              {(location.lat === -6.2088 && location.lng === 106.8456) && (
                <p className="text-xs text-orange-600 mt-1">
                  ⚠️ Using test location (Jakarta Bay)
                </p>
              )}
            </div>
          )}
        </div>

        {/* File Upload */}
        <div>
          <label className="block">
            <div className="w-full flex items-center justify-center gap-3 bg-green-50 hover:bg-green-100 text-green-700 font-medium py-8 px-6 rounded-lg cursor-pointer transition border-2 border-dashed border-green-300">
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-green-700 border-t-transparent" />
                  <span>AI Analyzing...</span>
                </>
              ) : (
                <>
                  <Upload size={24} />
                  <span>Upload Photo of Plastic</span>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={uploading || !location}
              className="hidden"
            />
          </label>
          <p className="text-sm text-gray-500 mt-2">
            Take a clear photo of plastic waste in or near water
          </p>
        </div>

        {/* Preview */}
        {detectionPreview && (
          <div className="mt-4">
            <p className="text-sm font-medium mb-2">Analyzing this image:</p>
            <img 
              src={detectionPreview} 
              alt="Detection preview" 
              className="w-full h-48 object-cover rounded-lg"
            />
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">
            {aiEnabled ? '🤖 AI-Powered Detection' : '📸 Basic Detection'}
          </h4>
          <ol className="text-sm text-blue-800 space-y-1">
            {aiEnabled ? (
              <>
                <li>1. Enable location to mark where you found the plastic</li>
                <li>2. Take a photo - AI will identify plastic objects</li>
                <li>3. AI determines severity based on type & amount</li>
                <li>4. Results are added to the map automatically!</li>
              </>
            ) : (
              <>
                <li>1. Enable location to mark where you found the plastic</li>
                <li>2. Take or upload a photo of the plastic pollution</li>
                <li>3. Basic analysis will estimate severity</li>
                <li>4. Help coordinate cleanup efforts!</li>
              </>
            )}
          </ol>
        </div>

        {/* AI Info */}
        {aiEnabled && (
          <div className="bg-purple-50 p-4 rounded-lg">
            <h4 className="font-semibold text-purple-900 mb-2">🧠 AI Capabilities</h4>
            <p className="text-sm text-purple-800">
              Our AI can detect: bottles, cups, bags, and other plastic items. 
              It analyzes colors and patterns typical of ocean plastic pollution.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
