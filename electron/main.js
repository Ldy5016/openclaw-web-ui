const { app, BrowserWindow, shell, session, webRequest, ipcMain, dialog } = require('electron')
const path = require('path')
const { exec } = require('child_process')
const fs = require('fs')

let mainWindow = null
let splashWindow = null

// 强制单例模式 - 已有实例运行时直接退出
if (!app.requestSingleInstanceLock()) {
  app.quit()
}

// 获取 OpenClaw 版本号
function getOpenClawVersion() {
  try {
    // 动态获取 npm 全局安装路径
    const npmPath = process.env.APPDATA || path.join(process.env.USERPROFILE, 'AppData', 'Roaming')
    const packagePath = path.join(npmPath, 'npm', 'node_modules', 'openclaw', 'package.json')
    if (fs.existsSync(packagePath)) {
      const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
      return pkg.version || '1.0.0'
    }
  } catch (e) {
    console.log('获取版本失败:', e)
  }
  return '1.0.0'
}

// 获取机器人名称
function getBotName() {
  try {
    // 动态获取 OpenClaw 工作目录
    const openclawPath = process.env.OPENCLAW_PATH || path.join(process.env.USERPROFILE || '', 'OpenClawData', '.openclaw')
    const identityPath = path.join(openclawPath, 'workspace', 'IDENTITY.md')
    if (fs.existsSync(identityPath)) {
      const content = fs.readFileSync(identityPath, 'utf8')
      // 匹配 - **Name:** 李肆 格式
      const match = content.match(/- Name: (.+)/)
      if (match) {
        // 去掉括号内容
        return match[1].replace(/（.+?）/g, '').trim()
      }
    }
  } catch (e) {
    console.log('获取机器人名称失败:', e)
  }
  return '李肆'
}

// 获取机器人图标
function getBotIcon() {
  try {
    // 动态获取 OpenClaw 工作目录
    const openclawPath = process.env.OPENCLAW_PATH || path.join(process.env.USERPROFILE || '', 'OpenClawData', '.openclaw')
    const identityPath = path.join(openclawPath, 'workspace', 'IDENTITY.md')
    if (fs.existsSync(identityPath)) {
      const content = fs.readFileSync(identityPath, 'utf8')
      // 匹配 - **Emoji:** 🎯 格式
      const match = content.match(/- Emoji: (.+)/)
      if (match) return match[1].trim()
    }
  } catch (e) {
    console.log('获取机器人图标失败:', e)
  }
  return ''
}

// 获取保存的端口号
function getGatewayPort() {
  try {
    const fs = require('fs')
    const userDataPath = app.getPath('userData')
    const configPath = path.join(userDataPath, 'config.json')
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
      return config.gatewayPort || '18789'
    }
  } catch (e) {
    console.log('读取端口配置失败:', e)
  }
  return '18789'
}

// 保存端口号
function saveGatewayPort(port) {
  try {
    const fs = require('fs')
    const userDataPath = app.getPath('userData')
    const configPath = path.join(userDataPath, 'config.json')
    let config = {}
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
    }
    config.gatewayPort = port
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
  } catch (e) {
    console.log('保存端口配置失败:', e)
  }
}

// 创建启动画面
function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 400,
    height: 350,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: '#667eea',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  splashWindow.loadFile(path.join(__dirname, '../dist/splash.html'))

  splashWindow.once('ready-to-show', () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.show()
    }
  })
}

// 更新启动状态
function updateSplashStatus(status) {
  console.log('更新状态:', status)
  if (splashWindow && !splashWindow.isDestroyed()) {
    try {
      splashWindow.webContents.executeJavaScript(`
        (function() {
          var el = document.getElementById('status');
          if (el) {
            el.textContent = '${status}';
            return 'OK';
          }
          return 'Element not found';
        })()
      `).then(result => console.log('状态更新结果:', result)).catch(e => console.log('状态更新错误:', e))
    } catch (e) {
      console.log('状态更新异常:', e)
    }
  }
}

// 关闭启动画面
function closeSplash() {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close()
    splashWindow = null
  }
}

// 创建主窗口
function createMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) return

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../public/icon.png'),
    show: false
  })

  // 允许跨域
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Access-Control-Allow-Origin': ['*'],
        'Access-Control-Allow-Methods': ['GET, POST, OPTIONS'],
        'Access-Control-Allow-Headers': ['Content-Type, Authorization, x-openclaw-agent-id']
      }
    })
  })

  mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))

  // 监听关闭事件，弹出确认对话框
  mainWindow.on('close', (event) => {
    event.preventDefault()
    dialog.showMessageBox(mainWindow, {
      type: 'question',
      buttons: ['取消', '确认退出'],
      defaultId: 0,
      cancelId: 0,
      title: '确认退出',
      message: '确定要退出 OpenClaw 吗？'
    }).then(result => {
      if (result.response === 1) {
        mainWindow.destroy()
        app.exit(0)
      }
    })
  })

  // 注入版本号到页面
  const version = getOpenClawVersion()
  const botName = getBotName()
  const botIcon = getBotIcon()
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.executeJavaScript(`
      (function() {
        // 设置版本号
        var versionEl = document.querySelector('.version');
        if (versionEl) {
          versionEl.textContent = 'v${version}';
        }
        // 将版本号存储到 localStorage 供 Vue 使用
        try {
          localStorage.setItem('openclaw-version', 'v${version}');
          localStorage.setItem('openclaw-bot-name', '${botName}');
          localStorage.setItem('openclaw-bot-icon', '${botIcon}');
        } catch(e) {}
      })()
    `).catch(e => console.log('注入版本失败:', e))
  })

  mainWindow.once('ready-to-show', () => {
    closeSplash()
    if (mainWindow) mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

// 检查网关
function checkAndStartGateway() {
  return new Promise((resolve) => {
    const port = getGatewayPort()
    updateSplashStatus('检查网关...')

    fetch(`http://localhost:${port}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000)
    })
    .then(response => {
      if (response.ok) {
        updateSplashStatus('网关已就绪')
        resolve(true)
      } else {
        startGateway(resolve)
      }
    })
    .catch(() => {
      startGateway(resolve)
    })
  })
}

function startGateway(callback) {
  updateSplashStatus('启动网关...')
  console.log('执行网关启动命令...')

  exec('openclaw gateway restart', { shell: 'powershell.exe' }, (error, stdout, stderr) => {
    console.log('命令执行结果:', { error, stdout, stderr })
    
    if (error) {
      console.log('命令执行出错，但继续等待网关启动...')
    } else {
      console.log('命令执行成功，等待网关启动...')
    }
    
    // 等待网关真正启动
    let waitTime = 0
    const maxWait = 80000
    const checkInterval = 10000
    
    updateSplashStatus('等待网关就绪...')
    
    const checkGateway = () => {
      const port = getGatewayPort()
      console.log('检查网关状态, waitTime:', waitTime, 'port:', port)
      fetch(`http://localhost:${port}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      })
      .then(response => {
        if (response.ok) {
          updateSplashStatus('网关已就绪')
          setTimeout(() => callback(true), 1000)
        } else if (waitTime < maxWait) {
          waitTime += checkInterval
          updateSplashStatus(`等待网关就绪...(${Math.ceil((maxWait - waitTime) / 1000)}秒)`)
          setTimeout(checkGateway, checkInterval)
        } else {
          updateSplashStatus('启动超时')
          callback(false)
        }
      })
      .catch(() => {
        if (waitTime < maxWait) {
          waitTime += checkInterval
          updateSplashStatus(`等待网关就绪...(${Math.ceil((maxWait - waitTime) / 1000)}秒)`)
          setTimeout(checkGateway, checkInterval)
        } else {
          updateSplashStatus('启动超时')
          callback(false)
        }
      })
    }
    
    // 5秒后开始检查
    setTimeout(checkGateway, 5000)
  })
}

// 应用就绪
app.whenReady().then(() => {
  createSplashWindow()

  // 90秒超时
  const timeoutId = setTimeout(() => {
    console.log('启动超时，强制进入主界面')
    closeSplash()
    createMainWindow()
  }, 90000)

  checkAndStartGateway().then((success) => {
    clearTimeout(timeoutId)
    if (success) {
      updateSplashStatus('加载成功！')
    }
    setTimeout(() => {
      createMainWindow()
    }, 500)
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
})

// 添加 IPC 处理器 - 执行 CLI 命令
ipcMain.handle('execute-command', async (event, command) => {
  return new Promise((resolve) => {
    exec(command, { shell: 'powershell.exe' }, (error, stdout, stderr) => {
      if (error) {
        resolve({ success: false, error: error.message, stdout: stdout, stderr: stderr })
      } else {
        resolve({ success: true, stdout: stdout, stderr: stderr })
      }
    })
  })
})

// 添加 IPC 处理器 - 关闭确认
ipcMain.handle('confirm-close', async (event) => {
  const result = await dialog.showMessageBox(mainWindow, {
    type: 'question',
    buttons: ['取消', '确认退出'],
    defaultId: 0,
    cancelId: 0,
    title: '确认退出',
    message: '确定要退出 OpenClaw 吗？'
  })
  if (result.response === 1) {
    app.exit(0)
  }
  return false
})

// 添加 IPC 处理器 - 打开文件选择对话框
ipcMain.handle('open-file-dialog', async (event, options = {}) => {
  const defaultOptions = {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: '所有文件', extensions: ['*'] },
      { name: '图片', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'] },
      { name: '文档', extensions: ['pdf', 'doc', 'docx', 'txt', 'md'] }
    ]
  }
  
  const mergedOptions = { ...defaultOptions, ...options }
  
  const result = await dialog.showOpenDialog(mainWindow, mergedOptions)
  
  if (result.canceled) {
    return { canceled: true, filePaths: [] }
  }
  
  return {
    canceled: false,
    filePaths: result.filePaths
  }
})
