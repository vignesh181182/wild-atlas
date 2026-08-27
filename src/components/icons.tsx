/** The line icons used across the app, traced from the design at 1.5px stroke. */

type IconProps = { size?: number };

export function StarIcon({ size = 18 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M12 3.5l2.2 5.1 5.3.5-4 3.6 1.2 5.3-4.7-2.8-4.7 2.8 1.2-5.3-4-3.6 5.3-.5z" />
    </svg>
  );
}

export function SearchIcon({ size = 18 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="6.5" />
      <line x1="16" y1="16" x2="20.5" y2="20.5" />
    </svg>
  );
}

export function PencilIcon({ size = 15 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M4 20h4l10-10-4-4L4 16z" />
      <path d="M14.5 5.5l4 4" />
    </svg>
  );
}

export function TrashIcon({ size = 15 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M5 7h14" />
      <path d="M8 7V4.5h8V7" />
      <path d="M6.5 7l1 13h9l1-13" />
    </svg>
  );
}

export function BookmarkIcon({ size = 15, filled = false }: IconProps & { filled?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M6.5 3.5h11v17l-5.5-4-5.5 4z" />
    </svg>
  );
}

export function BackIcon({ size = 16 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <path d="M14 5l-7 7 7 7" />
    </svg>
  );
}

export function GridIcon({ size = 18 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <rect x="3.5" y="3.5" width="7" height="7" />
      <rect x="13.5" y="3.5" width="7" height="7" />
      <rect x="3.5" y="13.5" width="7" height="7" />
      <rect x="13.5" y="13.5" width="7" height="7" />
    </svg>
  );
}

/** A folded paper map — the button that opens the sightings full screen. */
export function MapIcon({ size = 15 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M3.5 6.5l5.5-2 6 2 5.5-2v13l-5.5 2-6-2-5.5 2z" />
      <path d="M9 4.5v13M15 6.5v13" />
    </svg>
  );
}

export function CloseIcon({ size = 16 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

/** Zoom the map back out to the whole planet. */
export function GlobeIcon({ size = 16 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8.5" />
      <ellipse cx="12" cy="12" rx="4" ry="8.5" />
      <path d="M3.5 12h17" />
    </svg>
  );
}

/** Corner marks: draw the frame back in around the sightings. */
export function FitIcon({ size = 16 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
    </svg>
  );
}

/** Open this one — the arrow a row points you along. */
export function OpenIcon({ size = 16 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <path d="M5 12h13M12.5 6l6 6-6 6" />
    </svg>
  );
}

export function PlayIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <polygon points="7,4 20,12 7,20" />
    </svg>
  );
}

export function StopIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" />
    </svg>
  );
}

/* The two glyphs the app did not already have, taken from the design's icon
   set rather than redrawn. Both keep their 16px viewBox and 1.25 stroke, which
   is the geometry they were drawn at — scaling a 24-box glyph down to match
   would thicken the line against everything beside it. */

export function GiftIcon({ size = 16 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 4.66667H5C4.55797 4.66667 4.13405 4.49107 3.82149 4.17851C3.50893 3.86595 3.33333 3.44203 3.33333 3C3.33333 2.55797 3.50893 2.13405 3.82149 1.82149C4.13405 1.50893 4.55797 1.33333 5 1.33333C7.33333 1.33333 8 4.66667 8 4.66667ZM8 4.66667H11C11.442 4.66667 11.866 4.49107 12.1785 4.17851C12.4911 3.86595 12.6667 3.44203 12.6667 3C12.6667 2.55797 12.4911 2.13405 12.1785 1.82149C11.866 1.50893 11.442 1.33333 11 1.33333C8.66667 1.33333 8 4.66667 8 4.66667ZM8 4.66667L8 14.6667M1.33333 9.33333H14.6667M1.33333 6.8L1.33333 12.5333C1.33333 13.2801 1.33333 13.6534 1.47866 13.9387C1.60649 14.1895 1.81046 14.3935 2.06135 14.5213C2.34656 14.6667 2.71993 14.6667 3.46667 14.6667L12.5333 14.6667C13.2801 14.6667 13.6534 14.6667 13.9387 14.5213C14.1895 14.3935 14.3935 14.1895 14.5213 13.9387C14.6667 13.6534 14.6667 13.2801 14.6667 12.5333V6.8C14.6667 6.05326 14.6667 5.6799 14.5213 5.39468C14.3935 5.1438 14.1895 4.93982 13.9387 4.81199C13.6534 4.66667 13.2801 4.66667 12.5333 4.66667L3.46667 4.66667C2.71993 4.66667 2.34656 4.66667 2.06135 4.81199C1.81046 4.93982 1.60649 5.1438 1.47866 5.39468C1.33333 5.67989 1.33333 6.05326 1.33333 6.8Z" />
    </svg>
  );
}

export function FolderIcon({ size = 16 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8.66667 4.66667L7.92297 3.17928C7.70894 2.7512 7.60191 2.53715 7.44225 2.38078C7.30105 2.24249 7.13088 2.13732 6.94405 2.07287C6.73278 2 6.49347 2 6.01486 2H3.46667C2.71993 2 2.34656 2 2.06135 2.14532C1.81046 2.27316 1.60649 2.47713 1.47866 2.72801C1.33333 3.01323 1.33333 3.3866 1.33333 4.13333V4.66667M1.33333 4.66667H11.4667C12.5868 4.66667 13.1468 4.66667 13.5746 4.88465C13.951 5.0764 14.2569 5.38236 14.4487 5.75869C14.6667 6.18651 14.6667 6.74656 14.6667 7.86667V10.8C14.6667 11.9201 14.6667 12.4802 14.4487 12.908C14.2569 13.2843 13.951 13.5903 13.5746 13.782C13.1468 14 12.5868 14 11.4667 14H4.53333C3.41323 14 2.85318 14 2.42535 13.782C2.04903 13.5903 1.74307 13.2843 1.55132 12.908C1.33333 12.4802 1.33333 11.9201 1.33333 10.8V4.66667Z" />
    </svg>
  );
}
