import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { studyDataQuery } from "@/lib/data";
import { summarize } from "@/lib/queue";
import { todayLocal } from "@/lib/srs";

const PREF_KEY = "due-notifications";
const LAST_KEY = "due-notified-on";
const CHANGE_EVENT = "due-notifications-change";
const CHECK_EVERY_MS = 15 * 60 * 1000;

type Check = {
  enabled: boolean;
  permission: NotificationPermission | "unsupported";
  /** Only worth a notification when the user is not looking at the app */
  hidden: boolean;
  dueCount: number;
  studiedToday: boolean;
  today: string;
  lastNotifiedOn: string | null;
};

/** At most one a day: only when cards are due, the app is in the background, and nothing was practised yet today. */
export function shouldNotify(c: Check): boolean {
  return (
    c.enabled &&
    c.permission === "granted" &&
    c.hidden &&
    c.dueCount > 0 &&
    !c.studiedToday &&
    c.lastNotifiedOn !== c.today
  );
}

/** Has a card been rated today (local date)? Practice mode saves no ratings, so it does not count. */
export function studiedToday(reviews: { last_reviewed: string | null }[], today: string): boolean {
  return reviews.some((r) => r.last_reviewed != null && todayLocal(new Date(r.last_reviewed)) === today);
}

export function dueMessage(n: number): string {
  return n === 1 ? "Er staat 1 kaart klaar om te oefenen." : `Er staan ${n} kaarten klaar om te oefenen.`;
}

export const notificationsSupported = () => typeof window !== "undefined" && "Notification" in window;

const permissionNow = (): Check["permission"] => (notificationsSupported() ? Notification.permission : "unsupported");

function readPref(): boolean {
  try {
    return localStorage.getItem(PREF_KEY) === "on";
  } catch {
    return false;
  }
}

function readLast(): string | null {
  try {
    return localStorage.getItem(LAST_KEY);
  } catch {
    return null;
  }
}

/** The on/off switch for this browser. It is per device, like the browser permission it depends on. */
export function useDueNotificationPref() {
  const [enabled, setEnabledState] = useState(false);
  const [permission, setPermission] = useState<Check["permission"]>("default");

  useEffect(() => {
    const sync = () => {
      setEnabledState(readPref());
      setPermission(permissionNow());
    };
    sync();
    window.addEventListener(CHANGE_EVENT, sync);
    return () => window.removeEventListener(CHANGE_EVENT, sync);
  }, []);

  /** Turning on asks the browser for permission; the user can still say no. Returns whether it is on now. */
  const setEnabled = useCallback(async (on: boolean) => {
    if (on) {
      if (!notificationsSupported()) return false;
      const result = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
      if (result !== "granted") {
        window.dispatchEvent(new Event(CHANGE_EVENT));
        return false;
      }
    }
    try {
      localStorage.setItem(PREF_KEY, on ? "on" : "off");
    } catch {
      /* storage unavailable: the choice only lasts until reload */
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
    return on;
  }, []);

  return { enabled, permission, setEnabled };
}

/** Mounted once in the app shell. Shows a single "cards are due" notification per day when allowed. */
export function useDueNotifications() {
  const { enabled, permission } = useDueNotificationPref();
  const navigate = useNavigate();
  const active = enabled && permission === "granted";
  const { data } = useQuery({
    ...studyDataQuery,
    enabled: active,
    refetchInterval: CHECK_EVERY_MS,
    refetchIntervalInBackground: true,
  });

  const latest = useRef({ data, active, navigate });
  latest.current = { data, active, navigate };

  useEffect(() => {
    if (!active) return;
    const check = () => {
      const { data: d, navigate: go } = latest.current;
      if (!d) return;
      const today = todayLocal();
      const dueCount = summarize(d, ["image"], today).due;
      const ok = shouldNotify({
        enabled: true,
        permission: permissionNow(),
        hidden: document.visibilityState === "hidden",
        dueCount,
        studiedToday: studiedToday(d.reviews, today),
        today,
        lastNotifiedOn: readLast(),
      });
      if (!ok) return;
      try {
        // Remember first, so a failing notification is not retried every few minutes
        localStorage.setItem(LAST_KEY, today);
      } catch {
        /* storage unavailable: worst case it shows again after a reload */
      }
      try {
        const n = new Notification("Plexus", { body: dueMessage(dueCount), tag: "plexus-due" });
        n.onclick = () => {
          window.focus();
          go({ to: "/study" });
          n.close();
        };
      } catch {
        /* some mobile browsers only allow notifications through a service worker */
      }
    };
    check();
    document.addEventListener("visibilitychange", check);
    const timer = setInterval(check, 60 * 1000);
    return () => {
      document.removeEventListener("visibilitychange", check);
      clearInterval(timer);
    };
  }, [active, data]);
}
