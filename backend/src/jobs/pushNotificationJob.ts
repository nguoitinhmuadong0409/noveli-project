import webpush, { PushSubscription as WebPushSubscription } from 'web-push';
import { prisma } from '../config/prisma';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY ?? '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? 'mailto:noreply@novoli.app';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

/**
 * Sends reading reminder push notifications to all subscriptions
 * whose reminderTime matches the current UTC HH:MM.
 */
export async function sendReadingReminders(): Promise<void> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('[Push] VAPID keys not configured — skipping push notifications');
    return;
  }

  const now = new Date();
  const hh = String(now.getUTCHours()).padStart(2, '0');
  const mm = String(now.getUTCMinutes()).padStart(2, '0');
  const currentTime = `${hh}:${mm}`;

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { reminderTime: currentTime, isActive: true },
  });

  if (subscriptions.length === 0) return;

  console.log(`[Push] Sending reminders to ${subscriptions.length} devices at ${currentTime}`);

  const payload = JSON.stringify({
    title: '📚 novoli — Giờ đọc sách!',
    body: 'Dành 15 phút để đọc hôm nay. Duy trì chuỗi ngày đọc của bạn!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    data: { url: '/timer' },
  });

  const results = await Promise.allSettled(
    subscriptions.map((sub) => {
      const pushSub: WebPushSubscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dhKey, auth: sub.authKey },
      };
      return webpush.sendNotification(pushSub, payload);
    }),
  );

  // Deactivate expired / invalid subscriptions (HTTP 404 or 410)
  const goneIds: string[] = [];
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      const err = result.reason as { statusCode?: number };
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        const sub = subscriptions[index];
        if (sub) goneIds.push(sub.id);
      }
    }
  });

  if (goneIds.length > 0) {
    await prisma.pushSubscription
      .updateMany({ where: { id: { in: goneIds } }, data: { isActive: false } })
      .catch(() => {});
  }
}

/** Start the cron loop — checks every 60 seconds */
export function startPushNotificationJob(): void {
  console.log('[Push] Starting push notification scheduler');
  setInterval(() => {
    sendReadingReminders().catch((err) =>
      console.error('[Push] Scheduler error:', err),
    );
  }, 60_000);
}
