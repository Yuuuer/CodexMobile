# CodexMobile 小红书展示视频

这个目录是一个独立的 Remotion 竖屏视频工程，用当前 CodexMobile 真实 UI 截图和 README 公开口径生成小红书展示视频。

## 输出规格

- 画幅：1080 x 1920
- 帧率：30fps
- 时长：22 秒
- 成片：`out/codexmobile-xhs-showcase.mp4`
- 素材：`public/real-ui-*.png`，来自 `docs/images/codexmobile-real-ui/` 的 iPhone 17 Pro Max 3x 截图（1320 x 2868）
- 品牌：`codex-icon-512.png`、`pairing-wordmark.png`、`pairing-background*.png`

## 命令

```bash
npm install
npm run still
npm run render
```

也可以打开 Remotion Studio 预览：

```bash
npm run studio
```
