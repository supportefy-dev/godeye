import React from 'react'
import { RefreshCw, WifiOff, Clock, AlertTriangle, Cpu, MemoryStick, HardDrive } from 'lucide-react'
import StatCard from './StatCard'
import MetricCard from './MetricCard'
import { BarHistoryChart, LineHistoryChart } from './HistoryChart'

const ACCENT = '#c8ff00'

function diagnose(err) {
  if (!err) return ''
  const e = err.toLowerCase()
  if (e.includes('all configured authentication') || e.includes('auth') || e.includes('permission denied'))
    return '→ Wrong username or password. Double-check your credentials.'
  if (e.includes('econnrefused'))
    return '→ Connection refused. Port 22 may be closed or SSH is not running.'
  if (e.includes('etimedout') || e.includes('timed out'))
    return '→ Connection timed out. Check the IP address or firewall rules.'
  if (e.includes('enotfound') || e.includes('getaddrinfo'))
    return '→ Hostname not found. Verify the IP address is correct.'
  if (e.includes('econnreset'))
    return '→ Connection reset by server. Try reconnecting.'
  if (e.includes('handshake'))
    return '→ SSH handshake failed. The server may use unsupported algorithms.'
  return '→ Click Reconnect to try again.'
}

function fmtUptime(s) {
  if (!s) return '—'
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export default function ServerDashboard({ server, status, stats, history, statusError, onReconnect }) {
  const cpuPct   = stats?.cpu ?? 0
  const ramPct   = stats?.ramTotal ? (stats.ramUsed / stats.ramTotal) * 100 : 0
  const diskPct  = stats?.diskTotal ? (stats.diskUsed / stats.diskTotal) * 100 : 0

  // Build history arrays with percent fields
  const richHistory = history.map((h) => ({
    ...h,
    ramPct: h.ramTotal ? (h.ramUsed / h.ramTotal) * 100 : 0,
    diskPct: h.diskTotal ? (h.diskUsed / h.diskTotal) * 100 : 0
  }))

  const badge = {
    online:     { bg: 'bg-[#c8ff00]/10', text: 'text-[#c8ff00]',  dot: '#c8ff00',  label: 'Online' },
    offline:    { bg: 'bg-red-500/10',   text: 'text-red-400',    dot: '#ef4444',  label: 'Offline' },
    connecting: { bg: 'bg-yellow-400/10',text: 'text-yellow-400', dot: '#f59e0b',  label: 'Connecting…' }
  }[status] ?? { bg: 'bg-red-500/10', text: 'text-red-400', dot: '#ef4444', label: 'Offline' }

  return (
    <div className="p-8 min-h-full">
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-4xl font-bold text-white">
            Hello{' '}
            <span style={{ color: ACCENT }}>{server.name}</span>
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-gray-500 text-sm">{server.ip}:{server.port || 22}</span>
            <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${badge.bg} ${badge.text}`}>
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: badge.dot }} />
              {badge.label}
            </span>
            {stats?.uptime != null && (
              <span className="flex items-center gap-1 text-gray-500 text-xs">
                <Clock size={12} />
                {fmtUptime(stats.uptime)}
              </span>
            )}
          </div>
        </div>

        {status === 'offline' && (
          <button
            onClick={onReconnect}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#2a2a2a] text-gray-300 hover:text-white hover:border-[#444] text-sm transition-colors"
          >
            <RefreshCw size={14} />
            Reconnect
          </button>
        )}
      </div>

      {/* ── Top stat cards (filled lime style) ── */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard
          icon={Cpu}
          label="CPU Usage"
          value={stats ? `${cpuPct.toFixed(1)}%` : '—'}
          delta={stats ? Math.round(cpuPct) : null}
          variant="accent"
        />
        <StatCard
          icon={MemoryStick}
          label="RAM Usage"
          value={stats ? `${ramPct.toFixed(1)}%` : '—'}
          delta={stats ? Math.round(ramPct) : null}
          variant="accent"
        />
        <StatCard
          icon={HardDrive}
          label="Disk Usage"
          value={stats ? `${diskPct.toFixed(1)}%` : '—'}
          delta={stats ? Math.round(diskPct) : null}
          variant="dark"
        />
      </div>

      {/* ── Gauge cards row ── */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <MetricCard
          title="CPU Activity"
          percent={cpuPct}
          sublabel={stats ? `Core load` : 'Waiting…'}
          color={ACCENT}
        />
        <MetricCard
          title="RAM Usage"
          rawValue={stats?.ramUsed}
          rawMax={stats?.ramTotal}
          sublabel={stats?.ramTotal ? `${(stats.ramTotal / 1024).toFixed(1)} GB total` : 'Waiting…'}
          color="#60a5fa"
        />
        <MetricCard
          title="Disk Usage"
          rawValue={stats?.diskUsed}
          rawMax={stats?.diskTotal}
          sublabel={stats?.diskTotal ? `${(stats.diskTotal / 1024).toFixed(1)} GB total` : 'Waiting…'}
          color="#c084fc"
        />
      </div>

      {/* ── History charts row ── */}
      {richHistory.length > 2 && (
        <div className="grid grid-cols-3 gap-4">
          <BarHistoryChart
            data={richHistory}
            dataKey="cpu"
            color={ACCENT}
            title="CPU History"
          />
          <BarHistoryChart
            data={richHistory}
            dataKey="ramPct"
            color="#60a5fa"
            title="RAM History"
          />
          <LineHistoryChart
            data={richHistory}
            title="Breakdown"
            series={[
              { key: 'cpu',     color: ACCENT,    label: 'CPU' },
              { key: 'ramPct',  color: '#ffffff',  label: 'RAM' },
              { key: 'diskPct', color: '#c084fc',  label: 'Disk' }
            ]}
          />
        </div>
      )}

      {/* ── Offline / connecting state ── */}
      {status === 'offline' && !stats && (
        <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
          <WifiOff size={44} className="text-gray-700 mb-4" />
          <p className="text-white font-semibold text-sm mb-1">Cannot reach server</p>

          {/* Show the real SSH error */}
          {statusError && (
            <div className="mt-3 mb-4 w-full bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-left">
              <p className="text-red-400 text-xs font-mono break-all">{statusError}</p>
              <p className="text-gray-500 text-xs mt-2">{diagnose(statusError)}</p>
            </div>
          )}

          {!statusError && (
            <p className="text-gray-600 text-xs mt-1">Check credentials or network and try reconnecting</p>
          )}
        </div>
      )}

      {status === 'connecting' && !stats && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div
            className="w-10 h-10 rounded-full border-2 border-t-transparent mb-4 animate-spin"
            style={{ borderColor: `${ACCENT} transparent transparent transparent` }}
          />
          <p className="text-gray-500 text-sm">Connecting to server…</p>
        </div>
      )}
    </div>
  )
}
