/**
 * 根据运行态与是否有可展示进度，决定活动卡片是否默认展开。
 *
 * Keywords: activity card, expand, running
 *
 * Exports:
 * - activityCardShouldOpen — 返回是否应打开活动摘要。
 *
 * Inward: 无外部 import。
 *
 * Outward: ActivityMessage.jsx
 */

export function activityCardShouldOpen({ running, hasProcess }) {
  return Boolean(running && hasProcess);
}
