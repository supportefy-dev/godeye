import React from 'react'
import { Eye, Plus } from 'lucide-react'

const ACCENT = '#c8ff00'

export default function EmptyState({ onAdd }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <div className="w-20 h-20 rounded-2xl bg-[#111111] border border-[#1e1e1e] flex items-center justify-center mb-6">
        <Eye size={34} style={{ color: ACCENT }} />
      </div>
      <h2 className="text-3xl font-bold text-white mb-3">
        Hello <span style={{ color: ACCENT }}>GodEye</span>
      </h2>
      <p className="text-gray-500 text-sm max-w-xs mb-8 leading-relaxed">
        Add a Linux server to start monitoring CPU, RAM, and disk usage in real time — auto-refreshing every 3 seconds.
      </p>
      <button
        onClick={onAdd}
        className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-black transition-colors hover:opacity-90"
        style={{ background: ACCENT }}
      >
        <Plus size={16} />
        Add Your First Server
      </button>
    </div>
  )
}
