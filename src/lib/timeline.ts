function formatTickLabel(date: Date, showYear: boolean) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return showYear ? `${y}/${m}/${d}` : `${m}/${d}`;
}

function formatHourLabel(date: Date) {
  return String(date.getHours()).padStart(2, '0') + ':00';
}

export interface TimelineTick {
  date: Date;
  label: string;
  major: boolean;
  position: number;
}

export function getTimelineTicks(startDate: Date, endDate: Date, zoom: number): TimelineTick[] {
  const totalMs = endDate.getTime() - startDate.getTime();
  if (totalMs <= 0) return [];

  const spanDays = totalMs / (1000 * 60 * 60 * 24);
  const spanHours = totalMs / (1000 * 60 * 60);
  const showHours = spanHours <= 48 * zoom;

  let intervalMs: number;
  let labelFn: (d: Date) => string;
  let majorEvery = 4;

  if (showHours) {
    intervalMs = 1000 * 60 * 60;
    labelFn = formatHourLabel;
    majorEvery = 6;
  } else if (spanDays <= 7 * zoom) {
    intervalMs = 1000 * 60 * 60 * 24;
    labelFn = (d) => formatTickLabel(d, false);
    majorEvery = 1;
  } else if (spanDays <= 30 * zoom) {
    intervalMs = 1000 * 60 * 60 * 24;
    labelFn = (d) => formatTickLabel(d, false);
    majorEvery = 7;
  } else if (spanDays <= 365 * zoom) {
    intervalMs = 1000 * 60 * 60 * 24 * 30;
    labelFn = (d) => formatTickLabel(d, true);
    majorEvery = 1;
  } else {
    intervalMs = 1000 * 60 * 60 * 24 * 90;
    labelFn = (d) => formatTickLabel(d, true);
    majorEvery = 2;
  }

  const startMs = startDate.getTime();
  const firstTickMs = Math.ceil(startMs / intervalMs) * intervalMs;
  const ticks: TimelineTick[] = [];

  for (let t = firstTickMs; t <= endDate.getTime(); t += intervalMs) {
    const date = new Date(t);
    const position = ((t - startMs) / totalMs) * 100;
    const index = Math.round((t - firstTickMs) / intervalMs);
    ticks.push({
      date,
      label: labelFn(date),
      major: index % majorEvery === 0,
      position,
    });
  }

  return ticks;
}

export function getEventPosition(startDate: Date, endDate: Date, eventTime: Date | null): number {
  if (!eventTime) return 0;
  const totalMs = endDate.getTime() - startDate.getTime();
  if (totalMs <= 0) return 0;
  const eventMs = new Date(eventTime).getTime() - startDate.getTime();
  return Math.max(0, Math.min(100, (eventMs / totalMs) * 100));
}

export function getTimeAtPosition(startDate: Date, endDate: Date, ratio: number): Date {
  const totalMs = endDate.getTime() - startDate.getTime();
  return new Date(startDate.getTime() + totalMs * ratio);
}
