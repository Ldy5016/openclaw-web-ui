const { contextBridge, ipcRenderer } = require('electron')
const path = require('path')
const fs = require('fs')

// 暴露 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 执行命令行命令
  executeCommand: (command) => ipcRenderer.invoke('execute-command', command),
  
  // 获取 OpenClaw 版本
  getVersion: () => {
    return new Promise((resolve) => {
      try {
        // 动态获取 npm 全局安装路径
        const npmPath = process.env.APPDATA || path.join(process.env.USERPROFILE, 'AppData', 'Roaming')
        const packagePath = path.join(npmPath, 'npm', 'node_modules', 'openclaw', 'package.json')
        if (fs.existsSync(packagePath)) {
          const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
          resolve(pkg.version || '1.0.0')
        } else {
          resolve('1.0.0')
        }
      } catch (e) {
        resolve('1.0.0')
      }
    })
  },
  
  // 关闭确认
  confirmClose: () => ipcRenderer.invoke('confirm-close'),
  
  // 打开文件选择对话框
  openFileDialog: (options) => ipcRenderer.invoke('open-file-dialog', options),
  
  // 读取文件内容（用于 Electron 模式下的文件路径读取）
  readFile: (filePath) => {
    return new Promise((resolve, reject) => {
      try {
        if (!fs.existsSync(filePath)) {
          reject(new Error('文件不存在: ' + filePath))
          return
        }
        
        const buffer = fs.readFileSync(filePath)
        const base64 = buffer.toString('base64')
        const mimeType = getMimeType(filePath)
        
        resolve({
          data: `data:${mimeType};base64,${base64}`,
          size: buffer.length,
          mimeType: mimeType
        })
      } catch (e) {
        reject(e)
      }
    })
  }
})

// 根据文件扩展名获取 MIME 类型
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase().slice(1)
  const mimeTypes = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'bmp': 'image/bmp',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'txt': 'text/plain',
    'md': 'text/markdown',
    'json': 'application/json',
    'xml': 'application/xml',
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript'
  }
  return mimeTypes[ext] || 'application/octet-stream'
}
