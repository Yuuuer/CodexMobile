import assert from 'node:assert/strict';
import test from 'node:test';

import {
  completeActivityMessagesForTurn,
  isPlaceholderActivityMessage,
  shouldRenderActivityMessageInChat,
  upsertActivityMessage,
  upsertStatusMessage
} from './chat/activity-model.js';

test('upsertActivityMessage keeps concrete MCP tool calls with generic status labels', () => {
  const result = upsertActivityMessage([], {
    sessionId: 'session-1',
    turnId: 'turn-1',
    messageId: 'tool-1',
    kind: 'mcp_tool_call',
    status: 'completed',
    label: '已完成一步操作',
    detail: 'functions.exec_command',
    toolName: 'exec_command'
  });

  assert.equal(result.length, 1);
  assert.equal(result[0].role, 'activity');
  assert.equal(result[0].activities.length, 1);
  assert.equal(result[0].activities[0].kind, 'mcp_tool_call');
  assert.equal(result[0].activities[0].detail, 'functions.exec_command');
});

test('upsertStatusMessage keeps concrete dynamic tool calls with generic status labels', () => {
  const result = upsertStatusMessage([], {
    sessionId: 'session-1',
    turnId: 'turn-1',
    kind: 'dynamic_tool_call',
    status: 'completed',
    label: '已完成一步操作',
    detail: 'web.run',
    toolName: 'web.run'
  });

  assert.equal(result.length, 1);
  assert.equal(result[0].role, 'activity');
  assert.equal(result[0].activities.length, 1);
  assert.equal(result[0].activities[0].kind, 'dynamic_tool_call');
  assert.equal(result[0].activities[0].detail, 'web.run');
});

test('upsertStatusMessage merges desktop turn updates back into the optimistic mobile card', () => {
  const current = upsertStatusMessage([], {
    sessionId: 'thread-1',
    turnId: 'client-turn-1',
    kind: 'reasoning',
    status: 'running',
    label: '正在思考中',
    timestamp: '2026-05-09T00:00:00.000Z'
  });

  const result = upsertStatusMessage(current, {
    sessionId: 'thread-1',
    turnId: 'desktop-turn-1',
    clientTurnId: 'client-turn-1',
    kind: 'mcp_tool_call',
    status: 'running',
    label: '正在完成一步操作',
    detail: 'functions.exec_command',
    toolName: 'exec_command',
    timestamp: '2026-05-09T00:00:05.000Z'
  });

  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'status-client-turn-1');
  assert.equal(result[0].turnId, 'desktop-turn-1');
  assert.equal(result[0].clientTurnId, 'client-turn-1');
  assert.deepEqual(result[0].activities.map((activity) => activity.kind), ['reasoning', 'mcp_tool_call']);
});

test('upsertActivityMessage also merges desktop activity updates by client turn id', () => {
  const current = upsertStatusMessage([], {
    sessionId: 'thread-1',
    turnId: 'client-turn-1',
    kind: 'reasoning',
    status: 'running',
    label: '正在思考中'
  });

  const result = upsertActivityMessage(current, {
    sessionId: 'thread-1',
    turnId: 'desktop-turn-1',
    clientTurnId: 'client-turn-1',
    kind: 'mcp_tool_call',
    status: 'running',
    label: '正在完成一步操作',
    detail: 'functions.exec_command',
    toolName: 'exec_command'
  });

  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'status-client-turn-1');
  assert.equal(result[0].turnId, 'desktop-turn-1');
  assert.equal(result[0].clientTurnId, 'client-turn-1');
  assert.deepEqual(result[0].activities.map((activity) => activity.kind), ['reasoning', 'mcp_tool_call']);
});

test('completeActivityMessagesForTurn marks running activity steps completed', () => {
  const result = completeActivityMessagesForTurn([
    {
      id: 'status-turn-1',
      role: 'activity',
      sessionId: 'session-1',
      turnId: 'turn-1',
      status: 'running',
      activities: [
        { id: 'thinking', kind: 'reasoning', label: '正在思考', status: 'running' },
        { id: 'tool', kind: 'mcp_tool_call', label: '执行操作', status: 'queued' }
      ]
    }
  ], {
    sessionId: 'session-1',
    turnId: 'turn-1',
    completedAt: '2026-05-08T00:00:00.000Z'
  });

  assert.equal(result[0].status, 'completed');
  assert.deepEqual(result[0].activities.map((activity) => activity.status), ['completed', 'completed']);
});

test('placeholder thinking activity is suppressed from chat stream', () => {
  assert.equal(isPlaceholderActivityMessage({
    id: 'status-turn-1',
    role: 'activity',
    status: 'running',
    activities: [
      { id: 'thinking', kind: 'reasoning', label: '正在思考中', status: 'running' }
    ]
  }), true);
});

test('activity with concrete work is not treated as placeholder', () => {
  assert.equal(isPlaceholderActivityMessage({
    id: 'status-turn-1',
    role: 'activity',
    status: 'running',
    activities: [
      { id: 'thinking', kind: 'reasoning', label: '正在思考中', status: 'running' },
      { id: 'tool', kind: 'mcp_tool_call', label: '正在执行命令', detail: 'functions.exec_command', status: 'running' }
    ]
  }), false);
});

test('transient local handoff activity is kept for runtime but hidden from chat stream', () => {
  assert.equal(shouldRenderActivityMessageInChat({
    id: 'status-client-turn-1',
    role: 'activity',
    source: 'local-handoff',
    transient: true,
    status: 'running',
    label: '后台启动中',
    activities: [
      { id: 'handoff', kind: 'turn', label: '后台启动中', status: 'running' }
    ]
  }), false);
});

test('real activity still renders in the chat stream', () => {
  assert.equal(shouldRenderActivityMessageInChat({
    id: 'status-turn-1',
    role: 'activity',
    status: 'running',
    activities: [
      { id: 'tool', kind: 'mcp_tool_call', label: '运行命令', detail: 'functions.exec_command', status: 'running' }
    ]
  }), true);
});
