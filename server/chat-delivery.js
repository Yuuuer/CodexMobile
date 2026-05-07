import { buildCodexTurnInput } from './codex-native-images.js';

export async function assertDesktopBridgeAvailable(getDesktopBridgeStatus) {
  const bridge = getDesktopBridgeStatus ? await getDesktopBridgeStatus({ force: true }) : null;
  if (bridge && !bridge.connected) {
    const error = new Error(bridge.reason || '桌面端 Codex 未连接，无法发送消息。');
    error.statusCode = 503;
    error.code = 'CODEXMOBILE_DESKTOP_BRIDGE_UNAVAILABLE';
    throw error;
  }
  return bridge;
}

function desktopIpcUnavailableError(message = '桌面端 Codex 已连接，但当前线程没有可接管的桌面窗口。') {
  const error = new Error(message);
  error.statusCode = 409;
  error.code = 'CODEXMOBILE_DESKTOP_THREAD_OWNER_UNAVAILABLE';
  return error;
}

function desktopCreateThreadUnavailableError() {
  const error = new Error('当前桌面端 Codex 只开放了接管已有对话，不能从手机直接新建桌面端对话。请先在桌面端新建或打开一个对话，再从手机继续发送。');
  error.statusCode = 409;
  error.code = 'CODEXMOBILE_DESKTOP_CREATE_THREAD_UNAVAILABLE';
  return error;
}

export function desktopIpcCanUseBackgroundFallback(bridge) {
  return Boolean(
    bridge?.capabilities?.backgroundCodex ||
    bridge?.capabilities?.headless ||
    bridge?.capabilities?.createThreadViaBackground
  );
}

export function backgroundFallbackBridge(bridge, reason = '桌面端当前没有接管这个线程，已改用后台 Codex 执行。') {
  return {
    ...(bridge || {}),
    strict: false,
    connected: true,
    mode: 'headless-local',
    reason,
    capabilities: {
      ...(bridge?.capabilities || {}),
      read: true,
      sendToOpenDesktopThread: false,
      createThread: true,
      headless: true,
      backgroundCodex: true
    }
  };
}

export async function sendViaDesktopIpc({
  bridge,
  project,
  selectedSessionId,
  draftSessionId,
  turnId,
  sendMode,
  codexMessage,
  visibleMessage,
  attachments,
  selectedSkills,
  model,
  reasoningEffort,
  permissionMode,
  collaborationMode,
  getSession,
  rememberTurn,
  broadcast,
  setDesktopFollowerCollaborationMode,
  steerDesktopFollowerTurn,
  startDesktopFollowerTurn,
  interruptDesktopFollowerTurn
}) {
  if (!selectedSessionId) {
    throw desktopCreateThreadUnavailableError();
  }

  const input = buildCodexTurnInput({
    message: codexMessage,
    attachments,
    selectedSkills
  });
  const now = new Date().toISOString();
  const lastSession = getSession(selectedSessionId);
  const baseTurnStartParams = {
    input,
    cwd: lastSession?.cwd || project.path || null,
    approvalPolicy: 'never',
    approvalsReviewer: 'user',
    sandboxPolicy: permissionMode === 'bypassPermissions'
      ? { type: 'dangerFullAccess' }
      : { type: 'workspaceWrite', networkAccess: false },
    model: model || null,
    effort: reasoningEffort || null,
    collaborationMode: collaborationMode || null,
    attachments: []
  };

  rememberTurn(turnId, {
    projectId: project.id,
    projectPath: project.path,
    sessionId: selectedSessionId,
    previousSessionId: selectedSessionId,
    draftSessionId,
    status: 'running',
    label: sendMode === 'steer' ? '已发送到当前任务' : '已交给桌面端处理',
    startedAt: now
  });
  broadcast({
    type: 'user-message',
    sessionId: selectedSessionId,
    projectId: project.id,
    message: {
      id: `local-${Date.now()}`,
      role: 'user',
      content: visibleMessage,
      timestamp: now
    }
  });

  let result;
  try {
    if (sendMode === 'steer') {
      if (collaborationMode && setDesktopFollowerCollaborationMode) {
        await setDesktopFollowerCollaborationMode(selectedSessionId, collaborationMode);
      }
      result = await steerDesktopFollowerTurn(selectedSessionId, {
        input,
        attachments: [],
        restoreMessage: {
          text: codexMessage,
          cwd: lastSession?.cwd || project.path || null,
          context: {
            workspaceRoots: project.path ? [project.path] : [],
            collaborationMode: collaborationMode || null
          },
          responsesapiClientMetadata: null
        }
      });
    } else {
      if (sendMode === 'interrupt') {
        await interruptDesktopFollowerTurn(selectedSessionId);
      }
      if (collaborationMode && setDesktopFollowerCollaborationMode) {
        await setDesktopFollowerCollaborationMode(selectedSessionId, collaborationMode);
      }
      result = await startDesktopFollowerTurn(selectedSessionId, baseTurnStartParams);
    }
  } catch (error) {
    if (error?.message === 'no-client-found' || error?.statusCode === 409) {
      throw desktopIpcUnavailableError();
    }
    throw error;
  }

  const appTurnId = result?.result?.turn?.id || result?.turn?.id || turnId;
  broadcast({
    type: 'status-update',
    projectId: project.id,
    sessionId: selectedSessionId,
    turnId,
    kind: 'turn',
    status: 'running',
    label: sendMode === 'steer' ? '已发送到当前任务' : '已交给桌面端处理',
    detail: '',
    timestamp: new Date().toISOString()
  });
  return {
    accepted: true,
    queued: false,
    sessionId: selectedSessionId,
    draftSessionId,
    turnId: appTurnId,
    clientTurnId: turnId,
    delivery: sendMode === 'steer' ? 'steered' : (sendMode === 'interrupt' ? 'interrupted-started' : 'started'),
    desktopBridge: bridge
  };
}

export function runQueuedHeadlessChatJob({
  job,
  queueKey,
  state,
  sessionId,
  runCodexTurn,
  registerProjectlessThread,
  registerMobileSession,
  refreshCodexCache,
  broadcast,
  rememberConversationAlias,
  rememberTurn,
  emitJobEvent,
  scheduleAutoNameCompletedSession,
  onQueueDrained
}) {
  const metadataUpdates = [];

  function rememberCreatedProjectlessThread(payload) {
    if (!job.project?.projectless || !payload?.sessionId || !job.draftSessionId) {
      return;
    }
    const updatedAt = payload.startedAt || new Date().toISOString();
    metadataUpdates.push(
      Promise.all([
        registerProjectlessThread(payload.sessionId, job.project.path),
        registerMobileSession({
          id: payload.sessionId,
          projectPath: job.executionProjectPath || job.project.path,
          projectless: true,
          title: job.displayMessage,
          summary: job.displayMessage,
          updatedAt,
          messages: [
            {
              id: `${payload.sessionId}-user-${job.turnId}`,
              role: 'user',
              content: job.displayMessage,
              timestamp: updatedAt
            }
          ]
        })
      ]).catch((error) => {
        console.warn('[sessions] Failed to register projectless thread:', error.message);
      })
    );
  }

  runCodexTurn(
    {
      sessionId,
      draftSessionId: job.draftSessionId,
      projectPath: job.executionProjectPath || job.project.path,
      message: job.codexMessage,
      attachments: job.attachments,
      selectedSkills: job.selectedSkills,
      model: job.model,
      reasoningEffort: job.reasoningEffort,
      permissionMode: job.permissionMode,
      collaborationMode: job.collaborationMode,
      turnId: job.turnId
    },
    (payload) => {
      if (payload.sessionId) {
        state.sessionId = payload.sessionId;
        rememberConversationAlias(queueKey, payload.sessionId);
      }
      if (payload.previousSessionId) {
        rememberConversationAlias(queueKey, payload.previousSessionId);
      }
      if (payload.type === 'thread-started') {
        rememberCreatedProjectlessThread(payload);
      }
      emitJobEvent(job, payload);
    }
  ).then(async (finalSessionId) => {
    if (finalSessionId) {
      state.sessionId = finalSessionId;
      rememberConversationAlias(queueKey, finalSessionId);
    }
    rememberTurn(job.turnId, {
      projectId: job.project.id,
      sessionId: finalSessionId || sessionId || job.selectedSessionId || job.draftSessionId || null,
      previousSessionId: job.draftSessionId || job.selectedSessionId || null
    });
    if (job.draftSessionId) {
      scheduleAutoNameCompletedSession({
        sessionId: finalSessionId || sessionId || job.selectedSessionId || null,
        turnId: job.turnId,
        userMessage: job.displayMessage
      });
    }
  }).finally(async () => {
    try {
      if (metadataUpdates.length) {
        await Promise.allSettled(metadataUpdates);
      }
      const snapshot = await refreshCodexCache();
      broadcast({ type: 'sync-complete', syncedAt: snapshot.syncedAt, projects: snapshot.projects });
    } catch (error) {
      console.warn('[sync] Failed to refresh after chat:', error.message);
    } finally {
      state.running = false;
      if (state.jobs.length) {
        onQueueDrained?.();
      }
    }
  });
}
