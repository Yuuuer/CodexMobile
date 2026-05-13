/**
 * 根据运行态、文件变更与可展示进度，决定活动卡片是否默认展开。
 *
 * Keywords: activity card, expand, running
 *
 * Exports:
 * - activityCardShouldOpen — 返回是否应打开活动摘要。
 * - activityMessageIsRunning — 聚合容器与子步骤状态判断是否运行中。
 * - effectiveActivityMessageIsRunning — 合并外部 runtime 强制运行态后的最终判断。
 * - initialActivityCardOpenState / nextActivityCardOpenState — 初始展开与状态变更后的保留展开策略。
 *
 * Inward: 无外部 import。
 *
 * Outward: ActivityMessage.jsx
 */

function statusIsRunning(status) {
  return status === 'running' || status === 'queued';
}

export function activityMessageIsRunning(message = {}, activities = message.activities || []) {
  if (statusIsRunning(message.status)) {
    return true;
  }
  return (activities || []).some((activity) => statusIsRunning(activity?.status));
}

export function effectiveActivityMessageIsRunning({ message = {}, activities = message.activities || [], forceRunning = false } = {}) {
  return Boolean(forceRunning || activityMessageIsRunning(message, activities));
}

export function activityCardShouldOpen({ running, hasProcess, message, activities } = {}) {
  const active = running ?? activityMessageIsRunning(message, activities);
  return Boolean(hasProcess && active);
}

export function initialActivityCardOpenState({ running, hasProcess, forceOpen = false } = {}) {
  return Boolean(hasProcess && (running || forceOpen));
}

export function nextActivityCardOpenState({ previousOpen = false, running, hasProcess, forceOpen = false } = {}) {
  void previousOpen;
  if (!hasProcess) {
    return false;
  }
  if (running || forceOpen) {
    return true;
  }
  return false;
}
