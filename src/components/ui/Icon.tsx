import type { SVGProps } from "react";

export type IconName =
  | "sun"
  | "calendar"
  | "ledger"
  | "users"
  | "tray"
  | "contrast"
  | "settings"
  | "plus"
  | "check"
  | "x"
  | "question"
  | "warning"
  | "chevronRight"
  | "chevronDown"
  | "chevronLeft"
  | "bell"
  | "eye"
  | "globe"
  | "rupee"
  | "mic"
  | "play"
  | "share"
  | "pin"
  | "logout"
  | "archive"
  | "pencil"
  | "clock"
  | "phone"
  | "link"
  | "home"
  | "star"
  | "whatsapp";

interface IconDef {
  paths: string[];
  /** Paths that are filled instead of stroked (e.g. the contrast half-moon). */
  filled?: string[];
  circles?: Array<[number, number, number]>;
  rects?: Array<[number, number, number, number, number]>;
  strokeWidth?: number;
  round?: boolean;
}

const ICONS: Record<IconName, IconDef> = {
  sun: {
    circles: [[12, 12, 4]],
    paths: ["M12 2.5v2M12 19.5v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2.5 12h2M19.5 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"],
  },
  calendar: {
    rects: [[3.5, 5, 17, 15, 2]],
    paths: ["M3.5 10h17M8 3v4M16 3v4"],
  },
  ledger: { paths: ["M6 3h12v18l-3-2-3 2-3-2-3 2z", "M9 8h6M9 12h6"] },
  users: {
    circles: [[9, 8, 3.5]],
    paths: ["M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5", "M16 4.8a3.5 3.5 0 0 1 0 6.4M18 14.8c1.8.7 3 2.5 3.5 5.2"],
  },
  tray: { paths: ["M3.5 13.5l2.5-8h12l2.5 8v5h-17z", "M3.5 13.5h5l1 2h5l1-2h5"] },
  contrast: {
    circles: [[12, 12, 8.5]],
    paths: [],
    filled: ["M12 3.5v17a8.5 8.5 0 0 0 0-17z"],
    round: false,
  },
  settings: {
    circles: [[12, 12, 3]],
    paths: ["M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"],
  },
  plus: { paths: ["M12 5v14M5 12h14"], strokeWidth: 2.4 },
  check: { paths: ["M5 12.5l4.5 4.5L19 7.5"], strokeWidth: 3 },
  x: { paths: ["M6 6l12 12M18 6L6 18"], strokeWidth: 3 },
  question: { paths: ["M9 9a3 3 0 1 1 4.5 2.6c-1 .6-1.5 1.2-1.5 2.4", "M12 18h.01"], strokeWidth: 3.2 },
  warning: { paths: ["M12 3.5L2.5 20h19z", "M12 10v4.5M12 17.5h.01"], strokeWidth: 2.4 },
  chevronRight: { paths: ["M9 5l7 7-7 7"], strokeWidth: 2.4 },
  chevronDown: { paths: ["M6 9l6 6 6-6"], strokeWidth: 2.4 },
  chevronLeft: { paths: ["M15 5l-7 7 7 7"], strokeWidth: 2.4 },
  bell: { paths: ["M6 16V11a6 6 0 0 1 12 0v5l2 2H4z", "M10 21h4"] },
  eye: { circles: [[12, 12, 3]], paths: ["M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"] },
  globe: {
    circles: [[12, 12, 9]],
    paths: ["M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z"],
  },
  rupee: { paths: ["M7 4h10M7 9h10M8 4c4.5 0 6.5 2 6.5 5s-2 5-6.5 5h-1l7.5 7"], strokeWidth: 2.2 },
  mic: { paths: ["M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z", "M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"] },
  play: { paths: [], filled: ["M8 5v14l11-7z"] },
  share: { paths: ["M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7", "M12 3v13M7 8l5-5 5 5"] },
  pin: { circles: [[12, 9.5, 2.5]], paths: ["M12 21s7-6.5 7-11.5a7 7 0 1 0-14 0C5 14.5 12 21 12 21z"] },
  logout: { paths: ["M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h5", "M14 8l4 4-4 4M18 12H9"] },
  archive: { rects: [[3.5, 4, 17, 5, 1.5]], paths: ["M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9", "M10 13h4"] },
  pencil: { paths: ["M4 20l4-1 10-10-3-3L5 16z", "M13 7l3 3"] },
  clock: { circles: [[12, 12, 8.5]], paths: ["M12 7.5V12l3 2"] },
  phone: { paths: ["M6 3h4l2 5-2.5 1.5a11 11 0 0 0 5 5L16 12l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 4 5a2 2 0 0 1 2-2z"] },
  link: { paths: ["M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7L11.5 6.8", "M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.5-1.5"] },
  home: { paths: ["M3.5 11L12 4l8.5 7", "M6 10v10h12V10"] },
  star: { paths: ["M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1.1 5.8L12 16.8l-5.3 2.8 1.1-5.8-4.3-4.1 5.9-.8z"] },
  whatsapp: {
    paths: ["M4 20l1.2-4.2A8.5 8.5 0 1 1 8.4 19z", "M9.5 8.5c.2 2.5 3 5.3 5.5 5.5l1-1.2-1.8-1-.9.7c-.9-.4-1.9-1.4-2.3-2.3l.7-.9-1-1.8z"],
    strokeWidth: 1.8,
  },
};

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
  size?: number;
  strokeWidth?: number;
}

export function Icon({ name, size = 20, strokeWidth, className, ...rest }: IconProps) {
  const def = ICONS[name];
  const sw = strokeWidth ?? def.strokeWidth ?? 2;
  const round = def.round !== false;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap={round ? "round" : undefined}
      strokeLinejoin={round ? "round" : undefined}
      aria-hidden="true"
      className={className}
      {...rest}
    >
      {def.rects?.map(([x, y, w, h, r], i) => (
        <rect key={`r${i}`} x={x} y={y} width={w} height={h} rx={r} />
      ))}
      {def.circles?.map(([cx, cy, r], i) => (
        <circle key={`c${i}`} cx={cx} cy={cy} r={r} />
      ))}
      {def.paths.map((d, i) => (
        <path key={`p${i}`} d={d} />
      ))}
      {def.filled?.map((d, i) => (
        <path key={`f${i}`} d={d} fill="currentColor" stroke="none" />
      ))}
    </svg>
  );
}
