import React from 'react'

/**
 * Top filled stat card — matches the lime-background cards in the reference.
 * variant: 'accent' (lime fill) | 'dark' (dark card)
 */
export default function StatCard({ icon: Icon, label, value, delta, variant = 'dark' }) {
  const isAccent = variant === 'accent'

  return (
    <div
      className={`rounded-2xl p-5 flex flex-col gap-3 ${
        isAccent
          ? 'text-black'
          : 'bg-[#111111] border border-[#1e1e1e] text-white'
      }`}
      style={isAccent ? { background: '#c8ff00' } : {}}
    >
      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium uppercase tracking-wider ${isAccent ? 'text-black/60' : 'text-gray-400'}`}>
          {label}
        </span>
        {Icon && (
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isAccent ? 'bg-black/10' : 'bg-[#1e1e1e]'}`}>
            <Icon size={14} className={isAccent ? 'text-black' : 'text-gray-400'} />
          </div>
        )}
      </div>

      <div className="flex items-end gap-2">
        <span className="text-3xl font-bold leading-none tracking-tight">{value ?? '—'}</span>
        {delta != null && (
          <span
            className={`text-xs font-semibold px-1.5 py-0.5 rounded-md mb-0.5 ${
              isAccent ? 'bg-black/15 text-black' : 'bg-white/10 text-white'
            }`}
          >
            {delta > 0 ? '+' : ''}{delta}%
          </span>
        )}
      </div>
    </div>
  )
}
