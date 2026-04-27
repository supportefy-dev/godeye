import React, { useCallback, useEffect, useState } from 'react'
import { FileText, Play, RefreshCw, RotateCw, Square } from 'lucide-react'
import PanelState from './PanelState'

function parseList(raw = '') {
  return raw.split('\n').filter(Boolean).map((line) => {
    const [id, name, image, status, ports] = line.split('|')
    return { id, name, image, status, ports }
  })
}

function badge(status = '') {
  if (/up/i.test(status)) return 'bg-[#c8ff00]/10 text-[#c8ff00]'
  if (/paused/i.test(status)) return 'bg-yellow-400/10 text-yellow-400'
  return 'bg-red-500/10 text-red-400'
}

export default function DockerMonitor({ serverId, status }) {
  const [containers, setContainers] = useState([])
  const [stats, setStats] = useState({})
  const [logs, setLogs] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!serverId || status !== 'online') return
    const res = await window.godeye.execCommand(serverId, 'docker ps -a --format "{{.ID}}|{{.Names}}|{{.Image}}|{{.Status}}|{{.Ports}}"')
    if (res.error) {
      setError('Docker not found on this server')
      return
    }
    setError('')
    setContainers(parseList(res.stdout))
    const statRes = await window.godeye.execCommand(serverId, 'docker stats --no-stream --format "{{.Name}}|{{.CPUPerc}}|{{.MemUsage}}"')
    if (!statRes.error) {
      const next = {}
      statRes.stdout.split('\n').filter(Boolean).forEach((line) => {
        const [name, cpu, mem] = line.split('|')
        next[name] = { cpu, mem }
      })
      setStats(next)
    }
  }, [serverId, status])

  useEffect(() => {
    load()
    const id = setInterval(load, 10000)
    return () => clearInterval(id)
  }, [load])

  const act = async (cmd, id) => {
    await window.godeye.execCommand(serverId, `docker ${cmd} ${id}`)
    load()
  }

  const openLogs = async (container) => {
    const res = await window.godeye.execCommand(serverId, `docker logs --tail 100 ${container.id}`)
    setLogs({ title: container.name, text: res.error || res.stdout })
  }

  if (!serverId || status !== 'online') return <PanelState title="Docker Monitor" />

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6 text-white">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Docker</h1>
        <button onClick={load} className="px-3 py-2 rounded-xl border border-[#2a2a2a] text-gray-300 flex items-center gap-2"><RefreshCw size={15} />Refresh</button>
      </div>
      {error ? <PanelState title="Docker" message={error} /> : (
        <div className="grid grid-cols-2 gap-4">
          {containers.map((c) => (
            <div key={c.id} className="bg-[#111111] border border-[#1e1e1e] rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-xl font-bold truncate">{c.name}</h2>
                  <p className="text-xs text-gray-500 font-mono truncate mt-1">{c.image}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs ${badge(c.status)}`}>{c.status}</span>
              </div>
              <p className="text-xs text-gray-500 font-mono mt-3 truncate">{c.ports || 'No ports'}</p>
              <p className="text-xs text-gray-400 mt-3">CPU {stats[c.name]?.cpu || '-'} | MEM {stats[c.name]?.mem || '-'}</p>
              <div className="flex gap-2 mt-4">
                <button onClick={() => act('start', c.id)} className="w-9 h-9 rounded-xl bg-[#1a1a1a] flex items-center justify-center"><Play size={15} /></button>
                <button onClick={() => act('stop', c.id)} className="w-9 h-9 rounded-xl bg-[#1a1a1a] flex items-center justify-center"><Square size={15} /></button>
                <button onClick={() => act('restart', c.id)} className="w-9 h-9 rounded-xl bg-[#1a1a1a] flex items-center justify-center"><RotateCw size={15} /></button>
                <button onClick={() => openLogs(c)} className="w-9 h-9 rounded-xl bg-[#1a1a1a] flex items-center justify-center"><FileText size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {logs && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-8" onClick={() => setLogs(null)}>
          <div className="bg-[#111111] border border-[#1e1e1e] rounded-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-[#1e1e1e] font-semibold">{logs.title}</div>
            <pre className="p-4 overflow-auto max-h-[70vh] text-xs text-gray-300 font-mono whitespace-pre-wrap">{logs.text}</pre>
          </div>
        </div>
      )}
    </div>
  )
}

