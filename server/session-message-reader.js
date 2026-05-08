import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import readline from 'node:readline';
import { readDesktopThread as defaultReadDesktopThread } from './codex-app-server.js';
import {
  readDesktopCollabActivities as defaultReadDesktopCollabActivities,
  readRawSessionActivities as defaultReadRawSessionActivities
} from './desktop-activity-parser.js';
import {
  messagesFromDesktopThread as defaultMessagesFromDesktopThread,
  removeFallbackActivitiesCoveredByRaw as defaultRemoveFallbackActivitiesCoveredByRaw,
  sortDesktopActivitySteps as defaultSortDesktopActivitySteps,
  upsertDesktopActivity as defaultUpsertDesktopActivity
} from './desktop-thread-projector.js';
import {
  filterDeletedMessages as defaultFilterDeletedMessages,
  readDeletedMessageIds as defaultReadDeletedMessageIds
} from './session-local-state.js';

const ROLLOUT_CONTEXT_READ_BYTES = Math.max(
  64 * 1024,
  Number(process.env.CODEXMOBILE_ROLLOUT_CONTEXT_READ_BYTES) || 1024 * 1024
);

function positiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

export function publicContextState(state = {}, configContext = {}) {
  const contextWindow = state.contextWindow || configContext.modelContextWindow || null;
  const inputTokens = state.inputTokens || null;
  const autoCompactLimit = configContext.autoCompactTokenLimit || null;
  const percent =
    inputTokens && contextWindow
      ? Math.max(0, Math.min(100, Math.round((inputTokens / contextWindow) * 1000) / 10))
      : null;
  const compactDetected = Boolean(state.autoCompactDetected);
  return {
    sessionId: state.sessionId || null,
    model: state.model || null,
    inputTokens,
    totalTokens: state.totalTokens || null,
    contextWindow,
    percent,
    lastTokenUsage: state.lastTokenUsage || null,
    totalTokenUsage: state.totalTokenUsage || null,
    updatedAt: state.updatedAt || null,
    autoCompact: {
      enabled: Boolean(autoCompactLimit || configContext.autoCompactEnabled),
      tokenLimit: autoCompactLimit,
      detected: compactDetected,
      status: compactDetected ? 'detected' : (autoCompactLimit || configContext.autoCompactEnabled) ? 'watching' : 'unknown',
      lastCompactedAt: state.autoCompactLastAt || null,
      reason: state.autoCompactReason || ''
    }
  };
}

function tokenUsageFromPayload(payload) {
  const info = payload?.info && typeof payload.info === 'object' ? payload.info : {};
  const last = info.last_token_usage && typeof info.last_token_usage === 'object' ? info.last_token_usage : {};
  const total = info.total_token_usage && typeof info.total_token_usage === 'object' ? info.total_token_usage : {};
  return {
    inputTokens: positiveNumber(last.input_tokens ?? total.input_tokens),
    totalTokens: positiveNumber(total.total_tokens ?? last.total_tokens),
    contextWindow: positiveNumber(info.model_context_window ?? payload?.model_context_window),
    lastTokenUsage: last,
    totalTokenUsage: total
  };
}

function applyContextEntry(state, entry, sessionId) {
  const payload = entry?.payload || {};
  const timestamp = entry?.timestamp || new Date().toISOString();
  const type = payload.type || '';

  if (entry.type === 'turn_context') {
    const summary = String(payload.summary || '').trim();
    if (summary && summary !== 'none') {
      state.autoCompactDetected = true;
      state.autoCompactLastAt = timestamp;
      state.autoCompactReason = '会话已带摘要继续';
    }
    if (payload.model) {
      state.model = payload.model;
    }
    state.updatedAt = timestamp;
    return;
  }

  if (entry.type === 'compacted') {
    state.autoCompactDetected = true;
    state.autoCompactLastAt = timestamp;
    state.autoCompactReason = '上下文已自动压缩';
    state.updatedAt = timestamp;
    return;
  }

  if (entry.type !== 'event_msg') {
    return;
  }

  if (type === 'task_started') {
    state.contextWindow = positiveNumber(payload.model_context_window) || state.contextWindow || null;
    state.updatedAt = timestamp;
    return;
  }

  if (type !== 'token_count') {
    return;
  }

  const usage = tokenUsageFromPayload(payload);
  const previousInputTokens = state.inputTokens;
  state.sessionId = sessionId;
  state.inputTokens = usage.inputTokens || state.inputTokens || null;
  state.totalTokens = usage.totalTokens || state.totalTokens || null;
  state.contextWindow = usage.contextWindow || state.contextWindow || null;
  state.lastTokenUsage = usage.lastTokenUsage;
  state.totalTokenUsage = usage.totalTokenUsage;
  state.updatedAt = timestamp;

  if (
    previousInputTokens &&
    usage.inputTokens &&
    previousInputTokens > 20000 &&
    usage.inputTokens < previousInputTokens * 0.62
  ) {
    state.autoCompactDetected = true;
    state.autoCompactLastAt = timestamp;
    state.autoCompactReason = '上下文用量回落';
  }
}

export async function readRolloutContextState(filePath, sessionId) {
  const state = { sessionId };
  if (!filePath) {
    return state;
  }

  let start = 0;
  try {
    const stats = await fs.stat(filePath);
    if (stats.size > ROLLOUT_CONTEXT_READ_BYTES) {
      start = stats.size - ROLLOUT_CONTEXT_READ_BYTES;
    }
  } catch {
    return state;
  }

  const stream = fsSync.createReadStream(filePath, { encoding: 'utf8', start });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  try {
    for await (const line of rl) {
      if (!line.trim()) {
        continue;
      }
      try {
        applyContextEntry(state, JSON.parse(line), sessionId);
      } catch {
        // Skip malformed or partial JSONL rows.
      }
    }
  } catch {
    return state;
  }
  return state;
}

export function paginateMessages(messages, { limit = 120, offset = null, latest = true } = {}) {
  const total = messages.length;
  const count = Number(limit) || 0;
  const hasOffset = offset !== null && offset !== undefined;
  const start = hasOffset
    ? Math.max(0, Number(offset) || 0)
    : latest && count
      ? Math.max(0, total - count)
      : 0;
  const end = count ? start + count : undefined;
  return {
    messages: messages.slice(start, end),
    total,
    offset: start,
    hasMore: end ? end < total : false,
    hasMoreBefore: start > 0
  };
}

export function isoFromEpochSeconds(value) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return null;
  }
  return new Date(seconds * 1000).toISOString();
}

export function createSessionMessageReader({
  readDeletedMessageIds = defaultReadDeletedMessageIds,
  readDesktopThread = defaultReadDesktopThread,
  messagesFromDesktopThread = defaultMessagesFromDesktopThread,
  readRawSessionActivities = defaultReadRawSessionActivities,
  readDesktopCollabActivities = defaultReadDesktopCollabActivities,
  removeFallbackActivitiesCoveredByRaw = defaultRemoveFallbackActivitiesCoveredByRaw,
  upsertDesktopActivity = defaultUpsertDesktopActivity,
  sortDesktopActivitySteps = defaultSortDesktopActivitySteps,
  filterDeletedMessages = defaultFilterDeletedMessages,
  readRolloutContextState: readRolloutContextStateImpl = readRolloutContextState,
  getConfigContext = () => ({})
} = {}) {
  async function readSessionMessages(
    sessionId,
    { limit = 120, offset = null, latest = true, includeActivity = false } = {}
  ) {
    const deletedIds = await readDeletedMessageIds(sessionId);
    const response = await readDesktopThread(sessionId, { includeTurns: true });
    if (!response?.thread) {
      const error = new Error('Desktop thread not found');
      error.statusCode = 404;
      throw error;
    }

    const messages = messagesFromDesktopThread(response.thread, { includeActivity });
    if (includeActivity) {
      const rawActivities = await readRawSessionActivities(response.thread.path, response.thread.turns || []);
      removeFallbackActivitiesCoveredByRaw(messages, rawActivities);
      for (const item of rawActivities) {
        upsertDesktopActivity(messages, item.turnId, item.activity);
      }
      const collabActivities = await readDesktopCollabActivities(response.thread.path);
      for (const item of collabActivities) {
        upsertDesktopActivity(messages, item.turnId, item.activity);
      }
      sortDesktopActivitySteps(messages);
    }
    messages.sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));

    const contextState = await readRolloutContextStateImpl(response.thread.path, sessionId);
    return {
      ...paginateMessages(filterDeletedMessages(messages, deletedIds), { limit, offset, latest }),
      context: publicContextState(contextState, getConfigContext() || {})
    };
  }

  return { readSessionMessages };
}

