/**
 * 测试 panels/topbar-status.js：bridgeConnectionLabel 各连接与 runtime 组合。
 * Keywords: topbar, bridge, tests
 * Exports: 无导出 / 内含用例
 * Inward: panels/topbar-status.js
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { bridgeConnectionLabel } from './panels/topbar-status.js';

test('bridgeConnectionLabel shows idle desktop IPC as mirror-only sync', () => {
  const label = bridgeConnectionLabel('connected', {
    connected: true,
    mode: 'desktop-ipc'
  }, {
    selectedSession: { id: 'thread-1' }
  });

  assert.equal(label.label, '已同步');
  assert.match(label.description, /移动端发送固定走后台 Codex/);
});

test('bridgeConnectionLabel keeps running label compact while preserving source classes', () => {
  const desktop = bridgeConnectionLabel('connected', { connected: true, mode: 'desktop-ipc' }, {
    selectedSession: { id: 'thread-1' },
    selectedRuntime: { status: 'running', source: 'desktop-ipc' }
  });
  const headless = bridgeConnectionLabel('connected', { connected: true, mode: 'desktop-ipc' }, {
    selectedSession: { id: 'thread-1' },
    selectedRuntime: { status: 'running', source: 'headless-local' }
  });

  assert.equal(desktop.label, '正在运行');
  assert.match(desktop.className, /is-thread-ipc/);
  assert.equal(headless.label, '正在运行');
  assert.match(headless.className, /is-headless/);
});

test('bridgeConnectionLabel avoids claiming IPC route before running source is known', () => {
  const label = bridgeConnectionLabel('connected', { connected: true, mode: 'desktop-ipc' }, {
    selectedSession: { id: 'thread-1' },
    selectedRuntime: { status: 'running' }
  });

  assert.equal(label.label, '正在运行');
  assert.match(label.description, /等待 sync runtime/);
});

test('bridgeConnectionLabel uses compact background and disconnected labels', () => {
  assert.equal(
    bridgeConnectionLabel('connected', { connected: true, mode: 'headless-local' }).label,
    '后台可用'
  );

  assert.equal(
    bridgeConnectionLabel('disconnected', null).label,
    '未连接'
  );
});
