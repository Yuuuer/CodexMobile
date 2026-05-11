# 项目结构分析

## 总览

CodexMobile 是一个单仓库、多层职责拆分的项目：

- `server/`：Node.js 桥接层，负责认证、会话、聊天、Git、文件、通知、语音和静态资源。
- `client/`：React + Vite 的移动端 PWA 前端，负责状态编排、聊天界面、Composer 和侧边面板。
- `shared/`：前后端共用的纯函数和数据规则，避免重复实现。
- `asr-service/`：独立的 Python FastAPI 语音识别服务，可选接入。
- `scripts/`：启动、安装、校验和运维脚本。
- `skills/`：本地 skill 定义。
- `docs/`：说明文档、计划和示例图片。

## 入口与主链路

- 服务入口是 `server/index.js`，它把认证、`/api/*` 路由、WebSocket、静态文件和可选 HTTPS 串起来。
- 前端入口是 `client/src/main.jsx`，根据路径切换主应用和文件预览页。
- 语音识别入口是 `asr-service/app.py`，独立提供 `/health` 和转写接口。

## 前端结构

- `client/src/app/`：应用级状态编排和 hook 组合，是前端主控制层。
- `client/src/chat/`：消息展示、时间线、图片预览和 Markdown 渲染。
- `client/src/composer/`：输入框、附件、技能、文件 mention 和快捷操作。
- `client/src/panels/`：顶部栏、抽屉、Git、Docs、Toast 等辅助面板。
- `client/src/styles/`：按模块拆分的样式文件，便于局部调整。

## 后端结构

- `server/chat-*.js`：聊天发送、请求准备、队列、自动标题、图像处理等核心链路。
- `server/session-*.js`：项目、会话、消息读取与本地状态同步。
- `server/git-*.js`：Git 面板能力和命令执行封装。
- `server/voice-*.js`：转写、TTS、实时语音代理。
- `server/push-service.js` 和 `server/notification-routes.js`：推送通知。
- `server/file-*.js`：文件搜索、上传和安全静态读取。

## 结构特点

- 运行时边界清晰：前端只做交互和状态展示，真正的执行与文件访问留在本机服务端。
- 共享逻辑集中：`shared/` 让前后端复用纯函数，减少状态规则分叉。
- 可选能力隔离：ASR、飞书、推送、桌面 IPC 都是独立模块，便于按环境开关。
- 资源组织合理：`docs/images/` 放演示图，`client/dist/` 是构建产物，不应手工编辑。

## 结论

这个项目的结构核心不是“页面很多”，而是“把桌面 Codex 能力安全地搬进移动浏览器”。它的目录划分基本按运行时和职责边界切开，后续扩展时最稳的方式也是继续沿着这条边界加模块。
