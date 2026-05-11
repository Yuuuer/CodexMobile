/**
 * 测试 chat/activity-card-state.js：活动卡片是否在可见进程运行时应展开。
 * Keywords: activity-card, tests
 * Exports: 无导出 / 内含用例
 * Inward: chat/activity-card-state.js
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { activityCardShouldOpen } from './chat/activity-card-state.js';

test('activity card opens only while a visible process is running', () => {
  assert.equal(activityCardShouldOpen({ running: true, hasProcess: true }), true);
  assert.equal(activityCardShouldOpen({ running: false, hasProcess: true }), false);
  assert.equal(activityCardShouldOpen({ running: true, hasProcess: false }), false);
});
