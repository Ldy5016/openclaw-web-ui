<template>
  <div class="settings-panel">
    <div class="panel-header">
      <h2>⚙️ 设置中心</h2>
      <p class="subtitle">配置 OpenClaw 连接和界面风格</p>
    </div>
    
    <div class="settings-content">
      <!-- 连接设置 -->
      <div class="settings-section">
        <h3 class="section-title">🔗 连接设置</h3>
        
        <div class="setting-item">
          <div class="setting-label">
            <span class="label-icon">🌐</span>
            <span>网关端口</span>
          </div>
          <div class="setting-control">
            <input 
              type="text" 
              v-model="gatewayPort" 
              placeholder="18789"
              class="setting-input port-input"
            />
            <button class="setting-btn" @click="testConnection" :disabled="testing">
              {{ testing ? '测试中...' : '测试连接' }}
            </button>
          </div>
          <p class="setting-hint">OpenClaw Gateway 运行的端口号</p>
          <p class="connection-status" :class="connectionStatus">
            {{ connectionStatusText }}
          </p>
        </div>
        
        <div class="setting-item">
          <div class="setting-label">
            <span class="label-icon">🔑</span>
            <span>网关令牌</span>
          </div>
          <div class="setting-control">
            <input 
              type="password" 
              v-model="gatewayToken" 
              placeholder="请输入网关令牌"
              class="setting-input token-input"
            />
            <button class="setting-btn" @click="saveToken">
              保存
            </button>
          </div>
          <p class="setting-hint">用于控制板自动登录验证</p>
        </div>
      </div>
      
      <!-- 主题设置 -->
      <div class="settings-section">
        <h3 class="section-title">🎨 主题设置</h3>
        
        <div class="theme-options">
          <label 
            v-for="theme in themes" 
            :key="theme.value"
            class="theme-option"
            :class="{ active: currentTheme === theme.value }"
          >
            <input 
              type="radio" 
              :value="theme.value" 
              v-model="currentTheme"
              @change="changeTheme"
            />
            <div class="theme-preview" :style="{ background: theme.preview }">
              <span class="theme-check" v-if="currentTheme === theme.value">✓</span>
            </div>
            <span class="theme-name">{{ theme.label }}</span>
          </label>
        </div>
      </div>
      
      <!-- 数据管理 -->
      <div class="settings-section">
        <h3 class="section-title">💾 数据管理</h3>
        
        <div class="setting-item">
          <div class="setting-label">
            <span class="label-icon">🗑️</span>
            <span>历史对话</span>
          </div>
          <div class="setting-actions">
            <button class="action-btn" @click="exportHistory">
              导出历史
            </button>
            <button class="action-btn danger" @click="clearHistory">
              清除记录
            </button>
          </div>
          <p class="setting-hint">导出或清除本地存储的对话记录</p>
        </div>
      </div>
      
      <!-- 关于 -->
      <div class="settings-section">
        <h3 class="section-title">ℹ️ 关于</h3>
        
        <div class="about-info">
          <div class="about-item">
            <span class="about-label">应用版本</span>
            <span class="about-value">{{ appVersion }}</span>
          </div>
          <div class="about-item">
            <span class="about-label">OpenClaw</span>
            <span class="about-value">{{ openclawVersion }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

// 主题选项
const themes = [
  { value: 'default', label: '默认主题', preview: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { value: 'dark', label: '暗夜主题', preview: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' },
  { value: 'pink', label: '粉色主题', preview: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)' },
  { value: 'cyber', label: '赛博科技', preview: 'linear-gradient(135deg, #00f5ff 0%, #ff00ff 100%)' },
  { value: 'ocean', label: '梦幻海洋', preview: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)' }
]

// 状态
const gatewayPort = ref('18789')
const gatewayToken = ref('')
const testing = ref(false)
const connectionStatus = ref('')
const currentTheme = ref('default')
const appVersion = ref('1.0.0')
const openclawVersion = ref('v1.0.0')

const connectionStatusText = computed(() => {
  switch (connectionStatus.value) {
    case 'success': return '✓ 连接成功'
    case 'error': return '✗ 连接失败'
    case 'testing': return '... 正在测试'
    default: return ''
  }
})

// 加载设置
const loadSettings = () => {
  const savedPort = localStorage.getItem('openclaw-gateway-port')
  if (savedPort) {
    gatewayPort.value = savedPort
  }
  
  const savedTheme = localStorage.getItem('openclaw-theme')
  if (savedTheme) {
    currentTheme.value = savedTheme
  }
  
  const savedToken = localStorage.getItem('openclaw-gateway-token')
  if (savedToken) {
    gatewayToken.value = savedToken
  }
}

// 保存令牌
const saveToken = () => {
  localStorage.setItem('openclaw-gateway-token', gatewayToken.value)
  alert('令牌已保存')
}

// 保存端口
const savePort = () => {
  localStorage.setItem('openclaw-gateway-port', gatewayPort.value)
}

// 测试连接
const testConnection = async () => {
  testing.value = true
  connectionStatus.value = 'testing'
  
  try {
    const port = gatewayPort.value || '18789'
    // 尝试获取 token
    const response = await fetch(`http://localhost:${port}/v1/models`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000)
    })
    
    if (response.ok) {
      connectionStatus.value = 'success'
      savePort()
      // 提示用户配置令牌
      alert('连接成功！请在"网关令牌"处配置令牌以使用全部功能')
    } else {
      connectionStatus.value = 'error'
    }
  } catch (e) {
    connectionStatus.value = 'error'
  } finally {
    testing.value = false
  }
}

// 切换主题
const changeTheme = () => {
  localStorage.setItem('openclaw-theme', currentTheme.value)
  // 触发主题变更事件
  window.dispatchEvent(new CustomEvent('theme-change', { detail: currentTheme.value }))
}

// 导出历史
const exportHistory = () => {
  const history = localStorage.getItem('openclaw-messages')
  if (history) {
    const blob = new Blob([history], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `openclaw-history-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  } else {
    alert('暂无历史记录')
  }
}

// 清除历史
const clearHistory = () => {
  if (confirm('确定要清除所有历史对话记录吗？此操作不可恢复。')) {
    localStorage.removeItem('openclaw-messages')
    alert('历史记录已清除')
    // 刷新页面
    window.location.reload()
  }
}

onMounted(() => {
  loadSettings()
  // 加载版本号
  const savedVersion = localStorage.getItem('openclaw-version')
  if (savedVersion) {
    openclawVersion.value = savedVersion
  } else {
    // 开发模式默认版本
    const isDev = window.location.protocol === 'http:' && window.location.port === '5173'
    if (isDev) {
      openclawVersion.value = 'v2026.3.8'
    }
  }
})
</script>

<style scoped>
.settings-panel {
  padding: 24px;
  height: 100%;
  overflow-y: auto;
}

.panel-header {
  margin-bottom: 24px;
}

.panel-header h2 {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.subtitle {
  font-size: 14px;
  color: var(--text-secondary);
}

.settings-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.settings-section {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}

.setting-item {
  margin-bottom: 16px;
}

.setting-item:last-child {
  margin-bottom: 0;
}

.setting-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.label-icon {
  font-size: 16px;
}

.setting-control {
  display: flex;
  gap: 10px;
  margin-bottom: 8px;
}

.setting-input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  transition: all 0.2s;
  pointer-events: auto;
}

.setting-input.token-input {
  max-width: 400px;
}

.setting-input.port-input {
  max-width: 100px;
}

.setting-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px rgba(90, 90, 236, 0.2);
}

.setting-btn {
  padding: 10px 20px;
  border: 1px solid var(--accent);
  border-radius: 8px;
  background: var(--accent);
  color: white;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.setting-btn:hover:not(:disabled) {
  background: var(--accent-hover);
}

.setting-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.setting-hint {
  font-size: 12px;
  color: var(--text-secondary);
}

.connection-status {
  font-size: 13px;
  margin-top: 8px;
  font-weight: 500;
}

.connection-status.success {
  color: #10b981;
}

.connection-status.error {
  color: #ef4444;
}

.connection-status.testing {
  color: #ffc107;
}

/* Toggle 开关 */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 26px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--bg-tertiary);
  border: 1px solid var(--border);
  transition: 0.3s;
  border-radius: 26px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.toggle-switch input:checked + .toggle-slider {
  background-color: var(--accent);
  border-color: var(--accent);
}

.toggle-switch input:checked + .toggle-slider:before {
  transform: translateX(22px);
}

.toggle-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-left: 12px;
}

/* 主题选项 */
.theme-options {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.theme-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.theme-option input {
  display: none;
}

.theme-preview {
  width: 80px;
  height: 60px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid transparent;
  transition: all 0.2s;
}

.theme-option.active .theme-preview {
  border-color: var(--accent);
}

.theme-check {
  color: white;
  font-size: 24px;
  font-weight: bold;
  text-shadow: 0 2px 4px rgba(0,0,0,0.3);
}

.theme-name {
  font-size: 13px;
  color: var(--text-secondary);
}

.theme-option.active .theme-name {
  color: var(--text-primary);
  font-weight: 500;
}

/* 操作按钮 */
.setting-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 8px;
}

.action-btn {
  padding: 10px 20px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  border-color: var(--accent);
  background: var(--accent);
  color: white;
}

.action-btn.danger {
  border-color: #ef4444;
  color: #ef4444;
}

.action-btn.danger:hover {
  background: #ef4444;
  color: white;
}

/* 关于信息 */
.about-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.about-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
}

.about-item:last-child {
  border-bottom: none;
}

.about-label {
  color: var(--text-secondary);
  font-size: 14px;
}

.about-value {
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 500;
}
</style>
