import assert from 'node:assert/strict';
import test from 'node:test';
import {
  actionCommandPreview,
  actionPlatformHint,
  actionResultSummary,
  createActionDraft,
  normalizeActionResult,
  normalizeActionsResponse,
  sanitizeActionDraft,
  validateActionDraft
} from './actions-panel-state.js';

test('normalizeActionsResponse reads environment payload and action flags', () => {
  const normalized = normalizeActionsResponse({
    exists: true,
    path: '/repo/.codex/environments/environment.toml',
    revision: 'rev-1',
    environment: {
      name: 'CodexMobile',
      setup: { script: 'npm install' },
      actions: [
        { actionKey: 'build#1', name: '构建', icon: 'run', command: 'npm run build' },
        { name: '仅 Windows', command: 'npm start', platform: 'win32', platformMatched: false }
      ]
    }
  });

  assert.equal(normalized.environment.setupScriptPresent, true);
  assert.equal(normalized.environment.actions[0].actionKey, 'build#1');
  assert.equal(normalized.environment.actions[1].platformMatched, false);
});

test('sanitizeActionDraft trims boundary whitespace and omits all-platform marker', () => {
  assert.deepEqual(
    sanitizeActionDraft({
      name: '  构建  ',
      icon: 'run',
      command: '\n npm run build \n',
      platform: 'all'
    }),
    {
      name: '构建',
      icon: 'run',
      command: 'npm run build'
    }
  );
});

test('validateActionDraft rejects missing name and command while icon uses UI default', () => {
  assert.equal(validateActionDraft({ name: '', icon: 'run', command: 'npm run build' }), 'Action 名称不能为空');
  assert.equal(validateActionDraft({ name: '构建', icon: '', command: 'npm run build' }), '');
  assert.equal(validateActionDraft({ name: '构建', icon: 'run', command: '   ' }), 'Action 命令不能为空');
});

test('createActionDraft keeps multiline commands and defaults icon/platform', () => {
  assert.deepEqual(
    createActionDraft({ name: '运行', command: 'pnpm dev\r\npnpm test' }),
    {
      name: '运行',
      icon: 'run',
      command: 'pnpm dev\npnpm test',
      platform: 'all'
    }
  );
});

test('action helpers expose compact preview, platform hint and result summary', () => {
  assert.equal(actionCommandPreview('pnpm dev\npnpm test'), 'pnpm dev ...');
  assert.equal(actionPlatformHint({ platform: 'linux', platformMatched: false }), '当前平台不可运行');
  assert.equal(actionResultSummary({ exitCode: 0 }, '构建'), '构建 执行成功');
});

test('normalizeActionResult reads nested execution payloads', () => {
  assert.deepEqual(
    normalizeActionResult({
      result: {
        actionKey: 'build#1',
        exitCode: 2,
        stdout: 'partial',
        stderr: 'boom',
        timedOut: false
      }
    }),
    {
      actionKey: 'build#1',
      actionName: '',
      exitCode: 2,
      stdout: 'partial',
      stderr: 'boom',
      timedOut: false,
      durationMs: null,
      startedAt: '',
      finishedAt: '',
      summary: ''
    }
  );
});
