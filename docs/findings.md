2026-05-12 00:34:12:781 :初步结论：这是一个单仓库多层架构，Node.js server 负责桥接与 API，React/Vite client 负责 PWA，shared 放前后端共用纯逻辑，asr-service 是独立语音识别微服务。
2026-05-12 00:35:42:815 :结构上没有发现需要改代码才能解释清楚的问题；当前主要风险是后续若新增过程文件，仍需继续保持仅放在 docs 目录。
2026-05-12 16:51:55:449 :初步结论：GitPanel 初始化 effect 依赖 `refreshAll`，而 `refreshAll` 依赖 `loadBranches`，`loadBranches` 又依赖 `status`；`loadStatus` 每次都会写入新的 `status` 对象，导致 effect 自激重跑并反复请求 `/api/git/status` 与 `/api/git/branches`。
2026-05-12 16:51:55:450 :风险结论：`/api/git/branches` 服务端内部还会再次调用 `status()`，单次前端刷新会放大为多次 `git rev-parse`、`git status`、`git for-each-ref` 子进程；请求风暴会造成 Git 子进程堆积和索引锁竞争，从而连带让 pull/commit/push 失败或表现为无法完成。
2026-05-12 16:53:48:657 :环境结论：当前仓库位于 `main -> origin/main`，`git user.name/user.email` 已配置，且 `git fetch --dry-run origin` 与 `git push --dry-run origin HEAD` 均成功；因此 pull/push 无法在面板中完成，不是 remote、SSH 凭据或用户身份缺失导致。
2026-05-12 17:21:23:157 :修复结论：只要切断 `loadBranches -> status` 这条闭包依赖，`refreshAll` 就不会因 `setStatus()` 被重建，GitPanel 初始化 effect 也不会再次自触发；这已经覆盖请求风暴的最短根因链。
2026-05-12 17:21:23:158 :验证结论：与本次改动直接相关的客户端测试和构建均通过；`server/git-service.test.mjs` 里既有的 worktree 用例仍失败，但该失败发生在未修改的服务端文件，和本次客户端修复无直接因果关系。
