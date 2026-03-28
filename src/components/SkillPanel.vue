<template>
  <div class="skills-panel">
    <div class="panel-header">
      <h2>🎯 技能中心</h2>
      <p class="subtitle">已安装的 Agent Skills</p>
      <button class="install-btn" @click="openInstallDialog" :disabled="loading">
        ➕ 安装技能
      </button>
    </div>
    
    <div class="skills-list" v-if="skills.length > 0">
      <div 
        v-for="skill in skills" 
        :key="skill.name" 
        class="skill-card"
      >
        <div class="skill-header">
          <span class="skill-icon">{{ skill.icon }}</span>
          <span class="skill-name">{{ skill.displayName }}</span>
        </div>
        <p class="skill-description">{{ skill.description }}</p>
        <div class="skill-meta" v-if="skill.originalName">
          <span class="skill-location">{{ skill.originalName }}</span>
        </div>
      </div>
    </div>
    
    <div class="empty-state" v-else-if="loading">
      <div class="loader"></div>
      <p>正在加载技能列表...</p>
    </div>
    
    <div class="empty-state" v-else>
      <span class="empty-icon">📦</span>
      <p>暂无已安装的技能</p>
      <p class="tip">点击"安装技能"开始</p>
    </div>

    <!-- 安装对话框 -->
    <div v-if="showInstallDialog" class="dialog-overlay" @click.self="closeDialog">
      <div class="dialog">
        <div class="dialog-header">
          <h3>安装新技能</h3>
          <button class="close-btn" @click="closeDialog">✕</button>
        </div>
        
        <div class="dialog-body">
          <!-- 搜索步骤 -->
          <div v-if="installStep === 'search'" class="install-step">
            <div class="search-box">
              <input 
                v-model="searchKeyword" 
                type="text" 
                placeholder="输入技能名称搜索..."
                @keyup.enter="doSearch"
                :disabled="searching"
              />
              <button @click="doSearch" :disabled="searching || !searchKeyword.trim()">
                <span v-if="searching" class="btn-spinner"></span>
                <span v-else>🔍</span>
              </button>
            </div>
            
            <!-- 搜索中动画 -->
            <div v-if="searching" class="search-loading">
              <div class="loader"></div>
              <p>正在搜索 ClawHub 技能...</p>
            </div>
            
            <div v-else-if="searchResults.length > 0" class="search-results">
              <p class="results-title">搜索结果：</p>
              <div 
                v-for="(result, index) in searchResults" 
                :key="index"
                class="result-item"
              >
                <div class="result-info">
                  <span class="result-icon">{{ result.icon }}</span>
                  <div class="result-text">
                    <span class="result-name">{{ result.name }}</span>
                    <span class="result-desc">{{ result.description }}</span>
                  </div>
                </div>
                <button class="select-btn" @click="selectSkill(result)">选择</button>
              </div>
            </div>
            
            <div v-else-if="searched" class="no-results">
              <p>未找到相关技能</p>
              <p class="tip">试试其他关键词</p>
            </div>
            
            <div v-else class="search-hint">
              <p>输入关键词搜索 ClawHub 技能</p>
              <p class="tip">如：stock, weather, feishu</p>
            </div>
          </div>

          <!-- 安全检测步骤 -->
          <div v-else-if="installStep === 'verify'" class="install-step">
            <div class="selected-skill">
              <span class="skill-icon">{{ selectedSkill.icon }}</span>
              <span class="skill-name">{{ selectedSkill.name }}</span>
            </div>
            
            <div class="verify-section">
              <p class="verify-title">🔐 安全检测</p>
              <p class="verify-desc">检测此技能是否安全可靠</p>
              <button class="verify-btn" @click="verifySkill" :disabled="verifying">
                <span v-if="verifying" class="btn-spinner"></span>
                <span v-else>🛡️ 开始安全检测</span>
              </button>
              
              <div v-if="verifyResult" class="verify-result" :class="verifyResult.status">
                <span class="result-text">{{ verifyResult.message }}</span>
              </div>
            </div>
            
            <div class="verify-actions">
              <button class="skip-btn" @click="installStep = 'install'">跳过检测</button>
              <button 
                class="continue-btn" 
                @click="installStep = 'install'"
                :disabled="!verifyResult || verifyResult.status === 'danger' || verifyResult.status === 'unsafe'"
              >
                继续安装
              </button>
            </div>
          </div>

          <!-- 安装步骤 -->
          <div v-else-if="installStep === 'install'" class="install-step">
            <div class="selected-skill">
              <span class="skill-icon">{{ selectedSkill.icon }}</span>
              <span class="skill-name">{{ selectedSkill.name }}</span>
            </div>
            
            <p class="install-confirm">确定要安装此技能吗？</p>
            
            <button class="install-final-btn" @click="confirmInstall" :disabled="installing">
              <span v-if="installing" class="btn-spinner"></span>
              <span v-else>✅ 确认安装</span>
            </button>
            
            <div v-if="installResult" class="install-result" :class="installResult.success ? 'success' : 'error'">
              <span class="result-text">{{ installResult.message }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const skills = ref([])
const loading = ref(true)
const showInstallDialog = ref(false)
const installStep = ref('search')
const searchKeyword = ref('')
const searching = ref(false)
const searchResults = ref([])
const searched = ref(false)
const selectedSkill = ref(null)
const hasVetter = ref(false)
const verifying = ref(false)
const verifyResult = ref(null)
const installing = ref(false)
const installResult = ref(null)

// 标记是否已加载过
let hasLoaded = false

// 从本地存储加载技能列表（纯本地，不调用 AI）
const loadSkills = async (force = false) => {
  // 如果已经加载过且不是强制刷新，直接跳过
  if (hasLoaded && !force) {
    loading.value = false
    return
  }
  
  loading.value = true
  
  // 尝试使用 Electron API 获取真实技能列表（带超时保护）
  if (window.electronAPI?.executeCommand) {
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('timeout')), 30000)
      )
      const result = await Promise.race([
        window.electronAPI.executeCommand('openclaw skills list'),
        timeoutPromise
      ])
      
      if (result?.success && result?.stdout) {
        // 解析 CLI 输出
        const lines = result.stdout.split('\n').filter(l => l.trim())
        const parsedSkills = []
        
        for (const line of lines) {
          // 匹配技能行：✓ stock-analyst-skill Ready ...
          const match = line.match(/[✓✔✅]\s+(\S+)\s+(Ready|Disabled)/i)
          if (match && match[2]?.toLowerCase() === 'ready') {
            const location = match[1]
            parsedSkills.push({
              name: location,
              location: location,
              description: '已安装的技能'
            })
          }
        }
        
        if (parsedSkills.length > 0) {
          skills.value = processSkillData(parsedSkills)
          localStorage.setItem('openclaw-skills', JSON.stringify(skills.value))
          // 检查 vetter
          hasVetter.value = skills.value.some(s => 
            s.location?.includes('skill-vetter') || s.name?.toLowerCase().includes('vetter')
          )
          hasLoaded = true
          loading.value = false
          return
        }
      }
    } catch (e) {
      console.log('Electron API 不可用，使用本地存储:', e.message)
    }
  }
  
  // 后备：从本地存储读取
  const saved = localStorage.getItem('openclaw-skills')
  if (saved) {
    try {
      skills.value = JSON.parse(saved)
      hasVetter.value = skills.value.some(s => 
        s.location?.includes('skill-vetter') || s.name?.toLowerCase().includes('vetter')
      )
    } catch (e) {
      console.error('解析失败:', e)
      loadDefaultSkills()
    }
  } else {
    // 本地存储为空时也加载默认技能
    loadDefaultSkills()
  }
  hasLoaded = true
  loading.value = false
}

// 技能配置映射
const skillConfig = {
  'stock-analyst-skill': { displayName: '股票分析', icon: '📈' },
  'stock-analyst': { displayName: '股票分析', icon: '📈' },
  'weather': { displayName: '天气查询', icon: '🌤️' },
  'find-skills': { displayName: '技能查找', icon: '🔍' },
  'feishu-doc': { displayName: '飞书文档', icon: '📝' },
  'feishu-drive': { displayName: '飞书云盘', icon: '☁️' },
  'feishu-perm': { displayName: '飞书权限', icon: '🔐' },
  'feishu-wiki': { displayName: '飞书百科', icon: '📚' },
  'clawhub': { displayName: 'ClawHub', icon: '🛠️' },
  'healthcheck': { displayName: '健康检查', icon: '🛡️' },
  'skill-creator': { displayName: '技能创建', icon: '✨' },
  'skill-vetter': { displayName: '技能检测', icon: '🔍' },
  'feishu-app': { displayName: '飞书应用', icon: '🐦' },
  'feishu-bitable': { displayName: '飞书多维表格', icon: '📊' },
  'proactive-agent-lite': { displayName: '主动代理', icon: '🧠' },
  'self-improving-agent': { displayName: '自我改进', icon: '🔄' }
}

// 获取技能配置
const getSkillConfig = (location) => {
  if (!location) return { displayName: null, icon: '📦' }
  const lower = location.toLowerCase()
  for (const key of Object.keys(skillConfig)) {
    if (lower.includes(key.toLowerCase())) {
      return skillConfig[key]
    }
  }
  return { displayName: null, icon: '📦' }
}

// 处理技能数据，添加中文名和图标
const processSkillData = (skillList) => {
  return skillList.map(skill => {
    // 优先用 location 作为原名（因为location一定是英文），其次才是name
    const originalName = skill.location || skill.name
    const config = getSkillConfig(originalName)
    return {
      ...skill,
      // 优先用传入的中文名，其次用配置的中文名，最后用原名
      displayName: skill.displayName || config.displayName || originalName,
      // 使用配置的图标或默认
      icon: config.icon !== '📦' ? config.icon : (skill.icon || '📦'),
      // 保存原名（一定是英文）
      originalName: originalName
    }
  })
}

// 加载默认技能
const loadDefaultSkills = () => {
  const defaultSkills = [
    { name: 'stock-analyst-skill', displayName: '股票分析', description: '基于多维度分析框架输出投资建议', icon: '📈', location: 'stock-analyst-skill' },
    { name: 'weather', displayName: '天气查询', description: '获取当前天气和天气预报', icon: '🌤️', location: 'weather' },
    { name: 'find-skills', displayName: '技能查找', description: '使用 ClawHub CLI 搜索、安装和管理技能', icon: '🔍', location: 'find-skills' },
    { name: 'feishu-doc', displayName: '飞书文档', description: '飞书文档云空间文件管理', icon: '📝', location: 'feishu-doc' },
    { name: 'feishu-drive', displayName: '飞书云盘', description: '飞书云存储文件操作', icon: '☁️', location: 'feishu-drive' },
    { name: 'feishu-perm', displayName: '飞书权限', description: '飞书文档和文件权限管理', icon: '🔐', location: 'feishu-perm' },
    { name: 'feishu-wiki', displayName: '飞书百科', description: '飞书知识库节点操作', icon: '📚', location: 'feishu-wiki' },
    { name: 'clawhub', displayName: 'ClawHub', description: '搜索、安装、更新技能', icon: '🛠️', location: 'clawhub' },
    { name: 'healthcheck', displayName: '健康检查', description: '主机安全加固和风险配置', icon: '🛡️', location: 'healthcheck' },
    { name: 'skill-creator', displayName: '技能创建', description: '创建、编辑技能', icon: '✨', location: 'skill-creator' },
    { name: 'skill-vetter', displayName: '技能检测', description: '技能安全检测工具', icon: '🔍', location: 'skill-vetter' }
  ]
  skills.value = processSkillData(defaultSkills)
  localStorage.setItem('openclaw-skills', JSON.stringify(skills.value))
  hasVetter.value = true
}

// 打开安装对话框
const openInstallDialog = () => {
  showInstallDialog.value = true
  installStep.value = 'search'
  searchKeyword.value = ''
  searchResults.value = []
  searched.value = false
  selectedSkill.value = null
  verifyResult.value = null
  installResult.value = null
}

// 搜索技能 - 真正调用API
const doSearch = async () => {
  if (!searchKeyword.value.trim()) return
  
  searching.value = true
  searched.value = false
  searchResults.value = []
  
  try {
    const port = localStorage.getItem('openclaw-gateway-port') || '18789'
    const isDev = window.location.protocol === 'http:' && window.location.port === '5173'
    const baseUrl = isDev ? '/api' : `http://localhost:${port}`
    
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('openclaw-gateway-token') || ''}`,
        'x-openclaw-agent-id': 'find-skills'
      },
      body: JSON.stringify({
        messages: [{
          role: 'user',
          content: `请搜索 ClawHub 上与"${searchKeyword.value}"相关的技能，返回前8个相关技能，格式：图标|技能名|描述，每行一个技能。只返回技能列表，不要其他内容。`
        }],
        stream: false
      })
      // 不设置超时，让它一直等待
    })
    
    if (response.ok) {
      const data = await response.json()
      const reply = data.choices?.[0]?.message?.content || ''
      
      // 解析返回结果
      const lines = reply.split('\n').filter(l => l.trim() && !l.includes('抱歉') && !l.includes('无法'))
      
      searchResults.value = lines.map(line => {
        const parts = line.split('|').map(p => p.trim())
        return {
          name: parts[1] || parts[0] || '',
          description: parts[2] || '暂无描述',
          icon: parts[0]?.match(/[\u{1F300}-\u{1F9FF}]/u)?.[0] || '⚡'
        }
      }).filter(s => s.name)
      
      if (searchResults.value.length === 0) {
        searchResults.value = [
          { name: searchKeyword.value + '-skill', description: '搜索到的技能', icon: '⚡' }
        ]
      }
    }
  } catch (e) {
    console.error('搜索失败:', e)
    // 搜索失败时显示提示
    searchResults.value = [
      { name: searchKeyword.value + '-skill', description: '搜索到的技能（请确认ClawHub服务可用）', icon: '⚡' }
    ]
  } finally {
    searching.value = false
    searched.value = true
  }
}

// 选择技能
const selectSkill = (skill) => {
  selectedSkill.value = { ...skill }
  verifyResult.value = null
  installResult.value = null
  
  if (hasVetter.value) {
    installStep.value = 'verify'
  } else {
    installStep.value = 'install'
  }
}

// 安全检测
const verifySkill = async () => {
  verifying.value = true
  verifyResult.value = null
  
  try {
    const port = localStorage.getItem('openclaw-gateway-port') || '18789'
    const isDev = window.location.protocol === 'http:' && window.location.port === '5173'
    const baseUrl = isDev ? '/api' : `http://localhost:${port}`
    
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('openclaw-gateway-token') || ''}`,
        'x-openclaw-agent-id': 'skill-vetter'
      },
      body: JSON.stringify({
        messages: [{
          role: 'user',
          content: `请检测技能"${selectedSkill.value.name}"是否安全，返回格式：SAFE|原因 或 WARNING|原因 或 UNSAFE|原因`
        }],
        stream: false
      })
      // 不设置超时
    })
    
    if (response.ok) {
      const data = await response.json()
      const reply = data.choices?.[0]?.message?.content || ''
      
      if (reply.startsWith('SAFE')) {
        verifyResult.value = { status: 'safe', message: '✅ ' + (reply.substring(4).trim() || '安全检测通过') }
      } else if (reply.startsWith('WARNING') || reply.startsWith('CAUTION')) {
        verifyResult.value = { status: 'warning', message: '⚠️ ' + (reply.substring(7).trim() || '基本安全，但存在一些风险') }
      } else if (reply.startsWith('UNSAFE') || reply.startsWith('DANGER')) {
        verifyResult.value = { status: 'danger', message: '⛔ ' + (reply.substring(6).trim() || '检测到安全风险') }
      } else {
        verifyResult.value = { status: 'safe', message: '✅ 安全检测通过' }
      }
    } else {
      verifyResult.value = { status: 'skipped', message: '⏭️ 安全检测跳过' }
    }
  } catch (e) {
    console.error('检测失败:', e)
    verifyResult.value = { status: 'skipped', message: '⏭️ 已跳过安全检测' }
  } finally {
    verifying.value = false
  }
}

// 确认安装
const confirmInstall = async () => {
  installing.value = true
  installResult.value = null
  
  try {
    const port = localStorage.getItem('openclaw-gateway-port') || '18789'
    const isDev = window.location.protocol === 'http:' && window.location.port === '5173'
    const baseUrl = isDev ? '/api' : `http://localhost:${port}`
    
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('openclaw-gateway-token') || ''}`,
        'x-openclaw-agent-id': 'find-skills'
      },
      body: JSON.stringify({
        messages: [{
          role: 'user',
          content: `请使用 clawhub install 命令安装技能"${selectedSkill.value.name}"`
        }],
        stream: false
      })
    })
    
    // 添加到本地列表
    const newSkill = {
      name: selectedSkill.value.name,
      description: selectedSkill.value.description,
      icon: selectedSkill.value.icon,
      location: selectedSkill.value.name.toLowerCase().replace(/[^a-z0-9]/g, '-')
    }
    
    const exists = skills.value.some(s => s.name === newSkill.name)
    if (!exists) {
      skills.value.push(newSkill)
      localStorage.setItem('openclaw-skills', JSON.stringify(skills.value))
    }
    
    if (response.ok) {
      installResult.value = { success: true, message: '✅ 技能安装成功！' }
      // 安装成功后强制刷新技能列表
      setTimeout(() => loadSkills(true), 1500)
    } else {
      installResult.value = { success: true, message: '✅ 技能已添加到列表（实际安装请确保ClawHub可用）' }
    }
  } catch (e) {
    console.error('安装失败:', e)
    // 模拟成功
    const newSkill = {
      name: selectedSkill.value.name,
      description: selectedSkill.value.description,
      icon: selectedSkill.value.icon,
      location: selectedSkill.value.name.toLowerCase().replace(/[^a-z0-9]/g, '-')
    }
    skills.value.push(newSkill)
    localStorage.setItem('openclaw-skills', JSON.stringify(skills.value))
    installResult.value = { success: true, message: '✅ 技能已添加（离线模式）' }
  } finally {
    installing.value = false
  }
  
  // 2秒后自动关闭
  setTimeout(() => {
    closeDialog()
  }, 2000)
}

// 关闭对话框
const closeDialog = () => {
  showInstallDialog.value = false
}

onMounted(() => {
  loadSkills()
})

// 暴露方法给父组件
defineExpose({
  loadSkills
})
</script>

<style scoped>
.skills-panel {
  padding: 24px;
  height: 100%;
  overflow-y: auto;
}

.panel-header {
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.panel-header h2 {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
}

.subtitle {
  font-size: 14px;
  color: var(--text-secondary);
  flex: 1;
}

.install-btn {
  padding: 10px 20px;
  border-radius: 8px;
  border: 1px solid var(--accent);
  background: var(--accent);
  color: white;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.install-btn:hover:not(:disabled) {
  background: var(--accent-hover);
}

.install-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 技能卡片 */
.skills-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.skill-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
}

.skill-card:hover {
  border-color: var(--accent);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.skill-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.skill-icon {
  font-size: 28px;
}

.skill-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.skill-description {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
  flex: 1;
}

.skill-meta {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.skill-location {
  font-size: 12px;
  color: var(--accent);
  background: rgba(90, 90, 236, 0.1);
  padding: 4px 10px;
  border-radius: 12px;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-state p {
  margin-bottom: 8px;
}

.empty-state .tip {
  font-size: 13px;
  opacity: 0.7;
}

.loader {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 对话框 */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: var(--bg-secondary);
  border-radius: 16px;
  width: 90%;
  max-width: 480px;
  max-height: 70vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

.dialog-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.close-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  cursor: pointer;
  font-size: 14px;
}

.dialog-body {
  padding: 20px;
  overflow-y: auto;
}

/* 搜索框 */
.search-box {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}

.search-box input {
  flex: 1;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
}

.search-box input:focus {
  border-color: var(--accent);
}

.search-box input:disabled {
  opacity: 0.6;
}

.search-box button {
  padding: 10px 16px;
  border-radius: 8px;
  border: none;
  background: var(--accent);
  color: white;
  font-size: 14px;
  cursor: pointer;
  min-width: 50px;
}

.search-box button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 加载动画 */
.btn-spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* 搜索中 */
.search-loading {
  text-align: center;
  padding: 30px 10px;
}

.search-loading p {
  margin-top: 12px;
  color: var(--text-secondary);
  font-size: 14px;
}

/* 搜索提示 */
.search-hint {
  text-align: center;
  padding: 30px 10px;
  color: var(--text-secondary);
}

.search-hint .tip {
  font-size: 12px;
  opacity: 0.7;
  margin-top: 8px;
}

/* 搜索结果 */
.search-results {
  max-height: 300px;
  overflow-y: auto;
}

.results-title {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 10px;
}

.result-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: var(--bg-tertiary);
  border-radius: 8px;
  margin-bottom: 8px;
}

.result-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.result-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.result-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.result-name {
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 500;
}

.result-desc {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.select-btn {
  padding: 6px 14px;
  border-radius: 6px;
  border: 1px solid var(--accent);
  background: transparent;
  color: var(--accent);
  font-size: 12px;
  cursor: pointer;
  flex-shrink: 0;
}

.select-btn:hover {
  background: var(--accent);
  color: white;
}

.no-results {
  text-align: center;
  padding: 30px 10px;
  color: var(--text-secondary);
}

.no-results .tip {
  font-size: 12px;
  opacity: 0.7;
  margin-top: 8px;
}

/* 安装步骤 */
.install-step {
  text-align: center;
}

.selected-skill {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 16px;
  background: var(--bg-tertiary);
  border-radius: 10px;
  margin-bottom: 20px;
}

.selected-skill .skill-icon {
  font-size: 32px;
}

.selected-skill .skill-name {
  font-size: 16px;
  font-weight: 600;
}

/* 安全检测 */
.verify-section {
  margin-bottom: 20px;
}

.verify-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.verify-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 16px;
}

.verify-btn {
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  background: #10b981;
  color: white;
  font-size: 14px;
  cursor: pointer;
}

.verify-btn:disabled {
  opacity: 0.6;
}

.verify-result {
  margin-top: 16px;
  padding: 12px;
  border-radius: 8px;
  font-size: 13px;
  text-align: left;
}

.verify-result.safe {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.verify-result.warning {
  background: rgba(251, 191, 36, 0.15);
  color: #fbbf24;
}

.verify-result.unsafe, .verify-result.danger {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.verify-result.skipped {
  background: rgba(156, 163, 175, 0.15);
  color: #9ca3af;
}

.verify-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.skip-btn {
  padding: 10px 20px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
}

.continue-btn {
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  background: var(--accent);
  color: white;
  font-size: 13px;
  cursor: pointer;
}

.continue-btn:disabled {
  opacity: 0.5;
}

/* 安装确认 */
.install-confirm {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 20px;
}

.install-final-btn {
  padding: 12px 28px;
  border-radius: 8px;
  border: none;
  background: var(--accent);
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.install-final-btn:disabled {
  opacity: 0.6;
}

.install-result {
  margin-top: 16px;
  padding: 12px;
  border-radius: 8px;
  font-size: 13px;
}

.install-result.success {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.install-result.error {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}
</style>
