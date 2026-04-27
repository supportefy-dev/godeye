import React from 'react'
import {
  LineChart, Line, BarChart, Bar, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

const TIP_STYLE = {
  contentStyle: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, fontSize: 11 },
  itemStyle: { color: '#fff' },
  labelStyle: { display: 'none' }
}

/** Bar chart — visible bars with peak highlight */
export function BarHistoryChart({ data = [], dataKey, color = '#c8ff00', title }) {
  const chartData = data.map((d, i) => ({ i, v: +(d[dataKey] ?? 0).toFixed(1) }))
  const maxIdx = chartData.length > 0
    ? chartData.reduce((m, d, i, a) => (d.v > a[m].v ? i : m), 0)
    : 0

  return (
    <div className="bg-[#111111] border border-[#1e1e1e] rounded-2xl p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-white font-semibold text-sm">{title}</p>
        <button className="text-gray-600 hover:text-gray-400 transition-colors p-0.5">
          <span className="text-lg leading-none">···</span>
        </button>
      </div>
      <ResponsiveContainer width="100%" height={150}>
        <BarChart data={chartData} barCategoryGap="20%" barGap={2}>
          <XAxis dataKey="i" hide />
          <YAxis domain={[0, (dataMax) => Math.max(20, Math.ceil(dataMax * 1.4))]} hide />
          <Tooltip {...TIP_STYLE} formatter={(v) => [`${v}%`, title]} />
          <Bar dataKey="v" radius={[3, 3, 0, 0]} maxBarSize={14}>
            {chartData.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={index === maxIdx ? color : '#404040'}
                fillOpacity={index === maxIdx ? 1 : 0.7}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Line chart — clean separate lines, no overlapping fills */
export function LineHistoryChart({ data = [], series = [], title }) {
  const chartData = data.map((d, i) => {
    const obj = { i }
    series.forEach((s) => { obj[s.key] = +(d[s.key] ?? 0).toFixed(1) })
    return obj
  })

  return (
    <div className="bg-[#111111] border border-[#1e1e1e] rounded-2xl p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-white font-semibold text-sm">{title}</p>
        <button className="text-gray-600 hover:text-gray-400 transition-colors p-0.5">
          <span className="text-lg leading-none">···</span>
        </button>
      </div>
      <ResponsiveContainer width="100%" height={150}>
        <LineChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <XAxis dataKey="i" hide />
          <YAxis domain={[0, (dataMax) => Math.max(20, Math.ceil(dataMax * 1.4))]} hide />
          <Tooltip {...TIP_STYLE} formatter={(v, name) => [`${v}%`, name]} />
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              stroke={s.color}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              name={s.label}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      {/* Legend */}
      <div className="flex items-center gap-4 mt-2">
        {series.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 rounded-full inline-block" style={{ background: s.color }} />
            <span className="text-[10px] text-gray-500">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
