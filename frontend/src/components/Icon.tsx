// Icon.tsx — TanteEmma custom line-icon set, ported verbatim from
// design-ref/icons.jsx. Consistent 24x24 grid, stroke-based, inherits color.
import type { CSSProperties } from 'react';

export type IconName =
  | 'produce'
  | 'bread'
  | 'dairy'
  | 'cheese'
  | 'meat'
  | 'sweets'
  | 'drinks'
  | 'pantry'
  | 'cart'
  | 'store'
  | 'clock'
  | 'gear'
  | 'search'
  | 'camera'
  | 'plus'
  | 'check'
  | 'x'
  | 'trash'
  | 'chevron-right'
  | 'chevron-down'
  | 'grid'
  | 'rows'
  | 'card-rows'
  | 'pencil'
  | 'sliders'
  | 'sparkle'
  | 'sun'
  | 'moon'
  | 'users'
  | 'box'
  | 'logout'
  | 'globe'
  | 'dots-horizontal'
  | 'star-outline'
  | 'star-filled';

interface IconProps {
  name: IconName | string;
  size?: number;
  strokeWidth?: number;
  style?: CSSProperties;
  className?: string;
}

export function Icon({ name, size = 24, strokeWidth = 1.75, style, className }: IconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    style,
    className,
  };
  switch (name) {
    case 'produce':
      return (
        <svg {...common}>
          <path d="M4 20C4 12 9 5 20 4 19 15 12 20 4 20Z" />
          <path d="M9 15c2.5-3.5 5-5.5 8-7" />
        </svg>
      );
    case 'bread':
      return (
        <svg {...common}>
          <path d="M4 12.5C4 9.4 7.6 7 12 7s8 2.4 8 5.5c0 1.1-1 1.8-2 1.8v3.2a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 17.5v-3.2c-1 0-2-.7-2-1.8Z" />
          <path d="M10.5 10.5 9 13M14 10.5 12.5 13" />
        </svg>
      );
    case 'dairy':
      return (
        <svg {...common}>
          <path d="M7.5 9 9.2 5h5.6L16.5 9v10a1.3 1.3 0 0 1-1.3 1.3H8.8A1.3 1.3 0 0 1 7.5 19Z" />
          <path d="M7.5 9h9M12 5v4" />
        </svg>
      );
    case 'cheese':
      return (
        <svg {...common}>
          <path d="M4 17.5 17.2 9.4a2.4 2.4 0 0 1 3.3.9c.3.5.5 1.1.5 1.7v4.6a1 1 0 0 1-1 1H4Z" />
          <circle cx="9" cy="15.4" r="1" />
          <circle cx="14" cy="14" r="1" />
        </svg>
      );
    case 'meat':
      return (
        <svg {...common}>
          <path d="M13.5 4.2a5 5 0 0 0-6.8 7.1l-1.9 1.9a2.1 2.1 0 1 0 2.1 2.1l1.9-1.9a5 5 0 0 0 7.1-6.8" />
          <path d="m15.9 6.6 1.4-1.4M17.4 8.1l1.4-1.4" />
        </svg>
      );
    case 'sweets':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3.1" />
          <path d="M9.2 10.6 4.5 8.2v7.6l4.7-2.4M14.8 10.6l4.7-2.4v7.6l-4.7-2.4" />
        </svg>
      );
    case 'drinks':
      return (
        <svg {...common}>
          <path d="M10 3.5h4v2.2l1.1 2.6a3 3 0 0 1 .4 1.5v8.9a1.3 1.3 0 0 1-1.3 1.3H9.8a1.3 1.3 0 0 1-1.3-1.3V9.8a3 3 0 0 1 .4-1.5L10 5.7Z" />
          <path d="M9 12.5h6" />
        </svg>
      );
    case 'pantry':
      return (
        <svg {...common}>
          <ellipse cx="12" cy="6.4" rx="6" ry="2.2" />
          <path d="M6 6.4v11.2c0 1.2 2.7 2.2 6 2.2s6-1 6-2.2V6.4" />
          <path d="M6 12c0 1.2 2.7 2.2 6 2.2s6-1 6-2.2" />
        </svg>
      );
    case 'cart':
      return (
        <svg {...common}>
          <circle cx="9.5" cy="19" r="1.4" />
          <circle cx="17" cy="19" r="1.4" />
          <path d="M3 4h2l1.6 10.2a1.4 1.4 0 0 0 1.4 1.2h8.7a1.4 1.4 0 0 0 1.4-1.1L20 8H6.2" />
        </svg>
      );
    case 'store':
      return (
        <svg {...common}>
          <path d="M4 9.5 5.2 5h13.6L20 9.5M4 9.5h16M4 9.5v.6a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0v-.6" />
          <path d="M5.5 13v6.5a.8.8 0 0 0 .8.8h11.4a.8.8 0 0 0 .8-.8V13" />
          <path d="M9.5 20v-3.6a.8.8 0 0 1 .8-.8h3.4a.8.8 0 0 1 .8.8V20" />
        </svg>
      );
    case 'clock':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.2" />
          <path d="M12 7.5V12l3 1.8" />
        </svg>
      );
    case 'gear':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="2.8" />
          <path d="M12 3.2v2M12 18.8v2M20.8 12h-2M5.2 12h-2M18.2 5.8l-1.4 1.4M7.2 16.8l-1.4 1.4M18.2 18.2l-1.4-1.4M7.2 7.2 5.8 5.8" />
        </svg>
      );
    case 'search':
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="6.5" />
          <path d="m20 20-4.2-4.2" />
        </svg>
      );
    case 'camera':
      return (
        <svg {...common}>
          <path d="M3.5 8.5A1.5 1.5 0 0 1 5 7h1.8l1-1.6a1 1 0 0 1 .85-.47h6.7a1 1 0 0 1 .85.47L17.2 7H19a1.5 1.5 0 0 1 1.5 1.5v8.5A1.5 1.5 0 0 1 19 19.5H5A1.5 1.5 0 0 1 3.5 18Z" />
          <circle cx="12" cy="13" r="3.3" />
        </svg>
      );
    case 'plus':
      return (
        <svg {...common}>
          <path d="M12 5.5v13M5.5 12h13" />
        </svg>
      );
    case 'check':
      return (
        <svg {...common} strokeWidth={2.4}>
          <path d="m5 12.5 4.5 4.5L19 7" />
        </svg>
      );
    case 'x':
      return (
        <svg {...common}>
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      );
    case 'trash':
      return (
        <svg {...common}>
          <path d="M4.5 7h15M9.5 7V5.5A1.5 1.5 0 0 1 11 4h2a1.5 1.5 0 0 1 1.5 1.5V7M6.5 7l.9 11.5a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4L18.5 7" />
        </svg>
      );
    case 'chevron-right':
      return (
        <svg {...common}>
          <path d="m9 5 7 7-7 7" />
        </svg>
      );
    case 'chevron-down':
      return (
        <svg {...common}>
          <path d="m5 9 7 7 7-7" />
        </svg>
      );
    case 'grid':
      return (
        <svg {...common}>
          <rect x="4" y="4" width="7" height="7" rx="1.6" />
          <rect x="13" y="4" width="7" height="7" rx="1.6" />
          <rect x="4" y="13" width="7" height="7" rx="1.6" />
          <rect x="13" y="13" width="7" height="7" rx="1.6" />
        </svg>
      );
    case 'rows':
      return (
        <svg {...common}>
          <path d="M4 6.5h16M4 12h16M4 17.5h16" />
        </svg>
      );
    case 'card-rows':
      return (
        <svg {...common}>
          <rect x="4" y="5" width="16" height="6" rx="2" />
          <rect x="4" y="13" width="16" height="6" rx="2" />
        </svg>
      );
    case 'pencil':
      return (
        <svg {...common}>
          <path d="M16.5 4.5 19.5 7.5 9 18l-3.8.8.8-3.8Z" />
          <path d="m14.5 6.5 3 3" />
        </svg>
      );
    case 'sliders':
      return (
        <svg {...common}>
          <path d="M6 4v6M6 14v6M12 4v3M12 11v9M18 4v9M18 17v3" />
          <circle cx="6" cy="12" r="2" />
          <circle cx="12" cy="9" r="2" />
          <circle cx="18" cy="15" r="2" />
        </svg>
      );
    case 'sparkle':
      return (
        <svg {...common}>
          <path d="M12 4c.5 3.5 1.5 4.5 5 5-3.5.5-4.5 1.5-5 5-.5-3.5-1.5-4.5-5-5 3.5-.5 4.5-1.5 5-5Z" />
        </svg>
      );
    case 'sun':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6M18.4 18.4l-1.6-1.6M7.2 7.2 5.6 5.6" />
        </svg>
      );
    case 'moon':
      return (
        <svg {...common}>
          <path d="M20 13.5A8 8 0 1 1 10.5 4a6.2 6.2 0 0 0 9.5 9.5Z" />
        </svg>
      );
    case 'users':
      return (
        <svg {...common}>
          <circle cx="9" cy="8.5" r="3.2" />
          <path d="M3.5 19.5a5.5 5.5 0 0 1 11 0" />
          <path d="M16 5.6a3.2 3.2 0 0 1 0 5.8M17.5 19.5a5.5 5.5 0 0 0-3-4.9" />
        </svg>
      );
    case 'box':
      return (
        <svg {...common}>
          <path d="M12 3.2 20 7.5v9L12 20.8 4 16.5v-9Z" />
          <path d="m4 7.5 8 4.3 8-4.3M12 11.8v9" />
        </svg>
      );
    case 'logout':
      return (
        <svg {...common}>
          <path d="M14 4.5H6.5A1.5 1.5 0 0 0 5 6v12a1.5 1.5 0 0 0 1.5 1.5H14" />
          <path d="M17 8.5 21 12l-4 3.5M21 12H9.5" />
        </svg>
      );
    case 'globe':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.2" />
          <path d="M3.8 12h16.4M12 3.8c2.3 2.2 3.5 5.1 3.5 8.2S14.3 18 12 20.2C9.7 18 8.5 15.1 8.5 12S9.7 6 12 3.8Z" />
        </svg>
      );
    case 'dots-horizontal':
      return (
        <svg {...common}>
          <circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'star-outline':
      return (
        <svg {...common}>
          <path d="M12 2.5l2.8 5.7 6.3.9-4.6 4.4 1.1 6.3L12 16.8l-5.6 3 1.1-6.3L3 9.1l6.3-.9L12 2.5Z" />
        </svg>
      );
    case 'star-filled':
      return (
        <svg {...common} fill="currentColor">
          <path d="M12 2.5l2.8 5.7 6.3.9-4.6 4.4 1.1 6.3L12 16.8l-5.6 3 1.1-6.3L3 9.1l6.3-.9L12 2.5Z" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
  }
}
