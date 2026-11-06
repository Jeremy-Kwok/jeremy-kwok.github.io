"use client";

import { useRef, useState } from "react";

// The /about headshot with a hidden second photo. Mouse: hover swaps it.
// Touch: tap toggles. Keyboard: Enter/Space toggles. A mouse click is
// ignored, because the hover already swapped it and a click toggle would
// flip it straight back. No caption and no hint, on purpose.

export default function Headshot() {
  const [swapped, setSwapped] = useState(false);
  const lastPointer = useRef<string>("");

  return (
    <button
      type="button"
      aria-pressed={swapped}
      aria-label={`Photo of Jeremy Kwok: ${swapped ? "holiday photo" : "headshot"} showing`}
      onPointerDown={(e) => {
        lastPointer.current = e.pointerType;
      }}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") setSwapped(true);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") setSwapped(false);
      }}
      onClick={(e) => {
        // detail === 0: synthesized by Enter/Space on the focused button.
        if (e.detail === 0) setSwapped((s) => !s);
        else if (lastPointer.current !== "mouse") setSwapped((s) => !s);
      }}
      className="relative block w-full aspect-[4/5] overflow-hidden bg-hairline cursor-default focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-link"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/about/headshot.jpg"
        alt=""
        width={720}
        height={1080}
        fetchPriority="high"
        className="absolute inset-0 size-full object-cover"
        style={{ objectPosition: "50% 35%" }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/about/holiday_face.jpg"
        alt=""
        width={720}
        height={900}
        decoding="async"
        className={`absolute inset-0 size-full object-cover transition-opacity duration-200 motion-reduce:transition-none ${
          swapped ? "opacity-100" : "opacity-0"
        }`}
      />
    </button>
  );
}
