<template>
  <div class="app-container" :data-theme="currentTheme">
    <!-- 顶部标题栏 - 横跨整个页面 -->
    <header class="top-header">
      <div class="header-left">
        <span class="logo">🦞</span>
        <h1>OpenClaw</h1>
      </div>
      <div class="header-right">
        <span class="version">{{ openclawVersion }}</span>
      </div>
    </header>
    
    <!-- 主体区域 -->
    <div class="main-wrapper">
      <!-- 左侧功能栏 -->
      <HistorySidebar 
        ref="sidebarRef"
        :active-panel="rightPanel"
        @new-chat="newConversation"
        @switch-panel="switchRightPanel"
        @select-history="loadSelectedHistory"
      />
      
      <!-- 右侧内容区 -->
      <div class="main-content">
        <!-- 聊天界面 -->
        <div v-if="rightPanel === 'chat'" class="chat-view">
          <!-- 网关状态 -->
          <div class="gateway-status" :class="{ connected: gatewayStatus === 'connected' }">
            <span class="status-dot"></span>
            <span class="status-text">{{ gatewayStatusText }}</span>
            <button class="refresh-btn" @click="refreshChat" title="刷新">
              🔄
            </button>
          </div>

          <!-- 消息列表 -->
          <main 
            class="chat-container" 
            ref="chatContainer"
            @dragenter.prevent="onDragEnter"
            @dragover.prevent="onDragOver"
            @dragleave.prevent="onDragLeave"
            @drop.prevent="onDrop"
          >
            <div class="messages-wrapper">
              <ChatMessage
                v-for="(msg, index) in messages"
                :key="index"
                :message="msg"
                :bot-icon="botIcon"
              />
              <div v-if="messages.length === 0" class="empty-state">
                <p>你好！我是 {{ botName }} {{ botIcon }}</p>
                <p class="sub">有什么我可以帮你的吗？</p>
                <p class="tip">💡 点击左侧"新对话"开始聊天，或拖拽图片/文件到此处</p>
              </div>
            </div>
            
            <!-- 拖拽覆盖层 -->
            <div v-if="isDragging" class="drag-overlay" @dragenter.prevent @dragover.prevent @dragleave.prevent>
              <div class="drag-content">
                <span class="drag-icon">📁</span>
                <span>松开鼠标上传文件</span>
              </div>
            </div>
          </main>

          <!-- 附件预览区 -->
          <div v-if="attachments.length > 0" class="attachments-preview">
            <div 
              v-for="(file, index) in attachments" 
              :key="index" 
              class="attachment-item"
            >
              <img v-if="file.type.startsWith('image/')" :src="file.preview" class="attachment-image" />
              <div v-else class="attachment-file">
                <span class="file-icon">📄</span>
                <span class="file-name">{{ file.name }}</span>
              </div>
              <button class="attachment-remove" @click="removeAttachment(index)">✕</button>
            </div>
          </div>

          <!-- 输入区域 -->
          <footer class="input-area">
            <div 
              class="input-container"
              @dragover="handleDragOver"
              @drop="handleDrop"
            >
              <!-- 附件按钮 - 左下角 -->
              <button class="attach-btn" title="上传图片/文件" @click="openFileDialog">
                <span>📎</span>
              </button>
              
              <!-- 输入框 - 两行高度 -->
              <div class="input-box">
                <textarea
                  ref="inputRef"
                  v-model="inputText"
                  placeholder="输入消息... (支持拖拽图片/文件)"
                  @keydown="handleInputKeydown"
                  :disabled="gatewayStatus !== 'connected' || isThinking"
                  rows="2"
                ></textarea>
                <!-- 快捷键提示 -->
                <div class="input-hints">
                  <span>Enter 发送</span>
                  <span>Ctrl+Enter 换行</span>
                </div>
              </div>
              
              <!-- 发送/停止按钮 -->
              <button 
                v-if="!isThinking"
                class="send-btn"
                @click="sendMessage"
                :disabled="(!inputText.trim() && attachments.length === 0) || gatewayStatus !== 'connected'"
              >
                ➤ 发送
              </button>
              <button 
                v-else
                class="stop-btn"
                @click="stopThinking"
              >
                ⏹ 停止
              </button>
            </div>
          </footer>
        </div>
        
        <!-- 技能面板 -->
        <div v-show="rightPanel === 'skills'" class="panel-view">
          <SkillPanel ref="skillPanelRef" />
        </div>
        
        <!-- 插件面板 -->
        <div v-show="rightPanel === 'plugins'" class="panel-view">
          <PluginPanel />
        </div>
        
        <!-- 设置面板 -->
        <div v-show="rightPanel === 'settings'" class="panel-view">
          <SettingsPanel />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, computed, onUnmounted } from 'vue'
import ChatMessage from './components/ChatMessage.vue'
import HistorySidebar from './components/HistorySidebar.vue'
import SkillPanel from './components/SkillPanel.vue'
import PluginPanel from './components/PluginPanel.vue'
import SettingsPanel from './components/SettingsPanel.vue'

// 右侧面板
const rightPanel = ref('chat')
const sidebarRef = ref(null)
const skillPanelRef = ref(null)

// 主题
const currentTheme = ref('default')

// 机器人名称和图标（从本地存储读取）
const botName = ref('李肆')
const botIcon = ref('🎯')

// 加载机器人配置
const loadBotConfig = () => {
  // 确保默认端口已保存
  if (!localStorage.getItem('openclaw-gateway-port')) {
    localStorage.setItem('openclaw-gateway-port', '18789')
  }
  
  try {
    const savedName = localStorage.getItem('openclaw-bot-name')
    const savedIcon = localStorage.getItem('openclaw-bot-icon')
    if (savedName) botName.value = savedName
    if (savedIcon) botIcon.value = savedIcon
  } catch (e) {
    console.log('加载机器人配置失败')
  }
}

// OpenClaw版本号 - 初始化时从 localStorage 读取
const openclawVersion = ref('v1.0.0')

// 立即尝试读取版本号
;(function() {
  const saved = localStorage.getItem('openclaw-version')
  if (saved) {
    openclawVersion.value = saved
  }
})()

// 对话
const messages = ref([])
const inputText = ref('')
const inputRef = ref(null)
const chatContainer = ref(null)
const isDragging = ref(false)
const attachments = ref([])
const isThinking = ref(false)
let currentController = null // 用于停止请求

// 网关状态
const gatewayStatus = ref('checking')

const gatewayStatusText = computed(() => {
  switch (gatewayStatus.value) {
    case 'checking': return '检查网关状态...'
    case 'connected': return '网关已连接'
    case 'disconnected': return '网关未启动'
    default: return ''
  }
})

// 切换右侧面板
const switchRightPanel = (panel) => {
  rightPanel.value = panel
}

// 加载选中的历史记录
const loadSelectedHistory = (history) => {
  if (history && history.messages) {
    messages.value = history.messages
    rightPanel.value = 'chat'
    nextTick(() => scrollToBottom())
  }
}

// 保存当前对话到历史
const saveCurrentToHistory = () => {
  if (sidebarRef.value && messages.value.length > 0) {
    let currentHistory = sidebarRef.value.getActiveHistory()
    
    // 如果没有历史记录，先创建一个新的
    if (!currentHistory) {
      sidebarRef.value.addNewHistory('新对话')
      currentHistory = sidebarRef.value.getActiveHistory()
    }
    
    if (currentHistory) {
      currentHistory.messages = messages.value
      // 更新标题（第一条用户消息的前几个字）
      sidebarRef.value.updateCurrentTitle()
    }
  }
}

// 保存主题到本地
const saveTheme = () => {
  localStorage.setItem('openclaw-theme', currentTheme.value)
}

// 加载主题
const loadTheme = () => {
  const saved = localStorage.getItem('openclaw-theme')
  if (saved) {
    currentTheme.value = saved
  }
}

// 新对话
const newConversation = () => {
  messages.value = []
  attachments.value = []
  rightPanel.value = 'chat'
  // 创建新的历史记录
  if (sidebarRef.value) {
    sidebarRef.value.addNewHistory('新对话')
  }
}

// 刷新聊天数据
const refreshChat = async () => {
  await checkGateway()
  await nextTick()
  scrollToBottom()
}

// 检查网关状态
const checkGateway = async () => {
  gatewayStatus.value = 'checking'
  try {
    // 从设置中获取端口
    const port = localStorage.getItem('openclaw-gateway-port') || '18789'
    const isDev = window.location.protocol === 'http:' && window.location.port === '5173'
    const urls = isDev 
      ? ['/api/health', `http://localhost:${port}/health`]
      : [`http://localhost:${port}/health`]
    
    for (const url of urls) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          signal: AbortSignal.timeout(3000)
        })
        if (response.ok) {
          gatewayStatus.value = 'connected'
          return
        }
      } catch (e) {
        // 继续尝试下一个URL
      }
    }
    gatewayStatus.value = 'disconnected'
  } catch (e) {
    gatewayStatus.value = 'disconnected'
  }
}

// 获取OpenClaw版本号
const fetchOpenClawVersion = async () => {
  // 优先从 localStorage 获取（由 Electron 注入）
  const savedVersion = localStorage.getItem('openclaw-version')
  if (savedVersion) {
    openclawVersion.value = savedVersion
    return
  }
  
  // 开发模式：从 npm 包读取版本（通过固定的本地路径）
  // 由于浏览器无法直接读取文件系统，这里使用硬编码的开发版本
  // 打包后会通过 Electron 注入正确的版本号
  const isDev = window.location.protocol === 'http:' && window.location.port === '5173'
  if (isDev) {
    // 开发模式使用固定版本号（打包后会正确显示）
    openclawVersion.value = 'v2026.3.8'
  }
}

// 拖拽处理
let dragCounter = 0

const onDragEnter = (e) => {
  e.preventDefault()
  dragCounter++
  isDragging.value = true
}

const onDragOver = (e) => {
  e.preventDefault()
  isDragging.value = true
}

const onDragLeave = (e) => {
  e.preventDefault()
  dragCounter--
  if (dragCounter === 0) {
    isDragging.value = false
  }
}

const onDrop = async (e) => {
  e.preventDefault()
  dragCounter = 0
  isDragging.value = false
  const files = Array.from(e.dataTransfer.files)
  addFiles(files)
}

// 文件选择 - 点击按钮 (Electron)
const openFileDialog = async () => {
  if (!window.electronAPI?.openFileDialog) {
    // 如果不是 Electron 环境，触发隐藏的 file input
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = 'image/*,.pdf,.doc,.docx,.txt,.md'
    input.onchange = (e) => {
      const files = Array.from(e.target.files)
      addFiles(files)
    }
    input.click()
    return
  }
  
  const result = await window.electronAPI.openFileDialog()
  
  if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
    return
  }
  
  // 将文件路径转换为文件对象
  const files = result.filePaths.map(filePath => {
    const name = filePath.split(/[\\/]/).pop()
    const ext = name.split('.').pop()?.toLowerCase() || ''
    
    // 根据扩展名判断类型
    let type = 'application/octet-stream'
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) {
      type = `image/${ext === 'jpg' ? 'jpeg' : ext}`
    } else if (ext === 'pdf') {
      type = 'application/pdf'
    } else if (['doc', 'docx'].includes(ext)) {
      type = 'application/msword'
    } else if (['txt', 'md'].includes(ext)) {
      type = 'text/plain'
    }
    
    // 创建文件对象，path 属性包含真实路径
    return {
      name: name,
      path: filePath,
      type: type,
      size: 0
    }
  })
  
  addFiles(files)
}

// 文件选择 - input 变化
const onFileSelect = (e) => {
  const files = Array.from(e.target.files)
  addFiles(files)
  e.target.value = ''
}

// 添加文件到附件
const addFiles = async (files) => {
  for (const file of files) {
    // 检查是否有真实路径（Electron 拖拽或对话框选择）
    const hasRealPath = file.path && file.path !== file.name
    
    const attachment = {
      name: file.name,
      type: file.type,
      size: file.size || 0,
      file: file,
      content: null,
      path: hasRealPath ? file.path : null  // 保存真实路径
    }
    
    // 只有图片文件才读取内容，其他文件只保存路径
    if (hasRealPath && window.electronAPI?.readFile) {
      // 判断是否为图片类型
      const isImage = file.type.startsWith('image/') || 
        /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(file.name)
      
      if (isImage) {
        // 图片才读取内容
        try {
          const result = await window.electronAPI.readFile(file.path)
          attachment.content = result.data
          attachment.size = result.size
          attachment.type = result.mimeType
          attachment.preview = result.data
          console.log('图片已读取 (真实路径):', attachment.name, attachment.size, attachment.path)
        } catch (e) {
          console.error('读取文件失败:', e)
        }
      } else {
        // 非图片文件（Excel、Word等）不读取内容，只保存路径
        console.log('文件信息 (真实路径):', attachment.name, 'path:', attachment.path)
      }
    } else {
      // 没有真实路径的情况（如从微信拖拽）
      // 只读取图片作为预览，其他类型不读取内容
      if (file.type.startsWith('image/')) {
        attachment.preview = await readFileAsDataURL(file)
        attachment.content = await readFileAsDataURL(file)
      }
      // 非图片文件不读取内容，避免显示 base64
      
      console.log('文件信息 (无真实路径):', attachment.name, 'type:', attachment.type)
    }
    
    attachments.value.push(attachment)
  }
}

const readFileAsDataURL = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.readAsDataURL(file)
  })
}

const readFileAsText = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.readAsText(file)
  })
}

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// 拖拽处理
const handleDragOver = (e) => {
  e.preventDefault()
  e.stopPropagation()
}

const handleDrop = async (e) => {
  e.preventDefault()
  e.stopPropagation()
  
  const files = Array.from(e.dataTransfer.files)
  if (files.length > 0) {
    // 在 Electron 中，拖拽文件可以获取真实路径
    const fileWithPath = files.map(f => ({
      ...f,
      path: f.path || f.name  // Electron 支持获取真实路径
    }))
    addFiles(fileWithPath)
  }
}

const removeAttachment = (index) => {
  attachments.value.splice(index, 1)
}

// 发送消息
const sendMessage = async () => {
  const text = inputText.value.trim()
  const hasAttachments = attachments.value.length > 0
  
  if (!text && !hasAttachments) return

  // 构建消息内容 - 不显示 base64，只显示文件信息
  let content = text
  if (hasAttachments) {
    // 为每个附件生成可展示的内容
    const fileContents = await Promise.all(attachments.value.map(async (f) => {
      // 优先使用真实路径
      if (f.path) {
        // 有真实路径的文件，只发送路径信息，让 AI 直接访问
        return `[文件: ${f.name}]\n路径: ${f.path}`
      } else {
        // 没有路径的文件，只发送文件信息
        return f.type.startsWith('image/') 
          ? `[图片: ${f.name}] (${f.type}, ${formatFileSize(f.size)})`
          : `[文件: ${f.name}] (${f.type}, ${formatFileSize(f.size)})`
      }
    }))
    
    content = text ? `${text}\n\n${fileContents.join('\n\n')}` : fileContents.join('\n\n')
    
    // 调试：打印发送的内容长度
    console.log('发送的消息内容长度:', content.length, '字符')
  }

  // 添加用户消息
  messages.value.push({
    role: 'user',
    content: content,
    timestamp: new Date(),
    attachments: attachments.value.map(f => ({
      name: f.name,
      type: f.type,
      preview: f.preview,
      content: f.content
    }))
  })

  inputText.value = ''
  attachments.value = []

  await nextTick()
  scrollToBottom()

  // 保存到历史
  saveCurrentToHistory()

  // 添加空的AI消息
  const aiMessageIndex = messages.value.length
  messages.value.push({
    role: 'assistant',
    content: '正在思考...',
    timestamp: new Date()
  })
  await nextTick()
  scrollToBottom()

  // 设置思考状态
  isThinking.value = true

  try {
    const port = localStorage.getItem('openclaw-gateway-port') || '18789'
    const isDev = window.location.protocol === 'http:' && window.location.port === '5173'
    const apiBase = isDev ? '/api' : `http://localhost:${port}`
    const apiUrl = `${apiBase}/v1/chat/completions`
    
    // 创建 AbortController 用于停止请求
    currentController = new AbortController()
    
    // 从设置中获取 token
    const token = localStorage.getItem('openclaw-gateway-token') || ''
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-openclaw-agent-id': 'main'
      },
      body: JSON.stringify({
        messages: messages.value.slice(0, -1).map(m => ({
          role: m.role,
          content: m.content
        })),
        stream: false
      }),
      signal: currentController.signal
    })

    // 检查是否已停止
    if (!isThinking.value) {
      return
    }
    
    if (response.ok) {
      const data = await response.json()
      // 再次检查是否已停止
      if (!isThinking.value) return
      const reply = data.choices?.[0]?.message?.content || data.response || data.content || '收到回复'
      messages.value[aiMessageIndex].content = reply
    } else {
      const errorText = await response.text()
      messages.value[aiMessageIndex].content = '抱歉，回复失败 (' + response.status + ')'
    }
  } catch (e) {
    // 检查是否已停止（用户主动停止）
    if (!isThinking.value) {
      return
    }
    if (e.name === 'AbortError') {
      messages.value[aiMessageIndex].content = '已停止生成'
    } else {
      messages.value[aiMessageIndex].content = '连接失败，请检查网关状态'
    }
  } finally {
    isThinking.value = false
    currentController = null
  }

  // 保存到历史
  saveCurrentToHistory()
  
  await nextTick()
  scrollToBottom()
}

// 停止思考
const stopThinking = () => {
  if (currentController) {
    currentController.abort()
    currentController = null
  }
  // 设置标记阻止后续处理
  isThinking.value = false
}

// 滚动到底部
const scrollToBottom = () => {
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight
  }
}

// 输入框键盘事件
const handleInputKeydown = (e) => {
  // Enter 发送（不在输入框内时）
  if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
    e.preventDefault()
    sendMessage()
  }
  // Ctrl+Enter 换行
  if (e.ctrlKey && e.key === 'Enter') {
    e.preventDefault()
    // 在光标位置插入换行
    const textarea = inputRef.value
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const text = inputText.value
      inputText.value = text.substring(0, start) + '\n' + text.substring(end)
      nextTick(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 1
      })
    }
  }
  // Esc 清空
  if (e.key === 'Escape') {
    inputText.value = ''
    attachments.value = []
  }
}

// 全局键盘快捷键
const handleKeydown = (e) => {
  // Esc 停止思考
  if (e.key === 'Escape' && isThinking.value) {
    stopThinking()
  }
  // 输入框获得焦点
  if (inputRef.value && document.activeElement !== inputRef.value) {
    // 如果当前焦点不在输入框，且没有按住特殊键，则聚焦输入框
    if (!e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey) {
      inputRef.value.focus()
    }
  }
}

// 主题变更监听
const handleThemeChange = (event) => {
  currentTheme.value = event.detail
}

onMounted(() => {
  loadTheme()
  loadBotConfig()
  checkGateway()
  fetchOpenClawVersion()
  
  // 应用启动时预加载技能列表
  if (skillPanelRef.value) {
    skillPanelRef.value.loadSkills()
  }
  
  // 加载历史记录（不自动创建，保持空白）
  if (sidebarRef.value) {
    sidebarRef.value.loadHistory()
    // 不自动创建新对话，保持空白，等待用户发送消息后再创建
  }
  // 添加键盘监听
  document.addEventListener('keydown', handleKeydown)
  // 主题变更监听
  window.addEventListener('theme-change', handleThemeChange)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('theme-change', handleThemeChange)
})
</script>

<style scoped>
.app-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  background-image: var(--bg-effect);
  background-size: var(--bg-size);
  background-attachment: fixed;
}

/* 主体区域 */
.main-wrapper {
  flex: 1;
  display: flex;
  overflow: hidden;
  margin-top: 50px; /* 为固定定位的顶部标题栏留出空间 */
  height: calc(100% - 50px);
}

/* 左侧功能栏 */
.history-sidebar {
  width: 260px;
  flex-shrink: 0;
  height: 100%;
}

/* 右侧内容区 */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

/* 聊天视图 */
.chat-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.panel-view {
  flex: 1;
  overflow-y: auto;
  background: var(--bg-primary);
}

/* 顶部标题栏 - 横跨整个页面 */
.top-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 50px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  z-index: 100;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo {
  font-size: 24px;
}

.header-left h1 {
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.version {
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--bg-tertiary);
  padding: 4px 10px;
  border-radius: 12px;
}

/* 网关状态 */
.gateway-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 24px;
  font-size: 13px;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ffc107;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.gateway-status.connected .status-dot {
  background: #10b981;
  animation: none;
}

.gateway-status.connected {
  color: #10b981;
}

.refresh-btn {
  margin-left: auto;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.refresh-btn:hover {
  opacity: 1;
}

/* 对话容器 */
.chat-container {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  position: relative;
}

.messages-wrapper {
  max-width: 100%;
  padding: 0 24px;
  display: flex;
  flex-direction: column;
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: var(--text-secondary);
}

.empty-state p {
  font-size: 20px;
  margin-bottom: 12px;
  color: var(--text-primary);
}

.empty-state .sub {
  font-size: 14px;
  opacity: 0.7;
}

.empty-state .tip {
  margin-top: 24px;
  font-size: 13px;
  color: var(--text-secondary);
}

/* 拖拽覆盖层 */
.drag-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(90, 90, 236, 0.1);
  border: 3px dashed var(--accent);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.drag-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: var(--accent);
  font-size: 18px;
  font-weight: 500;
}

.drag-icon {
  font-size: 48px;
}

/* 附件预览区 */
.attachments-preview {
  display: flex;
  gap: 12px;
  padding: 12px 24px;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border);
  overflow-x: auto;
  flex-shrink: 0;
}

.attachment-item {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border);
  flex-shrink: 0;
}

.attachment-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.attachment-file {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  padding: 8px;
}

.file-icon {
  font-size: 24px;
}

.file-name {
  font-size: 10px;
  text-align: center;
  word-break: break-all;
  color: var(--text-secondary);
}

.attachment-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 输入区域 */
.input-area {
  padding: 12px 24px 20px;
  background: var(--bg-primary);
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}

.input-container {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  max-width: 1000px;
  margin: 0 auto;
}

/* 附件按钮 - 左下角小图标 */
.attach-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 18px;
  transition: all 0.2s;
  flex-shrink: 0;
  padding: 0;
}

.attach-btn:hover {
  border-color: var(--accent);
  background: var(--accent);
}

/* 输入框容器 */
.input-box {
  flex: 1;
  position: relative;
}

.input-box textarea {
  width: 100%;
  padding: 12px 16px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--input-bg);
  color: var(--text-primary);
  font-size: 15px;
  font-family: inherit;
  line-height: 1.5;
  outline: none;
  resize: none;
  transition: all 0.2s;
  min-height: 72px;
}

.input-box textarea::placeholder {
  color: var(--text-secondary);
}

.input-box textarea:focus {
  border-color: var(--input-focus-border);
  box-shadow: 0 0 0 3px rgba(90, 90, 236, 0.15);
}

.input-box textarea:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 快捷键提示 */
.input-hints {
  position: absolute;
  bottom: 6px;
  right: 12px;
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: var(--text-secondary);
  pointer-events: none;
}

/* 发送按钮 */
.send-btn {
  padding: 12px 24px;
  border-radius: 14px;
  border: none;
  background: var(--btn-primary-bg);
  color: var(--btn-primary-text);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
  height: 48px;
}

.send-btn:hover:not(:disabled) {
  background: var(--accent-hover);
  transform: translateY(-1px);
}

.send-btn:active:not(:disabled) {
  transform: translateY(0);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 停止按钮 */
.stop-btn {
  padding: 12px 24px;
  border-radius: 14px;
  border: none;
  background: #ef4444;
  color: white;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
  height: 48px;
}

.stop-btn:hover {
  background: #dc2626;
  transform: translateY(-1px);
}
</style>
