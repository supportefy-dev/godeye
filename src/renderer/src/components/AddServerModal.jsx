import React, { useState } from 'react'
import { Server, X } from 'lucide-react'

const ACCENT = '#c8ff00'

export default function AddServerModal({ onAdd, onClose }) {
  const [form, setForm] = useState({
    name: '',
    ip: '',
    port: '22',
    username: '',
    password: '',
    authType: 'password',
    privateKeyPath: ''
  })
  const [err, setErr] = useState('')

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }))

  const pickKey = async () => {
    const file = await window.godeye.pickKeyFile()
    if (file) setForm((p) => ({ ...p, privateKeyPath: file.path }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name || !form.ip || !form.username) {
      setErr('All fields are required')
      return
    }
    if (form.authType === 'password' && !form.password) {
      setErr('Password is required')
      return
    }
    if (form.authType === 'key' && !form.privateKeyPath) {
      setErr('Private key is required')
      return
    }
    onAdd({
      ...form,
      ip: form.ip.trim(),
      username: form.username.trim(),
      name: form.name.trim(),
      port: parseInt(form.port) || 22
    })
  }

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#0f0f0f] border border-[#222] rounded-2xl w-full max-w-[420px] mx-4 shadow-2xl">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#1e1e1e]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: ACCENT }}>
              <Server size={15} className="text-black" />
            </div>
            <span className="text-white font-semibold">Add Server</span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-3">
          <Field label="Display Name" placeholder="Production Server" value={form.name} onChange={set('name')} />
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Field label="IP / Host" placeholder="192.168.1.1" value={form.ip} onChange={set('ip')} />
            </div>
            <Field label="Port" placeholder="22" type="number" value={form.port} onChange={set('port')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Username" placeholder="root" value={form.username} onChange={set('username')} />
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Auth Type</label>
              <div className="grid grid-cols-2 gap-1 bg-[#1a1a1a] border border-[#252525] rounded-xl p-1">
                <button type="button" onClick={() => setForm((p) => ({ ...p, authType: 'password' }))} className={`py-2 rounded-lg text-xs ${form.authType === 'password' ? 'bg-[#c8ff00] text-black' : 'text-gray-400'}`}>Password</button>
                <button type="button" onClick={() => setForm((p) => ({ ...p, authType: 'key' }))} className={`py-2 rounded-lg text-xs ${form.authType === 'key' ? 'bg-[#c8ff00] text-black' : 'text-gray-400'}`}>Private Key</button>
              </div>
            </div>
          </div>
          {form.authType === 'password' ? (
            <Field label="Password" placeholder="Password" type="password" value={form.password} onChange={set('password')} />
          ) : (
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Private Key</label>
              <button type="button" onClick={pickKey} className="w-full bg-[#1a1a1a] border border-[#252525] text-left text-gray-400 text-sm rounded-xl px-3.5 py-2.5 truncate">
                {form.privateKeyPath || 'Choose .pem or .key file'}
              </button>
            </div>
          )}

          {err && <p className="text-red-400 text-xs pt-1">{err}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[#2a2a2a] text-gray-400 hover:text-white text-sm transition-colors">Cancel</button>
            <button type="submit" className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-black transition-colors hover:opacity-90" style={{ background: ACCENT }}>Connect</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full bg-[#1a1a1a] border border-[#252525] text-white text-sm rounded-xl px-3.5 py-2.5 placeholder-gray-700 outline-none transition-colors focus:border-[#c8ff00]/40"
      />
    </div>
  )
}
