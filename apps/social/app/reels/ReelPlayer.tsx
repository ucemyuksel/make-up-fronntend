"use client";

import * as React from "react";

/** Watched at least this share of the clip counts as a completion. */
const COMPLETION_RATIO = 0.9;

/** Below this, leaving counts as a skip rather than a short watch. */
const SKIP_SECONDS = 3;

type Signal = "VIEWED" | "COMPLETED" | "SKIPPED";

/**
 * A reel with playback reporting.
 *
 * <p>The ranking needs to know whether people watch a clip or abandon it; on
 * this surface a play is nearly free, so completion is what separates good from
 * bad. Without this component the counters stay at zero and the ranking runs
 * blind, however well the server side is written.
 *
 * <p><b>Completion is measured by progress, not by the end event.</b> The
 * player loops, so {@code ended} never fires - a clip watched fully would have
 * reported nothing at all. Progress is read from {@code timeupdate} instead and
 * 90% counts as watched: the last moments are often credits or a sign-off, and
 * demanding 100% would undercount real completions.
 *
 * <p><b>Each signal is sent at most once per mount</b> and the server counts it
 * once per viewer regardless, so looping a clip cannot inflate anything.
 */
export function ReelPlayer({
  reelId,
  videoUrl,
  posterUrl,
}: {
  reelId: string;
  videoUrl: string;
  posterUrl?: string | null;
}) {
  const ref = React.useRef<HTMLVideoElement | null>(null);
  const sent = React.useRef<Set<Signal>>(new Set());
  const watched = React.useRef(0);

  const send = React.useCallback(
    (type: Signal) => {
      if (sent.current.has(type)) return;
      sent.current.add(type);

      const url = `/api/reel-signal?reelId=${encodeURIComponent(reelId)}&type=${type}`;
      // sendBeacon survives the page being closed or navigated away from,
      // which is exactly when SKIPPED and COMPLETED need to go out. fetch()
      // there is cancelled and the signal is simply lost.
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        navigator.sendBeacon(url);
      } else {
        void fetch(url, { method: "POST", keepalive: true }).catch(() => {});
      }
    },
    [reelId],
  );

  const onTimeUpdate = React.useCallback(() => {
    const v = ref.current;
    if (!v) return;

    watched.current = Math.max(watched.current, v.currentTime);

    if (v.duration > 0 && v.currentTime / v.duration >= COMPLETION_RATIO) {
      send("COMPLETED");
    }
  }, [send]);

  // Leaving the page is the moment a skip becomes known: the viewer started
  // the clip and went away without watching it.
  React.useEffect(() => {
    return () => {
      if (!sent.current.has("COMPLETED") && sent.current.has("VIEWED")
          && watched.current > 0 && watched.current < SKIP_SECONDS) {
        send("SKIPPED");
      }
    };
  }, [send]);

  return (
    <video
      ref={ref}
      src={videoUrl}
      poster={posterUrl ?? undefined}
      controls
      loop
      muted
      playsInline
      preload="metadata"
      className="gg-reel-video"
      onPlay={() => send("VIEWED")}
      onTimeUpdate={onTimeUpdate}
    />
  );
}
