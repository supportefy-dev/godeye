import { Client } from 'ssh2'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { app } from 'electron'

// Single-line command: outputs "cpu|ramTotal ramUsed|diskTotal diskUsed|uptime"
const STATS_CMD =
  'CPU=$(awk \'/^cpu /{idle=$5;total=0;for(i=2;i<=NF;i++)total+=$i;printf "%.1f",(total-idle)*100/total}\' /proc/stat);' +
  'RAM=$(free -m|awk \'/Mem:/{printf "%d %d",$2,$3}\');' +
  'DISK=$(df -m /|awk \'NR==2{printf "%d %d",$2,$3}\');' +
  'UP=$(awk \'{printf "%d",$1}\' /proc/uptime);' +
  'echo "$CPU|$RAM|$DISK|$UP"'

export class SSHManager {
  constructor() {
    this.servers = new Map()   // id → server config
    this.clients = new Map()   // id → SSH Client
    this.intervals = new Map() // id → polling interval
    this.terminals = new Map()
    this.storePath = join(app.getPath('userData'), 'servers.json')
    this._load()
  }

  _load() {
    if (!existsSync(this.storePath)) return
    try {
      const list = JSON.parse(readFileSync(this.storePath, 'utf8'))
      list.forEach((s) => this.servers.set(s.id, s))
    } catch {
      // corrupt file — start fresh
    }
  }

  _save() {
    try {
      writeFileSync(this.storePath, JSON.stringify([...this.servers.values()], null, 2))
    } catch (e) {
      console.error('Failed to save servers:', e)
    }
  }

  getServers() {
    return [...this.servers.values()]
  }

  addServer(server) {
    this.servers.set(server.id, server)
    this._save()
  }

  removeServer(id) {
    this.servers.delete(id)
    this._save()
  }

  connect(id, win) {
    const server = this.servers.get(id)
    if (!server) return

    this._emit(win, 'server-status', { id, status: 'connecting' })

    const client = new Client()
    this.clients.set(id, client)

    client.on('ready', () => {
      this._emit(win, 'server-status', { id, status: 'online' })
      this._startPolling(id, client, win)
    })

    client.on('error', (err) => {
      console.error(`[SSH ${id}] error:`, err.message)
      this._emit(win, 'server-status', { id, status: 'offline', error: err.message })
      this._cleanup(id)
    })

    client.on('close', () => {
      this._emit(win, 'server-status', { id, status: 'offline' })
      this._cleanup(id)
    })

    const connectConfig = {
      host: (server.ip || '').trim(),
      port: server.port || 22,
      username: (server.username || '').trim(),
      readyTimeout: 20000,
      keepaliveInterval: 15000,
      // Broad algorithm list for compatibility with Ubuntu 20/22/24 servers
      algorithms: {
        kex: [
          'curve25519-sha256', 'curve25519-sha256@libssh.org',
          'ecdh-sha2-nistp256', 'ecdh-sha2-nistp384', 'ecdh-sha2-nistp521',
          'diffie-hellman-group-exchange-sha256', 'diffie-hellman-group14-sha256',
          'diffie-hellman-group14-sha1'
        ],
        serverHostKey: [
          'ssh-ed25519', 'ecdsa-sha2-nistp256', 'ecdsa-sha2-nistp384',
          'ecdsa-sha2-nistp521', 'rsa-sha2-512', 'rsa-sha2-256', 'ssh-rsa'
        ],
        cipher: [
          'aes128-gcm@openssh.com', 'aes256-gcm@openssh.com',
          'aes128-ctr', 'aes192-ctr', 'aes256-ctr'
        ],
        hmac: ['hmac-sha2-256', 'hmac-sha2-512', 'hmac-sha1'],
        compress: ['none', 'zlib@openssh.com', 'zlib']
      }
    }

    if (server.privateKeyPath) {
      connectConfig.privateKey = readFileSync(server.privateKeyPath)
    } else {
      connectConfig.password = server.password
    }

    client.connect(connectConfig)
  }

  _startPolling(id, client, win) {
    const poll = () => {
      client.exec(STATS_CMD, (err, stream) => {
        if (err) return
        let out = ''
        stream.on('data', (d) => (out += d))
        stream.stderr.on('data', () => {})
        stream.on('close', () => {
          const stats = parseStats(out.trim())
          if (stats) this._emit(win, 'stats-update', { id, ...stats, ts: Date.now() })
        })
      })
    }

    poll()
    this.intervals.set(id, setInterval(poll, 3000))
  }

  _cleanup(id) {
    const iv = this.intervals.get(id)
    if (iv) { clearInterval(iv); this.intervals.delete(id) }
  }

  disconnect(id) {
    const client = this.clients.get(id)
    this._cleanup(id)
    if (client) { try { client.end() } catch {} }
    this.clients.delete(id)
  }

  reconnect(id, win) {
    this.disconnect(id)
    setTimeout(() => this.connect(id, win), 500)
  }

  disconnectAll() {
    for (const id of [...this.clients.keys()]) this.disconnect(id)
    for (const termId of [...this.terminals.keys()]) this.closeTerminal(termId)
  }

  _emit(win, channel, data) {
    if (win && !win.isDestroyed()) win.webContents.send(channel, data)
  }

  getClient(id) {
    const client = this.clients.get(id)
    if (!client) throw new Error('Server is not connected')
    return client
  }

  getSftp(id) {
    const client = this.getClient(id)
    return new Promise((resolve, reject) => {
      client.sftp((err, sftp) => {
        if (err) reject(err)
        else resolve(sftp)
      })
    })
  }

  createTerminal(id, win) {
    const client = this.getClient(id)
    return new Promise((resolve, reject) => {
      client.shell({ term: 'xterm-256color' }, (err, stream) => {
        if (err) {
          reject(err)
          return
        }

        const termId = randomUUID()
        this.terminals.set(termId, stream)

        stream.on('data', (data) => {
          this._emit(win, 'terminal-data', { termId, data: data.toString('utf8') })
        })
        stream.stderr?.on('data', (data) => {
          this._emit(win, 'terminal-data', { termId, data: data.toString('utf8') })
        })
        stream.on('close', () => {
          this.terminals.delete(termId)
          this._emit(win, 'terminal-closed', { termId })
        })

        resolve(termId)
      })
    })
  }

  writeTerminal(termId, data) {
    const stream = this.terminals.get(termId)
    if (!stream) return false
    stream.write(data)
    return true
  }

  resizeTerminal(termId, cols, rows) {
    const stream = this.terminals.get(termId)
    if (!stream || typeof stream.setWindow !== 'function') return false
    stream.setWindow(rows, cols, 0, 0)
    return true
  }

  closeTerminal(termId) {
    const stream = this.terminals.get(termId)
    if (!stream) return false
    try { stream.end() } catch {}
    this.terminals.delete(termId)
    return true
  }
}

function parseStats(raw) {
  if (!raw) return null
  try {
    const [cpuStr, ramStr, diskStr, upStr] = raw.split('|')
    const cpu = parseFloat(cpuStr)
    const [ramTotal, ramUsed] = ramStr.trim().split(' ').map(Number)
    const [diskTotal, diskUsed] = diskStr.trim().split(' ').map(Number)
    const uptime = parseInt(upStr)
    if ([cpu, ramTotal, ramUsed, diskTotal, diskUsed].some(isNaN)) return null
    return { cpu, ramUsed, ramTotal, diskUsed, diskTotal, uptime: isNaN(uptime) ? 0 : uptime }
  } catch {
    return null
  }
}
