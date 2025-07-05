'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function StatsDisplay() {
  const [stats, setStats] = useState({
    totalDetections: 0,
    highSeverity: 0,
    reportsToday: 0,
    activeVolunteers: 0
  })

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      // Total detections
      const { count: total } = await supabase
        .from('plastic_detections')
        .select('*', { count: 'exact', head: true })

      // High severity
      const { count: high } = await supabase
        .from('plastic_detections')
        .select('*', { count: 'exact', head: true })
        .eq('severity', 'high')

      // Today's reports
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const { count: todayCount } = await supabase
        .from('plastic_detections')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString())

      setStats({
        totalDetections: total || 0,
        highSeverity: high || 0,
        reportsToday: todayCount || 0,
        activeVolunteers: 42 // Mock for now
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const statCards = [
    { label: 'Total Detections', value: stats.totalDetections, icon: '📍' },
    { label: 'High Severity', value: stats.highSeverity, icon: '🚨' },
    { label: 'Reports Today', value: stats.reportsToday, icon: '📅' },
    { label: 'Active Volunteers', value: stats.activeVolunteers, icon: '👥' },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat, index) => (
        <div key={index} className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{stat.label}</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
            </div>
            <span className="text-4xl">{stat.icon}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
