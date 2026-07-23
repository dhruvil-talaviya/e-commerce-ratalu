/**
 * Timezone-aware date range resolver for dashboard analytics.
 *
 * Converts logical filter names (Today, Yesterday, Last 7 Days…) into UTC
 * Date boundaries that are correct for the store's operating timezone
 * (Asia/Kolkata by default).
 *
 * IMPORTANT: MongoDB stores and queries dates in UTC. A "today" in IST
 * (UTC+05:30) starts at 18:30 *yesterday* in UTC. This helper computes
 * the UTC equivalent so all aggregation queries return results that align
 * with the admin's calendar day.
 */

const DEFAULT_TZ = 'Asia/Kolkata';

/**
 * Get the UTC offset in milliseconds for a given IANA timezone.
 * Uses Intl to derive the offset without any external dependency.
 */
function getTimezoneOffsetMs(tz = DEFAULT_TZ, refDate = new Date()) {
  // Build two formatted representations of the same instant
  const utcStr = refDate.toLocaleString('en-US', { timeZone: 'UTC' });
  const tzStr = refDate.toLocaleString('en-US', { timeZone: tz });
  return new Date(tzStr).getTime() - new Date(utcStr).getTime();
}

/**
 * Get start of day in UTC for a given IANA timezone.
 */
function startOfDayInTz(date, tz = DEFAULT_TZ) {
  const offset = getTimezoneOffsetMs(tz, date);
  // Shift to local time, truncate to midnight, shift back to UTC
  const local = new Date(date.getTime() + offset);
  local.setHours(0, 0, 0, 0);
  return new Date(local.getTime() - offset);
}

/**
 * Get end of day in UTC for a given IANA timezone.
 */
function endOfDayInTz(date, tz = DEFAULT_TZ) {
  const offset = getTimezoneOffsetMs(tz, date);
  const local = new Date(date.getTime() + offset);
  local.setHours(23, 59, 59, 999);
  return new Date(local.getTime() - offset);
}

/**
 * Resolve a named filter to { start: Date, end: Date } in UTC.
 *
 * @param {string} filter - One of the supported range names.
 * @param {string} [customFrom] - ISO date string for custom range start.
 * @param {string} [customTo] - ISO date string for custom range end.
 * @param {string} [tz] - IANA timezone (default: Asia/Kolkata).
 * @returns {{ start: Date | null, end: Date | null }}
 */
function resolveDateRange(filter, customFrom, customTo, tz = DEFAULT_TZ) {
  const now = new Date();

  switch (filter) {
    case 'today': {
      return { start: startOfDayInTz(now, tz), end: endOfDayInTz(now, tz) };
    }
    case 'yesterday': {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { start: startOfDayInTz(y, tz), end: endOfDayInTz(y, tz) };
    }
    case 'last7days': {
      const s = new Date(now);
      s.setDate(s.getDate() - 6);
      return { start: startOfDayInTz(s, tz), end: endOfDayInTz(now, tz) };
    }
    case 'last30days': {
      const s = new Date(now);
      s.setDate(s.getDate() - 29);
      return { start: startOfDayInTz(s, tz), end: endOfDayInTz(now, tz) };
    }
    case 'thisMonth': {
      const offset = getTimezoneOffsetMs(tz, now);
      const local = new Date(now.getTime() + offset);
      const first = new Date(local.getFullYear(), local.getMonth(), 1);
      return { start: new Date(first.getTime() - offset), end: endOfDayInTz(now, tz) };
    }
    case 'lastMonth': {
      const offset = getTimezoneOffsetMs(tz, now);
      const local = new Date(now.getTime() + offset);
      const firstThis = new Date(local.getFullYear(), local.getMonth(), 1);
      const lastPrev = new Date(firstThis.getTime() - 1);
      const firstPrev = new Date(lastPrev.getFullYear(), lastPrev.getMonth(), 1);
      return {
        start: new Date(firstPrev.getTime() - getTimezoneOffsetMs(tz, firstPrev)),
        end: new Date(lastPrev.getTime() - getTimezoneOffsetMs(tz, lastPrev))
      };
    }
    case 'thisQuarter': {
      const offset = getTimezoneOffsetMs(tz, now);
      const local = new Date(now.getTime() + offset);
      const qMonth = Math.floor(local.getMonth() / 3) * 3;
      const first = new Date(local.getFullYear(), qMonth, 1);
      return { start: new Date(first.getTime() - offset), end: endOfDayInTz(now, tz) };
    }
    case 'thisYear': {
      const offset = getTimezoneOffsetMs(tz, now);
      const local = new Date(now.getTime() + offset);
      const first = new Date(local.getFullYear(), 0, 1);
      return { start: new Date(first.getTime() - offset), end: endOfDayInTz(now, tz) };
    }
    case 'custom': {
      if (!customFrom || !customTo) return { start: null, end: null };
      return {
        start: startOfDayInTz(new Date(customFrom), tz),
        end: endOfDayInTz(new Date(customTo), tz)
      };
    }
    case 'allTime':
    default:
      return { start: null, end: null };
  }
}

module.exports = {
  DEFAULT_TZ,
  getTimezoneOffsetMs,
  startOfDayInTz,
  endOfDayInTz,
  resolveDateRange
};
