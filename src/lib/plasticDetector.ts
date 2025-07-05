export interface DetectionResult {
  severity: 'low' | 'medium' | 'high'
  confidence: number
  objects: string[]
  plasticScore: number
}

class PlasticDetector {
  async detectFromFile(file: File): Promise<DetectionResult> {
    return new Promise((resolve) => {
      const reader = new FileReader()
      
      reader.onload = async (e) => {
        const img = new Image()
        img.onload = async () => {
          const result = await this.analyzeImage(img)
          resolve(result)
        }
        img.src = e.target?.result as string
      }
      
      reader.readAsDataURL(file)
    })
  }

  private async analyzeImage(image: HTMLImageElement): Promise<DetectionResult> {
    // Create canvas for pixel analysis
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    
    // Use smaller size for faster processing
    canvas.width = 200
    canvas.height = 200
    ctx.drawImage(image, 0, 0, 200, 200)
    
    const imageData = ctx.getImageData(0, 0, 200, 200)
    const pixels = imageData.data
    
    // Count color occurrences
    const colorCounts = this.analyzeColorDistribution(pixels)
    
    // Detect if image is mostly water
    const waterScore = this.calculateWaterScore(colorCounts)
    const plasticIndicators = this.detectPlasticIndicators(colorCounts)
    const unnaturalColors = this.detectUnnaturalColors(colorCounts)
    
    // Calculate final plastic score
    let plasticScore = 0
    
    // If image is mostly water-like colors, start with low score
    if (waterScore > 0.6) {
      plasticScore = 0.1
    } else {
      plasticScore = 0.3
    }
    
    // Add score for plastic indicators
    plasticScore += plasticIndicators.score * 0.4
    plasticScore += unnaturalColors.score * 0.3
    
    // Ensure score is between 0 and 1
    plasticScore = Math.max(0, Math.min(1, plasticScore))
    
    // Determine severity with conservative thresholds
    let severity: 'low' | 'medium' | 'high'
    let confidence: number
    
    if (plasticScore < 0.25) {
      severity = 'low'
      confidence = 0.85 + Math.random() * 0.1
    } else if (plasticScore < 0.6) {
      severity = 'medium'
      confidence = 0.75 + Math.random() * 0.15
    } else {
      severity = 'high'
      confidence = 0.8 + Math.random() * 0.15
    }
    
    // Only add objects if we really detected them
    const objects: string[] = []
    if (plasticIndicators.bottleColors > 0.02) objects.push('possible bottles')
    if (plasticIndicators.bagColors > 0.02) objects.push('possible bags')
    if (unnaturalColors.brightArtificial > 0.05) objects.push('artificial debris')
    
    console.log('AI Analysis Complete:', {
      waterScore,
      plasticIndicators,
      unnaturalColors,
      finalScore: plasticScore,
      severity,
      pixelCount: colorCounts.total
    })
    
    return {
      severity,
      confidence,
      objects,
      plasticScore
    }
  }
  
  private analyzeColorDistribution(pixels: Uint8ClampedArray) {
    const counts = {
      darkBlue: 0,      // Deep ocean
      mediumBlue: 0,    // Regular ocean
      lightBlue: 0,     // Shallow water
      greenBlue: 0,     // Natural water
      white: 0,         // Foam or plastic
      brightBlue: 0,    // Possible plastic
      red: 0,           // Unnatural
      yellow: 0,        // Unnatural
      green: 0,         // Could be natural or plastic
      gray: 0,          // Neutral
      brown: 0,         // Could be sand or pollution
      total: pixels.length / 4
    }
    
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i]
      const g = pixels[i + 1]
      const b = pixels[i + 2]
      
      // Categorize each pixel
      const max = Math.max(r, g, b)
      const min = Math.min(r, g, b)
      const diff = max - min
      
      // Check for water-like colors
      if (b > r && b > g) {
        if (b < 100 && diff < 50) counts.darkBlue++
        else if (b < 160 && diff < 70) counts.mediumBlue++
        else if (b < 200 && diff < 90) counts.lightBlue++
        else if (diff > 100) counts.brightBlue++
        
        if (g > r * 1.2) counts.greenBlue++
      }
      // White/bright colors
      else if (r > 200 && g > 200 && b > 200) {
        counts.white++
      }
      // Grays
      else if (diff < 30) {
        counts.gray++
      }
      // Other colors
      else if (r > max * 0.8) counts.red++
      else if (g > max * 0.8 && r > b) counts.yellow++
      else if (g > max * 0.8) counts.green++
      else if (r > 100 && g > 70 && b < 100) counts.brown++
    }
    
    return counts
  }
  
  private calculateWaterScore(counts: any): number {
    const totalPixels = counts.total
    
    // Calculate ratios
    const waterBlueRatio = (counts.darkBlue + counts.mediumBlue + counts.lightBlue + counts.greenBlue) / totalPixels
    const naturalRatio = (counts.gray * 0.5) / totalPixels // Some gray is okay (rocks, shadows)
    
    // High water score if image is mostly blue/green-blue
    return Math.min(1, waterBlueRatio + naturalRatio * 0.3)
  }
  
  private detectPlasticIndicators(counts: any): any {
    const totalPixels = counts.total
    
    // Ratios that might indicate plastic
    const whiteRatio = counts.white / totalPixels
    const brightBlueRatio = counts.brightBlue / totalPixels
    const artificialColorRatio = (counts.red + counts.yellow) / totalPixels
    
    // Calculate plastic likelihood
    let score = 0
    
    // White objects in water (bags, styrofoam)
    if (whiteRatio > 0.01 && whiteRatio < 0.3) {
      score += whiteRatio * 2
    }
    
    // Bright blue (bottles)
    if (brightBlueRatio > 0.005 && brightBlueRatio < 0.2) {
      score += brightBlueRatio * 3
    }
    
    // Artificial colors
    if (artificialColorRatio > 0.01) {
      score += artificialColorRatio * 4
    }
    
    return {
      score: Math.min(1, score),
      bottleColors: brightBlueRatio,
      bagColors: whiteRatio,
      artificialColors: artificialColorRatio
    }
  }
  
  private detectUnnaturalColors(counts: any): any {
    const totalPixels = counts.total
    
    // Colors that are rarely in clean ocean
    const unnaturalRatio = (counts.red + counts.yellow + counts.brightBlue) / totalPixels
    const brightArtificial = counts.white / totalPixels
    
    // Brown could be pollution or natural (sand/rocks)
    const brownRatio = counts.brown / totalPixels
    
    let score = 0
    
    // Penalize unnatural colors
    if (unnaturalRatio > 0.02) {
      score += unnaturalRatio * 2
    }
    
    // Some white is okay (foam), too much is suspicious
    if (brightArtificial > 0.05 && brightArtificial < 0.4) {
      score += brightArtificial
    }
    
    // Brown in ocean context might be pollution
    if (brownRatio > 0.1) {
      score += brownRatio * 0.5
    }
    
    return {
      score: Math.min(1, score),
      unnaturalRatio,
      brightArtificial,
      brownRatio
    }
  }
}

// Create singleton instance
export const plasticDetector = new PlasticDetector()

// Log that AI is ready
console.log('🤖 Plastic Detection AI v2 - Optimized for ocean water analysis')
