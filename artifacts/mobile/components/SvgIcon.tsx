import React from "react";
import { ViewStyle } from "react-native";
import Svg, { Path, Circle, Line, Polyline, Rect, G, Polygon } from "react-native-svg";

interface Props {
  name: string;
  size?: number;
  color?: string;
  style?: ViewStyle;
}

export default function SvgIcon({ name, size = 24, color = "#fff", style }: Props) {
  const s = size;
  const p = { width: s, height: s, viewBox: "0 0 24 24", style };
  const sp = { stroke: color, strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  const sp2 = { stroke: color, strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };

  switch (name) {

    // ── Tab bar ────────────────────────────────────────────
    case "home":
      return <Svg {...p}><Path d="M3 9.5L12 3l9 6.5V21a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" fill={color}/><Path d="M9 22V12h6v10" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none"/></Svg>;
    case "home-outline":
      return <Svg {...p}><Path {...sp} d="M3 9.5L12 3l9 6.5V21a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/><Path {...sp} d="M9 22V12h6v10"/></Svg>;
    case "flash":
      return <Svg {...p}><Path d="M13 2L4.5 13.5H12L11 22l8.5-11.5H12.5L13 2z" fill={color}/></Svg>;
    case "flash-outline":
      return <Svg {...p}><Path {...sp} d="M13 2L4.5 13.5H12L11 22l8.5-11.5H12.5L13 2z"/></Svg>;
    case "bar-chart":
      return <Svg {...p}><Rect x="3" y="12" width="4" height="10" rx="1" fill={color}/><Rect x="10" y="7" width="4" height="15" rx="1" fill={color}/><Rect x="17" y="3" width="4" height="19" rx="1" fill={color}/></Svg>;
    case "bar-chart-outline":
      return <Svg {...p}><Rect {...sp} x="3" y="12" width="4" height="10" rx="1"/><Rect {...sp} x="10" y="7" width="4" height="15" rx="1"/><Rect {...sp} x="17" y="3" width="4" height="19" rx="1"/></Svg>;
    case "briefcase":
      return <Svg {...p}><Rect x="2" y="8" width="20" height="14" rx="2" fill={color}/><Path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" fill={color} stroke={color} strokeWidth={1.5} strokeLinejoin="round"/><Line x1="2" y1="14" x2="22" y2="14" stroke="#00000040" strokeWidth={1.5}/></Svg>;
    case "briefcase-outline":
      return <Svg {...p}><Rect {...sp} x="2" y="8" width="20" height="14" rx="2"/><Path {...sp} d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><Line {...sp} x1="2" y1="14" x2="22" y2="14"/></Svg>;
    case "time":
      return <Svg {...p}><Circle cx="12" cy="12" r="10" fill={color}/><Polyline points="12 6 12 12 16 14" stroke="#000000" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none"/></Svg>;
    case "time-outline":
      return <Svg {...p}><Circle {...sp} cx="12" cy="12" r="10"/><Polyline {...sp} points="12 6 12 12 16 14"/></Svg>;

    // ── Header / Profile ───────────────────────────────────
    case "search-outline":
      return <Svg {...p}><Circle {...sp} cx="11" cy="11" r="8"/><Line {...sp} x1="21" y1="21" x2="16.65" y2="16.65"/></Svg>;
    case "close-outline":
    case "close":
      return <Svg {...p}><Line {...sp} x1="18" y1="6" x2="6" y2="18"/><Line {...sp} x1="6" y1="6" x2="18" y2="18"/></Svg>;
    case "close-circle-outline":
      return <Svg {...p}><Circle {...sp} cx="12" cy="12" r="10"/><Line {...sp} x1="15" y1="9" x2="9" y2="15"/><Line {...sp} x1="9" y1="9" x2="15" y2="15"/></Svg>;
    case "notifications-outline":
      return <Svg {...p}><Path {...sp} d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><Path {...sp} d="M13.73 21a2 2 0 0 1-3.46 0"/></Svg>;
    case "person-outline":
      return <Svg {...p}><Path {...sp} d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><Circle {...sp} cx="12" cy="7" r="4"/></Svg>;
    case "moon-outline":
      return <Svg {...p}><Path {...sp} d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></Svg>;
    case "sunny-outline":
      return <Svg {...p}><Circle {...sp} cx="12" cy="12" r="5"/><Line {...sp} x1="12" y1="1" x2="12" y2="3"/><Line {...sp} x1="12" y1="21" x2="12" y2="23"/><Line {...sp} x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><Line {...sp} x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><Line {...sp} x1="1" y1="12" x2="3" y2="12"/><Line {...sp} x1="21" y1="12" x2="23" y2="12"/><Line {...sp} x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><Line {...sp} x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></Svg>;
    case "settings-outline":
      return <Svg {...p}><Circle {...sp} cx="12" cy="12" r="3"/><Path {...sp} d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></Svg>;
    case "share-social-outline":
      return <Svg {...p}><Circle {...sp} cx="18" cy="5" r="3"/><Circle {...sp} cx="6" cy="12" r="3"/><Circle {...sp} cx="18" cy="19" r="3"/><Line {...sp} x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><Line {...sp} x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></Svg>;
    case "chatbubble-outline":
      return <Svg {...p}><Path {...sp} d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></Svg>;
    case "log-out-outline":
      return <Svg {...p}><Path {...sp} d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><Polyline {...sp} points="16 17 21 12 16 7"/><Line {...sp} x1="21" y1="12" x2="9" y2="12"/></Svg>;
    case "chevron-forward-outline":
      return <Svg {...p}><Polyline {...sp} points="9 18 15 12 9 6"/></Svg>;
    case "chevron-back-outline":
      return <Svg {...p}><Polyline {...sp} points="15 18 9 12 15 6"/></Svg>;
    case "chevron-down-outline":
      return <Svg {...p}><Polyline {...sp} points="6 9 12 15 18 9"/></Svg>;
    case "chevron-up-outline":
      return <Svg {...p}><Polyline {...sp} points="18 15 12 9 6 15"/></Svg>;
    case "camera-outline":
      return <Svg {...p}><Path {...sp} d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><Circle {...sp} cx="12" cy="13" r="4"/></Svg>;
    case "send-outline":
      return <Svg {...p}><Line {...sp} x1="22" y1="2" x2="11" y2="13"/><Polygon points="22 2 15 22 11 13 2 9 22 2" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none"/></Svg>;
    case "lock-closed-outline":
      return <Svg {...p}><Rect {...sp} x="3" y="11" width="18" height="11" rx="2"/><Path {...sp} d="M7 11V7a5 5 0 0 1 10 0v4"/></Svg>;
    case "book-outline":
      return <Svg {...p}><Path {...sp} d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><Path {...sp} d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></Svg>;
    case "cloud-upload-outline":
      return <Svg {...p}><Polyline {...sp} points="16 16 12 12 8 16"/><Line {...sp} x1="12" y1="12" x2="12" y2="21"/><Path {...sp} d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></Svg>;
    case "help-circle-outline":
      return <Svg {...p}><Circle {...sp} cx="12" cy="12" r="10"/><Path {...sp} d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><Line {...sp} x1="12" y1="17" x2="12.01" y2="17" strokeWidth={2.5}/></Svg>;

    // ── Chart toolbar ──────────────────────────────────────
    case "add-outline":
    case "add":
      return <Svg {...p}><Line {...sp} x1="12" y1="5" x2="12" y2="19"/><Line {...sp} x1="5" y1="12" x2="19" y2="12"/></Svg>;
    case "remove-outline":
    case "remove":
      return <Svg {...p}><Line {...sp} x1="5" y1="12" x2="19" y2="12"/></Svg>;
    case "add-circle-outline":
      return <Svg {...p}><Circle {...sp} cx="12" cy="12" r="10"/><Line {...sp} x1="12" y1="8" x2="12" y2="16"/><Line {...sp} x1="8" y1="12" x2="16" y2="12"/></Svg>;
    case "remove-circle-outline":
      return <Svg {...p}><Circle {...sp} cx="12" cy="12" r="10"/><Line {...sp} x1="8" y1="12" x2="16" y2="12"/></Svg>;
    case "expand-outline":
      return <Svg {...p}><Path {...sp} d="M8 3H5a2 2 0 0 0-2 2v3"/><Path {...sp} d="M21 8V5a2 2 0 0 0-2-2h-3"/><Path {...sp} d="M3 16v3a2 2 0 0 0 2 2h3"/><Path {...sp} d="M16 21h3a2 2 0 0 0 2-2v-3"/></Svg>;
    case "contract-outline":
      return <Svg {...p}><Path {...sp} d="M8 3v3a2 2 0 0 1-2 2H3"/><Path {...sp} d="M21 8h-3a2 2 0 0 1-2-2V3"/><Path {...sp} d="M3 16h3a2 2 0 0 1 2 2v3"/><Path {...sp} d="M16 21v-3a2 2 0 0 1 2-2h3"/></Svg>;
    case "grid-outline":
      return <Svg {...p}><Rect {...sp} x="3" y="3" width="7" height="7"/><Rect {...sp} x="14" y="3" width="7" height="7"/><Rect {...sp} x="14" y="14" width="7" height="7"/><Rect {...sp} x="3" y="14" width="7" height="7"/></Svg>;
    case "options-outline":
      return <Svg {...p}><Line {...sp} x1="3" y1="6" x2="21" y2="6"/><Line {...sp} x1="3" y1="12" x2="21" y2="12"/><Line {...sp} x1="3" y1="18" x2="21" y2="18"/></Svg>;
    case "calendar-outline":
      return <Svg {...p}><Rect {...sp} x="3" y="4" width="18" height="18" rx="2"/><Line {...sp} x1="16" y1="2" x2="16" y2="6"/><Line {...sp} x1="8" y1="2" x2="8" y2="6"/><Line {...sp} x1="3" y1="10" x2="21" y2="10"/></Svg>;
    case "trash-outline":
      return <Svg {...p}><Polyline {...sp} points="3 6 5 6 21 6"/><Path {...sp} d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><Path {...sp} d="M10 11v6"/><Path {...sp} d="M14 11v6"/><Path {...sp} d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></Svg>;
    case "arrow-down-outline":
      return <Svg {...p}><Line {...sp} x1="12" y1="5" x2="12" y2="19"/><Polyline {...sp} points="19 12 12 19 5 12"/></Svg>;
    case "arrow-up-outline":
      return <Svg {...p}><Line {...sp} x1="12" y1="19" x2="12" y2="5"/><Polyline {...sp} points="5 12 12 5 19 12"/></Svg>;
    case "arrow-forward-outline":
      return <Svg {...p}><Line {...sp} x1="5" y1="12" x2="19" y2="12"/><Polyline {...sp} points="12 5 19 12 12 19"/></Svg>;
    case "arrow-back-outline":
      return <Svg {...p}><Line {...sp} x1="19" y1="12" x2="5" y2="12"/><Polyline {...sp} points="12 19 5 12 12 5"/></Svg>;

    // ── Drawing tool sidebar icons ──────────────────────────
    case "locate-outline":
      return <Svg {...p}><Circle {...sp} cx="12" cy="12" r="3"/><Line {...sp} x1="12" y1="1" x2="12" y2="5"/><Line {...sp} x1="12" y1="19" x2="12" y2="23"/><Line {...sp} x1="1" y1="12" x2="5" y2="12"/><Line {...sp} x1="19" y1="12" x2="23" y2="12"/></Svg>;
    case "trending-up-outline":
      return <Svg {...p}><Polyline {...sp} points="23 6 13.5 15.5 8.5 10.5 1 18"/><Polyline {...sp} points="17 6 23 6 23 12"/></Svg>;
    case "git-merge-outline":
      return <Svg {...p}><Circle {...sp} cx="18" cy="18" r="3"/><Circle {...sp} cx="6" cy="6" r="3"/><Path {...sp} d="M6 21V9a9 9 0 0 0 9 9"/></Svg>;
    case "git-branch-outline":
      return <Svg {...p}><Line {...sp} x1="6" y1="3" x2="6" y2="15"/><Circle {...sp} cx="18" cy="6" r="3"/><Circle {...sp} cx="6" cy="18" r="3"/><Path {...sp} d="M18 9a9 9 0 0 1-9 9"/></Svg>;
    case "pulse-outline":
      return <Svg {...p}><Polyline {...sp} points="22 12 18 12 15 21 9 3 6 12 2 12"/></Svg>;
    case "pencil-outline":
      return <Svg {...p}><Path {...sp} d="M12 20h9"/><Path {...sp} d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></Svg>;
    case "text-outline":
      return <Svg {...p}><Polyline {...sp} points="4 7 4 4 20 4 20 7"/><Line {...sp} x1="9" y1="20" x2="15" y2="20"/><Line {...sp} x1="12" y1="4" x2="12" y2="20"/></Svg>;
    case "happy-outline":
      return <Svg {...p}><Circle {...sp} cx="12" cy="12" r="10"/><Path {...sp} d="M8 13s1.5 2 4 2 4-2 4-2"/><Line {...sp} x1="9" y1="9" x2="9.01" y2="9" strokeWidth={2.5}/><Line {...sp} x1="15" y1="9" x2="15.01" y2="9" strokeWidth={2.5}/></Svg>;
    case "construct-outline":
      return <Svg {...p}><Path {...sp} d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L3 14.67V21h6.33l10.06-10.06a5.5 5.5 0 0 0 0-7.78z"/><Line {...sp} x1="15.5" y1="7" x2="17" y2="8.5"/></Svg>;
    case "magnet-outline":
      return <Svg {...p}><Path {...sp} d="M6 15A6 6 0 1 0 18 15"/><Line {...sp} x1="6" y1="15" x2="6" y2="20"/><Line {...sp} x1="18" y1="15" x2="18" y2="20"/><Line {...sp} x1="3" y1="20" x2="9" y2="20"/><Line {...sp} x1="15" y1="20" x2="21" y2="20"/></Svg>;
    case "eye-outline":
      return <Svg {...p}><Path {...sp} d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><Circle {...sp} cx="12" cy="12" r="3"/></Svg>;
    case "eye-off-outline":
      return <Svg {...p}><Path {...sp} d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><Path {...sp} d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><Line {...sp} x1="1" y1="1" x2="23" y2="23"/></Svg>;
    case "lock-open-outline":
      return <Svg {...p}><Rect {...sp} x="3" y="11" width="18" height="11" rx="2"/><Path {...sp} d="M7 11V7a5 5 0 0 1 9.9-1"/></Svg>;
    case "create-outline":
      return <Svg {...p}><Path {...sp} d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><Path {...sp} d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></Svg>;
    case "hand-right-outline":
      return <Svg {...p}><Path {...sp} d="M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2"/><Path {...sp} d="M14 10V4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v2"/><Path {...sp} d="M10 10.5V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8"/><Path {...sp} d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></Svg>;
    case "ellipsis-vertical-outline":
      return <Svg {...p}><Circle cx="12" cy="5" r="1.5" fill={color}/><Circle cx="12" cy="12" r="1.5" fill={color}/><Circle cx="12" cy="19" r="1.5" fill={color}/></Svg>;
    case "reorder-three-outline":
      return <Svg {...p}><Line {...sp} x1="3" y1="9" x2="21" y2="9"/><Line {...sp} x1="3" y1="12" x2="21" y2="12"/><Line {...sp} x1="3" y1="15" x2="21" y2="15"/></Svg>;
    case "reorder-four-outline":
      return <Svg {...p}><Line {...sp} x1="3" y1="8" x2="21" y2="8"/><Line {...sp} x1="3" y1="11" x2="21" y2="11"/><Line {...sp} x1="3" y1="14" x2="21" y2="14"/><Line {...sp} x1="3" y1="17" x2="21" y2="17"/></Svg>;
    case "layers-outline":
      return <Svg {...p}><Polygon {...sp} points="12 2 2 7 12 12 22 7 12 2"/><Polyline {...sp} points="2 17 12 22 22 17"/><Polyline {...sp} points="2 12 12 17 22 12"/></Svg>;
    case "triangle-outline":
      return <Svg {...p}><Path {...sp} d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></Svg>;
    case "radio-outline":
      return <Svg {...p}><Circle {...sp} cx="12" cy="12" r="2"/><Path {...sp} d="M4.93 4.93a10 10 0 0 0 0 14.14"/><Path {...sp} d="M19.07 4.93a10 10 0 0 1 0 14.14"/><Path {...sp} d="M7.76 7.76a6 6 0 0 0 0 8.48"/><Path {...sp} d="M16.24 7.76a6 6 0 0 1 0 8.48"/></Svg>;
    case "calculator-outline":
      return <Svg {...p}><Rect {...sp} x="4" y="2" width="16" height="20" rx="2"/><Line {...sp} x1="8" y1="8" x2="16" y2="8"/><Line {...sp} x1="8" y1="12" x2="8.01" y2="12" strokeWidth={2.5}/><Line {...sp} x1="12" y1="12" x2="12.01" y2="12" strokeWidth={2.5}/><Line {...sp} x1="16" y1="12" x2="16.01" y2="12" strokeWidth={2.5}/><Line {...sp} x1="8" y1="16" x2="8.01" y2="16" strokeWidth={2.5}/><Line {...sp} x1="12" y1="16" x2="12.01" y2="16" strokeWidth={2.5}/><Line {...sp} x1="16" y1="16" x2="16.01" y2="16" strokeWidth={2.5}/></Svg>;
    case "leaf-outline":
      return <Svg {...p}><Path {...sp} d="M17 8C8 10 5.9 16.17 3.82 19.98"/><Path {...sp} d="M21 3a16 16 0 0 1-5 10.55A12 12 0 0 1 3 18.07"/></Svg>;
    case "git-commit-outline":
      return <Svg {...p}><Circle {...sp} cx="12" cy="12" r="4"/><Line {...sp} x1="1.05" y1="12" x2="7" y2="12"/><Line {...sp} x1="17.01" y1="12" x2="22.96" y2="12"/></Svg>;
    case "document-text-outline":
      return <Svg {...p}><Path {...sp} d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><Polyline {...sp} points="14 2 14 8 20 8"/><Line {...sp} x1="16" y1="13" x2="8" y2="13"/><Line {...sp} x1="16" y1="17" x2="8" y2="17"/><Polyline {...sp} points="10 9 9 9 8 9"/></Svg>;
    case "pricetag-outline":
      return <Svg {...p}><Path {...sp} d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><Line {...sp} x1="7" y1="7" x2="7.01" y2="7" strokeWidth={2.5}/></Svg>;
    case "star-outline":
      return <Svg {...p}><Polygon {...sp} points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></Svg>;
    case "flag-outline":
      return <Svg {...p}><Path {...sp} d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><Line {...sp} x1="4" y1="22" x2="4" y2="15"/></Svg>;
    case "trophy-outline":
      return <Svg {...p}><Path {...sp} d="M6 9H3l1.5-6h15L21 9h-3"/><Path {...sp} d="M6 9a6 6 0 0 0 12 0"/><Line {...sp} x1="12" y1="15" x2="12" y2="19"/><Path {...sp} d="M8 19h8"/></Svg>;

    // ── People / User management ────────────────────────────────────────────
    case "people-outline":
    case "users":
      return <Svg {...p}><Path {...sp} d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><Circle {...sp} cx="9" cy="7" r="4"/><Path {...sp} d="M23 21v-2a4 4 0 0 0-3-3.87"/><Path {...sp} d="M16 3.13a4 4 0 0 1 0 7.75"/></Svg>;
    case "person-add-outline":
      return <Svg {...p}><Path {...sp} d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><Circle {...sp} cx="9" cy="7" r="4"/><Line {...sp} x1="19" y1="8" x2="19" y2="14"/><Line {...sp} x1="22" y1="11" x2="16" y2="11"/></Svg>;
    case "person-remove-outline":
      return <Svg {...p}><Path {...sp} d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><Circle {...sp} cx="9" cy="7" r="4"/><Line {...sp} x1="22" y1="11" x2="16" y2="11"/></Svg>;

    // ── Status / Alerts ─────────────────────────────────────────────────────
    case "alert-circle-outline":
      return <Svg {...p}><Circle {...sp} cx="12" cy="12" r="10"/><Line {...sp} x1="12" y1="8" x2="12" y2="12"/><Line {...sp} x1="12" y1="16" x2="12.01" y2="16" strokeWidth={2.5}/></Svg>;
    case "information-circle-outline":
      return <Svg {...p}><Circle {...sp} cx="12" cy="12" r="10"/><Line {...sp} x1="12" y1="16" x2="12" y2="12"/><Line {...sp} x1="12" y1="8" x2="12.01" y2="8" strokeWidth={2.5}/></Svg>;
    case "warning-outline":
      return <Svg {...p}><Path {...sp} d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><Line {...sp} x1="12" y1="9" x2="12" y2="13"/><Line {...sp} x1="12" y1="17" x2="12.01" y2="17" strokeWidth={2.5}/></Svg>;
    case "checkmark-outline":
    case "checkmark":
      return <Svg {...p}><Polyline {...sp} points="20 6 9 17 4 12"/></Svg>;
    case "checkmark-circle-outline":
      return <Svg {...p}><Path {...sp} d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><Polyline {...sp} points="22 4 12 14.01 9 11.01"/></Svg>;
    case "notifications-off-outline":
      return <Svg {...p}><Path {...sp} d="M13.73 21a2 2 0 0 1-3.46 0"/><Path {...sp} d="M18.63 13A17.89 17.89 0 0 1 18 8"/><Path {...sp} d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14"/><Path {...sp} d="M18 8a6 6 0 0 0-9.33-5"/><Line {...sp} x1="1" y1="1" x2="23" y2="23"/></Svg>;
    case "shield-outline":
      return <Svg {...p}><Path {...sp} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></Svg>;

    // ── Extra Actions ───────────────────────────────────────────────────────
    case "refresh-outline":
      return <Svg {...p}><Polyline {...sp} points="23 4 23 10 17 10"/><Polyline {...sp} points="1 20 1 14 7 14"/><Path {...sp} d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></Svg>;
    case "file-tray-outline":
      return <Svg {...p}><Path {...sp} d="M22 12h-6l-2 3H10l-2-3H2"/><Path {...sp} d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></Svg>;
    case "activity":
      return <Svg {...p}><Polyline {...sp} points="22 12 18 12 15 21 9 3 6 12 2 12"/></Svg>;
    case "layers":
      return <Svg {...p}><Polygon {...sp} points="12 2 2 7 12 12 22 7 12 2"/><Polyline {...sp} points="2 17 12 22 22 17"/><Polyline {...sp} points="2 12 12 17 22 12"/></Svg>;

    // ── Default fallback ────────────────────────────────────
    default:
      return (
        <Svg {...p}>
          <Circle {...sp} cx="12" cy="12" r="9"/>
          <Line {...sp} x1="12" y1="8" x2="12" y2="12"/>
          <Line {...sp} x1="12" y1="16" x2="12.01" y2="16" strokeWidth={2.5}/>
        </Svg>
      );
  }
}
