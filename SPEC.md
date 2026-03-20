# OpenClaw Web UI - 自定义对话界面

## 项目概述

- **项目名称**: OpenClaw Web UI
- **类型**: Web应用（Electron打包桌面端）
- **核心功能**: 自定义风格的AI对话交互界面，支持多皮肤切换
- **技术栈**: Vue 3 + Vite + Electron

## 功能规划

### Phase 1: 基础功能 ✅
- [ ] 消息发送与接收
- [ ] 消息列表渲染（文字）
- [ ] 输入框 + 发送按钮
- [ ] 对话历史记录（本地存储）

### Phase 2: 皮肤系统 🔄
- [ ] 主题切换机制（CSS变量）
- [ ] 默认皮肤（浅色）
- [ ] 暗色皮肤
- [ ] 皮肤切换器UI

### Phase 3: 网关集成 ⚡
- [ ] 启动时检测网关状态
- [ ] 未启动时自动启动网关
- [ ] 已启动则跳过

### Phase 4: 打包发布 📦
- [ ] Electron 打包
- [ ] 桌面快捷方式
- [ ] 开机自启配置

---

## 项目结构

```
openclaw-web-ui/
├── public/
├── src/
│   ├── assets/          # 静态资源
│   ├── components/      # Vue组件
│   │   ├── ChatMessage.vue
│   │   ├── ChatInput.vue
│   │   ├── MessageList.vue
│   │   └── ThemeSwitcher.vue
│   ├── styles/         # 样式文件
│   │   ├── variables.css
│   │   ├── themes/
│   │   │   ├── default.css
│   │   │   └── dark.css
│   ├── stores/         # 状态管理
│   │   └── chat.js
│   ├── utils/          # 工具函数
│   │   └── gateway.js  # 网关检测与启动
│   ├── App.vue
│   └── main.js
├── electron/
│   └── main.js         # Electron主进程
├── index.html
├── vite.config.js
└── package.json
```

---

## 皮肤系统设计

使用CSS变量实现主题切换：

```css
/* variables.css */
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --text-primary: #333333;
  --text-secondary: #666666;
  --accent: #007aff;
  --border: #e0e0e0;
  --message-user-bg: #007aff;
  --message-ai-bg: #f0f0f0;
}

/* 暗色主题 */
[data-theme="dark"] {
  --bg-primary: #1a1a1a;
  --bg-secondary: #2d2d2d;
  --text-primary: #ffffff;
  --text-secondary: #aaaaaa;
  --accent: #10b981;
  --border: #404040;
  --message-user-bg: #10b981;
  --message-ai-bg: #2d2d2d;
}
```

---

## 网关检测逻辑

```javascript
// 检测网关是否运行
async function checkGateway() {
  try {
    // 尝试访问网关API
    const response = await fetch('http://localhost:11434/api/tags');
    return response.ok;
  } catch {
    return false;
  }
}

// 启动网关
async function startGateway() {
  return new Promise((resolve, reject) => {
    const process = exec('openclaw gateway restart');
    process.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Exit code: ${code}`));
    });
  });
}
```

---

## 版本记录

- **v0.1.0** (2026-03-16): 项目初始化
