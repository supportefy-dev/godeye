import React, { useCallback, useEffect, useState } from 'react'
import { Download, FolderOpen, RefreshCw, Trash2, Upload } from 'lucide-react'
import PanelState from './PanelState'

function size(bytes = 0) {
  if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

export default function Backup({ serverId, status }) {
  const [tab, setTab] = useState('create')
  const [path, setPath] = useState('/')
  const [entries, setEntries] = useState([])
  const [selected, setSelected] = useState({})
  const [dest, setDest] = useState('')
  const [history, setHistory] = useState([])
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)

  const loadList = useCallback(async (next = path) => {
    if (!serverId || status !== 'online') return
    const list = await window.godeye.sftpList({ serverId, path: next })
    setEntries(list)
    setPath(next)
  }, [path, serverId, status])

  const loadHistory = useCallback(async () => setHistory(await window.godeye.backupHistory()), [])
  useEffect(() => { loadList('/'); loadHistory() }, [loadList, loadHistory])

  const start = async () => {
    const remotePaths = Object.keys(selected).filter((k) => selected[k])
    if (!remotePaths.length || !dest) return
    setBusy(true)
    const res = await window.godeye.backupFiles({ serverId, remotePaths, localDest: dest })
    setResult(res)
    setBusy(false)
    loadHistory()
  }

  const restore = async (entry) => {
    const remotePath = window.prompt('Restore to remote path', '/')
    if (!remotePath) return
    const res = await window.godeye.backupRestore({ serverId, localZip: entry.path, remotePath })
    if (!res.success) window.alert(res.error || 'Restore failed')
  }

  if (!serverId || status !== 'online') return <PanelState title="Backup" />

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6 text-white">
      <div className="flex gap-2 mb-4">
        {['create', 'history'].map((t) => <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-xl text-sm ${tab === t ? 'bg-[#c8ff00] text-black' : 'bg-[#111111] border border-[#1e1e1e] text-gray-400'}`}>{t === 'create' ? 'Create Backup' : 'History'}</button>)}
      </div>
      {tab === 'create' ? (
        <div className="grid grid-cols-[1fr_360px] gap-4">
          <section className="bg-[#111111] border border-[#1e1e1e] rounded-2xl overflow-hidden">
            <div className="px-4 py-3 bg-[#0d0d0d] border-b border-[#1e1e1e] flex items-center gap-2">
              <button onClick={() => loadList(path)}><RefreshCw size={15} /></button>
              <span className="font-mono text-xs text-gray-400">{path}</span>
            </div>
            {path !== '/' && <button onClick={() => loadList(path.split('/').slice(0, -1).join('/') || '/')} className="w-full text-left px-4 py-2 hover:bg-[#1a1a1a] font-mono">..</button>}
            {entries.map((e) => <div key={e.path} className="grid grid-cols-[32px_1fr_90px] px-4 py-2 hover:bg-[#1a1a1a] items-center">
              <input type="checkbox" checked={!!selected[e.path]} onChange={(ev) => setSelected({ ...selected, [e.path]: ev.target.checked })} />
              <button onClick={() => e.type === 'directory' && loadList(e.path)} className="text-left font-mono text-sm flex items-center gap-2">{e.type === 'directory' ? <FolderOpen size={15} className="text-[#c8ff00]" /> : <Download size={15} className="text-gray-500" />}{e.name}</button>
              <span className="text-xs text-gray-500">{e.type === 'file' ? size(e.size) : '-'}</span>
            </div>)}
          </section>
          <aside className="bg-[#111111] border border-[#1e1e1e] rounded-2xl p-5">
            <h2 className="font-semibold mb-4">Backup Destination</h2>
            <button onClick={async () => setDest(await window.godeye.pickBackupFolder() || dest)} className="w-full py-3 rounded-xl border border-[#2a2a2a] text-gray-300">Choose Folder</button>
            <p className="text-xs text-gray-500 font-mono mt-3 break-all">{dest || 'No destination selected'}</p>
            <button disabled={busy} onClick={start} className="w-full mt-5 py-3 rounded-xl bg-[#c8ff00] text-black font-semibold">{busy ? 'Downloading files...' : 'Start Backup'}</button>
            {result && <div className="mt-5 p-4 rounded-xl bg-[#0d0d0d] border border-[#1e1e1e] text-sm"><p className={result.success ? 'text-[#c8ff00]' : 'text-red-400'}>{result.success ? 'Backup complete' : result.error}</p>{result.path && <p className="text-xs text-gray-500 font-mono mt-2 break-all">{result.path}</p>}</div>}
          </aside>
        </div>
      ) : (
        <section className="bg-[#111111] border border-[#1e1e1e] rounded-2xl overflow-hidden">
          <table className="w-full text-sm"><thead className="bg-[#0d0d0d] text-gray-500"><tr><th className="text-left p-3">Date</th><th>Server</th><th>Files</th><th>Size</th><th>Path</th><th>Actions</th></tr></thead><tbody>{history.map((h) => <tr key={h.id} className="border-t border-[#1e1e1e] hover:bg-[#1a1a1a]"><td className="p-3">{new Date(h.date).toLocaleString()}</td><td>{h.serverName}</td><td>{h.fileCount}</td><td>{size(h.size)}</td><td className="font-mono text-xs text-gray-500 max-w-md truncate">{h.path}</td><td className="flex gap-3 py-3"><button onClick={() => restore(h)} className="text-[#c8ff00]"><Upload size={15} /></button><button onClick={() => window.godeye.backupDelete({ id: h.id, deleteFile: window.confirm('Delete local zip too?') }).then(loadHistory)} className="text-red-400"><Trash2 size={15} /></button></td></tr>)}</tbody></table>
        </section>
      )}
    </div>
  )
}
