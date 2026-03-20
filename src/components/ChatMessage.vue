<template>
  <div class="chat-message" :class="message.role">
    <!-- AI 消息在左边 -->
    <template v-if="message.role === 'assistant'">
      <div class="avatar">{{ botIcon || '🦞' }}</div>
      <div class="content">
        <!-- 思考流显示 -->
        <ThinkingMessage 
          v-if="message.thinking && showThinking" 
          :content="message.thinking"
          :global-collapsed="!thinkingEnabled"
        />
        
        <!-- 附件显示 -->
        <div v-if="message.attachments && message.attachments.length > 0" class="attachments">
          <div 
            v-for="(att, index) in message.attachments" 
            :key="index"
            class="attachment"
          >
            <img v-if="att.type && att.type.startsWith('image/')" :src="att.preview" class="attachment-img" />
            <div v-else class="attachment-file">
              <span class="file-icon">📄</span>
              <span class="file-name">{{ att.name }}</span>
            </div>
          </div>
        </div>
        
        <div class="bubble-wrapper">
          <div class="bubble">
            {{ message.content }}
          </div>
          <button class="copy-btn" @click="copyContent" title="复制">
            📋
          </button>
        </div>
        <div class="timestamp">
          {{ formatTime(message.timestamp) }}
        </div>
      </div>
    </template>
    
    <!-- 用户消息在右边 -->
    <template v-else>
      <div class="content">
        <div class="bubble-wrapper" style="margin-left: auto;">
          <div class="bubble">
            {{ message.content }}
          </div>
          <button class="copy-btn" @click="copyContent" title="复制">
            📋
          </button>
        </div>
        <div class="timestamp" style="text-align: right;">
          {{ formatTime(message.timestamp) }}
        </div>
      </div>
      <div class="avatar">👤</div>
    </template>
  </div>
</template>

<script setup>
import ThinkingMessage from './ThinkingMessage.vue'

const props = defineProps({
  message: {
    type: Object,
    required: true
  },
  botIcon: {
    type: String,
    default: '🦞'
  },
  showThinking: {
    type: Boolean,
    default: true
  },
  thinkingEnabled: {
    type: Boolean,
    default: true
  }
})

const formatTime = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

const copyContent = async () => {
  try {
    await navigator.clipboard.writeText(props.message.content)
  } catch (e) {
    console.error('复制失败:', e)
  }
}
</script>

<style scoped>
.chat-message {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
  background: var(--bg-tertiary);
}

.chat-message.user .avatar {
  background: var(--message-user-bg);
}

.chat-message.assistant .avatar {
  background: var(--accent);
}

.content {
  flex: 1;
  max-width: 75%;
  display: flex;
  flex-direction: column;
}

.chat-message.user .content {
  align-items: flex-end;
}

/* 附件样式 */
.attachments {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.attachment {
  max-width: 200px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border);
}

.attachment-img {
  display: block;
  max-width: 100%;
  height: auto;
}

.attachment-file {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: var(--bg-tertiary);
}

.file-icon {
  font-size: 18px;
}

.file-name {
  font-size: 13px;
  color: var(--text-primary);
}

.bubble-wrapper {
  position: relative;
  display: inline-block;
  max-width: 100%;
}

.bubble {
  padding: 14px 18px;
  border-radius: 16px;
  line-height: 1.6;
  font-size: 15px;
  white-space: pre-wrap;
  word-break: break-word;
  display: inline-block;
}

.chat-message.user .bubble {
  background: var(--message-user-bg);
  color: var(--message-user-text);
  border-bottom-left-radius: 4px;
}

.chat-message.assistant .bubble {
  background: var(--message-ai-bg);
  color: var(--message-ai-text);
  border-bottom-right-radius: 4px;
}

/* 赛博科技 - 霓虹青边框对话框 */
[data-theme="cyber"] .chat-message.user .bubble {
  border-radius: var(--bubble-radius, 0px);
  border: 2px solid transparent;
  box-shadow: 4px 4px 0px rgba(0, 245, 255, 0.4);
}

[data-theme="cyber"] .chat-message.assistant .bubble {
  border-radius: var(--bubble-radius, 0px);
  border: 2px solid var(--accent);
  box-shadow: 0 0 8px rgba(0, 245, 255, 0.2);
}

/* 梦幻海洋 - 半透明对话框 + 明显光泽 */
[data-theme="ocean"] .chat-message.user .bubble {
  background: linear-gradient(135deg, rgba(6, 182, 212, 0.7) 0%, rgba(59, 130, 246, 0.7) 100%);
  border-radius: var(--bubble-radius, 20px);
  box-shadow: 0 4px 15px rgba(6, 182, 212, 0.25);
  position: relative;
  overflow: hidden;
}

[data-theme="ocean"] .chat-message.user .bubble::before {
  content: '';
  position: absolute;
  top: 8px;
  left: 12px;
  width: 30px;
  height: 30px;
  background: linear-gradient(135deg, rgba(255,255,255,0.6) 0%, transparent 70%);
  border-radius: 50%;
}

[data-theme="ocean"] .chat-message.assistant .bubble {
  background: rgba(139, 92, 246, 0.35);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: var(--bubble-radius, 20px);
  color: var(--message-ai-text);
  box-shadow: 0 4px 15px rgba(139, 92, 246, 0.2);
  position: relative;
  overflow: hidden;
}

[data-theme="ocean"] .chat-message.assistant .bubble::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 50px;
  background: linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 100%);
  pointer-events: none;
}

/* 赛博科技对话框适配浅黑色背景 */
[data-theme="cyber"] .chat-message.assistant .bubble {
  background: var(--message-ai-bg);
}

.copy-btn {
  position: absolute;
  top: 8px;
  right: -36px;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: var(--bg-tertiary);
  cursor: pointer;
  font-size: 14px;
  opacity: 0;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chat-message:hover .copy-btn {
  opacity: 0.7;
}

.copy-btn:hover {
  opacity: 1 !important;
  background: var(--accent);
}

.timestamp {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 6px;
  padding: 0 4px;
}
</style>
