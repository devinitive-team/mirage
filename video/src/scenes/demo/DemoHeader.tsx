import React from "react";
import { COLORS } from "../../lib/constants";
import { MirageLogo } from "../../components/MirageLogo";

export const DemoHeader: React.FC = () => {
  return (
    <div
      style={{
        height: 48,
        display: "flex",
        alignItems: "center",
        padding: "0 20px",
        borderBottom: `1px solid ${COLORS.line}`,
        background: COLORS.headerBg,
        gap: 24,
        flexShrink: 0,
      }}
    >
      <MirageLogo size={24} color={COLORS.seaInk} />
      <span style={{ fontSize: 14, color: COLORS.seaInk, fontWeight: 700 }}>
        Mirage
      </span>
      <div style={{ flex: 1 }} />
      {["Sources", "Query", "Settings"].map((item) => (
        <span key={item} style={{ fontSize: 13, color: COLORS.seaInkSoft }}>
          {item}
        </span>
      ))}
    </div>
  );
};
