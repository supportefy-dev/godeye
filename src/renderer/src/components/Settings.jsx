import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Play, RefreshCw, RotateCw, Search, Square } from 'lucide-react'
import PanelState from './PanelState'
import Backup from './Backup'

const COMMON = ['nginx', 'apache2', 'mysql', 'postgresql', 'redis', 'docker', 'ssh']

function parseServices(raw = '') {
  return raw.split('\n').filter((l) => l.includes('.service')).map((line) => {
    const p = line.trim().split(/\s+/)
    return { name: p[0], status: p[3] || p[2] || 'unknown', enabled: '-' }
  }).slice(0, 40)
}

export default function Settings({ serverId, status }) {
  const [services, setServices] = useState([])
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [tab, setTab] = useState('services')

  const load = useCallback(async () => {
    if (!serverId || status !== 'online') return
    const res = await window.godeye.execCommand(serverId, 'systemctl list-units --type=service --state=loaded --no-pager --plain | head -40')
    if (res.error) setError(res.error)
    else {
      setError('')
      setServices(parseServices(res.stdout))
    }
  }, [serverId, status])

  useEffect(() => { load() }, [load])
  const visible = useMemo(() => services.filter((s) => s.name.toLowerCase().includes(query.toLowerCase())), [services, query])
  const run = async (cmd, svc) => {
    await window.godeye.execCommand(serverId, `systemctl ${cmd} ${svc}`)
    load()
  }

  if (!serverId || status !== 'online') return <PanelState title="Settings" />
  if (tab === 'backup') {
    return (
      <div>
        <SettingsTabs tab={tab} setTab={setTab} />
        <Backup serverId={serverId} status={status} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6 text-white">
      <SettingsTabs tab={tab} setTab={setTab} />
      <section className="bg-[#111111] border border-[#1e1e1e] rounded-2xl overflow-hidden">
        <div className="p-4 bg-[#0d0d0d] border-b border-[#1e1e1e] flex items-center gap-2">
          <h1 className="font-semibold mr-4">Services</h1>
          {COMMON.map((s) => <button key={s} onClick={() => setQuery(s)} className="px-3 py-1.5 rounded-lg border border-[#242424] text-xs text-gray-400">{s}</button>)}
          <div className="ml-auto flex items-center gap-2 bg-[#1a1a1a] rounded-xl px-3 py-2"><Search size={14} /><input value={query} onChange={(e) => setQuery(e.target.value)} className="bg-transparent outline-none text-sm" /></div>
          <button onClick={load} className="w-9 h-9 rounded-xl bg-[#1a1a1a] flex items-center justify-center"><RefreshCw size={15} /></button>
        </div>
        {error && <div className="px-4 py-2 text-xs text-red-400">{error}</div>}
        <table className="w-full text-sm"><thead className="bg-[#0d0d0d] text-gray-500"><tr><th className="text-left px-4 py-3">Name</th><th>Status</th><th>Enabled</th><th>Actions</th></tr></thead><tbody>{visible.map((s) => <tr key={s.name} className="border-t border-[#1e1e1e] hover:bg-[#1a1a1a]"><td className="px-4 py-3 font-mono">{s.name}</td><td><span className={`inline-block w-2 h-2 rounded-full mr-2 ${s.status === 'running' || s.status === 'active' ? 'bg-[#c8ff00]' : s.status === 'failed' ? 'bg-red-500' : 'bg-gray-500'}`} />{s.status}</td><td>{s.enabled}</td><td className="flex gap-2 py-2"><button onClick={() => run('start', s.name)}><Play size={15} /></button><button onClick={() => run('stop', s.name)}><Square size={15} /></button><button onClick={() => run('restart', s.name)}><RotateCw size={15} /></button><button onClick={() => run('enable', s.name)} className="text-[#c8ff00] text-xs">Enable</button><button onClick={() => run('disable', s.name)} className="text-gray-400 text-xs">Disable</button></td></tr>)}</tbody></table>
      </section>
    </div>
  )
}

function SettingsTabs({ tab, setTab }) {
  return (
    <div className="flex gap-2 mb-4">
      <button onClick={() => setTab('services')} className={`px-4 py-2 rounded-xl text-sm ${tab === 'services' ? 'bg-[#c8ff00] text-black' : 'bg-[#111111] border border-[#1e1e1e] text-gray-400'}`}>Services</button>
      <button onClick={() => setTab('backup')} className={`px-4 py-2 rounded-xl text-sm ${tab === 'backup' ? 'bg-[#c8ff00] text-black' : 'bg-[#111111] border border-[#1e1e1e] text-gray-400'}`}>Backup</button>
    </div>
  )
}
