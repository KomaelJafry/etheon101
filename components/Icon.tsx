// SVG icon component — zero dependency on font loading
// All icons are inline SVG paths, guaranteed to render everywhere

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: React.CSSProperties;
  className?: string;
}

const PATHS: Record<string, React.ReactNode> = {
  change_history: (
    // Delta / triangle — Etheon logo mark
    <polygon points="12,3 22,21 2,21" fill="currentColor" />
  ),
  bolt: (
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor" />
  ),
  mail: (
    <>
      <rect x="2" y="4" width="20" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <polyline points="2,4 12,13 22,4" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </>
  ),
  person: (
    <>
      <circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </>
  ),
  visibility: (
    <>
      <path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </>
  ),
  visibility_off: (
    <>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="1.8" />
    </>
  ),
  verified_user: (
    <>
      <path d="M12 2L4 6v6c0 5.5 3.8 10.7 8 12 4.2-1.3 8-6.5 8-12V6l-8-4z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <polyline points="9,12 11,14 15,10" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </>
  ),
  account_balance_wallet: (
    <>
      <rect x="2" y="7" width="20" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M16 14h.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M22 11H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </>
  ),
  arrow_forward: (
    <>
      <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <polyline points="12,5 19,12 12,19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  arrow_back: (
    <>
      <line x1="19" y1="12" x2="5" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <polyline points="12,19 5,12 12,5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  add: (
    <>
      <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  add_circle: (
    <>
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <line x1="12" y1="8" x2="12" y2="16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  remove: (
    <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  diamond: (
    // ETH diamond shape
    <polygon points="12,2 22,12 12,22 2,12" fill="currentColor" />
  ),
  notifications: (
    <>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </>
  ),
  trending_up: (
    <>
      <polyline points="23,6 13.5,15.5 8.5,10.5 1,18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="17,6 23,6 23,12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  swap_vert: (
    <>
      <polyline points="17,11 12,6 7,11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="7,13 12,18 17,13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  swap_horiz: (
    <>
      <polyline points="7,16 3,12 7,8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="17,8 21,12 17,16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  north_east: (
    <>
      <line x1="7" y1="17" x2="17" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <polyline points="7,7 17,7 17,17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  edit: (
    <>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <polyline points="16,17 21,12 16,7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </>
  ),
  content_copy: (
    <>
      <rect x="9" y="9" width="13" height="13" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </>
  ),
  check: (
    <polyline points="20,6 9,17 4,12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <line x1="12" y1="16" x2="12" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="12" y1="8" x2="12.01" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  download: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <polyline points="7,10 12,15 17,10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  grid_view: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <rect x="14" y="3" width="7" height="7" rx="1" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <rect x="3" y="14" width="7" height="7" rx="1" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <rect x="14" y="14" width="7" height="7" rx="1" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </>
  ),
  schedule: (
    <>
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <polyline points="12,6 12,12 16,14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  eco: (
    <path d="M2 22s0-10 10-12c0 0-2-6 6-8 0 4-2 8-6 10 0 0 2-1 4-1-4 2-6 6-6 8s-3 3-8 3z" fill="currentColor" />
  ),
  device_thermostat: (
    <>
      <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </>
  ),
  tune: (
    <>
      <line x1="4" y1="6" x2="20" y2="6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="4" y1="18" x2="20" y2="18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="8" cy="6" r="2" fill="currentColor" />
      <circle cx="16" cy="12" r="2" fill="currentColor" />
      <circle cx="8" cy="18" r="2" fill="currentColor" />
    </>
  ),
  expand_more: (
    <polyline points="6,9 12,15 18,9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  ),
  smartphone: (
    <>
      <rect x="5" y="2" width="14" height="20" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <line x1="12" y1="18" x2="12.01" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),
  rocket_launch: (
    <>
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </>
  ),
  close: (
    <>
      <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  group: (
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="9" cy="7" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </>
  ),
  admin_panel_settings: (
    <>
      <path d="M12 2L4 6v6c0 5.5 3.8 10.7 8 12 4.2-1.3 8-6.5 8-12V6l-8-4z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="11" r="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 13v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  attach_money: (
    <>
      <line x1="12" y1="1" x2="12" y2="23" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </>
  ),
  paid: (
    <>
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <line x1="12" y1="7" x2="12" y2="17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M15 9.5H9.5a1.5 1.5 0 0 0 0 3h5a1.5 1.5 0 0 1 0 3H9" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </>
  ),
  currency_bitcoin: (
    <>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9 8h5a2 2 0 0 1 0 4H9v4h5.5a2 2 0 0 0 0-4H9" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <line x1="10" y1="7" x2="10" y2="8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="13" y1="7" x2="13" y2="8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="10" y1="16" x2="10" y2="17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="13" y1="16" x2="13" y2="17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  arrow_downward: (
    <>
      <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <polyline points="19,12 12,19 5,12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  savings: (
    <>
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3.22 12H9.5l.5-1 2 4 .5-2h6.28" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  person_add: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="9" cy="7" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <line x1="19" y1="8" x2="19" y2="14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="22" y1="11" x2="16" y2="11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  draw: (
    <>
      <path d="M12 20h9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </>
  ),
  desktop_windows: (
    <>
      <rect x="2" y="3" width="20" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <line x1="8" y1="21" x2="16" y2="21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  history: (
    <>
      <polyline points="1,4 1,10 7,10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.51 15a9 9 0 1 0 .49-4.95L1 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="12,7 12,12 16,14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  restore: (
    <>
      <polyline points="1,4 1,10 7,10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.51 15a9 9 0 1 0 .49-4.95L1 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  notifications_active: (
    <>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </>
  ),
  menu: (
    <>
      <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  pause: (
    <>
      <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" />
      <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" />
    </>
  ),
  play_arrow: (
    <polygon points="5,3 19,12 5,21" fill="currentColor" />
  ),
  memory: (
    <>
      <rect x="5" y="5" width="14" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <rect x="9" y="9" width="6" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <line x1="9" y1="2" x2="9" y2="5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="15" y1="2" x2="15" y2="5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="9" y1="19" x2="9" y2="22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="15" y1="19" x2="15" y2="22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="2" y1="9" x2="5" y2="9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="2" y1="15" x2="5" y2="15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="19" y1="9" x2="22" y2="9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="19" y1="15" x2="22" y2="15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  shopping_bag: (
    <>
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="1.8" />
      <path d="M16 10a4 4 0 0 1-8 0" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </>
  ),
};

export default function Icon({ name, size = 24, color = 'currentColor', style, className }: IconProps) {
  const paths = PATHS[name];

  if (!paths) {
    // Unknown icon — render nothing rather than show raw text
    return null;
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, color, ...style }}
      className={className}
      aria-hidden="true"
    >
      {paths}
    </svg>
  );
}
