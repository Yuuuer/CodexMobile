/**
 * 主界面壳层：拼装顶栏、侧栏、文档/Git 面板、连接恢复、Toast、聊天区与 Composer 的 props 下发。
 *
 * Keywords: app-shell, layout, panels
 *
 * Exports:
 * - `AppShell` — 接收 `shellClass` 与各子区 props 的纯布局组件。
 *
 * Inward: `Composer`、`ChatPane`、panels 汇总导出（`Drawer`、`TopBar` 等）。
 *
 * Outward: `App.jsx` 在通过配对后挂载主 UI。
 */

import { Composer } from '../composer/Composer.jsx';
import { ChatPane } from '../chat/ChatPane.jsx';
import { ImagePreviewModal } from '../chat/ImagePreview.jsx';
import { ConnectionRecoveryCard, DocsPanel, Drawer, GitPanel, ToastStack, TopBar } from '../panels/index.js';

export function AppShell({ shellClass, panelProps, drawerProps, chatProps, composerProps }) {
  const {
    topBarProps,
    docsPanelProps,
    gitPanelProps,
    recoveryCardProps,
    toastStackProps,
    imagePreviewProps
  } = panelProps;

  return (
    <div className={shellClass}>
      <TopBar {...topBarProps} />
      <Drawer {...drawerProps} />
      <DocsPanel {...docsPanelProps} />
      <GitPanel {...gitPanelProps} />
      <ConnectionRecoveryCard {...recoveryCardProps} />
      <ToastStack {...toastStackProps} />
      <ChatPane {...chatProps} />
      <Composer {...composerProps} />
      <ImagePreviewModal {...imagePreviewProps} />
    </div>
  );
}
