"use client";

import { Fragment, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import type { Axis, Lane, LaneId, TimelineItem } from "@/lib/aboutSchema";
import { axisRange, axisTicks, fractionalMonth, layoutLanes, pct } from "@/lib/timelineLayout";
import { useHydrated } from "@/lib/useHydrated";

// The /about Gantt chart: filter chips, the chart, a detail card and a legend.
// The server renders it with the build date's "Now"; on the client the date
// is re-read, so the Now line stays right between rebuilds. Every bar is a
// <button aria-pressed>, and the full list is also printed in a closed <details> by
// the page, so nothing here is required to read the content.

const ROW_H = 40; // label + gap + 14px bar + breathing room
/** Rough width of one label character (13px Archivo at the label width) and the plot's
 *  narrowest width (the 960px chart minus the lane column), for label room on phones. */
const LABEL_CHAR_PX = 6.6;
const CHART_AXIS_MIN_PX = 848;
/** Space kept between a sliding label and the next bar on its row. */
const LABEL_GAP_PX = 12;
const LANE_PAD = 10;

interface TimelineProps {
  axis: Axis;
  lanes: Lane[];
  items: TimelineItem[];
  defaultSelected: string;
  /** Fractional month index at build time; the client swaps in today's. */
  buildNow: number;
}

// A tint of a lane color (hex) or a theme token (var(--…)).
const tint = (color: string, share: number) => `color-mix(in srgb, ${color} ${Math.round(share * 100)}%, transparent)`;

const noSubscribe = () => () => {};

// The spec names each bar "{title}, {dates}". Where the visible label isn't
// part of the title (e.g. "GT Audiovisual Services, part-time"), lead with the
// label so voice-control users can say what they see (WCAG 2.5.3).
export function barName(item: TimelineItem): string {
  const inTitle = item.title.toLowerCase().includes(item.label.toLowerCase());
  return inTitle ? `${item.title}, ${item.dates}` : `${item.label}, ${item.title}, ${item.dates}`;
}

export default function Timeline({ axis, lanes, items, defaultSelected, buildNow }: TimelineProps) {
  const now = useSyncExternalStore(noSubscribe, () => fractionalMonth(new Date()), () => buildNow);
  const hydrated = useHydrated();
  const [filter, setFilter] = useState<LaneId | "all">("all");
  const [selectedId, setSelectedId] = useState(defaultSelected);
  const scrollRef = useRef<HTMLDivElement>(null);

  const range = useMemo(() => axisRange(axis, now), [axis, now]);
  const placed = useMemo(() => layoutLanes(lanes, items, range), [lanes, items, range]);
  const ticks = useMemo(() => axisTicks(range), [range]);
  const nowPct = pct(range, now);
  const laneById = useMemo(() => new Map(lanes.map((l) => [l.id, l])), [lanes]);
  const selected = items.find((it) => it.id === selectedId) ?? items[0];
  const selectedLane = laneById.get(selected.lane)!;

  // On a phone the chart overflows: open it on the most recent years.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && el.scrollWidth > el.clientWidth) el.scrollLeft = el.scrollWidth;
  }, []);

  // A sticky label slides only to the end of its track, so near the lane column it
  // can sit half under it and show a stray fragment (a lone "ting"). After every
  // scroll and resize: hide the label of a bar that has gone under the lane column,
  // and shorten a stuck label that no longer fits its track, with an ellipsis.
  // Runs after the effect above, so it sees the opening scroll position.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let frame = 0;
    const fit = () => {
      frame = 0;
      const edge = el.getBoundingClientRect().left + (parseFloat(getComputedStyle(el).getPropertyValue("--lane-col")) || 0);
      el.querySelectorAll<HTMLElement>("[data-tl-label]").forEach((label) => {
        const s = label.style;
        s.visibility = s.maxWidth = s.overflow = s.textOverflow = "";
        const track = label.parentElement!.getBoundingClientRect();
        const bar = label.parentElement!.nextElementSibling?.getBoundingClientRect();
        if (bar && bar.right <= edge + 2) {
          s.visibility = "hidden";
          return;
        }
        if (track.left >= edge + 6) return; // not stuck: resting beside its own bar
        const room = track.right - (edge + 6);
        if (room >= label.scrollWidth) return;
        if (room < 28) {
          s.visibility = "hidden";
          return;
        }
        s.maxWidth = `${room}px`;
        s.overflow = "hidden";
        s.textOverflow = "ellipsis";
      });
      // Year labels on the axis: hide one once its text (past the 6px padding) reaches the lane column.
      el.querySelectorAll<HTMLElement>("[data-tl-axis]").forEach((a) => {
        a.style.visibility = "";
        if (a.getBoundingClientRect().left + parseFloat(getComputedStyle(a).paddingLeft) < edge + 1) a.style.visibility = "hidden";
      });
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(fit);
    };
    fit();
    el.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    document.fonts?.ready.then(schedule);
    return () => {
      el.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [selectedId]);

  const laneHeight = (rows: number) => LANE_PAD * 2 + rows * ROW_H;

  return (
    <div>
      <div role="group" aria-label="Filter the timeline by lane" className="flex flex-wrap gap-2 mb-4">
        <Chip label="All" color="var(--color-ink)" active={filter === "all"} hydrated={hydrated} onClick={() => setFilter("all")} />
        {lanes.map((lane) => (
          <Chip
            key={lane.id}
            label={lane.name}
            color={lane.color}
            swatch
            active={filter === lane.id}
            hydrated={hydrated}
            onClick={() => setFilter(lane.id)}
          />
        ))}
      </div>

      <div
        ref={scrollRef}
        tabIndex={0}
        role="region"
        aria-label="Timeline chart (scrolls sideways on small screens)"
        className="overflow-x-auto border border-rule bg-panel [--lane-col:112px] sm:[--lane-col:140px] [scroll-padding-left:var(--lane-col)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
      >
        <div
          className="relative grid min-w-[960px]"
          style={{ gridTemplateColumns: "var(--lane-col) 1fr", gridTemplateRows: `28px repeat(${placed.length}, auto) 24px` }}
        >
          {/* Gridlines and the Now line span every lane in the plot column. */}
          <div
            aria-hidden="true"
            className="pointer-events-none relative"
            style={{ gridColumn: 2, gridRow: `1 / span ${placed.length + 2}` }}
          >
            {ticks.map((t) =>
              t.kind === "year" ? (
                <span key={t.pct} className="absolute top-0 bottom-6 w-px bg-hairline" style={{ left: `${t.pct}%` }} />
              ) : null
            )}
            {nowPct >= 0 && nowPct <= 100 && (
              <>
                <span
                  className="absolute top-0 bottom-6 border-l-2 border-dashed border-accent"
                  style={{ left: `${nowPct}%` }}
                />
                <span
                  className={`absolute bottom-1 ${nowPct > 96 ? "-translate-x-full" : nowPct < 4 ? "" : "-translate-x-1/2"} font-label text-[12px] font-bold uppercase tracking-wide text-accent-text`}
                  style={{ left: `${nowPct}%` }}
                >
                  Now
                </span>
              </>
            )}
          </div>

          {/* Axis: year labels, year ticks (tall) and quarter ticks (short). */}
          <div className="sticky left-0 z-20 border-b border-r border-rule bg-panel" style={{ gridColumn: 1, gridRow: 1 }} />
          <div aria-hidden="true" className="relative border-b border-rule" style={{ gridColumn: 2, gridRow: 1 }}>
            {ticks.map((t) => (
              <Fragment key={t.pct}>
                <span
                  className={`absolute bottom-0 w-px bg-rule ${t.kind === "year" ? "h-3" : "h-1.5"}`}
                  style={{ left: `${t.pct}%` }}
                />
                {t.label && t.pct <= 96 && (
                  <span
                    data-tl-axis
                    className="absolute top-1 pl-1.5 font-label text-[13px] font-bold tabular-nums text-ink-2"
                    style={{ left: `${t.pct}%` }}
                  >
                    {t.label}
                  </span>
                )}
              </Fragment>
            ))}
          </div>

          {placed.map((pl, laneIdx) => {
            const dimLane = filter !== "all" && filter !== pl.lane.id;
            return (
              <Fragment key={pl.lane.id}>
                <div
                  className={`sticky left-0 z-20 flex items-start gap-2 bg-panel px-3 pt-3 border-r border-rule ${laneIdx < placed.length - 1 ? "border-b border-b-hairline" : ""}`}
                  style={{ gridColumn: 1, gridRow: laneIdx + 2, height: laneHeight(pl.rows) }}
                >
                  <span aria-hidden="true" className="mt-1 size-2.5 shrink-0" style={{ background: pl.lane.color }} />
                  <span
                    className={`font-label text-[13px] font-bold leading-tight text-ink transition-opacity duration-150 motion-reduce:transition-none ${dimLane ? "opacity-60" : ""}`}
                  >
                    {pl.lane.name}
                  </span>
                </div>
                <div
                  role="group"
                  aria-label={pl.lane.name}
                  className={`relative ${laneIdx < placed.length - 1 ? "border-b border-hairline" : ""}`}
                  style={{ gridColumn: 2, gridRow: laneIdx + 2, height: laneHeight(pl.rows) }}
                >
                  {pl.items.map((p) => {
                    const isSel = p.item.id === selected.id;
                    // Room for the label to slide right as the chart scrolls: up to where the
                    // next bar on this row begins (so labels never overlap), and no further
                    // than about one label-width past its own bar (so it never floats far from it).
                    const nextLeft = Math.min(
                      100,
                      ...pl.items.filter((q) => q.row === p.row && q.left > p.left).map((q) => q.left)
                    );
                    const labelPct = (p.item.label.length * LABEL_CHAR_PX * 100) / CHART_AXIS_MIN_PX;
                    const gapPct = (LABEL_GAP_PX * 100) / CHART_AXIS_MIN_PX;
                    const roomPct = Math.max(gapPct, Math.min(nextLeft - p.left - gapPct, p.width + labelPct));
                    return (
                      <button
                        key={p.item.id}
                        type="button"
                        aria-pressed={isSel}
                        aria-label={barName(p.item)}
                        tabIndex={hydrated ? undefined : -1}
                        onClick={() => setSelectedId(p.item.id)}
                        onFocus={(e) => {
                          if (e.currentTarget.matches(":focus-visible")) {
                            e.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest" });
                          }
                        }}
                        className="group absolute z-10 focus-visible:z-[15] block text-left cursor-pointer outline-none"
                        style={{
                          left: `${p.left}%`,
                          width: `${p.width}%`,
                          top: LANE_PAD + p.row * ROW_H,
                          height: ROW_H - 6,
                        }}
                      >
                        {/* Sticky labels: when a long bar starts off-screen to the left (the
                            chart opens scrolled to the latest years), its label slides along to
                            stay readable just right of the lane names. The track is click-through;
                            the label itself still selects its bar. */}
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute left-0 top-0 block h-4"
                          style={{ width: `${(roomPct / p.width) * 100}%` }}
                        >
                          <span
                            data-tl-label
                            className={`pointer-events-auto sticky left-[calc(var(--lane-col)+6px)] block w-fit whitespace-nowrap bg-panel font-label text-[13px] leading-4 text-ink transition-opacity duration-150 motion-reduce:transition-none ${
                              isSel ? "font-[800] underline underline-offset-2" : "font-semibold group-hover:underline"
                            } ${dimLane ? "opacity-60" : ""} group-focus-visible:underline group-focus-visible:decoration-link group-focus-visible:decoration-2`}
                          >
                            {p.item.label}
                          </span>
                        </span>
                        <span
                          className={`relative mt-[22px] block h-3.5 transition-opacity duration-150 motion-reduce:transition-none ${
                            dimLane ? "opacity-20" : ""
                          } ${isSel ? "outline-2 outline-offset-2 outline-ink" : ""} group-focus-visible:ring-2 group-focus-visible:ring-link group-focus-visible:ring-offset-[5px] group-focus-visible:ring-offset-panel`}
                        >
                          {p.gaps.map((g, i) =>
                            g.width > 0 ? (
                              <span
                                key={i}
                                className="absolute top-1/2 -translate-y-1/2 border-t-2 border-dashed"
                                style={{ left: `${g.left}%`, width: `${g.width}%`, borderColor: pl.lane.color }}
                              />
                            ) : null
                          )}
                          {p.segments.map((s, i) => (
                            <span
                              key={i}
                              className="absolute inset-y-0 border border-ink"
                              style={{ left: `${s.left}%`, width: `${s.width}%`, background: pl.lane.color }}
                            />
                          ))}
                          {p.item.milestone && (
                            <span
                              className="absolute right-0 top-1/2 size-3 -translate-y-1/2 translate-x-1/2 rotate-45 border border-ink bg-panel"
                              style={{ boxShadow: `inset 0 0 0 2px ${pl.lane.color}` }}
                            />
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Fragment>
            );
          })}

          <div className="sticky left-0 z-20 border-t border-r border-rule bg-panel" style={{ gridColumn: 1, gridRow: placed.length + 2 }} />
          <div className="border-t border-rule" style={{ gridColumn: 2, gridRow: placed.length + 2 }} />
        </div>
      </div>

      <Legend />

      <div aria-live="polite" className="mt-6 border border-rule bg-panel p-5 sm:p-6">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-label text-[13px] font-bold text-ink-2">
          <span aria-hidden="true" className="size-2.5" style={{ background: selectedLane.color }} />
          <span>{selectedLane.name}</span>
          <span aria-hidden="true">·</span>
          <span className="font-semibold tabular-nums">{selected.dates}</span>
        </p>
        <h3 className="mt-2 font-display text-2xl font-[800] leading-tight text-ink">{selected.title}</h3>
        <p className="mt-2 text-ink">{selected.description}</p>
        {selected.quote && (
          <figure className="mt-4 px-4 py-3" style={{ background: tint(selectedLane.color, 0.1) }}>
            <blockquote className="text-ink italic">{selected.quote.text}</blockquote>
            <figcaption className="mt-2 text-sm text-ink-2">{selected.quote.by}</figcaption>
          </figure>
        )}
        {selected.links && (
          <ul className="mt-4 flex flex-col gap-1.5">
            {selected.links.map((l) => (
              <li key={l.href}>
                <TimelineLinkAnchor href={l.href} text={l.text} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Chip({
  label,
  color,
  active,
  swatch = false,
  hydrated,
  onClick,
}: {
  label: string;
  color: string;
  active: boolean;
  swatch?: boolean;
  hydrated: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      tabIndex={hydrated ? undefined : -1}
      onClick={onClick}
      className="inline-flex min-h-9 items-center gap-2 border-2 px-3 font-label text-[13px] font-bold text-ink cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
      style={{
        borderColor: active ? color : "var(--color-hairline)",
        background: active ? tint(color, 0.12) : "var(--color-panel)",
      }}
    >
      {swatch && <span aria-hidden="true" className="size-2.5" style={{ background: color }} />}
      {label}
    </button>
  );
}

export function TimelineLinkAnchor({ href, text }: { href: string; text: string }) {
  const cls = "text-link underline underline-offset-2 hover:text-ink";
  return href.startsWith("/") ? (
    <Link href={href} prefetch={false} className={cls}>
      {text}
    </Link>
  ) : (
    <a href={href} className={cls} target="_blank" rel="noopener noreferrer">
      {text}
    </a>
  );
}

function Legend() {
  return (
    <ul aria-label="Legend" className="mt-3 flex flex-wrap gap-x-6 gap-y-2 font-label text-[13px] font-semibold text-ink-2">
      <li className="flex items-center gap-2">
        <span aria-hidden="true" className="relative inline-block h-2.5 w-12">
          <span className="absolute inset-y-0 left-0 w-3.5 border border-ink bg-rule" />
          <span className="absolute left-3.5 right-3.5 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-rule" />
          <span className="absolute inset-y-0 right-0 w-3.5 border border-ink bg-rule" />
        </span>
        Semesters only
      </li>
      <li className="flex items-center gap-2">
        <span aria-hidden="true" className="inline-block size-2.5 rotate-45 border border-ink bg-panel" />
        Graduation
      </li>
      <li className="flex items-center gap-2">
        <span aria-hidden="true" className="inline-block h-3.5 border-l-2 border-dashed border-accent" />
        Today
      </li>
    </ul>
  );
}
