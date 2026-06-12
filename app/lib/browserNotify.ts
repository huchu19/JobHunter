"use client";

/**
 * Thin browser-Notification wrappers. All message content comes from the
 * pure, tested builders in `reminders.ts`; this file only touches the DOM
 * API, mirroring how `theme.ts` separates pure helpers from DOM glue.
 */

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationPermission(): NotificationPermission | "unsupported" {
  return notificationsSupported() ? Notification.permission : "unsupported";
}

export async function requestNotificationPermission(): Promise<
  NotificationPermission | "unsupported"
> {
  if (!notificationsSupported()) return "unsupported";
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

/** Fire a desktop notification if (and only if) permission is granted. */
export function showNotification(title: string, body: string): boolean {
  if (!notificationsSupported() || Notification.permission !== "granted") {
    return false;
  }
  try {
    new Notification(title, { body, icon: "/icon.png" });
    return true;
  } catch {
    return false;
  }
}
