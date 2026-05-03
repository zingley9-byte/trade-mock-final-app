import React from "react";
import Svg, { Path, Circle, Line, Polyline, Rect, G } from "react-native-svg";

type IconName =
  | "home" | "home-outline"
  | "flash" | "flash-outline"
  | "bar-chart" | "bar-chart-outline"
  | "briefcase" | "briefcase-outline"
  | "time" | "time-outline"
  | "search-outline"
  | "close-outline"
  | "notifications-outline"
  | "person-outline"
  | "moon-outline"
  | "sunny-outline"
  | "settings-outline"
  | "share-social-outline"
  | "chatbubble-outline"
  | "log-out-outline"
  | "chevron-forward-outline"
  | "camera-outline"
  | "send-outline"
  | "bar-chart-outline"
  | "lock-closed-outline"
  | "options-outline"
  | "book-outline"
  | "cloud-upload-outline"
  | "help-circle-outline";

interface Props {
  name: IconName | string;
  size?: number;
  color?: string;
}

export default function SvgIcon({ name, size = 24, color = "#fff" }: Props) {
  const s = size;
  const props = { width: s, height: s, viewBox: "0 0 24 24" };
  const sp = { stroke: color, strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };

  switch (name) {
    case "home":
      return (
        <Svg {...props}>
          <Path d="M3 9.5L12 3l9 6.5V21a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" fill={color} />
          <Path d="M9 22V12h6v10" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </Svg>
      );
    case "home-outline":
      return (
        <Svg {...props}>
          <Path {...sp} d="M3 9.5L12 3l9 6.5V21a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
          <Path {...sp} d="M9 22V12h6v10" />
        </Svg>
      );
    case "flash":
      return (
        <Svg {...props}>
          <Path d="M13 2L4.5 13.5H12L11 22l8.5-11.5H12.5L13 2z" fill={color} />
        </Svg>
      );
    case "flash-outline":
      return (
        <Svg {...props}>
          <Path {...sp} d="M13 2L4.5 13.5H12L11 22l8.5-11.5H12.5L13 2z" />
        </Svg>
      );
    case "bar-chart":
      return (
        <Svg {...props}>
          <Rect x="3" y="12" width="4" height="10" rx="1" fill={color} />
          <Rect x="10" y="7" width="4" height="15" rx="1" fill={color} />
          <Rect x="17" y="3" width="4" height="19" rx="1" fill={color} />
        </Svg>
      );
    case "bar-chart-outline":
      return (
        <Svg {...props}>
          <Rect {...sp} x="3" y="12" width="4" height="10" rx="1" />
          <Rect {...sp} x="10" y="7" width="4" height="15" rx="1" />
          <Rect {...sp} x="17" y="3" width="4" height="19" rx="1" />
        </Svg>
      );
    case "briefcase":
      return (
        <Svg {...props}>
          <Rect x="2" y="8" width="20" height="14" rx="2" fill={color} />
          <Path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" fill={color} stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
          <Line x1="2" y1="14" x2="22" y2="14" stroke="#00000040" strokeWidth={1.5} />
        </Svg>
      );
    case "briefcase-outline":
      return (
        <Svg {...props}>
          <Rect {...sp} x="2" y="8" width="20" height="14" rx="2" />
          <Path {...sp} d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <Line {...sp} x1="2" y1="14" x2="22" y2="14" />
        </Svg>
      );
    case "time":
      return (
        <Svg {...props}>
          <Circle cx="12" cy="12" r="10" fill={color} />
          <Polyline points="12 6 12 12 16 14" stroke="#000000" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </Svg>
      );
    case "time-outline":
      return (
        <Svg {...props}>
          <Circle {...sp} cx="12" cy="12" r="10" />
          <Polyline {...sp} points="12 6 12 12 16 14" />
        </Svg>
      );
    case "search-outline":
      return (
        <Svg {...props}>
          <Circle {...sp} cx="11" cy="11" r="8" />
          <Line {...sp} x1="21" y1="21" x2="16.65" y2="16.65" />
        </Svg>
      );
    case "close-outline":
      return (
        <Svg {...props}>
          <Line {...sp} x1="18" y1="6" x2="6" y2="18" />
          <Line {...sp} x1="6" y1="6" x2="18" y2="18" />
        </Svg>
      );
    case "notifications-outline":
      return (
        <Svg {...props}>
          <Path {...sp} d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <Path {...sp} d="M13.73 21a2 2 0 0 1-3.46 0" />
        </Svg>
      );
    case "person-outline":
      return (
        <Svg {...props}>
          <Path {...sp} d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <Circle {...sp} cx="12" cy="7" r="4" />
        </Svg>
      );
    case "moon-outline":
      return (
        <Svg {...props}>
          <Path {...sp} d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </Svg>
      );
    case "sunny-outline":
      return (
        <Svg {...props}>
          <Circle {...sp} cx="12" cy="12" r="5" />
          <Line {...sp} x1="12" y1="1" x2="12" y2="3" />
          <Line {...sp} x1="12" y1="21" x2="12" y2="23" />
          <Line {...sp} x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <Line {...sp} x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <Line {...sp} x1="1" y1="12" x2="3" y2="12" />
          <Line {...sp} x1="21" y1="12" x2="23" y2="12" />
          <Line {...sp} x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <Line {...sp} x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </Svg>
      );
    case "settings-outline":
      return (
        <Svg {...props}>
          <Circle {...sp} cx="12" cy="12" r="3" />
          <Path {...sp} d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </Svg>
      );
    case "share-social-outline":
      return (
        <Svg {...props}>
          <Circle {...sp} cx="18" cy="5" r="3" />
          <Circle {...sp} cx="6" cy="12" r="3" />
          <Circle {...sp} cx="18" cy="19" r="3" />
          <Line {...sp} x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <Line {...sp} x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </Svg>
      );
    case "chatbubble-outline":
      return (
        <Svg {...props}>
          <Path {...sp} d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </Svg>
      );
    case "log-out-outline":
      return (
        <Svg {...props}>
          <Path {...sp} d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <Polyline {...sp} points="16 17 21 12 16 7" />
          <Line {...sp} x1="21" y1="12" x2="9" y2="12" />
        </Svg>
      );
    case "chevron-forward-outline":
      return (
        <Svg {...props}>
          <Polyline {...sp} points="9 18 15 12 9 6" />
        </Svg>
      );
    case "camera-outline":
      return (
        <Svg {...props}>
          <Path {...sp} d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <Circle {...sp} cx="12" cy="13" r="4" />
        </Svg>
      );
    case "send-outline":
      return (
        <Svg {...props}>
          <Line {...sp} x1="22" y1="2" x2="11" y2="13" />
          <Polygon points="22 2 15 22 11 13 2 9 22 2" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </Svg>
      );
    case "lock-closed-outline":
      return (
        <Svg {...props}>
          <Rect {...sp} x="3" y="11" width="18" height="11" rx="2" />
          <Path {...sp} d="M7 11V7a5 5 0 0 1 10 0v4" />
        </Svg>
      );
    case "options-outline":
      return (
        <Svg {...props}>
          <Line {...sp} x1="3" y1="6" x2="21" y2="6" />
          <Line {...sp} x1="3" y1="12" x2="21" y2="12" />
          <Line {...sp} x1="3" y1="18" x2="21" y2="18" />
        </Svg>
      );
    case "book-outline":
      return (
        <Svg {...props}>
          <Path {...sp} d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <Path {...sp} d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </Svg>
      );
    case "cloud-upload-outline":
      return (
        <Svg {...props}>
          <Polyline {...sp} points="16 16 12 12 8 16" />
          <Line {...sp} x1="12" y1="12" x2="12" y2="21" />
          <Path {...sp} d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
        </Svg>
      );
    case "help-circle-outline":
      return (
        <Svg {...props}>
          <Circle {...sp} cx="12" cy="12" r="10" />
          <Path {...sp} d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <Line {...sp} x1="12" y1="17" x2="12.01" y2="17" strokeWidth={2.5} />
        </Svg>
      );
    default:
      return (
        <Svg {...props}>
          <Circle {...sp} cx="12" cy="12" r="9" />
          <Line {...sp} x1="12" y1="8" x2="12" y2="12" />
          <Line {...sp} x1="12" y1="16" x2="12.01" y2="16" strokeWidth={2.5} />
        </Svg>
      );
  }
}
