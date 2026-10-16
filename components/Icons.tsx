// 라인 아이콘 (stroke = currentColor). design-system.md §5 StatBadge·탭바
type P = { size?: number; className?: string };
const base = (size = 20) => ({
  width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
  strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true,
});

export const DropIcon = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M12 3.5c3.5 4.2 6 7.6 6 10.5a6 6 0 0 1-12 0c0-2.9 2.5-6.3 6-10.5Z" /></svg>
);
export const ThermoIcon = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M10 14.5V5a2 2 0 1 1 4 0v9.5a4 4 0 1 1-4 0Z" /><path d="M12 9v7" /></svg>
);
export const SunIcon = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);
export const BatteryIcon = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><rect x="3" y="7" width="16" height="10" rx="2" /><path d="M22 11v2M6 10v4" /></svg>
);
export const HomeIcon = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1Z" /></svg>
);
export const ChatIcon = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M5 18.5V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8Z" /></svg>
);
export const SlidersIcon = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M5 4v6M5 14v6M12 4v10M12 18v2M19 4v2M19 10v10" /><circle cx="5" cy="12" r="2" /><circle cx="12" cy="16" r="2" /><circle cx="19" cy="8" r="2" />
  </svg>
);
export const GearIcon = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7 7 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.07-.4.1-.8.1-1.2Z" />
  </svg>
);
export const UsersIcon = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6" />
  </svg>
);
export const BackIcon = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M15 5 8 12l7 7" /></svg>
);
export const SendIcon = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M4 12 20 4l-6 16-3-7Z" /><path d="m11 13 9-9" /></svg>
);
export const ChevronIcon = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="m9 5 7 7-7 7" /></svg>
);
