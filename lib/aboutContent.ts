import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { AXIS, DEFAULT_SELECTED, ITEMS, LANES } from '@/content/about/timeline';
import { BLOCKPARTY_INTRO, BLOCKPARTY_TEAM_LINE, MECHANISMS } from '@/content/about/blockparty';
import { AxisSchema, LaneSchema, MechanismSchema, TimelineItemSchema, MonthSchema } from '@/lib/aboutSchema';
import { axisRange, layoutLanes, monthIndex } from '@/lib/timelineLayout';

// The one place the /about data is checked, mirroring lib/content.ts for
// projects. The page calls loadAbout() during `next build` and
// scripts/validate-content.ts calls it in prebuild, so a bad edit to
// content/about/ fails the build with every problem listed at once.

const publicDir = path.join(process.cwd(), 'public');

function zodProblems(label: string, schema: z.ZodType, value: unknown): string[] {
  const result = schema.safeParse(value);
  if (result.success) return [];
  return result.error.issues.map((i) => `${label}: ${i.path.join('.') || '(root)'}: ${i.message}`);
}

// Width and height from a JPEG's start-of-frame marker, so every <img> on the
// page carries real dimensions (no layout shift) without a dependency.
export function jpegSize(file: string): { width: number; height: number } | null {
  const buf = fs.readFileSync(file);
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) return null;
    while (buf[i + 1] === 0xff && i + 2 < buf.length) i++; // fill bytes before a marker
    const marker = buf[i + 1];
    const len = buf.readUInt16BE(i + 2);
    const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSof) return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    i += 2 + len;
  }
  return null;
}

function duplicates(ids: string[]): string[] {
  return ids.filter((id, i) => ids.indexOf(id) !== i);
}

let imageSizes: Record<string, { width: number; height: number }> | null = null;

export function loadAbout() {
  if (!imageSizes) {
    const errors: string[] = [];

    errors.push(...zodProblems('AXIS', AxisSchema, AXIS));
    errors.push(...zodProblems('DEFAULT_SELECTED', z.string().min(1), DEFAULT_SELECTED));
    LANES.forEach((l, i) => errors.push(...zodProblems(`LANES[${i}]`, LaneSchema, l)));
    ITEMS.forEach((it, i) => errors.push(...zodProblems(`ITEMS[${i}] (${it.id})`, TimelineItemSchema, it)));
    MECHANISMS.forEach((m, i) => errors.push(...zodProblems(`MECHANISMS[${i}] (${m.id})`, MechanismSchema, m)));
    if (!BLOCKPARTY_INTRO.trim()) errors.push('BLOCKPARTY_INTRO is empty');
    if (!BLOCKPARTY_TEAM_LINE.trim()) errors.push('BLOCKPARTY_TEAM_LINE is empty');
    if (MECHANISMS.length === 0) errors.push('MECHANISMS is empty');

    for (const id of duplicates(LANES.map((l) => l.id))) errors.push(`LANES: duplicate id "${id}"`);
    for (const id of duplicates(ITEMS.map((it) => it.id))) errors.push(`ITEMS: duplicate id "${id}"`);
    for (const id of duplicates(MECHANISMS.map((m) => m.id))) errors.push(`MECHANISMS: duplicate id "${id}"`);
    if (!ITEMS.some((it) => it.id === DEFAULT_SELECTED)) {
      errors.push(`DEFAULT_SELECTED: no item with id "${DEFAULT_SELECTED}"`);
    }

    const lanes = new Set(LANES.map((l) => l.id));
    const monthOk = (m: string) => MonthSchema.safeParse(m).success;
    if (monthOk(AXIS.start) && monthOk(AXIS.end) && monthIndex(AXIS.end) < monthIndex(AXIS.start)) {
      errors.push('AXIS: end is before start');
    }
    for (const it of ITEMS) {
      if (!lanes.has(it.lane)) errors.push(`ITEMS (${it.id}): lane "${it.lane}" is not in LANES`);
      if (it.segments.length === 0) continue; // already reported by the schema
      let prevEnd = -Infinity;
      for (const [s, e] of it.segments) {
        if (!monthOk(s) || !monthOk(e)) continue; // already reported by the schema
        if (monthIndex(e) < monthIndex(s)) errors.push(`ITEMS (${it.id}): segment ${s}..${e} ends before it starts`);
        if (monthIndex(s) <= prevEnd) errors.push(`ITEMS (${it.id}): segments overlap or are out of order at ${s}`);
        prevEnd = monthIndex(e);
      }
      if (monthOk(AXIS.start) && it.segments.every(([s]) => monthOk(s)) && monthIndex(it.segments[0][0]) < monthIndex(AXIS.start)) {
        errors.push(`ITEMS (${it.id}): starts before AXIS.start`);
      }
      const lastEnd = it.segments[it.segments.length - 1][1];
      if (monthOk(AXIS.end) && monthOk(lastEnd) && monthIndex(lastEnd) > monthIndex(AXIS.end)) {
        errors.push(`ITEMS (${it.id}): ends after AXIS.end (move AXIS.end out to ${lastEnd} or later)`);
      }
    }

    for (const m of MECHANISMS) {
      if (m.image.startsWith('/') && !fs.existsSync(path.join(publicDir, m.image))) {
        errors.push(`MECHANISMS (${m.id}): ${m.image} not found in public/`);
      }
    }
    for (const img of ['/about/headshot.jpg', '/about/holiday_face.jpg']) {
      if (!fs.existsSync(path.join(publicDir, img))) errors.push(`${img} not found in public/`);
    }

    // Row assignment throws on a forced overlap; surface it with the rest.
    if (errors.length === 0) {
      try {
        layoutLanes(LANES, ITEMS, axisRange(AXIS, 0));
      } catch (err) {
        errors.push(err instanceof Error ? err.message : String(err));
      }
    }

    const sizes: Record<string, { width: number; height: number }> = {};
    if (errors.length === 0) {
      for (const m of MECHANISMS) {
        const size = jpegSize(path.join(publicDir, m.image));
        if (size) sizes[m.image] = size;
        else errors.push(`MECHANISMS (${m.id}): ${m.image} is not a readable JPEG`);
      }
    }

    if (errors.length > 0) throw new Error(`Invalid /about content:\n  ${errors.join('\n  ')}`);
    imageSizes = sizes;
  }

  return {
    axis: AXIS,
    lanes: LANES,
    items: ITEMS,
    defaultSelected: DEFAULT_SELECTED,
    blockparty: { intro: BLOCKPARTY_INTRO, teamLine: BLOCKPARTY_TEAM_LINE, mechanisms: MECHANISMS, imageSizes: imageSizes ?? {} },
  };
}
