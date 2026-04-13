import React from "react";

export default function GlassCard({ children, className = "", glow = false, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`glass rounded-xl p-4 md:p-5 transition-all duration-300 ${
        glow ? "glow-green-sm hover:glow-green" : "hover:border-primary/20"
      } ${onClick ? "cursor-pointer" : ""} ${className}`}
    >
      {children}
    </div>
  );
}