import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const godeye = {
  getServers: () => ipcRenderer.invoke('get-servers'),
  addServer: (server) => ipcRenderer.invoke('add-server', server),
  removeServer: (id) => ipcRenderer.invoke('remove-server', id),
  reconnectServer: (id) => ipcRenderer.invoke('reconnect-server', id),
  pickUploadFile: () => ipcRenderer.invoke('pick-upload-file'),
  pickKeyFile: () => ipcRenderer.invoke('pick-key-file'),
  pickBackupFolder: () => ipcRenderer.invoke('pick-backup-folder'),
  execCommand: (serverId, command) => ipcRenderer.invoke('exec-command', { serverId, command }),
  sftpList: (payload) => ipcRenderer.invoke('sftp-list', payload),
  sftpRead: (payload) => ipcRenderer.invoke('sftp-read', payload),
  sftpDelete: (payload) => ipcRenderer.invoke('sftp-delete', payload),
  sftpUpload: (payload) => ipcRenderer.invoke('sftp-upload', payload),
  sftpDownload: (payload) => ipcRenderer.invoke('sftp-download', payload),
  terminalCreate: (serverId) => ipcRenderer.invoke('terminal-create', { serverId }),
  terminalInput: (termId, data) => ipcRenderer.send('terminal-input', { termId, data }),
  terminalResize: (termId, cols, rows) => ipcRenderer.send('terminal-resize', { termId, cols, rows }),
  terminalClose: (termId) => ipcRenderer.send('terminal-close', { termId }),
  backupFiles: (payload) => ipcRenderer.invoke('backup-files', payload),
  backupHistory: () => ipcRenderer.invoke('backup-history'),
  backupRestore: (payload) => ipcRenderer.invoke('backup-restore', payload),
  backupDelete: (payload) => ipcRenderer.invoke('backup-delete', payload),

  onStatsUpdate: (cb) => {
    const fn = (_, d) => cb(d)
    ipcRenderer.on('stats-update', fn)
    return () => ipcRenderer.removeListener('stats-update', fn)
  },

  onServerStatus: (cb) => {
    const fn = (_, d) => cb(d)
    ipcRenderer.on('server-status', fn)
    return () => ipcRenderer.removeListener('server-status', fn)
  },

  onTerminalData: (cb) => {
    const fn = (_, d) => cb(d)
    ipcRenderer.on('terminal-data', fn)
    return () => ipcRenderer.removeListener('terminal-data', fn)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('godeye', godeye)
  } catch (e) {
    console.error(e)
  }
} else {
  window.electron = electronAPI
  window.godeye = godeye
}
