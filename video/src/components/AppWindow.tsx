import React from "react";
import { COLORS } from "../lib/constants";

interface AppWindowProps {
  children: React.ReactNode;
  title?: string;
}

export const AppWindow: React.FC<AppWindowProps> = ({ children, title }) => {
  return (
    <div
      style={{
        border: `1px solid ${COLORS.line}`,
        background: COLORS.foam,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        width: "100%",
        height: "100%",
      }}
    >
      <div
        style={{
          height: 32,
          display: "flex",
          alignItems: "center",
          paddingLeft: 12,
          gap: 6,
          borderBottom: `1px solid ${COLORS.line}`,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 10,
            height: 10,
            background: "rgba(255,255,255,0.15)",
          }}
        />
        <div
          style={{
            width: 10,
            height: 10,
            background: "rgba(255,255,255,0.15)",
          }}
        />
        <div
          style={{
            width: 10,
            height: 10,
            background: "rgba(255,255,255,0.15)",
          }}
        />
        {title && (
          <span
            style={{ marginLeft: 8, color: COLORS.seaInkSoft, fontSize: 12 }}
          >
            {title}
          </span>
        )}
      </div>
      <div style={{ flex: 1, overflow: "hidden" }}>{children}</div>
    </div>
  );
};
