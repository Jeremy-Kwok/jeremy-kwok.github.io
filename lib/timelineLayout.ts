import type { Axis, Lane, LaneId, TimelineItem } from '@/lib/aboutSchema';

// Pure layout math for the /about timeline. No React, no DOM, no fs, so the
// server render, the client re-render and the build-time validator all use
// the same numbers.
//
// Months are counted as integers (year * 12 + month - 1). Segment ends are
// inclusive, so a bar that "ends 2024-07" stops at the start of 2024-08.

export function monthIndex(month: string): number {
  const [y, m] = month.split('-').map(Number);
  return y * 12 + (m - 1);
}

/** A date as a fractional month index: 2026-11-16 is about Nov + 0.5. */
export function fractionalMonth(date: Date): number {
  const y = date.getFullYear();
  const m = date.getMonth();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  return y * 12 + m + (date.getDate() - 1) / daysInMonth;
}

export interface AxisRange {
  /** Inclusive start, as a month index. */
  start: number;
  /** Exclusive end, as a month index. */
  end: number;
}

/** The chart's range. If today has passed the configured end, extend to today + 3 months. */
export function axisRange(axis: Axis, now: number): AxisRange {
  const start = monthIndex(axis.start);
  let end = monthIndex(axis.end) + 1;
  if (now >= end) end = Math.floor(now) + 4;
  return { start, end };
}

/** Position of a month index across the axis, as a percentage. */
export function pct(range: AxisRange, month: number): number {
  return ((month - range.start) / (range.end - range.start)) * 100;
}

export interface Tick {
  pct: number;
  kind: 'year' | 'quarter';
  /** Year label, on year ticks only. */
  label?: string;
}

export function axisTicks(range: AxisRange): Tick[] {
  const ticks: Tick[] = [];
  for (let m = Math.ceil(range.start / 3) * 3; m < range.end; m += 3) {
    const isYear = m % 12 === 0;
    ticks.push({
      pct: pct(range, m),
      kind: isYear ? 'year' : 'quarter',
      ...(isYear ? { label: String(m / 12) } : {}),
    });
  }
  return ticks;
}

export interface PlacedSegment {
  /** Left edge and width, as a percentage of the item's own span (for drawing inside the bar). */
  left: number;
  width: number;
}

export interface PlacedItem {
  item: TimelineItem;
  row: number;
  /** Left edge and width of the item's full span, as a percentage of the axis. */
  left: number;
  width: number;
  segments: PlacedSegment[];
  /** Gaps between segments, as a percentage of the item's own span. */
  gaps: PlacedSegment[];
}

export interface PlacedLane {
  lane: Lane;
  rows: number;
  items: PlacedItem[];
}

function span(item: TimelineItem): { start: number; end: number } {
  return {
    start: monthIndex(item.segments[0][0]),
    end: monthIndex(item.segments[item.segments.length - 1][1]) + 1,
  };
}

/**
 * Assigns rows inside each lane. An item with `track` goes on that row;
 * otherwise it takes the first row whose last end is at or before its start,
 * processing items in start order. Throws if two items on one row overlap
 * (only possible when `track` forces it), so a bad data edit fails the build.
 */
export function layoutLanes(lanes: Lane[], items: TimelineItem[], range: AxisRange): PlacedLane[] {
  return lanes.map((lane) => {
    const laneItems = items
      .filter((it) => it.lane === lane.id)
      .map((it, i) => ({ it, i, ...span(it) }))
      .sort((a, b) => a.start - b.start || a.i - b.i);

    const rowEnds: number[] = [];
    const rowSpans: { start: number; end: number; id: string }[][] = [];
    const placed: PlacedItem[] = [];

    for (const { it, start, end } of laneItems) {
      let row = it.track;
      if (row === undefined) {
        row = rowEnds.findIndex((e) => e <= start);
        if (row === -1) row = rowEnds.length;
      }
      while (rowEnds.length <= row) {
        rowEnds.push(-Infinity);
        rowSpans.push([]);
      }
      const clash = rowSpans[row].find((s) => s.start < end && start < s.end);
      if (clash) {
        throw new Error(`timeline: "${it.id}" overlaps "${clash.id}" on row ${row} of lane "${lane.id}"`);
      }
      rowSpans[row].push({ start, end, id: it.id });
      rowEnds[row] = Math.max(rowEnds[row], end);

      const total = end - start;
      const segs = it.segments.map(([s, e]) => ({ s: monthIndex(s), e: monthIndex(e) + 1 }));
      placed.push({
        item: it,
        row,
        left: pct(range, start),
        width: pct(range, end) - pct(range, start),
        segments: segs.map(({ s, e }) => ({ left: ((s - start) / total) * 100, width: ((e - s) / total) * 100 })),
        gaps: segs.slice(1).map(({ s }, i) => {
          const prevEnd = segs[i].e;
          return { left: ((prevEnd - start) / total) * 100, width: ((s - prevEnd) / total) * 100 };
        }),
      });
    }

    return { lane, rows: Math.max(1, rowEnds.length), items: placed };
  });
}

export const laneIds = (lanes: Lane[]): Set<LaneId> => new Set(lanes.map((l) => l.id));
