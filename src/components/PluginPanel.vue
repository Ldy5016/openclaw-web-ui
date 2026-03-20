<template>
  <div class="plugins-panel">
    <div class="panel-header">
      <h2>🔌 插件中心</h2>
      <p class="subtitle">已安装的 OpenClaw 插件</p>
    </div>
    
    <div class="plugins-list" v-if="plugins.length > 0">
      <div 
        v-for="plugin in plugins" 
        :key="plugin.name" 
        class="plugin-card"
      >
        <div class="plugin-header">
          <span class="plugin-icon">{{ plugin.icon || '🔧' }}</span>
          <span class="plugin-name">{{ plugin.name }}</span>
          <span class="plugin-status" :class="{ active: plugin.enabled }">
            {{ plugin.enabled ? '已启用' : '未启用' }}
          </span>
        </div>
        <p class="plugin-description">{{ plugin.description }}</p>
        <div class="plugin-meta" v-if="plugin.version">
          <span class="plugin-version">v{{ plugin.version }}</span>
        </div>
      </div>
    </div>
    
    <div class="empty-state" v-else-if="loading">
      <div class="loader"></div>
      <p>正在加载插件列表...</p>
    </div>
    
    <div class="empty-state" v-else>
      <span class="empty-icon">🔌</span>
      <p>暂无已安装的插件</p>
      <p class="tip">请通过 npm 安装插件</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const plugins = ref([])
const loading = ref(true)

const loadPlugins = async () => {
  loading.value = true
  try {
    // 从 localStorage 获取插件列表
    const saved = localStorage.getItem('openclaw-plugins')
    if (saved) {
      plugins.value = JSON.parse(saved)
    } else {
      // 默认插件列表
      plugins.value = [
        {
          name: 'Feishu (飞书)',
          description: '飞书消息、文档、云盘、知识库等应用集成',
          icon: '🐦',
          version: '1.0.0',
          enabled: true
        },
        {
          name: 'WebChat (网页聊天)',
          description: '网页端聊天界面支持',
          icon: '💬',
          version: '1.0.0',
          enabled: true
        },
        {
          name: 'Telegram',
          description: 'Telegram 机器人集成',
          icon: '✈️',
          version: '1.0.0',
          enabled: false
        },
        {
          name: 'Discord',
          description: 'Discord 机器人集成',
          icon: '🎮',
          version: '1.0.0',
          enabled: false
        },
        {
          name: 'WhatsApp',
          description: 'WhatsApp 消息集成',
          icon: '📱',
          version: '1.0.0',
          enabled: false
        },
        {
          name: 'Slack',
          description: 'Slack 工作区集成',
          icon: '💼',
          version: '1.0.0',
          enabled: false
        }
      ]
      localStorage.setItem('openclaw-plugins', JSON.stringify(plugins.value))
    }
  } catch (e) {
    console.error('加载插件失败:', e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadPlugins()
})
</script>

<style scoped>
.plugins-panel {
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

.plugins-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.plugin-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
}

.plugin-card:hover {
  border-color: var(--accent);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.plugin-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.plugin-icon {
  font-size: 28px;
}

.plugin-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  flex: 1;
}

.plugin-status {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 12px;
  background: rgba(255, 193, 7, 0.1);
  color: #ffc107;
}

.plugin-status.active {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.plugin-description {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin-bottom: 10px;
}

.plugin-meta {
  display: flex;
  gap: 8px;
}

.plugin-version {
  font-size: 12px;
  color: var(--accent);
  background: rgba(90, 90, 236, 0.1);
  padding: 4px 10px;
  border-radius: 12px;
}

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
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
