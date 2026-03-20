<template>
  <div class="thinking-container" :class="{ collapsed: isCollapsed }">
    <!-- 思考流头部 -->
    <div class="thinking-header" @click="toggleCollapse">
      <span class="thinking-icon">🧠</span>
      <span class="thinking-title">思考过程</span>
      <span class="thinking-toggle">{{ isCollapsed ? '▶' : '▼' }}</span>
    </div>
    
    <!-- 思考流内容 -->
    <div class="thinking-content" v-show="!isCollapsed">
      <div class="thinking-text">{{ content }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  content: {
    type: String,
    default: ''
  },
  // 全局收起状态（当思考流关闭时）
  globalCollapsed: {
    type: Boolean,
    default: false
  }
})

// 初始状态：从全局设置读取
const isCollapsed = ref(props.globalCollapsed)

// 监听全局状态变化
watch(() => props.globalCollapsed, (newVal) => {
  isCollapsed.value = newVal
})

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
}
</script>

<style scoped>
.thinking-container {
  background: var(--bg-tertiary);
  border-radius: 10px;
  margin-bottom: 8px;
  overflow: hidden;
  border: 1px solid var(--border);
}

.thinking-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  cursor: pointer;
  user-select: none;
  transition: background 0.2s;
}

.thinking-header:hover {
  background: var(--bg-secondary);
}

.thinking-icon {
  font-size: 14px;
}

.thinking-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  flex: 1;
}

.thinking-toggle {
  font-size: 10px;
  color: var(--text-secondary);
  transition: transform 0.2s;
}

.thinking-content {
  padding: 0 14px 14px;
}

.thinking-text {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: 'Consolas', 'Monaco', monospace;
}

/* 收起状态 */
.thinking-container.collapsed .thinking-toggle {
  transform: rotate(-90deg);
}
</style>
