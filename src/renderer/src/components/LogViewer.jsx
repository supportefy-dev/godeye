import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Clipboard, Eraser, Play, Search } from 'lucide-react'
import PanelState from './PanelState'

const PATHS = ['/var/log/syslog', '/var/log/auth.log', '/var/log/nginx/access.log', '/var/log/nginx/error.log', '/var/log/mysql/error.log']

function esc(path) {
  return `'${path.replace(/'/g, "'\\''")}'`
}

function colorFor(line) {
  if (/error/i.test(line)) return 'text-red-400'
  if (/warn/i.test(line)) return 'text-yellow-400'
  if (/info/i.test(line)) return 'text-blue-400'
  return 'text-gray-400'
}

export default function LogViewer({ serverId, status }) {
  const [path, setPath] = useState(PATHS[0])
  const [custom, setCustom] = useState('')
  const [lines, setLines] = useState([])
  const [live, setLive] = useState(false)
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const scrollRef = useRef(null)
  const seenRef = useRef(new Set())

  const load = useCallback(async (count = 200, append = false) => {
    if (!serverId || status !== 'online' || !path) return
    const res = await window.godeye.execCommand(serverId, `tail -n ${count} ${esc(path)}`)
    if (res.error) {
      setError(res.error)
      return
    }
    setError('')
    const next = (res.stdout || '').split('\n').filter(Boolean)
    if (!append) {
      seenRef.current = new Set(next)
      setLines(next)
      return
    }
    const fresh = next.filter((line) => {
      const key = `${line}`
      if (seenRef.current.has(key)) return false
      seenRef.current.add(key)
      return true
    })
    if (fresh.length) setLines((prev) => [...prev, ...fresh].slice(-1000))
  }, [path, serverId, status])

  useEffect(() => { load(200, false) }, [load])
  useEffect(() => {
    if (!live) return undefined
    const id = setInterval(() => load(50, true), 3000)
    return () => clearInterval(id)
  }, [live, load])
  useEffect(() => {
    const el = scrollRef.current
    if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 120) el.scrollTop = el.scrollHeight
  }, [lines])

  const visible = useMemo(() => lines.filter((line) => line.toLowerCase().includes(query.toLowerCase())), [lines, query])

  if (!serverId || status !== 'online') return <PanelState title="Log Viewer" />

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6 text-white">
      <div className="bg-[#111111] border border-[#1e1e1e] rounded-2xl overflow-hidden flex flex-col min-h-[calc(100vh-48px)]">
        <div className="p-4 bg-[#0d0d0d] border-b border-[#1e1e1e] flex flex-wrap items-center gap-2">
          {PATHS.map((p) => <button key={p} onClick={() => setPath(p)} className={`px-3 py-2 rounded-xl text-xs font-mono border ${path === p ? 'bg-[#c8ff00] text-black border-[#c8ff00]' : 'border-[#242424] text-gray-400'}`}>{p}</button>)}
          <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Custom path" className="bg-[#1a1a1a] border border-[#242424] rounded-xl px-3 py-2 text-xs font-mono outline-none" />
          <button onClick={() => custom && setPath(custom)} className="px-3 py-2 rounded-xl bg-[#c8ff00] text-black text-xs font-semibold">Open</button>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setLive((v) => !v)} className="w-9 h-9 rounded-xl bg-[#1a1a1a] flex items-center justify-center text-gray-300"><Play size={15} className={live ? 'text-[#c8ff00]' : ''} /></button>
            <button onClick={() => navigator.clipboard.writeText(visible.join('\n'))} className="w-9 h-9 rounded-xl bg-[#1a1a1a] flex items-center justify-center text-gray-300"><Clipboard size={15} /></button>
            <button onClick={() => setLines([])} className="w-9 h-9 rounded-xl bg-[#1a1a1a] flex items-center justify-center text-gray-300"><Eraser size={15} /></button>
          </div>
        </div>
        <div className="px-4 py-3 border-b border-[#1e1e1e] flex items-center gap-2">
          <Search size={14} className="text-gray-500" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search logs" className="bg-transparent outline-none text-sm flex-1" />
        </div>
        {error && <div className="px-4 py-2 text-xs text-red-400 border-b border-[#1e1e1e]">{error}</div>}
        <div ref={scrollRef} className="flex-1 overflow-auto p-4 font-mono text-xs leading-5">
          {visible.map((line, i) => (
            <div key={`${i}-${line}`} className={colorFor(line)}>
              {query ? line.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig')).map((part, n) => part.toLowerCase() === query.toLowerCase() ? <span key={n} className="text-[#c8ff00] bg-[#c8ff00]/10">{part}</span> : part) : line}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

