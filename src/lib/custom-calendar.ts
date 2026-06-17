// ============================================
// 自定义日历系统 — 支持地球/修仙界/奇幻等不同历法
// ============================================

/** 日历配置 */
export interface CalendarConfig {
  yearLength: number;      // 一年多少天（默认365）
  monthCount: number;      // 一年多少月（默认12）
  dayLength: number;       // 一天多少小时（默认24）
  epochName: string;       // 纪元名称（默认"公元"）
  monthNames?: string[];   // 自定义月份名
}

/** 时间刻度 */
export interface Tick {
  date: Date;
  label: string;
  major: boolean;
  position: number;
}

// --- 预设历法 ---

/** 地球默认历法 */
export const EARTH: CalendarConfig = {
  yearLength: 365,
  monthCount: 12,
  dayLength: 24,
  epochName: '公元',
};

/** 修仙界历法：360 天/年，12 月，30 天/月 */
export const XIANXIU: CalendarConfig = {
  yearLength: 360,
  monthCount: 12,
  dayLength: 24,
  epochName: '灵元',
  monthNames: [
    '正月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '冬月', '腊月',
  ],
};

/** 奇幻世界历法：19 时/日 */
export const FANTASY: CalendarConfig = {
  yearLength: 365,
  monthCount: 12,
  dayLength: 19,
  epochName: '星纪',
  monthNames: [
    '霜月', '雾月', '风月', '雨月', '花月', '阳月',
    '焰月', '麦月', '丰月', '叶月', '寒月', '冰月',
  ],
};

/** 预设映射 */
export const CALENDAR_PRESETS: Record<string, { label: string; config: CalendarConfig }> = {
  earth: { label: '地球历', config: EARTH },
  xianxiu: { label: '修仙界历', config: XIANXIU },
  fantasy: { label: '奇幻历', config: FANTASY },
};

/** 默认配置 */
export const DEFAULT_CALENDAR: CalendarConfig = EARTH;

/**
 * 从工作区的 calendarConfigJson 字段解析配置
 * 解析失败时返回默认地球历法
 */
export function parseCalendarConfig(json: string | null | undefined): CalendarConfig | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      yearLength: Number(parsed.yearLength) || 365,
      monthCount: Number(parsed.monthCount) || 12,
      dayLength: Number(parsed.dayLength) || 24,
      epochName: typeof parsed.epochName === 'string' ? parsed.epochName : '公元',
      monthNames: Array.isArray(parsed.monthNames) ? parsed.monthNames : undefined,
    };
  } catch {
    return null;
  }
}

/** 序列化配置为 JSON 字符串 */
export function serializeCalendarConfig(config: CalendarConfig): string {
  return JSON.stringify(config);
}

/**
 * 计算自定义历法下某时刻的年/月/日/时
 * 以 1970-01-01 00:00 UTC 为历元起点
 */
export function toCustomCalendar(date: Date, config: CalendarConfig): {
  year: number;
  month: number;     // 1-based
  day: number;       // 1-based
  hour: number;      // 0-based
  totalDays: number;
} {
  const ms = date.getTime();
  // 一天的毫秒数（基于自定义日长，按现实秒数计算）
  const dayMs = config.dayLength * 60 * 60 * 1000;
  const totalDays = Math.floor(ms / dayMs);
  const year = Math.floor(totalDays / config.yearLength) + 1970;
  const dayOfYear = totalDays % config.yearLength;
  const daysPerMonth = Math.floor(config.yearLength / config.monthCount);
  const month = Math.min(config.monthCount, Math.floor(dayOfYear / daysPerMonth) + 1);
  const day = (dayOfYear % daysPerMonth) + 1;
  const hour = Math.floor((ms % dayMs) / (60 * 60 * 1000));
  return { year, month, day, hour, totalDays };
}

/** 获取月份名 */
function getMonthName(month: number, config: CalendarConfig): string {
  if (config.monthNames && config.monthNames.length >= config.monthCount) {
    return config.monthNames[month - 1] ?? `${month}月`;
  }
  return `${month}月`;
}

/**
 * 按自定义历法格式化日期
 * 输出格式："[纪元] 年-月-日 时:00"
 */
export function formatCustomDate(date: Date, config: CalendarConfig): string {
  const { year, month, day, hour } = toCustomCalendar(date, config);
  const monthName = getMonthName(month, config);
  const hourStr = String(hour).padStart(2, '0');
  return `${config.epochName}${year}年 ${monthName}${day}日 ${hourStr}时`;
}

/**
 * 按自定义历法生成时间刻度
 * 与 getTimelineTicks 行为类似，但标签使用自定义历法
 */
export function getCustomTicks(
  startDate: Date,
  endDate: Date,
  config: CalendarConfig,
  zoom: number = 1,
): Tick[] {
  const totalMs = endDate.getTime() - startDate.getTime();
  if (totalMs <= 0) return [];

  const dayMs = config.dayLength * 60 * 60 * 1000;
  const spanDays = totalMs / dayMs;
  const spanHours = totalMs / (60 * 60 * 1000);
  const showHours = spanHours <= 48 * zoom;

  let intervalMs: number;
  let majorEvery = 4;

  if (showHours) {
    intervalMs = 60 * 60 * 1000;
    majorEvery = 6;
  } else if (spanDays <= 7 * zoom) {
    intervalMs = dayMs;
    majorEvery = 1;
  } else if (spanDays <= 30 * zoom) {
    intervalMs = dayMs;
    majorEvery = 7;
  } else if (spanDays <= config.yearLength * zoom) {
    intervalMs = dayMs * 30;
    majorEvery = 1;
  } else {
    intervalMs = dayMs * 90;
    majorEvery = 2;
  }

  const startMs = startDate.getTime();
  const firstTickMs = Math.ceil(startMs / intervalMs) * intervalMs;
  const ticks: Tick[] = [];

  for (let t = firstTickMs; t <= endDate.getTime(); t += intervalMs) {
    const date = new Date(t);
    const position = ((t - startMs) / totalMs) * 100;
    const index = Math.round((t - firstTickMs) / intervalMs);
    const { year, month, day, hour } = toCustomCalendar(date, config);
    const monthName = getMonthName(month, config);

    let label: string;
    if (showHours) {
      label = `${monthName}${day}日 ${String(hour).padStart(2, '0')}时`;
    } else if (spanDays <= 30 * zoom) {
      label = `${monthName}${day}日`;
    } else {
      label = `${config.epochName}${year}年 ${monthName}`;
    }

    ticks.push({
      date,
      label,
      major: index % majorEvery === 0,
      position,
    });
  }

  return ticks;
}
