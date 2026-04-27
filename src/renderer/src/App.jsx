import React, { useState, useEffect, useRef } from 'react'
import Sidebar from './components/Sidebar'
import ServerDashboard from './components/ServerDashboard'
import AddServerModal from './components/AddServerModal'
import EmptyState from './components/EmptyState'
import FileManager from './components/FileManager'
import Terminal from './components/Terminal'
import ProcessManager from './components/ProcessManager'
import LogViewer from './components/LogViewer'
import DockerMonitor from './components/DockerMonitor'
import CronJobs from './components/CronJobs'
import Settings from './components/Settings'
import ServersPanel from './components/ServersPanel'

export default function App() {
  const [servers, setServers] = useState([])
  const [statuses, setStatuses] = useState({})
  const [stats, setStats] = useState({})
  const [history, setHistory] = useState({})
  const [selectedId, setSelectedId] = useState(null)
  const [activePanel, setActivePanel] = useState('dashboard')
  const [showModal, setShowModal] = useState(false)
  const [statusErrors, setStatusErrors] = useState({})
  const alertCooldowns = useRef({})
  const serversRef = useRef([])

  useEffect(() => {
    serversRef.current = servers
  }, [servers])

  useEffect(() => {
    window.godeye.getServers().then((list) => {
      setServers(list)
      if (list.length > 0) setSelectedId(list[0].id)
    })

    const unsubStats = window.godeye.onStatsUpdate((data) => {
      const { id, ts, ...metrics } = data
      maybeNotify(id, metrics, serversRef.current, alertCooldowns.current)
      setStats((prev) => ({ ...prev, [id]: { ...metrics, ts } }))
      setHistory((prev) => {
        const h = prev[id] || []
        return { ...prev, [id]: [...h.slice(-29), { ...metrics, ts }] }
      })
    })

    const unsubStatus = window.godeye.onServerStatus((data) => {
      setStatuses((prev) => ({ ...prev, [data.id]: data.status }))
      if (data.error) setStatusErrors((prev) => ({ ...prev, [data.id]: data.error }))
      else if (data.status === 'online') setStatusErrors((prev) => ({ ...prev, [data.id]: null }))
    })

    return () => {
      unsubStats()
      unsubStatus()
    }
  }, [])

  const handleAddServer = async (formData) => {
    const server = { ...formData, id: crypto.randomUUID() }
    await window.godeye.addServer(server)
    setServers((prev) => [...prev, server])
    setSelectedId(server.id)
    setShowModal(false)
  }

  const handleRemoveServer = async (id) => {
    await window.godeye.removeServer(id)
    setServers((prev) => prev.filter((s) => s.id !== id))
    setStats((prev) => { const n = { ...prev }; delete n[id]; return n })
    setStatuses((prev) => { const n = { ...prev }; delete n[id]; return n })
    setHistory((prev) => { const n = { ...prev }; delete n[id]; return n })
    if (selectedId === id) {
      setSelectedId(servers.find((s) => s.id !== id)?.id ?? null)
    }
  }

  const selectedServer = servers.find((s) => s.id === selectedId) ?? null
  const selectedStats = stats[selectedId] ?? null
  const selectedStatus = statuses[selectedId] ?? 'connecting'
  const selectedHistory = history[selectedId] ?? []

  return (
    <div className="flex h-screen bg-[#0a0a0a] overflow-hidden">
      <Sidebar
        servers={servers}
        statuses={statuses}
        selectedId={selectedId}
        activePanel={activePanel}
        onPanelChange={setActivePanel}
        onSelect={setSelectedId}
        onAdd={() => setShowModal(true)}
        onRemove={handleRemoveServer}
      />

      <main className="flex-1 overflow-y-auto">
        {activePanel === 'dashboard' && selectedServer ? (
          <ServerDashboard
            server={selectedServer}
            status={selectedStatus}
            stats={selectedStats}
            history={selectedHistory}
            statusError={statusErrors[selectedId] ?? null}
            onReconnect={() => window.godeye.reconnectServer(selectedId)}
          />
        ) : activePanel === 'dashboard' ? (
          <EmptyState onAdd={() => setShowModal(true)} />
        ) : activePanel === 'servers' ? (
          <ServersPanel
            servers={servers}
            statuses={statuses}
            stats={stats}
            onSelect={(id) => { setSelectedId(id); setActivePanel('dashboard') }}
            onReconnect={(id) => window.godeye.reconnectServer(id)}
            onRemove={handleRemoveServer}
            onAdd={() => setShowModal(true)}
          />
        ) : activePanel === 'files' ? (
          <FileManager serverId={selectedId} status={selectedStatus} />
        ) : activePanel === 'terminal' ? (
          <Terminal server={selectedServer} serverId={selectedId} status={selectedStatus} />
        ) : activePanel === 'processes' ? (
          <ProcessManager serverId={selectedId} status={selectedStatus} />
        ) : activePanel === 'logs' ? (
          <LogViewer serverId={selectedId} status={selectedStatus} />
        ) : activePanel === 'docker' ? (
          <DockerMonitor serverId={selectedId} status={selectedStatus} />
        ) : activePanel === 'cron' ? (
          <CronJobs serverId={selectedId} status={selectedStatus} />
        ) : (
          <Settings serverId={selectedId} status={selectedStatus} />
        )}
      </main>

      {showModal && (
        <AddServerModal onAdd={handleAddServer} onClose={() => setShowModal(false)} />
      )}
    </div>
  )
}

function maybeNotify(id, metrics, servers, cooldowns) {
  if (!window.Notification) return
  const server = servers.find((s) => s.id === id)
  const name = server?.name || 'Server'
  const now = Date.now()
  const checks = [
    ['cpu', metrics.cpu, 85, `${name} CPU at ${Number(metrics.cpu || 0).toFixed(1)}%`],
    ['ram', metrics.ramTotal ? (metrics.ramUsed / metrics.ramTotal) * 100 : 0, 90, `${name} RAM at ${metrics.ramTotal ? ((metrics.ramUsed / metrics.ramTotal) * 100).toFixed(1) : 0}%`],
    ['disk', metrics.diskTotal ? (metrics.diskUsed / metrics.diskTotal) * 100 : 0, 90, `${name} Disk at ${metrics.diskTotal ? ((metrics.diskUsed / metrics.diskTotal) * 100).toFixed(1) : 0}%`]
  ]

  checks.forEach(([kind, value, threshold, title]) => {
    const key = `${id}:${kind}`
    if (value <= threshold || now - (cooldowns[key] || 0) < 60000) return
    cooldowns[key] = now
    new window.Notification(title, { body: 'GodEye threshold alert' })
  })
}
