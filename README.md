# OpenClaw Web UI

一个基于 Electron + Vue 3 的 OpenClaw 自定义对话交互桌面客户端应用。

## 功能特性

- 🎨 多主题支持：默认、暗夜、粉色、赛博科技、梦幻海洋
- 💬 聊天界面：发送消息、附件支持、拖拽上传
- 🎯 技能中心：管理 OpenClaw Agent Skills
- ⚙️ 设置中心：网关连接配置、主题切换
- 🔐 网关令牌自动认证

## 快速开始

### 开发模式

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 构建

```bash
# 构建 Web 资源
npm run build

# 构建 Electron 应用
npm run electron:build
```

打包后的文件位于 `dist-electron` 目录。

## 项目结构

```
openclaw-web-ui/
├── electron/           # Electron 主进程代码
│   ├── main.js        # 应用入口
│   └── preload.js     # 预加载脚本
├── src/               # Vue 3 前端代码
│   ├── components/   # Vue 组件
│   ├── styles/       # CSS 样式
│   ├── App.vue       # 主应用组件
│   └── main.js       # 前端入口
├── public/            # 静态资源
├── dist/              # 构建输出（Web）
└── dist-electron/     # 构建输出（Electron）
```

## 技术栈

- **前端**：Vue 3 + Vite
- **桌面**：Electron 28
- **打包**：electron-builder

## 主题预览

| 主题 | 描述 |
|------|------|
| 默认 | DeepSeek 浅色风格 |
| 暗夜 | 深色护眼主题 |
| 粉色 | 粉色可爱风格 |
| 赛博科技 | 霓虹网格风格 |
| 梦幻海洋 | 渐变梦幻风格 |

## 许可证

MIT License
