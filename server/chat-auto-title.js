export function createChatAutoNamer({
  getTurn,
  refreshCodexCache,
  getSession,
  maybeAutoNameSession,
  renameSession,
  broadcast,
  logger = console
} = {}) {
  async function autoNameCompletedSession({ sessionId, turnId, userMessage } = {}) {
    if (!sessionId || !turnId) {
      return;
    }
    const turn = getTurn?.(turnId) || {};
    const assistantMessage = turn.assistantPreview || '';
    if (!String(userMessage || assistantMessage || '').trim()) {
      return;
    }

    await refreshCodexCache();
    const session = getSession(sessionId);
    if (!session || session.titleLocked) {
      return;
    }

    const renamed = await maybeAutoNameSession({
      session,
      userMessage,
      assistantMessage,
      renameSessionImpl: renameSession
    });
    if (renamed) {
      const snapshot = await refreshCodexCache();
      broadcast({ type: 'sync-complete', syncedAt: snapshot.syncedAt, projects: snapshot.projects });
    }
  }

  function scheduleAutoNameCompletedSession(payload) {
    autoNameCompletedSession(payload).catch((error) => {
      logger?.warn?.('[title] auto naming failed:', error.message);
    });
  }

  return {
    autoNameCompletedSession,
    scheduleAutoNameCompletedSession
  };
}

