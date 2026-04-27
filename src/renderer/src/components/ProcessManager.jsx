import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Pause, Play, RefreshCw, Search, X } from 'lucide-react'
import PanelState from './PanelState'

const CMD = 'ps aux --sort=-%cpu | head -30'

function parseProcesses(raw = '') {
  return raw.split('\n').slice(1).filter(Boolean).map((line) => {
    const parts = line.trim().split(/\s+/)
    return {
      user: parts[0],
      pid: parts[1],
      cpu: parseFloat(parts[2]) || 0,
      mem: parseFloat(parts[3]) || 0,
      status: parts[7] || '-',
      command: parts.slice(10).join(' ') || parts[10] || '-'
    }
  })
}

export default function ProcessManager({ serverId, status }) {
  const [items, setItems] = useState([])
  const [query, setQuery] = useState('')
  const [paused, setPaused] = useState(false)
  const [sort, setSort] = useState({ key: 'cpu', dir: 'desc' })
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!serverId || status !== 'online') return
    const res = await window.godeye.execCommand(serverId, CMD)
    if (res.error) setError(res.error)
    else {
      setError('')
      setItems(parseProcesses(res.stdout))
    }
  }, [serverId, status])

  useEffect(() => {
    load()
    if (paused) return undefined
    const id = setInterval(load, 5000)
    return () => clearInterval(id)
  }, [load, paused])

  const visible = useMemo(() => {
    const q = query.toLowerCase()
    return items
      .filter((p) => p.command.toLowerCase().includes(q))
      .sort((a, b) => {
        const av = a[sort.key]
        const bv = b[sort.key]
        const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv))
        return sort.dir === 'asc' ? cmp : -cmp
      })
  }, [items, query, sort])

  const kill = async (proc) => {
    if (!window.confirm(`Kill process ${proc.command} (${proc.pid})?`)) return
    await window.godeye.execCommand(serverId, `kill -9 ${proc.pid}`)
    load()
  }

  if (!serverId || status !== 'online') return <PanelState title="Process Manager" />

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6 text-white">
      <div className="bg-[#111111] border border-[#1e1e1e] rounded-2xl overflow-hidden">
        <div className="h-14 px-4 bg-[#0d0d0d] border-b border-[#1e1e1e] flex items-center gap-3">
          <button onClick={() => setPaused((v) => !v)} className="w-9 h-9 rounded-xl bg-[#1a1a1a] flex items-center justify-center text-gray-300">{paused ? <Play size={15} /> : <Pause size={15} />}</button>
          <button onClick={load} className="w-9 h-9 rounded-xl bg-[#1a1a1a] flex items-center justify-center text-gray-300"><RefreshCw size={15} /></button>
          <div className="ml-auto flex items-center gap-2 bg-[#1a1a1a] border border-[#242424] rounded-xl px-3 py-2">
            <Search size={14} className="text-gray-500" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter processes" className="bg-transparent outline-none text-sm text-white w-56" />
          </div>
        </div>
        {error && <div className="px-4 py-2 text-xs text-red-400 border-b border-[#1e1e1e]">{error}</div>}
        <table className="w-full text-sm">
          <thead className="bg-[#0d0d0d] text-gray-500 text-xs uppercase">
            <tr>{['pid', 'command', 'cpu', 'mem', 'status'].map((key) => <th key={key} onClick={() => setSort({ key, dir: sort.key === key && sort.dir === 'desc' ? 'asc' : 'desc' })} className="text-left px-4 py-3 cursor-pointer">{key === 'command' ? 'Process Name' : key}</th>)}<th className="px-4 py-3" /></tr>
          </thead>
          <tbody>
            {visible.map((p, i) => (
              <tr key={`${p.pid}-${i}`} className={`${i < 3 ? 'bg-[#c8ff00]/5' : ''} hover:bg-[#1a1a1a] border-t border-[#1e1e1e]`}>
                <td className="px-4 py-3 font-mono">{p.pid}</td>
                <td className="px-4 py-3 font-mono text-xs max-w-xl truncate">{p.command}</td>
                <td className="px-4 py-3">{p.cpu.toFixed(1)}</td>
                <td className="px-4 py-3">{p.mem.toFixed(1)}</td>
                <td className="px-4 py-3 text-gray-400">{p.status}</td>
                <td className="px-4 py-3 text-right"><button onClick={() => kill(p)} className="w-8 h-8 rounded-lg text-red-400 hover:bg-red-500/10"><X size={16} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

