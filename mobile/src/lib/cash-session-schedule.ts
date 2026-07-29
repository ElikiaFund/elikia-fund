import * as Notifications from 'expo-notifications';

import type { LocalCashSession } from '@/db/database';
import type { AuthUser } from '@/services/authService';

const DEFAULT_REMINDER_TIME = '20:00:00';

function parseTime(time: string | null): { hour: number; minute: number } {
  const [hour, minute] = (time ?? DEFAULT_REMINDER_TIME).split(':').map(Number);
  return { hour, minute };
}

/** This codebase's day convention (see Group.contribution_day) is ISO 1=Mon..7=Sun; Expo's WeeklyTriggerInput.weekday is 1=Sun..7=Sat. */
export function isoWeekdayToExpoWeekday(isoDay: number): number {
  return isoDay === 7 ? 1 : isoDay + 1;
}

type ScheduleFields = Pick<AuthUser, 'cash_session_frequency' | 'cash_session_day' | 'cash_session_reminder_time'>;

/**
 * The most recent scheduled reminder occurrence at or before `now` — mirrors
 * Group.cycleEndsAt()'s day/time-combining logic, adapted to daily/weekly cadences.
 */
function mostRecentOccurrence(user: ScheduleFields, now: Date): Date {
  const { hour, minute } = parseTime(user.cash_session_reminder_time);

  if (user.cash_session_frequency === 'daily') {
    const candidate = new Date(now);
    candidate.setHours(hour, minute, 0, 0);
    if (candidate > now) {
      candidate.setDate(candidate.getDate() - 1);
    }
    return candidate;
  }

  // No day configured -> falls back to the end of the week, mirroring Group.cycleEndsAt().
  const isoDay = user.cash_session_day ?? 7;
  const currentIsoDay = now.getDay() === 0 ? 7 : now.getDay();

  const candidate = new Date(now);
  candidate.setDate(candidate.getDate() - (currentIsoDay - isoDay));
  candidate.setHours(hour, minute, 0, 0);
  if (candidate > now) {
    candidate.setDate(candidate.getDate() - 7);
  }
  return candidate;
}

/**
 * True once at least one full reminder cycle has elapsed since the user's last closing (or, if
 * they've never closed a session, since their account was created) — drives the home-tab overdue
 * banner. Pure/no I/O.
 */
export function isSessionOverdue(
  user: ScheduleFields & Pick<AuthUser, 'cash_session_reminders_enabled' | 'created_at'>,
  lastClosedSession: Pick<LocalCashSession, 'closed_at'> | null,
  now: Date = new Date(),
): boolean {
  if (!user.cash_session_reminders_enabled) {
    return false;
  }

  const baseline = new Date(lastClosedSession?.closed_at ?? user.created_at);
  return baseline < mostRecentOccurrence(user, now);
}

/**
 * (Re)schedules the local cash-session reminder from the user's current settings. Blanket-cancels
 * first — confirmed the only local-scheduling feature in the app today; revisit (track/cancel by a
 * specific identifier instead) if a second local-scheduling feature is ever added.
 */
export async function scheduleCashSessionReminder(user: AuthUser): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  if (!user.cash_session_reminders_enabled) {
    return;
  }

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    return;
  }

  const { hour, minute } = parseTime(user.cash_session_reminder_time);

  const trigger: Notifications.NotificationTriggerInput =
    user.cash_session_frequency === 'weekly'
      ? {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: isoWeekdayToExpoWeekday(user.cash_session_day ?? 7),
          hour,
          minute,
        }
      : {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        };

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Clôture de caisse',
      body: "N'oubliez pas de clôturer votre session de caisse du jour.",
      data: { type: 'cash_session_reminder' },
    },
    trigger,
  });
}
