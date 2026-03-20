<template>
  <div class="history-sidebar">
    <!-- 新对话按钮 -->
    <button class="new-chat-btn" @click="handleNewChat">
      <span class="btn-icon">➕</span>
      <span>新对话</span>
    </button>
    
    <!-- 历史对话列表 -->
    <div class="history-list">
      <div 
        v-for="(item, index) in historyList" 
        :key="index"
        class="history-item"
        :class="{ active: activeIndex === index }"
        @click="selectHistory(index)"
        @contextmenu.prevent="showContextMenu($event, index)"
      >
        <span class="history-icon">💬</span>
        <span class="history-title">{{ getHistoryTitle(item) }}</span>
      </div>
      
      <div v-if="historyList.length === 0" class="empty-history">
        <p>暂无历史对话</p>
      </div>
    </div>
    
    <!-- 功能按钮区域 -->
    <div class="feature-buttons">
      <button 
        class="feature-btn"
        :class="{ active: activePanel === 'skills' }"
        @click="$emit('switch-panel', 'skills')"
      >
        <span class="btn-icon">🎯</span>
        <span>技能</span>
      </button>
      <button 
        class="feature-btn"
        :class="{ active: activePanel === 'plugins' }"
        @click="$emit('switch-panel', 'plugins')"
      >
        <span class="btn-icon">🔌</span>
        <span>插件</span>
      </button>
      <button 
        class="feature-btn"
        :class="{ active: activePanel === 'settings' }"
        @click="$emit('switch-panel', 'settings')"
      >
        <span class="btn-icon">⚙️</span>
        <span>设置</span>
      </button>
    </div>
    
    <!-- 控制板按钮 -->
    <button class="control-btn" @click="openControlPanel">
      <span class="btn-icon">🎛️</span>
      <span>控制板</span>
    </button>
    
    <!-- 右键菜单 -->
    <div 
      v-if="contextMenu.visible" 
      class="context-menu"
      :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }"
      @click.stop
    >
      <div class="menu-item" @click="selectHistory(contextMenu.index)">
        选择
      </div>
      <div class="menu-item danger" @click="hideHistory(contextMenu.index)">
        删除
      </div>
      <div class="menu-item" @click="closeContextMenu">
        取消
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  activePanel: {
    type: String,
    default: 'chat'
  }
})

const emit = defineEmits(['new-chat', 'switch-panel', 'select-history'])

// 历史记录
const historyList = ref([])
const activeIndex = ref(-1)

// 右键菜单
const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  index: -1
})

// 获取历史记录的标题（第一条用户消息的前几个字）
const getHistoryTitle = (item) => {
  if (!item || !item.messages || item.messages.length === 0) {
    return '新对话'
  }
  // 找第一条用户消息
  const firstUserMsg = item.messages.find(m => m.role === 'user')
  if (firstUserMsg && firstUserMsg.content) {
    // 去掉换行符，取前12个字符
    const text = firstUserMsg.content.replace(/\n/g, ' ').trim()
    return text.length > 12 ? text.slice(0, 12) + '...' : text
  }
  return '新对话'
}

// 处理新对话点击
const handleNewChat = () => {
  // 检查最近一次历史对话是否有内容
  if (historyList.value.length > 0) {
    const latestHistory = historyList.value[0]
    // 如果最近一次对话没有消息或只有AI消息（有用户消息才算有内容）
    const hasUserMessage = latestHistory.messages && 
      latestHistory.messages.some(m => m.role === 'user')
    
    if (!hasUserMessage) {
      // 最近一次对话是空的，直接进入该对话
      selectHistory(0)
      return
    }
  }
  // 最近一次对话有内容，创建新对话
  emit('new-chat')
}

// 加载历史记录
const loadHistory = () => {
  try {
    const saved = localStorage.getItem('openclaw-history')
    if (saved) {
      const data = JSON.parse(saved)
      // 过滤掉已隐藏的
      historyList.value = data.filter(item => !item.hidden)
    }
    
    // 如果没有历史，添加一个空记录作为默认
    if (historyList.value.length === 0) {
      historyList.value = [
        { title: '默认对话', messages: [], hidden: false }
      ]
      saveHistory()
    }
  } catch (e) {
    console.error('加载历史失败:', e)
    historyList.value = [
      { title: '默认对话', messages: [], hidden: false }
    ]
  }
}

// 保存历史记录
const saveHistory = () => {
  try {
    localStorage.setItem('openclaw-history', JSON.stringify(historyList.value))
  } catch (e) {
    console.error('保存历史失败:', e)
  }
}

// 选择历史
const selectHistory = (index) => {
  activeIndex.value = index
  emit('select-history', historyList.value[index])
  closeContextMenu()
}

// 显示右键菜单
const showContextMenu = (event, index) => {
  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    index: index
  }
}

// 隐藏历史（软删除）
const hideHistory = (index) => {
  if (index >= 0 && index < historyList.value.length) {
    historyList.value[index].hidden = true
    historyList.value = historyList.value.filter(item => !item.hidden)
    saveHistory()
    
    // 如果删除的是当前选中的，重置
    if (activeIndex.value === index) {
      activeIndex.value = -1
    }
  }
  closeContextMenu()
}

// 关闭菜单
const closeContextMenu = () => {
  contextMenu.value.visible = false
}

// 点击其他地方关闭菜单
const handleClickOutside = () => {
  if (contextMenu.value.visible) {
    closeContextMenu()
  }
}

// 打开控制板
const openControlPanel = async () => {
  const port = localStorage.getItem('openclaw-gateway-port') || '18789'
  localStorage.setItem('openclaw-gateway-port', port)
  
  // 从设置中读取 token，如果没有则提示用户
  const token = localStorage.getItem('openclaw-gateway-token')
  
  if (!token) {
    alert('请先在设置中配置网关令牌并保存')
    return
  }
  
  // 使用 #token= 格式（锚点方式），这是OpenClaw控制面板认可的格式
  window.open(`http://localhost:${port}/#token=${token}`, '_blank')
}

// 暴露方法给父组件
defineExpose({
  loadHistory,
  getActiveHistory: () => historyList.value[activeIndex.value],
  getHistoryTitle,
  addNewHistory: (title) => {
    // 如果没有提供title，使用第一条消息的内容作为标题
    const newHistory = { title: title || '新对话', messages: [], hidden: false }
    historyList.value.unshift(newHistory)
    activeIndex.value = 0
    saveHistory()
    return newHistory
  },
  // 更新当前历史的标题
  updateCurrentTitle: () => {
    if (historyList.value.length > 0 && activeIndex.value >= 0) {
      const current = historyList.value[activeIndex.value]
      if (current && current.messages && current.messages.length > 0) {
        const title = getHistoryTitle(current)
        current.title = title
        saveHistory()
      }
    }
  }
})

onMounted(() => {
  loadHistory()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.history-sidebar {
  width: 260px;
  height: 100%;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

/* 新对话按钮 */
.new-chat-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin: 16px;
  padding: 14px 20px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--accent);
  color: white;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.new-chat-btn:hover {
  background: var(--accent-hover);
  transform: translateY(-1px);
}

.btn-icon {
  font-size: 16px;
}

/* 历史列表 */
.history-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 4px;
}

.history-item:hover {
  background: var(--bg-tertiary);
}

.history-item.active {
  background: var(--accent);
  color: white;
}

.history-icon {
  font-size: 16px;
}

.history-title {
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.empty-history {
  text-align: center;
  padding: 30px 10px;
  color: var(--text-secondary);
  font-size: 13px;
}

/* 功能按钮 */
.feature-buttons {
  padding: 12px 8px;
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.feature-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.feature-btn:hover {
  background: var(--bg-tertiary);
}

.feature-btn.active {
  background: var(--accent);
  color: white;
}

/* 控制板按钮 */
.control-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin: 8px 16px 16px;
  padding: 12px 20px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.control-btn:hover {
  border-color: var(--accent);
  background: var(--accent);
  color: white;
}

/* 右键菜单 */
.context-menu {
  position: fixed;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 6px 0;
  min-width: 120px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
}

.menu-item {
  padding: 10px 16px;
  font-size: 14px;
  color: var(--text-primary);
  cursor: pointer;
  transition: background 0.2s;
}

.menu-item:hover {
  background: var(--bg-tertiary);
}

.menu-item.danger {
  color: #ef4444;
}

.menu-item.danger:hover {
  background: rgba(239, 68, 68, 0.1);
}
</style>
