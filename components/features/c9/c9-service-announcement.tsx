"use client";

import { useEffect, useMemo, useState } from "react";

type ServiceAnnouncementPayload = {
  enabled?: boolean;
  eyebrow?: string | null;
  title?: string | null;
  message?: string | null;
  detail?: string | null;
  updatedAt?: string | null;
};

interface ServiceAnnouncementResponse {
  ok: boolean;
  announcement?: ServiceAnnouncementPayload | null;
}

const FALLBACK_ANNOUNCEMENT: ServiceAnnouncementPayload = {
  enabled: true,
  eyebrow: "Service announcement",
  title: "Settlement update",
  message:
    "Jupiter is having issues resolving markets correctly. Miami Won and is working to be resolved quickly on their end. Expect your payouts within 12-24 hours",
  detail:
    "No action is needed on your side. Affected payouts will be credited automatically once Jupiter finishes their fix.",
};

function formatUpdatedAtLabel(value: string | null | undefined): string | null {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const date = new Date(raw);
  if (!Number.isFinite(date.getTime())) return null;
  try {
    const formatted = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
    return `Last updated: ${formatted} ET`;
  } catch {
    return null;
  }
}

export function C9ServiceAnnouncement() {
  const [announcement, setAnnouncement] = useState<ServiceAnnouncementPayload | null>(
    FALLBACK_ANNOUNCEMENT
  );

  useEffect(() => {
    let cancelled = false;

    const loadAnnouncement = async () => {
      try {
        const res = await fetch("/c9/service-announcement", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json().catch(() => null)) as ServiceAnnouncementResponse | null;
        if (cancelled) return;
        if (!data?.ok) return;
        if (data.announcement?.enabled === false) {
          setAnnouncement(null);
          return;
        }
        if (data.announcement?.message) {
          setAnnouncement({
            ...FALLBACK_ANNOUNCEMENT,
            ...data.announcement,
          });
        }
      } catch {}
    };

    void loadAnnouncement();
    return () => {
      cancelled = true;
    };
  }, []);

  const updatedAtLabel = useMemo(
    () => formatUpdatedAtLabel(announcement?.updatedAt),
    [announcement?.updatedAt]
  );

  if (!announcement?.message) return null;

  return (
    <section
      className="rounded-[12px] p-3 sm:rounded-[16px] sm:p-4"
      style={{
        background:
          "linear-gradient(0deg, rgba(255, 255, 255, 0.00) 34.52%, rgba(255, 255, 255, 0.01) 100%), #141416",
        boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.08) inset",
      }}
    >
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="space-y-1.5">
          <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-[#757575]">
            {announcement.eyebrow || "Service announcement"}
          </p>
          {announcement.title ? (
            <h2 className="text-sm font-medium text-white sm:text-base">{announcement.title}</h2>
          ) : null}
          <p className="text-sm leading-6 text-zinc-300">{announcement.message}</p>
          {announcement.detail ? (
            <p className="text-xs leading-5 text-[#757575]">{announcement.detail}</p>
          ) : null}
        </div>

        {updatedAtLabel ? (
          <div className="border-t border-white/[0.06] pt-3">
            <p className="text-[11px] text-[#757575]">{updatedAtLabel}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
