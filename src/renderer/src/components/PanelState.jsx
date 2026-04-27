import React from 'react'

export default function PanelState({ title, message = 'Connect to a server to use this feature' }) {
  return (
    <div className="h-full min-h-screen bg-[#0a0a0a] p-8 flex items-center justify-center">
      <div className="bg-[#111111] border border-[#1e1e1e] rounded-2xl p-8 text-center">
        <p className="text-white font-semibold">{title}</p>
        <p className="text-gray-500 text-sm mt-2">{message}</p>
      </div>
    </div>
  )
}

