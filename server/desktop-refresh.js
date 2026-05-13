/**
 * 实验性 Codex.app 桌面刷新：持久化开关并用 deep link route bounce 触发线程重挂载。
 *
 * Keywords: desktop-refresh, Codex.app, route-bounce, settings
 *
 * Exports:
 * - configureDesktopRefresh — 配置状态文件根目录与可注入执行器。
 * - getDesktopRefreshPublicState / setDesktopRefreshEnabled — 对外状态与 UI 开关持久化。
 * - triggerDesktopRefreshForThread — 在 headless 线程完成后尝试刷新桌面 App。
 *
 * Inward（本模块依赖/组装的关键符号）: node:child_process、node:fs、state JSON。
 *
 * Outward（谁在用/调用场景）: server/index 状态接口、chat-delivery completion hook。
 *
 * 不负责: Codex Desktop 真实时订阅；这里只做可选的 route bounce workaround。
 */
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const DEFAULT_BUNDLE_ID = 'com.openai.codex';
const DEFAULT_APP_PATH = '/Applications/Codex.app';
const BOUNCE_URL = 'codex://settings';

let settingsFilePath = '';
let settingsEnabled = false;
let runtimePlatform = process.platform;
let routeExecutor = defaultRouteExecutor;
let sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let bundleId = DEFAULT_BUNDLE_ID;
let appPath = DEFAULT_APP_PATH;
let lastTriggeredAt = null;
let lastError = null;

function isSupportedPlatform() {
  return runtimePlatform === 'darwin';
}

function readSettingsFromDisk() {
  if (!settingsFilePath) {
    settingsEnabled = false;
    return;
  }
  try {
    const raw = fs.readFileSync(settingsFilePath, 'utf8');
    const parsed = JSON.parse(raw);
    settingsEnabled = Boolean(parsed.enabled);
  } catch {
    settingsEnabled = false;
  }
}

function writeSettingsToDisk() {
  if (!settingsFilePath) {
    console.warn('[desktop-refresh] configureDesktopRefresh was not called; cannot persist UI toggle');
    return;
  }
  fs.mkdirSync(path.dirname(settingsFilePath), { recursive: true });
  fs.writeFileSync(
    settingsFilePath,
    JSON.stringify(
      {
        enabled: settingsEnabled,
        updatedAt: new Date().toISOString()
      },
      null,
      2
    ),
    'utf8'
  );
}

export function configureDesktopRefresh({
  rootDir,
  platform = process.platform,
  executor = defaultRouteExecutor,
  sleep: sleepImpl = sleep,
  codexBundleId = DEFAULT_BUNDLE_ID,
  codexAppPath = DEFAULT_APP_PATH
} = {}) {
  const root = String(rootDir || '').trim();
  settingsFilePath = root ? path.join(root, '.codexmobile', 'state', 'desktop-refresh.json') : '';
  runtimePlatform = platform;
  routeExecutor = executor;
  sleep = sleepImpl;
  bundleId = codexBundleId || DEFAULT_BUNDLE_ID;
  appPath = codexAppPath || DEFAULT_APP_PATH;
  lastTriggeredAt = null;
  lastError = null;
  readSettingsFromDisk();
}

export function getDesktopRefreshPublicState() {
  return {
    enabled: settingsEnabled,
    supported: isSupportedPlatform(),
    experimental: true,
    mode: 'completion',
    lastTriggeredAt,
    lastError
  };
}

export function setDesktopRefreshEnabled(enabled) {
  settingsEnabled = Boolean(enabled);
  writeSettingsToDisk();
  return getDesktopRefreshPublicState();
}

export async function triggerDesktopRefreshForThread(threadId, { reason = 'desktop-refresh', delayMs = 180 } = {}) {
  const id = String(threadId || '').trim();
  if (!settingsEnabled) {
    return { triggered: false, reason: 'desktop-refresh-disabled' };
  }
  if (!isSupportedPlatform()) {
    return { triggered: false, reason: 'desktop-refresh-unsupported-platform' };
  }
  if (!id) {
    return { triggered: false, reason: 'desktop-refresh-missing-thread' };
  }

  const targetUrl = `codex://threads/${encodeURIComponent(id)}`;
  try {
    await routeExecutor({ url: BOUNCE_URL, bundleId, appPath, phase: 'bounce', reason });
    await sleep(Math.max(0, Number(delayMs) || 0));
    await routeExecutor({ url: targetUrl, bundleId, appPath, phase: 'target', reason });
    lastTriggeredAt = new Date().toISOString();
    lastError = null;
    return { triggered: true, targetUrl };
  } catch (error) {
    lastError = error?.message || '桌面刷新失败';
    return { triggered: false, reason: 'desktop-refresh-failed', error: lastError, targetUrl };
  }
}

async function defaultRouteExecutor({ url, bundleId: targetBundleId, appPath: targetAppPath }) {
  try {
    await execFileAsync('open', ['-b', targetBundleId, url], { timeout: 3000 });
  } catch {
    await execFileAsync('open', ['-a', targetAppPath, url], { timeout: 3000 });
  }
}
