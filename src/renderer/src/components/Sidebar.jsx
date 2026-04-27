import React from 'react'
import {
  Activity,
  Boxes,
  CalendarClock,
  FolderOpen,
  LayoutDashboard,
  Plus,
  ScrollText,
  Server,
  Settings2,
  TerminalSquare,
  User
} from 'lucide-react'
import logoSrc from '../assets/logo.png'

const ACCENT = '#c8ff00'

export default function Sidebar({
  servers,
  statuses,
  selectedId,
  activePanel,
  onPanelChange,
  onSelect,
  onAdd,
  onRemove
}) {
  return (
    <div className="w-[68px] bg-[#0a0a0a] border-r border-[#1a1a1a] flex flex-col items-center py-4 gap-2 flex-shrink-0">
      {/* Logo */}
      <div className="w-10 h-10 flex items-center justify-center mb-3 select-none">
        <img src={logoSrc} alt="GodEye" className="w-10 h-10 object-contain" style={{ filter: 'drop-shadow(0 0 6px #c8ff0066)' }} />
      </div>

      {/* Nav icons */}
      <NavIcon icon={LayoutDashboard} active={activePanel === 'dashboard'} onClick={() => onPanelChange('dashboard')} title="Dashboard" />
      <NavIcon icon={Server} active={activePanel === 'servers'} onClick={() => onPanelChange('servers')} title="Servers" />
      <NavIcon icon={FolderOpen} active={activePanel === 'files'} onClick={() => onPanelChange('files')} title="File Manager" />
      <NavIcon icon={TerminalSquare} active={activePanel === 'terminal'} onClick={() => onPanelChange('terminal')} title="Terminal" />
      <NavIcon icon={Activity} active={activePanel === 'processes'} onClick={() => onPanelChange('processes')} title="Processes" />
      <NavIcon icon={ScrollText} active={activePanel === 'logs'} onClick={() => onPanelChange('logs')} title="Logs" />
      <NavIcon icon={Boxes} active={activePanel === 'docker'} onClick={() => onPanelChange('docker')} title="Docker" />
      <NavIcon icon={CalendarClock} active={activePanel === 'cron'} onClick={() => onPanelChange('cron')} title="Cron" />
      <NavIcon icon={Settings2} active={activePanel === 'settings'} onClick={() => onPanelChange('settings')} title="Settings" />

      <div className="flex-1" />

      {/* Server dots — one per server */}
      <div className="flex flex-col gap-1.5 mb-2">
        {servers.map((server) => {
          const st = statuses[server.id]
          const dotColor =
            st === 'online' ? ACCENT : st === 'connecting' ? '#f59e0b' : '#ef4444'
          return (
            <button
              key={server.id}
              onClick={() => onSelect(server.id)}
              title={server.name}
              className={`group relative w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                selectedId === server.id ? 'bg-[#1e1e1e]' : 'hover:bg-[#161616]'
              }`}
            >
              <Server size={16} className="text-gray-400 group-hover:text-white transition-colors" />
              {/* status dot */}
              <span
                className="absolute bottom-1 right-1 w-2 h-2 rounded-full border border-[#0a0a0a]"
                style={{
                  background: dotColor,
                  animation: st === 'connecting' ? 'pulse 1.5s infinite' : undefined
                }}
              />
              {/* remove on hover */}
              <span
                onClick={(e) => { e.stopPropagation(); onRemove(server.id) }}
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white items-center justify-center hidden group-hover:flex text-[9px] cursor-pointer"
              >
                ×
              </span>
            </button>
          )
        })}
      </div>

      {/* Add button */}
      <button
        onClick={onAdd}
        title="Add server"
        className="w-9 h-9 rounded-xl border border-dashed border-[#2a2a2a] flex items-center justify-center text-gray-500 hover:border-[#c8ff00] hover:text-[#c8ff00] transition-colors mb-1"
      >
        <Plus size={16} />
      </button>

      {/* User avatar placeholder */}
      <div className="w-9 h-9 rounded-full bg-[#1e1e1e] flex items-center justify-center mt-1">
        <User size={15} className="text-gray-400" />
      </div>
    </div>
  )
}

function NavIcon({ icon: Icon, active, onClick, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
        active ? 'text-black bg-[#c8ff00]' : 'text-gray-600 hover:text-gray-300 hover:bg-[#161616]'
      }`}
    >
      <Icon size={17} />
    </button>
  )
}
