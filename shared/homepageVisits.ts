/** GA4 daily views for the homepage card. Dates are Asia/Seoul calendar days. */

export const VISIT_WINDOW_DAYS = 30;
export const VISIT_COUNT_FONT_PX = 8;

export type VisitPoint = {
  date: string;
  views: number;
};

export type VisitKind = "평일" | "주말";

export type VisitBar = {
  date: string;
  label: string;
  views: number;
  kind: VisitKind;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function seoulDateString(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function addCalendarDays(isoDate: string, delta: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() + delta);
  return utc.toISOString().slice(0, 10);
}

/** Saturday and Sunday of the calendar date itself (already a Seoul date). */
export function isWeekendDate(isoDate: string): boolean {
  const [year, month, day] = isoDate.split("-").map(Number);
  const dow = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return dow === 0 || dow === 6;
}

export function parseGa4Date(raw: string): string | null {
  if (!/^\d{8}$/.test(raw)) return null;
  const iso = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  return ISO_DATE.test(iso) ? iso : null;
}

export function parseGa4Rows(
  rows: Array<{
    dimensionValues?: Array<{ value?: string }>;
    metricValues?: Array<{ value?: string }>;
  }>
): VisitPoint[] {
  const points: VisitPoint[] = [];
  for (const row of rows) {
    const date = parseGa4Date(row.dimensionValues?.[0]?.value ?? "");
    if (!date) continue;
    const views = Number(row.metricValues?.[0]?.value ?? "");
    if (!Number.isFinite(views)) continue;
    points.push({ date, views: Math.max(0, Math.round(views)) });
  }
  return points;
}

/**
 * Last 30 full Seoul days, ending yesterday. Today's partial count is dropped.
 * Missing days are 0 so every bar still has a number.
 */
export function buildVisitWindow(
  points: VisitPoint[],
  now: Date = new Date()
): VisitBar[] {
  const today = seoulDateString(now);
  const end = addCalendarDays(today, -1);
  const byDate = new Map<string, number>();

  for (const point of points) {
    if (!point || typeof point.date !== "string" || !ISO_DATE.test(point.date))
      continue;
    if (point.date >= today) continue;
    const views = Number(point.views);
    if (!Number.isFinite(views)) continue;
    byDate.set(
      point.date,
      (byDate.get(point.date) ?? 0) + Math.max(0, Math.round(views))
    );
  }

  const bars: VisitBar[] = [];
  for (let offset = VISIT_WINDOW_DAYS - 1; offset >= 0; offset -= 1) {
    const date = addCalendarDays(end, -offset);
    const [, month, day] = date.split("-");
    bars.push({
      date,
      label: `${Number(month)}/${Number(day)}`,
      views: byDate.get(date) ?? 0,
      kind: isWeekendDate(date) ? "주말" : "평일",
    });
  }
  return bars;
}

export function visitTotal(bars: VisitBar[]): number {
  return bars.reduce((sum, bar) => sum + bar.views, 0);
}

/** Rotated count labels sit in their own column, so they need a slot at least as wide as the font. */
export function countLabelsFit(
  plotWidthPx: number,
  barCount = VISIT_WINDOW_DAYS
): boolean {
  if (plotWidthPx <= 0 || barCount <= 0) return false;
  return plotWidthPx / barCount >= VISIT_COUNT_FONT_PX;
}
