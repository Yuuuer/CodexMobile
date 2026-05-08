import assert from 'node:assert/strict';
import test from 'node:test';
import { bridgeConnectionLabel } from './panels/topbar-status.js';

test('bridgeConnectionLabel shows idle desktop IPC as pending thread takeover', () => {
  const label = bridgeConnectionLabel('connected', {
    connected: true,
    mode: 'desktop-ipc'
  }, {
    selectedSession: { id: 'thread-1' }
  });

  assert.equal(label.label, '线程待确认');
  assert.match(label.description, /是否已被桌面接管要在发送时确认/);
});

test('bridgeConnectionLabel distinguishes desktop and background running routes', () => {
  assert.equal(
    bridgeConnectionLabel('connected', { connected: true, mode: 'desktop-ipc' }, {
      selectedSession: { id: 'thread-1' },
      selectedRuntime: { status: 'running', source: 'desktop-ipc' }
    }).label,
    '桌面运行中'
  );

  assert.equal(
    bridgeConnectionLabel('connected', { connected: true, mode: 'desktop-ipc' }, {
      selectedSession: { id: 'thread-1' },
      selectedRuntime: { status: 'running', source: 'headless-local' }
    }).label,
    '后台运行中'
  );
});

test('bridgeConnectionLabel avoids claiming IPC route before running source is known', () => {
  const label = bridgeConnectionLabel('connected', { connected: true, mode: 'desktop-ipc' }, {
    selectedSession: { id: 'thread-1' },
    selectedRuntime: { status: 'running' }
  });

  assert.equal(label.label, '运行确认中');
  assert.match(label.description, /正在确认/);
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
