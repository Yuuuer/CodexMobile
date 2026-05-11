/**
 * 当会话仍有运行中活动时，定时拉取消息流签名并合并桌面活动 runtime，保持选中线程与服务端一致。
 *
 * Keywords: live-polling, session-messages, running-activity
 *
 * Exports:
 * - `useSessionLivePolling` — 基于认证与选中会话驱动轮询的 effect hook。
 *
 * Inward: `api`、`session-live-refresh`、`activity-model` 签名、`session-utils`。
 *
 * Outward: `App.jsx` 与会话实时展示链路配合。
 */

import { useEffect } from 'react';
import { apiFetch } from '../api.js';
import {
  messageStreamSignature
} from '../chat/activity-model.js';
import {
  mergeLiveSelectedThreadMessages,
  shouldPollSelectedSessionMessages,
  syncDesktopActivityRuntimeFromMessages
} from '../session-live-refresh.js';
import { mergeContextStatus } from './context-status.js';
import {
  hasRunningKey,
  isDraftSession,
  isLiveThreadRuntime,
  selectedRunKeys,
  sessionMessagesApiPath
} from './session-utils.js';

export function useSessionLivePolling({
  authenticated,
  selectedSession,
  hasRunningActivity,
  running,
  desktopBridge,
  threadRuntimeById,
  defaultStatus,
  sessionLivePollRef,
  selectedSessionRef,
  runningByIdRef,
  messagesRef,
  markRun,
  clearRun,
  markSessionCompleteNotice,
  setContextStatus,
  setMessages
}) {
  useEffect(() => {
    if (!authenticated || !selectedSession?.id || isDraftSession(selectedSession)) {
      return undefined;
    }

    const sessionId = selectedSession.id;
    let stopped = false;
    async function pollSelectedSession() {
      if (stopped || sessionLivePollRef.current) {
        return;
      }
      const hasSelectedRunning = hasRunningKey(
        runningByIdRef.current || {},
        selectedRunKeys(selectedSessionRef.current || selectedSession)
      );
      const selectedRunRuntime = selectedRunKeys(selectedSessionRef.current || selectedSession)
        .map((key) => threadRuntimeById?.[key])
        .find(isLiveThreadRuntime) || null;
      const hasDesktopThreadRuntime =
        selectedRunRuntime?.source === 'desktop-thread' ||
        selectedRunRuntime?.source === 'desktop-ipc' ||
        selectedRunRuntime?.source === 'headless-local';
      const hasExternalThreadRefresh = Boolean(hasDesktopThreadRuntime);
      if (!shouldPollSelectedSessionMessages({
        hasSelectedRunning,
        desktopBridge,
        hasExternalThreadRefresh
      })) {
        return;
      }
      sessionLivePollRef.current = true;
      try {
        const data = await apiFetch(sessionMessagesApiPath(sessionId));
        if (!stopped && selectedSessionRef.current?.id === sessionId && Array.isArray(data.messages)) {
          syncDesktopActivityRuntimeFromMessages({
            messages: data.messages,
            sessionId,
            selectedRunRuntime,
            markRun,
            clearRun,
            markSessionCompleteNotice
          });
          setContextStatus((current) => mergeContextStatus(current, data.context || defaultStatus.context, defaultStatus.context));
          setMessages((current) =>
            messageStreamSignature(current) === messageStreamSignature(data.messages)
              ? current
              : mergeLiveSelectedThreadMessages(current, data.messages)
          );
        }
      } catch {
        // Keep the currently rendered conversation if a transient poll fails.
      } finally {
        sessionLivePollRef.current = false;
      }
    }

    const intervalMs = hasRunningActivity || running ? 700 : 1600;
    const timer = window.setInterval(pollSelectedSession, intervalMs);
    pollSelectedSession();
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [
    authenticated,
    selectedSession?.id,
    hasRunningActivity,
    running,
    desktopBridge,
    threadRuntimeById
  ]);
}
