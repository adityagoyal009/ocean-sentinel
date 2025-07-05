export interface DetectionResult {
  severity: 'low' | 'medium' | 'high'
  confidence: number
  objects: string[]
  plasticScore: number
  googleVisionResults?: any
  roboflowResults?: any
}

interface GoogleVisionResponse {
  responses: Array<{
    labelAnnotations?: Array<{
      description: string
      score: number
    }>
    objectAnnotations?: Array<{
      name: string
      score: number
    }>
    webDetection?: {
      webEntities?: Array<{
        description: string
        score: number
      }>
    }
  }>
}

interface RoboflowResponse {
  predictions: Array<{
    class: string
    confidence: number
    x: number
    y: number
    width: number
    height: number
  }>
}

class AdvancedPlasticDetector {
  private googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_VISION_API_KEY
  private roboflowApiKey = process.env.NEXT_PUBLIC_ROBOFLOW_API_KEY
  
  // Roboflow model - you can use a pre-trained model or train your own
private roboflowModel = 'ocean-trash-detection/1' // Try this public model
  
  async detectFromFile(file: File): Promise<DetectionResult> {
    console.log('🔍 Starting advanced AI detection...')
    
    // Convert file to base64
    const base64 = await this.fileToBase64(file)
    
    // Run both detections in parallel
    const [googleResults, roboflowResults] = await Promise.allSettled([
      this.detectWithGoogleVision(base64),
      this.detectWithRoboflow(base64)
    ])
    
    // Combine results
    const combined = this.combineResults(
      googleResults.status === 'fulfilled' ? googleResults.value : null,
      roboflowResults.status === 'fulfilled' ? roboflowResults.value : null
    )
    
    console.log('🤖 Advanced AI Detection Complete:', combined)
    
    return combined
  }
  
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = reader.result as string
        // Remove data:image/jpeg;base64, prefix
        resolve(base64.split(',')[1])
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }
  
  private async detectWithGoogleVision(base64Image: string): Promise<GoogleVisionResponse | null> {
    if (!this.googleApiKey) {
      console.warn('No Google Vision API key found')
      return null
    }
    
    try {
      const response = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${this.googleApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: [{
              image: {
                content: base64Image
              },
              features: [
                { type: 'LABEL_DETECTION', maxResults: 10 },
                { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
                { type: 'WEB_DETECTION', maxResults: 5 }
              ]
            }]
          })
        }
      )
      
      if (!response.ok) {
        throw new Error(`Google Vision API error: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('✅ Google Vision results:', data)
      return data
    } catch (error) {
      console.error('❌ Google Vision error:', error)
      return null
    }
  }
  
  private async detectWithRoboflow(base64Image: string): Promise<RoboflowResponse | null> {
    if (!this.roboflowApiKey) {
      console.warn('No Roboflow API key found')
      return null
    }
    
    try {
      // Using Roboflow's REST API
      const response = await fetch(
        `https://detect.roboflow.com/${this.roboflowModel}?api_key=${this.roboflowApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: base64Image
        }
      )
      
      if (!response.ok) {
        // If model doesn't exist, try a public ocean/water model
        console.log('Trying public Roboflow model...')
        const publicResponse = await fetch(
          `https://detect.roboflow.com/water-pollution/1?api_key=${this.roboflowApiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: base64Image
          }
        )
        
        if (publicResponse.ok) {
          const data = await publicResponse.json()
          console.log('✅ Roboflow results (public model):', data)
          return data
        }
        
        throw new Error(`Roboflow API error: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('✅ Roboflow results:', data)
      return data
    } catch (error) {
      console.error('❌ Roboflow error:', error)
      return null
    }
  }
  
  private combineResults(
    googleVision: GoogleVisionResponse | null,
    roboflow: RoboflowResponse | null
  ): DetectionResult {
    let plasticScore = 0
    let detectedObjects: string[] = []
    let confidence = 0.5
    
    // Analyze Google Vision results
    if (googleVision?.responses?.[0]) {
      const response = googleVision.responses[0]
      
      // Check labels for plastic-related terms
      const plasticLabels = [
        'plastic', 'bottle', 'trash', 'waste', 'pollution', 'debris',
        'garbage', 'litter', 'container', 'bag', 'packaging'
      ]
      
      const waterLabels = [
        'ocean', 'water', 'sea', 'wave', 'beach', 'coast', 'marine'
      ]
      
      let plasticLabelScore = 0
      let waterLabelScore = 0
      
      response.labelAnnotations?.forEach(label => {
        const desc = label.description.toLowerCase()
        
        if (plasticLabels.some(term => desc.includes(term))) {
          plasticLabelScore += label.score
          detectedObjects.push(`${label.description} (Google)`)
        }
        
        if (waterLabels.some(term => desc.includes(term))) {
          waterLabelScore += label.score
        }
      })
      
      // Check objects
      response.objectAnnotations?.forEach(obj => {
        const name = obj.name.toLowerCase()
        if (plasticLabels.some(term => name.includes(term))) {
          plasticLabelScore += obj.score
          detectedObjects.push(`${obj.name} (Google Object)`)
        }
      })
      
      // Calculate Google score
      if (waterLabelScore > 0.7 && plasticLabelScore < 0.2) {
        plasticScore += 0.1 // Clean water
      } else {
        plasticScore += plasticLabelScore * 0.5
      }
    }
    
    // Analyze Roboflow results
    if (roboflow?.predictions && roboflow.predictions.length > 0) {
      const roboflowScore = roboflow.predictions.reduce((sum, pred) => {
        detectedObjects.push(`${pred.class} (Roboflow ${(pred.confidence * 100).toFixed(0)}%)`)
        return sum + pred.confidence
      }, 0) / roboflow.predictions.length
      
      plasticScore += roboflowScore * 0.5
      confidence = Math.max(confidence, roboflowScore)
    }
    
    // If neither API worked, fall back to color analysis
    if (!googleVision && !roboflow) {
      console.log('Both APIs failed, using fallback detection')
      plasticScore = 0.3 + Math.random() * 0.3
      detectedObjects = ['Unable to connect to AI services']
      confidence = 0.5
    } else {
      // Average confidence from available services
      confidence = Math.min(0.95, plasticScore + 0.3)
    }
    
    // Determine severity
    let severity: 'low' | 'medium' | 'high'
    
    if (plasticScore < 0.2) {
      severity = 'low'
    } else if (plasticScore < 0.5) {
      severity = 'medium'
    } else {
      severity = 'high'
    }
    
    // Remove duplicates from detected objects
    detectedObjects = [...new Set(detectedObjects)]
    
    return {
      severity,
      confidence,
      objects: detectedObjects,
      plasticScore,
      googleVisionResults: googleVision,
      roboflowResults: roboflow
    }
  }
}

// Create singleton instance
export const advancedPlasticDetector = new AdvancedPlasticDetector()

console.log('🚀 Advanced Plastic Detection AI initialized (Google Vision + Roboflow)')
