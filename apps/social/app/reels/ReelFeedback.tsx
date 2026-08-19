"use client";

import * as React from "react";
import { ShareButton } from "../interactions";

/**
 * Report / "show me less" for a reel, plus share reporting.
 *
 * <p>The ranking weighs a report at roughly forty times a like and "show me
 * less" at twenty - they are the strongest levers it has. Until now nothing in
 * the interface could produce either, so those weights could never fire and
 * the feed had no way to learn that people dislike something. A moderation
 * signal nobody can send is not a moderation signal.
 *
 * <p>Sharing is reported from here too. The share button opens the OS sheet or
 * a link menu and never told the backend anything, so {@code share_count} - the
 * second heaviest positive weight - stayed at zero no matter how much a reel
 * was actually shared.
 *
 * <p>Both are recorded once per viewer by the service, so the button says what
 * happened and does not pretend a second press did something.
 */
export function ReelFeedback({ reelId }: { reelId: string }) {
  const [open, setOpen] = React.useState(false);
  const [done, setDone] = React.useState<"REPORTED" | "HIDDEN" | null>(null);

  const send = async (type: "REPORTED" | "HIDDEN") => {
    setOpen(false);
    setDone(type);
    await fetch(`/api/reel-signal?reelId=${encodeURIComponent(reelId)}&type=${type}`, {
      method: "POST",
      keepalive: true,
    }).catch(() => {
      // Telemetry: a failed send must not put an error over the video.
    });
  };

  // Once fed back, the control is replaced by an acknowledgement. Leaving the
  // menu live would invite a second press that the service ignores anyway.
  if (done) {
    return (
      <span className="gg-icon-btn-label" style={{ opacity: 0.7, fontSize: 12 }}>
        {done === "REPORTED" ? "Bildirildi, teşekkürler" : "Daha az gösterilecek"}
      </span>
    );
  }

  return (
    <span style={{ position: "relative", display: "inline-flex" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        title="Geri bildirim"
        aria-label="Bu reel hakkında geri bildirim"
        aria-expanded={open}
        className="gg-icon-btn"
      >
        <span aria-hidden="true">⋯</span>
      </button>

      {open ? (
        <span
          role="menu"
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            zIndex: 20,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            padding: 6,
            borderRadius: 10,
            background: "var(--gg-surface, #fff)",
            border: "1px solid var(--gg-border, #EFEAF0)",
            boxShadow: "0 6px 20px rgba(0,0,0,.12)",
            whiteSpace: "nowrap",
          }}
        >
          <button
            role="menuitem"
            onClick={() => send("HIDDEN")}
            className="gg-icon-btn"
            style={{ justifyContent: "flex-start", fontSize: 13 }}
          >
            🚫 Bunun gibileri daha az göster
          </button>
          <button
            role="menuitem"
            onClick={() => send("REPORTED")}
            className="gg-icon-btn"
            style={{ justifyContent: "flex-start", fontSize: 13 }}
          >
            ⚠️ Şikâyet et
          </button>
        </span>
      ) : null}
    </span>
  );
}

/** Reports a share to the ranking. Called after the user actually shares. */
export function reportShare(reelId: string) {
  const url = `/api/reel-signal?reelId=${encodeURIComponent(reelId)}&type=SHARED`;
  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    navigator.sendBeacon(url);
  } else {
    void fetch(url, { method: "POST", keepalive: true }).catch(() => {});
  }
}

/**
 * The share button, wired to report the share.
 *
 * <p>A thin client wrapper because the reels page is a server component and
 * cannot hand a callback to a client component. Keeping it here rather than
 * teaching ShareButton about reels keeps the shared button free of feed
 * concerns - posts use the same button and have no ranking signal.
 */
export function ReelShare({ reelId, title }: { reelId: string; title: string }) {
  return <ShareButton title={title} onShared={() => reportShare(reelId)} />;
}
