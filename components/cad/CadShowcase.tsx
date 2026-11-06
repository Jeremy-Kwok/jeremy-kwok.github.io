"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { CadPublic } from "@/lib/cad/schema";
import type { Explorer } from "@/lib/cad/explorer";
import { Balloon } from "@/components/DesignWalkthrough";
import { useHydrated } from "@/lib/useHydrated";

// A CAD showcase: a looping video by default (light, works on every phone and
// without JavaScript), with "Explore in 3D" to stop it and pick the real model
// up from the exact frame it was on. The 3D engine (three.js, ~150 KB) is only
// downloaded when someone asks for it.

type Mode = "video" | "loading" | "explore";

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";
function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia(reducedMotionQuery);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(reducedMotionQuery).matches,
    () => false
  );
}

// Border color is kept out of the shared classes: two border colors on one
// element resolve by stylesheet order, not class order, so the chapter
// highlight would silently lose.
const btnBase =
  "inline-flex items-center gap-1.5 border px-2.5 py-1.5 font-label text-[13px] font-semibold text-ink " +
  "disabled:cursor-wait disabled:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link";
const btn = `${btnBase} border-ink bg-panel hover:bg-hairline-2`;

function PlayIcon({ playing }: { playing: boolean }) {
  return playing ? (
    <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12">
      <rect x="2" y="1.5" width="3" height="9" fill="currentColor" />
      <rect x="7" y="1.5" width="3" height="9" fill="currentColor" />
    </svg>
  ) : (
    <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12">
      <path d="M2.5 1.5v9l8-4.5z" fill="currentColor" />
    </svg>
  );
}

/** Which build step is on screen at second t, or -1 outside the build. */
function stepIndexAt(steps: CadPublic["steps"], t: number): number {
  return steps.findIndex((s) => t >= s.start && t < s.end);
}

function formatMb(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Which chapter is on screen at second t, if any. */
function chapterAt(chapters: CadPublic["chapters"], t: number) {
  return chapters.find((c) => t >= c.start && t < c.end + 0.05) ?? null;
}

export interface CadShowcaseProps {
  cad: CadPublic;
  className?: string;
  /** Play a chapter by label (from a mechanism list, say). A new nonce replays the same chapter. */
  request?: { label: string; nonce: number } | null;
  /** Told whenever the chapter on screen changes, in either the video or the 3D view. */
  onChapter?: (label: string | null) => void;
}

export default function CadShowcase({ cad, className = "", request = null, onChapter }: CadShowcaseProps) {
  const hydrated = useHydrated();
  const reducedMotion = usePrefersReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const exploreButtonRef = useRef<HTMLButtonElement>(null);
  const engineRef = useRef<Explorer | null>(null);
  const startTimeRef = useRef(0);
  const returnFocusRef = useRef(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const handledRequest = useRef<number | null>(null);

  const [mode, setMode] = useState<Mode>("video");
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [time, setTime] = useState(0);
  const [explorePlaying, setExplorePlaying] = useState(false);
  const [videoStep, setVideoStep] = useState(-1);
  const [videoChapter, setVideoChapter] = useState<string | null>(null);
  const duration = cad.video.seconds;
  const activeChapter = chapterAt(cad.chapters, time) ?? undefined;
  const onScreenLabel = mode === "explore" ? (activeChapter?.label ?? null) : videoChapter;
  const onScreenChapter = cad.chapters.find((c) => c.label === onScreenLabel) ?? null;

  // Reduced motion: no autoplay. This pauses only when the preference applies,
  // not on every Play/Pause, or a visitor's own Play would be undone at once.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || mode !== "video" || !reducedMotion) return;
    video.pause();
  }, [mode, reducedMotion]);

  // Otherwise the video plays while it's on screen, unless the visitor paused it.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || mode !== "video") return;
    video.muted = true;
    if (reducedMotion || userPaused) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.35 }
    );
    io.observe(video);
    return () => io.disconnect();
  }, [mode, reducedMotion, userPaused]);

  // The caption and the chapter follow the video. React skips the re-render when neither changed.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || mode !== "video") return;
    let raf = requestAnimationFrame(function tick() {
      setVideoStep(stepIndexAt(cad.steps, video.currentTime));
      setVideoChapter(chapterAt(cad.chapters, video.currentTime)?.label ?? null);
      raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, [mode, cad.steps, cad.chapters]);

  // Start the 3D view once its canvas exists.
  useEffect(() => {
    if (mode !== "loading" || !cad.model) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    (async () => {
      try {
        const { createExplorer } = await import("@/lib/cad/explorer");
        const engine = await createExplorer({
          canvas,
          project: cad.project,
          modelUrl: cad.model!.src,
          startTime: startTimeRef.current,
          onProgress: (f) => setProgress(f),
          onTime: (t) => setTime(t),
          onPlayingChange: (p) => setExplorePlaying(p),
        });
        if (cancelled) {
          engine.dispose();
          return;
        }
        engineRef.current = engine;
        setTime(startTimeRef.current);
        setMode("explore");
        canvas.focus({ preventScroll: true });
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setError("The 3D model couldn't load on this device, so here's the video instead.");
        // The Explore button was disabled (and focused) while loading; give focus back.
        returnFocusRef.current = true;
        setMode("video");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, cad]);

  // Free the WebGL context when leaving the 3D view or the page.
  useEffect(() => {
    if (mode !== "video") return;
    engineRef.current?.dispose();
    engineRef.current = null;
    if (returnFocusRef.current) {
      returnFocusRef.current = false;
      exploreButtonRef.current?.focus({ preventScroll: true });
    }
  }, [mode]);
  useEffect(() => () => engineRef.current?.dispose(), []);

  // Report the chapter on screen.
  useEffect(() => {
    onChapter?.(onScreenLabel);
  }, [onScreenLabel, onChapter]);

  // Play a requested chapter, once per request, in whichever view is showing.
  useEffect(() => {
    if (!request || handledRequest.current === request.nonce || mode === "loading") return;
    handledRequest.current = request.nonce;
    const chapter = cad.chapters.find((c) => c.label === request.label);
    if (!chapter) return;
    frameRef.current?.scrollIntoView({ block: "nearest", behavior: reducedMotion ? "auto" : "smooth" });
    if (mode === "explore" && engineRef.current) {
      engineRef.current.playRange(chapter.start, chapter.end);
      return;
    }
    const video = videoRef.current;
    if (!video) return;
    // A click is a request to watch, even with reduced motion preferred.
    setUserPaused(false);
    const seek = () => {
      video.currentTime = chapter.start + 0.001;
    };
    // A video that has never loaded (preload="none") can't seek yet; older Safari
    // ignores the seek and plays from 0. Seek once its metadata is in.
    if (video.readyState >= 1) seek();
    else video.addEventListener("loadedmetadata", seek, { once: true });
    video.play().catch(() => {});
  }, [request, mode, cad.chapters, reducedMotion]);

  const enterExplore = () => {
    const video = videoRef.current;
    video?.pause();
    // A paused video shows whole frames; start the 3D view on the one on screen,
    // not between frames, or fast-moving parts visibly jump at the handoff.
    const fps = cad.video.fps;
    startTimeRef.current = video ? Math.floor(video.currentTime * fps + 1e-3) / fps : 0;
    setError(null);
    setProgress(null);
    setMode("loading");
  };

  const exitExplore = useCallback(() => {
    const video = videoRef.current;
    const t = engineRef.current ? time : startTimeRef.current;
    if (video) {
      video.currentTime = Math.min(t, Math.max(0, duration - 0.05));
      setUserPaused(false);
      if (!reducedMotion) video.play().catch(() => {});
    }
    returnFocusRef.current = true;
    setMode("video");
  }, [time, duration, reducedMotion]);

  const toggleVideo = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      setUserPaused(false);
      video.play().catch(() => {});
    } else {
      setUserPaused(true);
      video.pause();
    }
  };

  const onCanvasKey = (e: React.KeyboardEvent) => {
    const engine = engineRef.current;
    if (!engine) return;
    const actions: Record<string, () => void> = {
      ArrowLeft: () => engine.rotateBy(-15, 0),
      ArrowRight: () => engine.rotateBy(15, 0),
      ArrowUp: () => engine.rotateBy(0, 10),
      ArrowDown: () => engine.rotateBy(0, -10),
      "+": () => engine.zoomBy(0.85),
      "=": () => engine.zoomBy(0.85),
      "-": () => engine.zoomBy(1.18),
      _: () => engine.zoomBy(1.18),
      " ": () => (explorePlaying ? engine.pause() : engine.play()),
    };
    const action = actions[e.key];
    if (action) {
      e.preventDefault();
      action();
    }
  };

  const stepIndex = mode === "explore" ? stepIndexAt(cad.steps, time) : videoStep;
  const loadingLabel =
    progress === null ? "Loading 3D…" : `Loading 3D… ${Math.round(progress * 100)}%`;

  return (
    <figure
      className={className}
      data-cad={cad.slug}
      onKeyDown={(e) => {
        if (e.key === "Escape" && mode === "explore") exitExplore();
      }}
    >
      <div ref={frameRef} className="relative aspect-[16/10] scroll-mt-4 overflow-hidden border border-hairline bg-paper">
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-contain"
          src={cad.video.src}
          poster={cad.poster}
          width={cad.video.width}
          height={cad.video.height}
          muted
          loop
          playsInline
          preload="none"
          controls={!hydrated}
          disablePictureInPicture
          disableRemotePlayback
          aria-label={cad.description}
          onPlay={() => setVideoPlaying(true)}
          onPause={() => setVideoPlaying(false)}
        />

        {mode !== "video" && (
          <canvas
            ref={canvasRef}
            tabIndex={mode === "explore" ? 0 : -1}
            role="img"
            aria-label={`3D model of ${cad.title}. Drag to rotate, scroll or pinch to zoom. With the keyboard: arrow keys rotate, plus and minus zoom, space plays.`}
            onKeyDown={onCanvasKey}
            className={`absolute inset-0 h-full w-full touch-none outline-none transition-opacity duration-200 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-link ${
              mode === "explore" ? "cursor-grab opacity-100 active:cursor-grabbing" : "pointer-events-none opacity-0"
            }`}
          />
        )}

        {hydrated && mode === "video" && (
          <button
            type="button"
            className={`${btn} absolute left-2 top-2`}
            onClick={toggleVideo}
            aria-label={videoPlaying ? "Pause animation" : "Play animation"}
          >
            <PlayIcon playing={videoPlaying} />
          </button>
        )}

        {hydrated && cad.model && mode !== "explore" && (
          <button
            ref={exploreButtonRef}
            type="button"
            className={`${btn} absolute bottom-2 right-2`}
            onClick={enterExplore}
            onPointerEnter={() => void import("@/lib/cad/explorer")}
            onFocus={() => void import("@/lib/cad/explorer")}
            disabled={mode === "loading"}
          >
            {mode === "loading" ? (
              loadingLabel
            ) : (
              <>
                Explore in 3D <span className="font-normal text-ink-2">{formatMb(cad.model.bytes)}</span>
              </>
            )}
          </button>
        )}

        {hydrated && stepIndex >= 0 && (
          // Visual only: the step name repeats what the animation shows, and the
          // video's description already covers it for screen readers.
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-2 left-2 flex items-center gap-2 border border-hairline bg-paper/90 py-1 pl-1 pr-2.5"
          >
            <Balloon n={stepIndex + 1} filled />
            <span className="font-label text-[13px] font-semibold text-ink">{cad.steps[stepIndex].label}</span>
            <span className="font-label text-[12px] tabular-nums text-ink-2">of {cad.steps.length}</span>
          </div>
        )}

        {hydrated && stepIndex < 0 && onScreenChapter && onScreenChapter.color && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-2 left-2 flex items-center gap-2 border border-hairline bg-paper/90 px-2.5 py-1.5"
          >
            <span className="size-3 shrink-0 border border-ink/30" style={{ background: onScreenChapter.color }} />
            <span className="font-label text-[13px] font-semibold text-ink">{onScreenChapter.label}</span>
          </div>
        )}

        {mode === "explore" && (
          <div className="absolute right-2 top-2 flex gap-1.5">
            <button type="button" className={btn} onClick={() => engineRef.current?.resetView()}>
              Reset view
            </button>
            <button type="button" className={btn} onClick={exitExplore}>
              Back to video
            </button>
          </div>
        )}

        {mode === "explore" && (
          <p className="pointer-events-none absolute left-2 top-2 hidden bg-paper/85 px-1.5 py-0.5 font-label text-[12px] text-ink-2 sm:block">
            Drag to rotate · scroll or pinch to zoom
          </p>
        )}
      </div>

      {mode === "explore" && (
        <div className="border border-t-0 border-hairline bg-panel px-2 py-2 sm:px-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className={btn}
              onClick={() => (explorePlaying ? engineRef.current?.pause() : engineRef.current?.play())}
              aria-label={explorePlaying ? "Pause" : "Play"}
            >
              <PlayIcon playing={explorePlaying} />
            </button>
            <input
              type="range"
              min={0}
              max={duration}
              step={0.01}
              value={time}
              onChange={(e) => {
                engineRef.current?.pause();
                engineRef.current?.setTime(Number(e.target.value));
              }}
              aria-label="Animation time"
              aria-valuetext={`${time.toFixed(1)} of ${duration.toFixed(1)} seconds${activeChapter ? `, ${activeChapter.label}` : ""}`}
              className="h-6 min-w-0 flex-1 accent-[var(--color-accent)]"
            />
            <span className="w-[4.5rem] shrink-0 text-right font-label text-[13px] tabular-nums text-ink-2">
              {time.toFixed(1)} / {duration.toFixed(1)}s
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {cad.chapters.map((c) => (
              <button
                key={`${c.label}-${c.start}`}
                type="button"
                onClick={() => engineRef.current?.playRange(c.start, c.end)}
                aria-current={activeChapter === c ? "step" : undefined}
                className={`${btnBase} ${
                  activeChapter === c
                    ? "border-accent bg-[color-mix(in_srgb,var(--color-accent)_10%,transparent)]"
                    : "border-hairline bg-panel hover:bg-hairline-2"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="sr-only" aria-live="polite">
        {mode === "loading" ? loadingLabel : mode === "explore" ? `3D view of ${cad.title} is ready.` : ""}
      </p>
      {error && (
        <p role="status" className="mt-2 font-label text-[13px] text-ink-2">
          {error}
        </p>
      )}
    </figure>
  );
}
