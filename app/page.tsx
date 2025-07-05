'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import UploadSection from '../src/components/Upload/UploadSection'
import StatsDisplay from '../src/components/Dashboard/StatsDisplay'

// Load map dynamically to avoid SSR issues with Leaflet
const PlasticMap = dynamic(() => import('../src/components/Map/PlasticMap'), {
  ssr: false,
  loading: () => <div className="w-full h-[600px] bg-gray-100 animate-pulse" />
})

export default function Home() {
  const [refreshMap, setRefreshMap] = useState(0)

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-3xl">🌊</span>
              <h1 className="text-2xl font-bold text-gray-900">OceanSentinel</h1>
            </div>
            <nav className="flex space-x-6">
              <a href="#map" className="text-gray-600 hover:text-gray-900">Map</a>
              <a href="#report" className="text-gray-600 hover:text-gray-900">Report</a>
              <a href="#about" className="text-gray-600 hover:text-gray-900">About</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Help Us Clean the Oceans
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            AI-powered plastic detection to protect marine life
          </p>
        </div>

        {/* Stats */}
        <StatsDisplay />
      </section>

      {/* Map Section */}
      <section id="map" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-2xl font-semibold">Live Plastic Detection Map</h3>
          <button 
            onClick={() => setRefreshMap(prev => prev + 1)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Map
          </button>
        </div>
        <div className="rounded-lg overflow-hidden shadow-lg">
          <PlasticMap key={refreshMap} />
        </div>
        
        {/* Map Instructions */}
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            💡 <strong>Tip:</strong> Click on the colored circles to see detection details and photos. 
            Red = High severity, Yellow = Medium, Green = Low severity.
          </p>
        </div>
      </section>

      {/* Upload Section */}
      <section id="report" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <UploadSection onUploadSuccess={() => {
          // Delay refresh to allow database to update
          setTimeout(() => {
            setRefreshMap(prev => prev + 1)
          }, 1000)
        }} />
      </section>

      {/* About Section */}
      <section id="about" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h3 className="text-2xl font-semibold mb-4">About OceanSentinel</h3>
          <p className="text-gray-600 mb-4">
            OceanSentinel uses AI and satellite technology to detect and track ocean plastic pollution. 
            By crowdsourcing reports from people like you, we can create a real-time map of plastic 
            pollution and coordinate cleanup efforts more effectively.
          </p>
          <div className="grid md:grid-cols-3 gap-6 mt-8">
            <div className="text-center">
              <div className="text-4xl mb-2">🛰️</div>
              <h4 className="font-semibold mb-2">AI Detection</h4>
              <p className="text-sm text-gray-600">Advanced algorithms analyze images to identify plastic pollution</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-2">🗺️</div>
              <h4 className="font-semibold mb-2">Real-time Mapping</h4>
              <p className="text-sm text-gray-600">Live updates show pollution hotspots and cleanup progress</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-2">🤝</div>
              <h4 className="font-semibold mb-2">Community Action</h4>
              <p className="text-sm text-gray-600">Connect volunteers with cleanup organizations</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p>© 2024 OceanSentinel - Saving oceans with AI</p>
          <p className="text-sm text-gray-400 mt-2">
            Together we can make a difference 🌊
          </p>
        </div>
      </footer>
    </main>
  )
}
