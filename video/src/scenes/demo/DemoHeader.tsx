import React from "react";
import { COLORS } from "../../lib/constants";
import { MirageLogo } from "../../components/MirageLogo";

export const DemoHeader: React.FC = () => {
  return (
    <div
      style={{
        height: 52,
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
        borderBottom: `1px solid ${COLORS.line}`,
        background: COLORS.headerBg,
        gap: 8,
        flexShrink: 0,
      }}
    >
      <MirageLogo size={28} color={COLORS.seaInk} />
      <span
        style={{
          fontSize: 16,
          color: COLORS.seaInk,
          fontWeight: 700,
          marginRight: 16,
        }}
      >
        Mirage
      </span>
      <span style={{ fontSize: 14, color: COLORS.seaInk, fontWeight: 500 }}>
        Dashboard
      </span>
      <span
        style={{ fontSize: 14, color: COLORS.seaInkSoft, marginLeft: 12 }}
      >
        History
      </span>
      <div style={{ flex: 1 }} />
      {/* Theme toggle */}
      <div style={{ display: "flex", border: `1px solid ${COLORS.line}` }}>
        <div
          style={{
            padding: "5px 12px",
            fontSize: 11,
            color: COLORS.seaInkSoft,
          }}
        >
          Light
        </div>
        <div
          style={{
            padding: "5px 12px",
            fontSize: 11,
            color: COLORS.seaInk,
            background: COLORS.insetGlint,
            borderLeft: `1px solid ${COLORS.line}`,
            borderRight: `1px solid ${COLORS.line}`,
          }}
        >
          Dark
        </div>
        <div
          style={{
            padding: "5px 12px",
            fontSize: 11,
            color: COLORS.seaInkSoft,
          }}
        >
          Auto
        </div>
      </div>
    </div>
  );
};
