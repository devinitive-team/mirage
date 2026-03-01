import React from "react";

interface MirageLogoProps {
  size?: number;
  color?: string;
}

export const MirageLogo: React.FC<MirageLogoProps> = ({
  size = 32,
  color = "#f5f5f5",
}) => {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
      <path d="M5 24.5L9.1 8h3.8L8.8 24.5H5Z" fill={color} />
      <path d="M12.2 24.5L16 11.5h3.7L16 24.5h-3.8Z" fill={color} />
      <path d="M19.6 24.5L23.7 8H27l-4 16.5h-3.4Z" fill={color} />
    </svg>
  );
};
