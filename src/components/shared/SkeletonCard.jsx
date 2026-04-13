import React from "react";

export default function SkeletonCard({ rows = 3 }) {
  return (
    <div className="glass rounded-xl p-5 animate-pulse">
      <div className="h-4 bg-secondary/60 rounded w-2/3 mb-4" />
      {Array(rows).fill(0).map((_, i) => (
        <div key={i} className={`h-3 bg-secondary/40 rounded mb-2 ${i % 2 === 0 ? "w-full" : "w-4/5"}`} />
      ))}
    </div>
  );
}