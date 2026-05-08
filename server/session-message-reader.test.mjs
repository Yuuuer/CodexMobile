import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createSessionMessageReader } from './session-message-reader.js';

test('session message reader filters hidden messages, paginates, and exposes context status', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codexmobile-message-reader-'));
  try {
    const rolloutPath = path.join(dir, 'rollout.jsonl');
    await fs.writeFile(rolloutPath, [
      JSON.stringify({
        timestamp: '2026-05-08T01:00:00.000Z',
        type: 'event_msg',
        payload: {
          type: 'token_count',
          info: {
            model_context_window: 100000,
            last_token_usage: { input_tokens: 25000 },
            total_token_usage: { total_tokens: 30000 }
          }
        }
      }),
      JSON.stringify({
        timestamp: '2026-05-08T01:01:00.000Z',
        type: 'event_msg',
        payload: {
          type: 'token_count',
          info: {
            model_context_window: 100000,
            last_token_usage: { input_tokens: 10000 },
            total_token_usage: { total_tokens: 13000 }
          }
        }
      })
    ].join('\n'));

    const reader = createSessionMessageReader({
      readDeletedMessageIds: async () => new Set(['message-2']),
      readDesktopThread: async (sessionId, options) => {
        assert.equal(sessionId, 'session-1');
        assert.deepEqual(options, { includeTurns: true });
        return { thread: { id: 'session-1', path: rolloutPath, turns: [] } };
      },
      messagesFromDesktopThread: () => [
        { id: 'message-1', role: 'user', content: 'first', timestamp: '2026-05-08T01:00:00.000Z' },
        { id: 'message-2', role: 'assistant', content: 'hidden', timestamp: '2026-05-08T01:01:00.000Z' },
        { id: 'message-3', role: 'assistant', content: 'last', timestamp: '2026-05-08T01:02:00.000Z' }
      ],
      getConfigContext: () => ({ autoCompactTokenLimit: 80000 })
    });

    const result = await reader.readSessionMessages('session-1', { limit: 1, latest: true });

    assert.deepEqual(result.messages.map((message) => message.id), ['message-3']);
    assert.equal(result.total, 2);
    assert.equal(result.offset, 1);
    assert.equal(result.hasMoreBefore, true);
    assert.equal(result.context.inputTokens, 10000);
    assert.equal(result.context.contextWindow, 100000);
    assert.equal(result.context.autoCompact.detected, true);
    assert.equal(result.context.autoCompact.reason, '上下文用量回落');
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('session message reader merges raw and collaboration activities only when requested', async () => {
  const calls = [];
  const messages = [
    { id: 'message-1', role: 'user', content: 'hi', timestamp: '2026-05-08T01:00:00.000Z' }
  ];
  const reader = createSessionMessageReader({
    readDeletedMessageIds: async () => new Set(),
    readDesktopThread: async () => ({
      thread: { id: 'session-1', path: '/tmp/rollout.jsonl', turns: [{ id: 'turn-1' }] }
    }),
    messagesFromDesktopThread: (_thread, options) => {
      calls.push(['messagesFromDesktopThread', options.includeActivity]);
      return [...messages];
    },
    readRawSessionActivities: async (filePath, turns) => {
      calls.push(['raw', filePath, turns.length]);
      return [{ turnId: 'turn-1', activity: { id: 'raw-1', kind: 'command_execution', timestamp: '2026-05-08T01:01:00.000Z' } }];
    },
    readDesktopCollabActivities: async (filePath) => {
      calls.push(['collab', filePath]);
      return [{ turnId: 'turn-1', activity: { id: 'collab-1', kind: 'agent_message', timestamp: '2026-05-08T01:02:00.000Z' } }];
    },
    removeFallbackActivitiesCoveredByRaw: (items, raw) => calls.push(['removeFallback', items.length, raw.length]),
    upsertDesktopActivity: (items, turnId, activity) => {
      calls.push(['upsert', turnId, activity.id]);
      items.push({ id: activity.id, role: 'activity', timestamp: activity.timestamp });
    },
    sortDesktopActivitySteps: (items) => {
      calls.push(['sort', items.length]);
      items.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
    },
    readRolloutContextState: async () => ({ sessionId: 'session-1' })
  });

  const withoutActivity = await reader.readSessionMessages('session-1', { includeActivity: false });
  assert.deepEqual(withoutActivity.messages.map((message) => message.id), ['message-1']);
  assert.deepEqual(calls, [['messagesFromDesktopThread', false]]);

  calls.length = 0;
  const withActivity = await reader.readSessionMessages('session-1', { includeActivity: true });
  assert.deepEqual(withActivity.messages.map((message) => message.id), ['message-1', 'raw-1', 'collab-1']);
  assert.deepEqual(calls, [
    ['messagesFromDesktopThread', true],
    ['raw', '/tmp/rollout.jsonl', 1],
    ['removeFallback', 1, 1],
    ['upsert', 'turn-1', 'raw-1'],
    ['collab', '/tmp/rollout.jsonl'],
    ['upsert', 'turn-1', 'collab-1'],
    ['sort', 3]
  ]);
});
