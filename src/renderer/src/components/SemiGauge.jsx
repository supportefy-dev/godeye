import React from 'react'

/**
 * Half-circle (semicircular) gauge.
 * SVG height is size*0.80 so the knob at cy=size*0.72 has ~8% padding below — no overflow needed.
 * value: 0–100
 */
export default function SemiGauge({ value = 0, color = '#c8ff00', size = 180 }) {
  const clamped = Math.min(100, Math.max(0, value))
  const cx = size / 2
  const cy = size * 0.72           // arc centre — sits in lower portion
  const r  = size * 0.42
  const strokeW = size * 0.065

  // SVG canvas is taller than cy so the knob circle is fully contained
  const svgH = size * 0.80

  const toRad = (deg) => (deg * Math.PI) / 180
  const polarX = (deg) => cx + r * Math.cos(toRad(deg))
  const polarY = (deg) => cy + r * Math.sin(toRad(deg))

  // Track: 180° → 0° clockwise
  const trackStart = { x: polarX(180), y: polarY(180) }
  const trackEnd   = { x: polarX(0),   y: polarY(0) }
  const trackD = `M ${trackStart.x} ${trackStart.y} A ${r} ${r} 0 0 1 ${trackEnd.x} ${trackEnd.y}`

  // Progress arc with minimum 4° sweep so low values are still visible
  const MIN_DEG = 4
  const sweepDeg    = clamped === 0 ? 0 : Math.max(MIN_DEG, (clamped / 100) * 180)
  const progressAngle = 180 - sweepDeg
  const progEnd = { x: polarX(progressAngle), y: polarY(progressAngle) }
  const largeArc = sweepDeg > 180 ? 1 : 0
  const progressD = `M ${trackStart.x} ${trackStart.y} A ${r} ${r} 0 ${largeArc} 1 ${progEnd.x} ${progEnd.y}`

  const ringColor = clamped > 85 ? '#ef4444' : clamped > 65 ? '#f59e0b' : color

  return (
    <svg
      width={size}
      height={svgH}
      viewBox={`0 0 ${size} ${svgH}`}
    >
      {/* Track */}
      <path d={trackD} fill="none" stroke="#333333" strokeWidth={strokeW} strokeLinecap="round" />
      {/* Progress */}
      <path
        d={progressD}
        fill="none"
        stroke={ringColor}
        strokeWidth={strokeW}
        strokeLinecap="round"
        style={{ transition: 'all 0.55s ease' }}
      />
      {/* Knob dot */}
      <circle
        cx={progEnd.x}
        cy={progEnd.y}
        r={strokeW * 0.55}
        fill="#0a0a0a"
        stroke={ringColor}
        strokeWidth={3}
        style={{ transition: 'all 0.55s ease' }}
      />
    </svg>
  )
}
