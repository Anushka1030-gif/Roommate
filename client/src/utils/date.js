/**
 * Date and time formatting helpers for Chat UI and timestamps.
 */

/**
 * Format a timestamp into a 12-hour clock format (e.g., "3:45 PM").
 *
 * @param {string|number|Date} dateValue
 * @returns {string}
 */
export function formatMessageTime(dateValue) {
  if (!dateValue) return '';
  const d = new Date(dateValue);
  if (isNaN(d.getTime())) return '';

  return d.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format timestamp for inbox conversation list.
 * - Today: "3:45 PM"
 * - Yesterday: "Yesterday"
 * - Within 6 days: "Wed", "Thu", etc.
 * - Older: "Oct 24" or localized short date
 *
 * @param {string|number|Date} dateValue
 * @returns {string}
 */
export function formatConversationDate(dateValue) {
  if (!dateValue) return '';
  const d = new Date(dateValue);
  if (isNaN(d.getTime())) return '';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const diffTime = today.getTime() - msgDay.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return formatMessageTime(d);
  }

  if (diffDays === 1) {
    return 'Yesterday';
  }

  if (diffDays < 7) {
    return d.toLocaleDateString([], { weekday: 'short' });
  }

  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

/**
 * Format date for stream group divider (e.g. "Today", "Yesterday", "October 26, 2026").
 *
 * @param {string|number|Date} dateValue
 * @returns {string}
 */
export function formatDateDivider(dateValue) {
  if (!dateValue) return '';
  const d = new Date(dateValue);
  if (isNaN(d.getTime())) return '';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const diffTime = today.getTime() - msgDay.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  }

  if (diffDays === 1) {
    return 'Yesterday';
  }

  return d.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Check if two dates represent the same calendar day.
 *
 * @param {string|number|Date} d1
 * @param {string|number|Date} d2
 * @returns {boolean}
 */
export function isSameDay(d1, d2) {
  if (!d1 || !d2) return false;
  const a = new Date(d1);
  const b = new Date(d2);
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return false;

  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default {
  formatMessageTime,
  formatConversationDate,
  formatDateDivider,
  isSameDay,
};
