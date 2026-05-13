/**
 * 测试 server/desktop-refresh.js：实验性桌面 Codex.app route bounce 开关、持久化与触发条件。
 *
 * Keywords: desktop-refresh, tests, Codex.app, route-bounce
 *
 * Exports: 无导出，内含用例
 *
 * Inward: desktop-refresh.js
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  configureDesktopRefresh,
  getDesktopRefreshPublicState,
  setDesktopRefreshEnabled,
  triggerDesktopRefreshForThread
} from './desktop-refresh.js';

test('desktop refresh is off by default and does not execute route bounce', async () => {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codexmobile-desktop-refresh-off-'));
  const calls = [];
  configureDesktopRefresh({
    rootDir,
    platform: 'darwin',
    executor: async (step) => calls.push(step),
    sleep: async () => {}
  });

  assert.deepEqual(getDesktopRefreshPublicState(), {
    enabled: false,
    supported: true,
    experimental: true,
    mode: 'completion',
    lastTriggeredAt: null,
    lastError: null
  });

  const result = await triggerDesktopRefreshForThread('thread-1', { reason: 'test' });
  assert.equal(result.triggered, false);
  assert.equal(result.reason, 'desktop-refresh-disabled');
  assert.deepEqual(calls, []);
});

test('desktop refresh persists setting and bounces settings before target thread', async () => {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codexmobile-desktop-refresh-on-'));
  const calls = [];
  configureDesktopRefresh({
    rootDir,
    platform: 'darwin',
    executor: async (step) => calls.push(step),
    sleep: async () => {}
  });

  assert.equal(setDesktopRefreshEnabled(true).enabled, true);
  const result = await triggerDesktopRefreshForThread('thread-abc', { reason: 'background-thread-completed' });

  assert.equal(result.triggered, true);
  assert.equal(result.targetUrl, 'codex://threads/thread-abc');
  assert.deepEqual(calls.map((step) => step.url), ['codex://settings', 'codex://threads/thread-abc']);

  configureDesktopRefresh({
    rootDir,
    platform: 'darwin',
    executor: async () => {},
    sleep: async () => {}
  });
  assert.equal(getDesktopRefreshPublicState().enabled, true);
});
