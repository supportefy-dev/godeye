import { app, dialog, shell, BrowserWindow, ipcMain } from 'electron'
import { basename, dirname, join, posix } from 'path'
import { createWriteStream, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import { execFileSync } from 'child_process'
import archiver from 'archiver'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { SSHManager } from './ssh-manager'

let mainWindow
const sshManager = new SSHManager()
const backupLogPath = join(app.getPath('userData'), 'backups.json')

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    backgroundColor: '#0a0a0a',
    icon: join(__dirname, '../../resources/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Connect to all persisted servers once renderer is ready
  mainWindow.webContents.once('did-finish-load', () => {
    sshManager.getServers().forEach((server) => {
      sshManager.connect(server.id, mainWindow)
    })
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.godeye.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  sshManager.disconnectAll()
  if (process.platform !== 'darwin') app.quit()
})

// IPC handlers
ipcMain.handle('get-servers', () => sshManager.getServers())

ipcMain.handle('add-server', (_, server) => {
  sshManager.addServer(server)
  sshManager.connect(server.id, mainWindow)
  return { success: true }
})

ipcMain.handle('remove-server', (_, id) => {
  sshManager.disconnect(id)
  sshManager.removeServer(id)
  return { success: true }
})

ipcMain.handle('reconnect-server', (_, id) => {
  sshManager.reconnect(id, mainWindow)
  return { success: true }
})

ipcMain.handle('pick-upload-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile']
  })
  if (result.canceled || !result.filePaths.length) return null
  const path = result.filePaths[0]
  return { path, name: basename(path) }
})

ipcMain.handle('pick-key-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'SSH Keys', extensions: ['pem', 'key', 'ppk', '*'] }]
  })
  if (result.canceled || !result.filePaths.length) return null
  const path = result.filePaths[0]
  return { path, name: basename(path) }
})

ipcMain.handle('pick-backup-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] })
  if (result.canceled || !result.filePaths.length) return null
  return result.filePaths[0]
})

ipcMain.handle('exec-command', async (_, { serverId, command }) => {
  try {
    const client = sshManager.getClient(serverId)
    return { stdout: await execCommand(client, command) }
  } catch (err) {
    return { error: err.message }
  }
})

ipcMain.handle('sftp-list', async (_, { serverId, path = '/' }) => {
  const sftp = await sshManager.getSftp(serverId)
  try {
    const entries = await sftpReaddir(sftp, path)
    return entries
      .map((entry) => ({
        name: entry.filename,
        path: posix.join(path, entry.filename),
        size: entry.attrs?.size ?? 0,
        mtime: entry.attrs?.mtime ? entry.attrs.mtime * 1000 : null,
        type: entry.attrs?.isDirectory?.() ? 'directory' : 'file'
      }))
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
        return a.name.localeCompare(b.name)
      })
  } finally {
    sftp.end()
  }
})

ipcMain.handle('sftp-read', async (_, { serverId, path }) => {
  const sftp = await sshManager.getSftp(serverId)
  try {
    return await sftpReadFirstChunk(sftp, path, 50 * 1024)
  } finally {
    sftp.end()
  }
})

ipcMain.handle('sftp-delete', async (_, { serverId, path }) => {
  const sftp = await sshManager.getSftp(serverId)
  try {
    const attrs = await sftpStat(sftp, path)
    if (attrs?.isDirectory?.()) await sftpRmdir(sftp, path)
    else await sftpUnlink(sftp, path)
    return { success: true }
  } finally {
    sftp.end()
  }
})

ipcMain.handle('sftp-upload', async (_, { serverId, remotePath, localPath }) => {
  const sftp = await sshManager.getSftp(serverId)
  try {
    await sftpFastPut(sftp, localPath, remotePath)
    return { success: true }
  } finally {
    sftp.end()
  }
})

ipcMain.handle('sftp-download', async (_, { serverId, remotePath, localDest }) => {
  const sftp = await sshManager.getSftp(serverId)
  const dest = localDest || join(app.getPath('downloads'), basename(remotePath))
  try {
    await sftpFastGet(sftp, remotePath, dest)
    return { success: true, path: dest }
  } finally {
    sftp.end()
  }
})

ipcMain.handle('backup-files', async (_, { serverId, remotePaths, localDest }) => {
  const server = sshManager.getServers().find((s) => s.id === serverId)
  const tempDir = join(tmpdir(), `godeye-backup-${randomUUID()}`)
  mkdirSync(tempDir, { recursive: true })
  const stamp = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '-')
  const zipPath = join(localDest || app.getPath('downloads'), `backup_${stamp}.zip`)
  const files = []
  let sftp

  try {
    sftp = await sshManager.getSftp(serverId)
    for (const remotePath of remotePaths || []) {
      const localPath = join(tempDir, sanitizeBackupName(remotePath))
      await downloadRemotePath(sftp, remotePath, localPath, files)
    }
    await zipDirectory(tempDir, zipPath)
    const entry = {
      id: randomUUID(),
      serverId,
      serverName: server?.name || serverId,
      date: new Date().toISOString(),
      path: zipPath,
      size: statSync(zipPath).size,
      fileCount: files.length,
      files
    }
    const history = readBackupLog()
    writeBackupLog([entry, ...history])
    return { success: true, path: zipPath, size: entry.size, fileCount: entry.fileCount }
  } catch (err) {
    return { success: false, error: err.message }
  } finally {
    if (sftp) sftp.end()
    if (existsSync(tempDir)) rmSync(tempDir, { recursive: true, force: true })
  }
})

ipcMain.handle('backup-history', () => readBackupLog())

ipcMain.handle('backup-delete', (_, { id, deleteFile }) => {
  const history = readBackupLog()
  const entry = history.find((item) => item.id === id)
  if (deleteFile && entry?.path && existsSync(entry.path)) rmSync(entry.path, { force: true })
  writeBackupLog(history.filter((item) => item.id !== id))
  return { success: true }
})

ipcMain.handle('backup-restore', async (_, { serverId, localZip, remotePath }) => {
  const tempDir = join(tmpdir(), `godeye-restore-${randomUUID()}`)
  mkdirSync(tempDir, { recursive: true })
  let sftp
  try {
    execFileSync('tar', ['-xf', localZip, '-C', tempDir])
    sftp = await sshManager.getSftp(serverId)
    await uploadLocalDirectory(sftp, tempDir, remotePath || '/')
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  } finally {
    if (sftp) sftp.end()
    if (existsSync(tempDir)) rmSync(tempDir, { recursive: true, force: true })
  }
})

ipcMain.handle('terminal-create', (_, { serverId }) => {
  return sshManager.createTerminal(serverId, mainWindow)
})

ipcMain.on('terminal-input', (_, { termId, data }) => {
  sshManager.writeTerminal(termId, data)
})

ipcMain.on('terminal-resize', (_, { termId, cols, rows }) => {
  sshManager.resizeTerminal(termId, cols, rows)
})

ipcMain.on('terminal-close', (_, { termId }) => {
  sshManager.closeTerminal(termId)
})

function sftpReaddir(sftp, path) {
  return new Promise((resolve, reject) => {
    sftp.readdir(path, (err, list) => {
      if (err) reject(err)
      else resolve(list)
    })
  })
}

function sftpReadFirstChunk(sftp, path, maxBytes) {
  return new Promise((resolve, reject) => {
    const stream = sftp.createReadStream(path, { start: 0, end: maxBytes - 1, encoding: 'utf8' })
    let out = ''
    stream.on('data', (chunk) => {
      out += chunk
      if (Buffer.byteLength(out, 'utf8') >= maxBytes) stream.destroy()
    })
    stream.on('error', reject)
    stream.on('close', () => resolve(out))
    stream.on('end', () => resolve(out))
  })
}

function sftpStat(sftp, path) {
  return new Promise((resolve, reject) => {
    sftp.stat(path, (err, attrs) => {
      if (err) reject(err)
      else resolve(attrs)
    })
  })
}

function sftpUnlink(sftp, path) {
  return new Promise((resolve, reject) => {
    sftp.unlink(path, (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

function sftpRmdir(sftp, path) {
  return new Promise((resolve, reject) => {
    sftp.rmdir(path, (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

function sftpFastPut(sftp, localPath, remotePath) {
  return new Promise((resolve, reject) => {
    sftp.fastPut(localPath, remotePath, (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

function sftpFastGet(sftp, remotePath, localDest) {
  return new Promise((resolve, reject) => {
    sftp.fastGet(remotePath, localDest, (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

function execCommand(client, command) {
  return new Promise((resolve, reject) => {
    client.exec(command, (err, stream) => {
      if (err) {
        reject(err)
        return
      }
      let stdout = ''
      let stderr = ''
      stream.on('data', (data) => { stdout += data.toString('utf8') })
      stream.stderr.on('data', (data) => { stderr += data.toString('utf8') })
      stream.on('close', (code) => {
        if (code && stderr) reject(new Error(stderr.trim()))
        else resolve(stdout || stderr)
      })
    })
  })
}

function readBackupLog() {
  try {
    if (!existsSync(backupLogPath)) return []
    return JSON.parse(readFileSync(backupLogPath, 'utf8'))
  } catch {
    return []
  }
}

function writeBackupLog(history) {
  mkdirSync(dirname(backupLogPath), { recursive: true })
  writeFileSync(backupLogPath, JSON.stringify(history, null, 2))
}

function sanitizeBackupName(remotePath) {
  return remotePath.replace(/^\/+/, '').replace(/[<>:"/\\|?*]+/g, '_') || 'root'
}

async function downloadRemotePath(sftp, remotePath, localPath, files) {
  const attrs = await sftpStat(sftp, remotePath)
  if (attrs?.isDirectory?.()) {
    mkdirSync(localPath, { recursive: true })
    const entries = await sftpReaddir(sftp, remotePath)
    for (const entry of entries) {
      await downloadRemotePath(
        sftp,
        posix.join(remotePath, entry.filename),
        join(localPath, entry.filename),
        files
      )
    }
    return
  }

  mkdirSync(dirname(localPath), { recursive: true })
  await sftpFastGet(sftp, remotePath, localPath)
  files.push(remotePath)
}

function zipDirectory(sourceDir, zipPath) {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(zipPath)
    const archive = archiver('zip', { zlib: { level: 9 } })
    output.on('close', resolve)
    archive.on('error', reject)
    archive.pipe(output)
    archive.directory(sourceDir, false)
    archive.finalize()
  })
}

async function uploadLocalDirectory(sftp, localDir, remoteDir) {
  await sftpMkdir(sftp, remoteDir)
  for (const entry of readdirSync(localDir, { withFileTypes: true })) {
    const localPath = join(localDir, entry.name)
    const remotePath = posix.join(remoteDir, entry.name)
    if (entry.isDirectory()) {
      await uploadLocalDirectory(sftp, localPath, remotePath)
    } else {
      await sftpFastPut(sftp, localPath, remotePath)
    }
  }
}

function sftpMkdir(sftp, path) {
  return new Promise((resolve) => {
    sftp.mkdir(path, () => resolve())
  })
}
