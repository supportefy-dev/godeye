import React from 'react'
import SemiGauge from './SemiGauge'

function fmtMB(mb) {
  if (!mb && mb !== 0) return '—'
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`
  return `${mb} MB`
}

export default function MetricCard({ title, rawValue, rawMax, percent, sublabel, color = '#c8ff00' }) {
  const pct = Math.min(100, Math.max(0, percent ?? (rawMax ? (rawValue / rawMax) * 100 : rawValue ?? 0)))
  const ringColor = pct > 85 ? '#ef4444' : pct > 65 ? '#f59e0b' : color

  // SemiGauge size=190 → svgH = 190*0.80 = 152px, cy = 190*0.72 = 136.8px
  // Arc mouth is 152 - 136.8 = 15.2px from SVG bottom → use bottom-4 (16px)
  const gaugeSize = 190

  return (
    <div className="bg-[#111111] border border-[#1e1e1e] rounded-2xl p-5 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-white font-semibold text-sm">{title}</p>
          <p className="text-gray-500 text-xs mt-0.5">{sublabel}</p>
        </div>
        <button className="text-gray-600 hover:text-gray-400 transition-colors p-0.5">
          <span className="text-lg leading-none">···</span>
        </button>
      </div>

      {/* Gauge + value overlay — self-contained, no bleed */}
      <div className="relative flex justify-center">
        <SemiGauge value={pct} color={color} size={gaugeSize} />

        {/* Text sits at the arc mouth: bottom-4 aligns to cy inside the SVG */}
        <div
          className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none"
          style={{ bottom: 16 }}
        >
          <span className="font-bold leading-none" style={{ color: ringColor, fontSize: 28 }}>
            {pct.toFixed(1)}<span style={{ fontSize: 14, fontWeight: 600 }}>%</span>
          </span>
          {rawMax && (
            <span className="text-[11px] text-gray-400 mt-1 font-mono">
              {fmtMB(rawValue)} / {fmtMB(rawMax)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
