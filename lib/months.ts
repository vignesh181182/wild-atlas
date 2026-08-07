/** Month names, January first — the season chart labels every bar with one. */

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** Single letters for the axis. J F M A M J J A S O N D reads as a year. */
export const MONTH_INITIALS = MONTH_NAMES.map((month) => month.charAt(0));
