import React from 'react'
import { Plus, RefreshCw, Trash2, LayoutDashboard, Cpu, MemoryStick, HardDrive, Clock } from 'lucide-react'

const ACCENT = '#c8ff00'

function fmtUptime(s) {
  if (!s) return null
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function MiniBar({ value = 0, color = ACCENT }) {
  const pct = Math.min(100, Math.max(0, value))
  const barColor = pct > 85 ? '#ef4444' : pct > 65 ? '#f59e0b' : color
  return (
    <div className="flex-1 h-1 bg-[#252525] rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: barColor }}
      />
    </div>
  )
}

export default function ServersPanel({ servers, statuses, stats, onSelect, onReconnect, onRemove, onAdd }) {
  return (
    <div className="h-full min-h-screen p-6 bg-[#0a0a0a] text-white">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Servers</h1>
        <p className="text-sm text-gray-500 mt-0.5">{servers.length} server{servers.length !== 1 ? 's' : ''} saved</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {servers.map((server) => {
          const status = statuses[server.id] ?? 'connecting'
          const s = stats[server.id] ?? null
          const cpuPct  = s?.cpu ?? 0
          const ramPct  = s?.ramTotal  ? (s.ramUsed  / s.ramTotal)  * 100 : 0
          const diskPct = s?.diskTotal ? (s.diskUsed / s.diskTotal) * 100 : 0
          const uptime  = fmtUptime(s?.uptime)
          const isOnline = status === 'online'

          const statusColor =
            status === 'online' ? ACCENT :
            status === 'connecting' ? '#f59e0b' : '#ef4444'

          const statusLabel =
            status === 'online' ? 'Online' :
            status === 'connecting' ? 'Connecting…' : 'Offline'

          return (
            <div
              key={server.id}
              className="bg-[#111111] border border-[#1e1e1e] rounded-2xl p-5 flex flex-col gap-4 hover:border-[#2a2a2a] transition-colors"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-white font-semibold text-base truncate">{server.name}</p>
                  <p className="text-[11px] font-mono text-gray-500 mt-0.5 truncate">
                    {server.ip}:{server.port || 22}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{
                      background: statusColor,
                      animation: status === 'connecting' ? 'pulse 1.5s infinite' : undefined,
                      boxShadow: isOnline ? `0 0 6px ${statusColor}88` : undefined
                    }}
                  />
                  <span className="text-[11px]" style={{ color: statusColor }}>{statusLabel}</span>
                </div>
              </div>

              {/* Metrics — only shown when online and have stats */}
              {isOnline && s ? (
                <div className="flex flex-col gap-2">
                  <MetricRow label="CPU" value={cpuPct} color={ACCENT} />
                  <MetricRow label="RAM" value={ramPct} color="#60a5fa" />
                  <MetricRow label="Disk" value={diskPct} color="#c084fc" />
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <MetricRow label="CPU" value={0} color="#333" inactive />
                  <MetricRow label="RAM" value={0} color="#333" inactive />
                  <MetricRow label="Disk" value={0} color="#333" inactive />
                </div>
              )}

              {/* Footer: uptime + actions */}
              <div className="flex items-center justify-between mt-auto pt-1 border-t border-[#1a1a1a]">
                <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
                  {uptime && isOnline ? (
                    <>
                      <Clock size={11} />
                      <span>{uptime}</span>
                    </>
                  ) : (
                    <span className="text-gray-700">{server.username}@{server.ip}</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <ActionBtn
                    icon={LayoutDashboard}
                    title="View Dashboard"
                    color={ACCENT}
                    onClick={() => onSelect(server.id)}
                  />
                  <ActionBtn
                    icon={RefreshCw}
                    title="Reconnect"
                    onClick={() => onReconnect(server.id)}
                  />
                  <ActionBtn
                    icon={Trash2}
                    title="Remove Server"
                    danger
                    onClick={() => {
                      if (window.confirm(`Remove "${server.name}"?`)) onRemove(server.id)
                    }}
                  />
                </div>
              </div>
            </div>
          )
        })}

        {/* Add Server card */}
        <button
          onClick={onAdd}
          className="bg-[#0d0d0d] border border-dashed border-[#2a2a2a] rounded-2xl p-5 flex flex-col items-center justify-center gap-3 min-h-[200px] hover:border-[#c8ff00]/50 hover:bg-[#111111] transition-all group"
        >
          <div
            className="w-10 h-10 rounded-xl border border-dashed border-[#2a2a2a] group-hover:border-[#c8ff00]/60 flex items-center justify-center transition-colors"
          >
            <Plus size={18} className="text-gray-600 group-hover:text-[#c8ff00] transition-colors" />
          </div>
          <span className="text-sm text-gray-600 group-hover:text-gray-400 transition-colors">Add Server</span>
        </button>
      </div>
    </div>
  )
}

function MetricRow({ label, value, color, inactive }) {
  const pct = Math.min(100, Math.max(0, value))
  const display = inactive ? '—' : `${pct.toFixed(0)}%`
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-gray-600 w-7 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1 bg-[#1e1e1e] rounded-full overflow-hidden">
        {!inactive && (
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              background: pct > 85 ? '#ef4444' : pct > 65 ? '#f59e0b' : color
            }}
          />
        )}
      </div>
      <span className="text-[10px] font-mono text-gray-500 w-7 text-right flex-shrink-0">{display}</span>
    </div>
  )
}

function ActionBtn({ icon: Icon, title, onClick, danger, color }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
        danger
          ? 'text-gray-600 hover:text-red-400 hover:bg-[#1e1e1e]'
          : 'text-gray-600 hover:text-white hover:bg-[#1e1e1e]'
      }`}
      style={color ? { '--hover-color': color } : undefined}
    >
      <Icon size={13} />
    </button>
  )
}
