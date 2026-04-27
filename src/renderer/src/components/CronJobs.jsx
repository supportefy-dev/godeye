import React, { useCallback, useEffect, useState } from 'react'
import { Plus, Save, Trash2 } from 'lucide-react'
import PanelState from './PanelState'

function describe(m, h, d, mo, w) {
  if (m === '0' && h !== '*' && d === '*' && mo === '*' && w === '*') return `Every day at ${String(h).padStart(2, '0')}:00`
  if (m === '0' && h === '*' && d === '*' && mo === '*' && w === '*') return 'Every hour'
  if (m === '0' && h === '0' && d === '*' && mo === '*' && w === '0') return 'Every week'
  if (m === '0' && h === '0' && d === '1' && mo === '*' && w === '*') return 'Every month'
  return `${m} ${h} ${d} ${mo} ${w}`
}

function parse(raw = '') {
  return raw.split('\n').filter((line) => line.trim() && !line.trim().startsWith('#')).map((line, i) => {
    const p = line.trim().split(/\s+/)
    return { id: i, minute: p[0], hour: p[1], day: p[2], month: p[3], weekday: p[4], command: p.slice(5).join(' ') }
  })
}

export default function CronJobs({ serverId, status }) {
  const [jobs, setJobs] = useState([])
  const [system, setSystem] = useState('')
  const [form, setForm] = useState({ minute: '0', hour: '*', day: '*', month: '*', weekday: '*', command: '' })

  const load = useCallback(async () => {
    if (!serverId || status !== 'online') return
    const user = await window.godeye.execCommand(serverId, 'crontab -l 2>/dev/null || echo ""')
    const sys = await window.godeye.execCommand(serverId, 'cat /etc/crontab')
    setJobs(parse(user.stdout || ''))
    setSystem(sys.stdout || sys.error || '')
  }, [serverId, status])

  useEffect(() => { load() }, [load])

  const saveJobs = async (next) => {
    const content = next.map((j) => `${j.minute} ${j.hour} ${j.day} ${j.month} ${j.weekday} ${j.command}`).join('\n')
    await window.godeye.execCommand(serverId, `cat <<'EOF' | crontab -\n${content}\nEOF`)
    setJobs(next)
  }

  if (!serverId || status !== 'online') return <PanelState title="Cron Jobs" />

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6 text-white grid grid-cols-2 gap-4">
      <section className="bg-[#111111] border border-[#1e1e1e] rounded-2xl overflow-hidden">
        <div className="px-4 py-3 bg-[#0d0d0d] border-b border-[#1e1e1e] font-semibold">User Crontab</div>
        <div className="p-4 grid grid-cols-6 gap-2">
          {['minute', 'hour', 'day', 'month', 'weekday'].map((k) => <input key={k} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className="bg-[#1a1a1a] border border-[#242424] rounded-xl px-3 py-2 text-sm" />)}
          <button onClick={() => setForm({ ...form, minute: '0', hour: '*' })} className="text-xs text-gray-400">Hourly</button>
          <input value={form.command} onChange={(e) => setForm({ ...form, command: e.target.value })} placeholder="Command" className="col-span-5 bg-[#1a1a1a] border border-[#242424] rounded-xl px-3 py-2 text-sm" />
          <button onClick={() => form.command && saveJobs([...jobs, { ...form, id: Date.now() }])} className="rounded-xl bg-[#c8ff00] text-black flex items-center justify-center"><Plus size={15} /></button>
        </div>
        <div className="divide-y divide-[#1e1e1e]">
          {jobs.map((j, idx) => <div key={j.id} className="grid grid-cols-[1fr_2fr_70px] gap-3 px-4 py-3 hover:bg-[#1a1a1a] text-sm">
            <div className="text-gray-400">{describe(j.minute, j.hour, j.day, j.month, j.weekday)}</div>
            <input value={j.command} onChange={(e) => setJobs(jobs.map((x, n) => n === idx ? { ...x, command: e.target.value } : x))} className="bg-transparent font-mono text-xs outline-none" />
            <div className="flex gap-1"><button onClick={() => saveJobs(jobs)}><Save size={15} /></button><button onClick={() => saveJobs(jobs.filter((_, n) => n !== idx))} className="text-red-400"><Trash2 size={15} /></button></div>
          </div>)}
        </div>
      </section>
      <section className="bg-[#111111] border border-[#1e1e1e] rounded-2xl overflow-hidden">
        <div className="px-4 py-3 bg-[#0d0d0d] border-b border-[#1e1e1e] font-semibold">System Crontab (/etc/crontab)</div>
        <pre className="p-4 text-xs text-gray-400 font-mono overflow-auto whitespace-pre-wrap">{system}</pre>
      </section>
    </div>
  )
}

