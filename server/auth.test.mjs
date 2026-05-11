/**
 * 测试 server/auth.js：Bearer 与 query token 提取优先级。
 *
 * Keywords: auth, bearer-token, test
 *
 * Exports: 无导出，内含用例
 *
 * Inward: auth.js
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { extractBearerToken } from './auth.js';

test('extractBearerToken falls back to token query parameter for image tags', () => {
  const url = new URL('http://127.0.0.1:3321/api/local-image?path=%2Ftmp%2Fa.png&token=query-token');
  assert.equal(extractBearerToken({ headers: {} }, url), 'query-token');
});

test('extractBearerToken prefers authorization header over query token', () => {
  const url = new URL('http://127.0.0.1:3321/api/local-image?token=query-token');
  assert.equal(extractBearerToken({ headers: { authorization: 'Bearer header-token' } }, url), 'header-token');
});
