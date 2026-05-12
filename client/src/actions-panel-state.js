export const DEFAULT_ACTION_ICON = 'run';

export const ACTION_ICON_OPTIONS = [
  'run',
  'terminal',
  'hammer',
  'wrench',
  'rocket',
  'bug',
  'sparkles'
];

export const ACTION_PLATFORM_OPTIONS = ['all', 'win32', 'darwin', 'linux'];

const PLATFORM_LABELS = {
  all: '全部平台',
  win32: 'Windows',
  darwin: 'macOS',
  linux: 'Linux'
};

function textValue(value) {
  return typeof value === 'string' ? value : '';
}

function numberValue(value) {
  if (value === '' || value === null || value === undefined) {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function normalizeActionPlatform(value) {
  const platform = textValue(value).trim();
  return platform && platform !== 'all' ? platform : 'all';
}

export function createActionDraft(action = null) {
  return {
    name: textValue(action?.name).trim(),
    icon: textValue(action?.icon).trim() || DEFAULT_ACTION_ICON,
    command: textValue(action?.command).replace(/\r\n/g, '\n'),
    platform: normalizeActionPlatform(action?.platform)
  };
}

export function sanitizeActionDraft(action) {
  const draft = createActionDraft(action);
  const payload = {
    name: draft.name,
    icon: draft.icon,
    command: draft.command.trim()
  };
  if (draft.platform !== 'all') {
    payload.platform = draft.platform;
  }
  return payload;
}

export function validateActionDraft(action) {
  const draft = sanitizeActionDraft(action);
  if (!draft.name) return 'Action 名称不能为空';
  if (!draft.icon) return 'Action 图标不能为空';
  if (!draft.command) return 'Action 命令不能为空';
  return '';
}

export function normalizeActionItem(action, index = 0) {
  const platform = textValue(action?.platform).trim();
  const command = textValue(action?.command).replace(/\r\n/g, '\n');
  return {
    actionKey: textValue(action?.actionKey).trim() || `${index}:${textValue(action?.name).trim() || 'action'}`,
    index: numberValue(action?.index) ?? index,
    name: textValue(action?.name).trim() || `Action ${index + 1}`,
    icon: textValue(action?.icon).trim() || DEFAULT_ACTION_ICON,
    command,
    platform,
    platformMatched: typeof action?.platformMatched === 'boolean' ? action.platformMatched : !platform
  };
}

export function normalizeActionsResponse(data) {
  const environmentSource = data?.environment && typeof data.environment === 'object' ? data.environment : data || {};
  const setupSource = environmentSource.setup && typeof environmentSource.setup === 'object' ? environmentSource.setup : {};
  const actionsSource = Array.isArray(environmentSource.actions)
    ? environmentSource.actions
    : Array.isArray(data?.actions)
      ? data.actions
      : [];
  const setupScript = textValue(environmentSource.setupScript || setupSource.script).replace(/\r\n/g, '\n');
  const environment = {
    version: environmentSource.version ?? data?.version ?? 1,
    name: textValue(environmentSource.name).trim() || 'Actions',
    setupScript,
    setupScriptPresent: typeof environmentSource.setupScriptPresent === 'boolean'
      ? environmentSource.setupScriptPresent
      : Boolean(setupScript.trim()),
    actions: actionsSource.map((action, index) => normalizeActionItem(action, index))
  };

  return {
    revision: data?.revision ?? environmentSource.revision ?? '',
    exists: typeof data?.exists === 'boolean'
      ? data.exists
      : Boolean(textValue(data?.path).trim() || environment.actions.length || environment.name),
    path: textValue(data?.path || environmentSource.path).trim() || '.codex/environments/environment.toml',
    environment
  };
}

export function actionPlatformLabel(platform) {
  return PLATFORM_LABELS[normalizeActionPlatform(platform)] || textValue(platform).trim() || PLATFORM_LABELS.all;
}

export function actionPlatformHint(action) {
  if (action?.platformMatched === false) {
    return '当前平台不可运行';
  }
  return action?.platform ? `仅 ${actionPlatformLabel(action.platform)}` : '当前平台可运行';
}

export function actionRunBlockedReason(action) {
  return action?.platformMatched === false ? '当前平台不可运行此 Action' : '';
}

export function actionCommandPreview(command) {
  const content = textValue(command).trim();
  if (!content) return '未配置命令';
  const [firstLine = ''] = content.split('\n');
  return content.includes('\n') ? `${firstLine} ...` : firstLine;
}

export function actionIconOptions(currentIcon = '') {
  const unique = new Set(ACTION_ICON_OPTIONS);
  const icon = textValue(currentIcon).trim();
  if (icon) {
    unique.add(icon);
  }
  return Array.from(unique);
}

export function normalizeActionResult(payload) {
  const source = [payload?.result, payload?.execution, payload?.run, payload]
    .find((candidate) => candidate && typeof candidate === 'object') || {};
  return {
    actionKey: textValue(source.actionKey || payload?.actionKey).trim(),
    actionName: textValue(source.actionName || source.name || payload?.actionName).trim(),
    exitCode: numberValue(source.exitCode),
    stdout: textValue(source.stdout || source.output).replace(/\r\n/g, '\n'),
    stderr: textValue(source.stderr || source.errorOutput).replace(/\r\n/g, '\n'),
    timedOut: Boolean(source.timedOut || source.timeout),
    durationMs: numberValue(source.durationMs),
    startedAt: textValue(source.startedAt).trim(),
    finishedAt: textValue(source.finishedAt).trim(),
    summary: textValue(source.summary || payload?.message).trim()
  };
}

export function actionResultSummary(result, actionName = 'Action') {
  if (!result) return '';
  if (result.timedOut) return `${actionName} 执行超时`;
  if (result.exitCode === 0) return `${actionName} 执行成功`;
  if (typeof result.exitCode === 'number') return `${actionName} 退出码 ${result.exitCode}`;
  if (result.summary) return result.summary;
  return `${actionName} 执行完成`;
}
