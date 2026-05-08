import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import { promisify } from 'node:util';
import { archiveDesktopThread, listDesktopThreads, readDesktopThread, setDesktopThreadName } from './codex-app-server.js';
import { CODEX_STATE_DB, readCodexConfig, readCodexWorkspaceState } from './codex-config.js';
import {
  readMobileSessionIndex,
  renameMobileSession
} from './mobile-session-index.js';
import {
  createSessionMessageReader,
  readRolloutContextState
} from './session-message-reader.js';
import { buildSessionIndex } from './session-index-builder.js';
import {
  hideSessionInMobile,
  hideSessionMessageInLocalState,
  readHiddenSessionIds
} from './session-local-state.js';

export { rawSessionActivitiesFromJsonl } from './desktop-activity-parser.js';
export { messagesFromDesktopThread } from './desktop-thread-projector.js';
export { normalizeComparablePath } from './session-index-builder.js';

const INCLUDE_MISSING_SUBAGENT_THREADS = process.env.CODEXMOBILE_INCLUDE_MISSING_SUBAGENT_THREADS === '1';
const execFileAsync = promisify(execFile);

let cache = {
  syncedAt: null,
  config: null,
  projects: [],
  projectById: new Map(),
  sessionsByProject: new Map(),
  sessionById: new Map()
};

const sessionMessageReader = createSessionMessageReader({
  getConfigContext: () => cache.config?.context || {}
});

function toPublicProject(entry) {
  return {
    id: entry.id,
    name: entry.name,
    path: entry.path,
    pathLabel: entry.pathLabel || null,
    projectless: Boolean(entry.projectless),
    trusted: entry.trusted,
    updatedAt: entry.updatedAt,
    sessionCount: entry.sessionCount || 0
  };
}

async function readThreadSpawnEdges() {
  try {
    await fs.access(CODEX_STATE_DB);
    const query = `
      select
        parent_thread_id as parentSessionId,
        child_thread_id as childSessionId,
        status
      from thread_spawn_edges
    `;
    const { stdout } = await execFileAsync('sqlite3', ['-json', CODEX_STATE_DB, query], {
      maxBuffer: 1024 * 1024
    });
    const parsed = JSON.parse(stdout || '[]');
    return Array.isArray(parsed)
      ? parsed.filter((edge) => edge?.parentSessionId && edge?.childSessionId)
      : [];
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn('[sessions] Failed to read subagent thread edges:', error.message);
    }
    return [];
  }
}

export async function refreshCodexCache() {
  const config = await readCodexConfig();
  const workspaceState = await readCodexWorkspaceState();
  const mobileSessionIndex = await readMobileSessionIndex();
  const hiddenSessionIds = await readHiddenSessionIds();
  const spawnEdges = INCLUDE_MISSING_SUBAGENT_THREADS ? await readThreadSpawnEdges() : [];
  const desktopThreads = await listDesktopThreads({ limit: 1000 });
  const sessionIndex = await buildSessionIndex({
    config,
    workspaceState,
    mobileSessionIndex,
    hiddenSessionIds,
    desktopThreads,
    spawnEdges,
    includeMissingSubagentThreads: INCLUDE_MISSING_SUBAGENT_THREADS,
    readDesktopThread,
    readRolloutContextState
  });

  cache = {
    syncedAt: new Date().toISOString(),
    config,
    ...sessionIndex
  };

  return getCacheSnapshot();
}

export function getCacheSnapshot() {
  return {
    syncedAt: cache.syncedAt,
    config: cache.config,
    projects: cache.projects.map(toPublicProject)
  };
}

export function listProjects() {
  return cache.projects.map(toPublicProject);
}

export function getProject(projectId) {
  return cache.projectById.get(projectId) || null;
}

export function listProjectSessions(projectId) {
  return (cache.sessionsByProject.get(projectId) || []).map((session) => ({
    id: session.id,
    projectId: session.projectId,
    cwd: session.cwd,
    title: session.title,
    summary: session.summary,
    model: session.model,
    provider: session.provider,
    source: session.source,
    parentSessionId: session.parentSessionId || null,
    isSubAgent: Boolean(session.isSubAgent),
    subAgent: session.subAgent || null,
    childCount: session.childCount || 0,
    openChildCount: session.openChildCount || 0,
    messageCount: session.messageCount,
    updatedAt: session.updatedAt,
    context: session.context || null
  }));
}

export function getSession(sessionId) {
  return cache.sessionById.get(sessionId) || null;
}

export async function renameSession(sessionId, projectId, title, { auto = false } = {}) {
  const session = getSession(sessionId);
  if (!session) {
    const error = new Error('Session not found');
    error.statusCode = 404;
    throw error;
  }
  if (projectId && session.projectId !== projectId) {
    const error = new Error('Session not found in project');
    error.statusCode = 404;
    throw error;
  }

  const nextTitle = String(title || '').trim().slice(0, 52);
  if (!nextTitle) {
    const error = new Error('Title is required');
    error.statusCode = 400;
    throw error;
  }

  if (!session.mobileOnly) {
    await setDesktopThreadName(session.id, nextTitle);
  }
  await renameMobileSession({
    id: session.id,
    projectPath: session.cwd,
    projectless: session.projectless,
    title: nextTitle,
    titleLocked: !auto,
    updatedAt: session.updatedAt
  });

  return { ...session, title: nextTitle, titleLocked: !auto };
}

export async function deleteSession(sessionId, projectId) {
  const session = getSession(sessionId);
  if (!session) {
    const error = new Error('Session not found');
    error.statusCode = 404;
    throw error;
  }
  if (projectId && session.projectId !== projectId) {
    const error = new Error('Session not found in project');
    error.statusCode = 404;
    throw error;
  }

  let archivedDesktopThread = false;
  if (!session.mobileOnly) {
    await archiveDesktopThread(session.id);
    archivedDesktopThread = true;
  }

  const hidden = await hideSessionInMobile(session);

  return {
    deletedSessionId: sessionId,
    projectId: session.projectId,
    hiddenOnly: !archivedDesktopThread,
    archivedDesktopThread,
    hiddenAt: hidden.hiddenAt,
    deletedFile: false,
    deletedIndexRows: false,
    deletedMobileRecord: false
  };
}

export async function hideSessionMessage(sessionId, messageId) {
  return hideSessionMessageInLocalState(sessionId, messageId);
}

export async function readSessionMessages(sessionId, options = {}) {
  return sessionMessageReader.readSessionMessages(sessionId, options);
}

export function getHostName() {
  return os.hostname();
}
