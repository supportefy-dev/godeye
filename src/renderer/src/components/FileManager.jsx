import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ChevronRight,
  Download,
  FileText,
  FolderOpen,
  RefreshCw,
  Trash2,
  Upload
} from 'lucide-react'

const ACCENT = '#c8ff00'

function joinRemotePath(base, name) {
  if (!base || base === '/') return `/${name}`
  return `${base.replace(/\/$/, '')}/${name}`
}

function parentPath(path) {
  if (!path || path === '/') return '/'
  const parts = path.split('/').filter(Boolean)
  parts.pop()
  return parts.length ? `/${parts.join('/')}` : '/'
}

function formatSize(bytes) {
  if (!bytes) return '0 KB'
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

function formatDate(ts) {
  if (!ts) return '-'
  return new Date(ts).toLocaleString()
}

export default function FileManager({ serverId, status }) {
  const [path, setPath] = useState('/')
  const [entries, setEntries] = useState([])
  const [selected, setSelected] = useState(null)
  const [preview, setPreview] = useState(null)   // null=none, 'loading'=fetching, string=content
  const [previewError, setPreviewError] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const crumbs = useMemo(() => {
    const parts = path.split('/').filter(Boolean)
    return [{ label: '/', path: '/' }].concat(
      parts.map((part, index) => ({
        label: part,
        path: `/${parts.slice(0, index + 1).join('/')}`
      }))
    )
  }, [path])

  const loadPath = useCallback(async (nextPath = '/') => {
    if (!serverId || status !== 'online') return
    setLoading(true)
    setError('')
    try {
      const list = await window.godeye.sftpList({ serverId, path: nextPath })
      setEntries(list)
      setPath(nextPath)
      setSelected(null)
      setPreview(null)
      setPreviewError('')
    } catch (err) {
      setError(err.message || 'Failed to list directory')
    } finally {
      setLoading(false)
    }
  }, [serverId, status])

  useEffect(() => {
    setPath('/')
    setEntries([])
    setSelected(null)
    setPreview('')
    loadPath('/')
  }, [serverId, status])

  const openEntry = async (entry) => {
    setSelected(entry)
    setError('')
    if (entry.type === 'directory') {
      await loadPath(entry.path)
      return
    }

    setPreview('loading')
    setPreviewError('')
    try {
      const text = await window.godeye.sftpRead({ serverId, path: entry.path })
      setPreview(text ?? '')
    } catch (err) {
      setPreview(null)
      setPreviewError(err.message || 'Failed to read file')
    }
  }

  const deleteEntry = async (entry) => {
    const confirmed = window.confirm(`Delete ${entry.path}?`)
    if (!confirmed) return
    setError('')
    try {
      await window.godeye.sftpDelete({ serverId, path: entry.path })
      await loadPath(path)
    } catch (err) {
      setError(err.message || 'Failed to delete item')
    }
  }

  const downloadEntry = async (entry) => {
    setError('')
    try {
      await window.godeye.sftpDownload({ serverId, remotePath: entry.path })
    } catch (err) {
      setError(err.message || 'Failed to download file')
    }
  }

  const uploadFile = async () => {
    setError('')
    try {
      const file = await window.godeye.pickUploadFile()
      if (!file) return
      await window.godeye.sftpUpload({
        serverId,
        localPath: file.path,
        remotePath: joinRemotePath(path, file.name)
      })
      await loadPath(path)
    } catch (err) {
      setError(err.message || 'Failed to upload file')
    }
  }

  if (!serverId) {
    return <PanelState title="File Manager" message="Select a server to browse files." />
  }

  if (status !== 'online') {
    return <PanelState title="File Manager" message="Server must be online before SFTP can open." />
  }

  return (
    <div className="h-full min-h-screen p-6 bg-[#0a0a0a] text-white">
      <div className="h-full min-h-[calc(100vh-48px)] grid grid-cols-[minmax(360px,42%)_1fr] gap-4">
        <section className="bg-[#111111] border border-[#1e1e1e] rounded-2xl overflow-hidden flex flex-col">
          <div className="h-14 px-4 border-b border-[#1e1e1e] flex items-center gap-2">
            <button
              onClick={() => loadPath(path)}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#1e1e1e]"
              title="Refresh"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={uploadFile}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-[#c8ff00] hover:bg-[#1e1e1e]"
              title="Upload"
            >
              <Upload size={16} />
            </button>

            <div className="flex items-center gap-1 min-w-0 text-xs font-mono text-gray-400">
              {crumbs.map((crumb, index) => (
                <React.Fragment key={crumb.path}>
                  {index > 0 && <ChevronRight size={13} className="text-gray-700 flex-shrink-0" />}
                  <button
                    onClick={() => loadPath(crumb.path)}
                    className="hover:text-[#c8ff00] truncate max-w-[130px]"
                    title={crumb.path}
                  >
                    {crumb.label}
                  </button>
                </React.Fragment>
              ))}
            </div>
          </div>

          {error && <div className="px-4 py-2 text-xs text-red-400 border-b border-[#1e1e1e]">{error}</div>}

          <div className="grid grid-cols-[1fr_90px_155px] gap-3 px-4 py-2 text-[10px] uppercase tracking-widest text-gray-600 border-b border-[#1e1e1e]">
            <span>Name</span>
            <span>Size</span>
            <span>Modified</span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {path !== '/' && (
              <button
                onClick={() => loadPath(parentPath(path))}
                className="w-full grid grid-cols-[1fr_90px_155px] gap-3 px-4 py-2.5 text-left text-sm font-mono text-gray-400 hover:bg-[#171717]"
              >
                <span>..</span>
                <span>-</span>
                <span>-</span>
              </button>
            )}

            {entries.map((entry) => {
              const isSelected = selected?.path === entry.path
              const Icon = entry.type === 'directory' ? FolderOpen : FileText
              return (
                <div
                  key={entry.path}
                  className={`group grid grid-cols-[1fr_90px_155px] gap-3 px-4 py-2.5 text-sm items-center cursor-pointer ${
                    isSelected ? 'bg-[#c8ff00]/10 text-white' : 'text-gray-300 hover:bg-[#171717]'
                  }`}
                  onClick={() => openEntry(entry)}
                >
                  <div className="min-w-0 flex items-center gap-2 font-mono">
                    <Icon size={15} style={{ color: entry.type === 'directory' ? ACCENT : '#8b8b8b' }} />
                    <span className="truncate">{entry.name}</span>
                    <div className="ml-auto hidden group-hover:flex items-center gap-1">
                      {entry.type === 'file' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); downloadEntry(entry) }}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-[#242424]"
                          title="Download"
                        >
                          <Download size={14} />
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteEntry(entry) }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-[#242424]"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <span className="font-mono text-xs text-gray-500">{entry.type === 'file' ? formatSize(entry.size) : '-'}</span>
                  <span className="font-mono text-xs text-gray-500 truncate">{formatDate(entry.mtime)}</span>
                </div>
              )
            })}

            {!loading && entries.length === 0 && (
              <div className="px-4 py-10 text-center text-sm text-gray-600">Empty directory</div>
            )}
          </div>
        </section>

        <section className="bg-[#111111] border border-[#1e1e1e] rounded-2xl overflow-hidden flex flex-col">
          <div className="h-14 px-4 border-b border-[#1e1e1e] flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">Preview</p>
              <p className="text-xs font-mono text-gray-500 truncate">{selected?.path || 'No file selected'}</p>
            </div>
            <span className="text-[10px] uppercase tracking-widest text-gray-600">First 50KB</span>
          </div>
          <pre className="flex-1 overflow-auto p-4 text-xs leading-5 font-mono whitespace-pre-wrap">
            {preview === null && !previewError && (
              <span className="text-gray-600">Select a text file to preview its content.</span>
            )}
            {preview === 'loading' && (
              <span className="text-gray-500">Loading…</span>
            )}
            {previewError && (
              <span className="text-red-400">{previewError}</span>
            )}
            {preview !== null && preview !== 'loading' && !previewError && (
              preview === ''
                ? <span className="text-gray-600 italic">(Empty file)</span>
                : <span className="text-gray-300">{preview}</span>
            )}
          </pre>
        </section>
      </div>
    </div>
  )
}

function PanelState({ title, message }) {
  return (
    <div className="h-full min-h-screen bg-[#0a0a0a] p-8 flex items-center justify-center">
      <div className="bg-[#111111] border border-[#1e1e1e] rounded-2xl p-8 text-center">
        <p className="text-white font-semibold">{title}</p>
        <p className="text-gray-500 text-sm mt-2">{message}</p>
      </div>
    </div>
  )
}
