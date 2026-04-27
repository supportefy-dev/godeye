import React, { useEffect, useRef, useState } from 'react'
import { Terminal as XTerm } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import 'xterm/css/xterm.css'

const ACCENT = '#c8ff00'

export default function Terminal({ server, serverId, status }) {
  const hostRef = useRef(null)
  const xtermRef = useRef(null)
  const fitRef = useRef(null)
  const termIdRef = useRef(null)
  const [error, setError] = useState('')
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!serverId || status !== 'online' || !hostRef.current) return

    let disposed = false
    const terminal = new XTerm({
      cursorBlink: true,
      fontFamily: 'Consolas, "Courier New", monospace',
      fontSize: 13,
      theme: {
        background: '#0a0a0a',
        foreground: '#e0e0e0',
        cursor: ACCENT,
        selectionBackground: '#c8ff0033',
        black: '#0a0a0a',
        brightBlack: '#555555',
        green: ACCENT,
        brightGreen: ACCENT
      }
    })
    const fitAddon = new FitAddon()

    xtermRef.current = terminal
    fitRef.current = fitAddon
    terminal.loadAddon(fitAddon)
    terminal.open(hostRef.current)
    fitAddon.fit()

    const inputDisposable = terminal.onData((data) => {
      if (termIdRef.current) window.godeye.terminalInput(termIdRef.current, data)
    })

    const unsubscribe = window.godeye.onTerminalData(({ termId, data }) => {
      if (termId === termIdRef.current) terminal.write(data)
    })

    const resize = () => {
      if (!fitRef.current || !xtermRef.current || !termIdRef.current) return
      fitRef.current.fit()
      window.godeye.terminalResize(termIdRef.current, xtermRef.current.cols, xtermRef.current.rows)
    }

    const observer = new ResizeObserver(resize)
    observer.observe(hostRef.current)

    window.godeye.terminalCreate(serverId)
      .then((termId) => {
        if (disposed) {
          window.godeye.terminalClose(termId)
          return
        }
        termIdRef.current = termId
        setConnected(true)
        resize()
      })
      .catch((err) => {
        setError(err.message || 'Failed to open terminal')
      })

    return () => {
      disposed = true
      observer.disconnect()
      unsubscribe()
      inputDisposable.dispose()
      if (termIdRef.current) window.godeye.terminalClose(termIdRef.current)
      termIdRef.current = null
      terminal.dispose()
      xtermRef.current = null
      fitRef.current = null
      setConnected(false)
    }
  }, [serverId, status])

  if (!serverId) {
    return <PanelState title="Terminal" message="Select a server to open an SSH terminal." />
  }

  if (status !== 'online') {
    return <PanelState title="Terminal" message="Server must be online before a terminal can open." />
  }

  return (
    <div className="h-full min-h-screen bg-[#0a0a0a] p-6 flex flex-col text-white">
      <div className="h-12 px-4 bg-[#111111] border border-[#1e1e1e] rounded-t-2xl flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: connected ? ACCENT : '#f59e0b' }}
          />
          <span className="font-semibold truncate">{server?.name || 'SSH Terminal'}</span>
          <span className="text-xs text-gray-500 font-mono truncate">{server?.ip || ''}</span>
        </div>
        <span className="text-xs text-gray-500">{connected ? 'Connected' : 'Connecting'}</span>
      </div>

      {error && (
        <div className="px-4 py-2 bg-red-500/10 border-x border-[#1e1e1e] text-red-400 text-xs">
          {error}
        </div>
      )}

      <div className="flex-1 min-h-0 bg-[#0a0a0a] border-x border-b border-[#1e1e1e] rounded-b-2xl overflow-hidden">
        <div ref={hostRef} className="w-full h-full p-3" />
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
