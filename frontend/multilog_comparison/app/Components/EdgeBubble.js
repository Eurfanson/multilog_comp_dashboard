// EdgeBubble.jsx
'use client';
import React from 'react';

export default function EdgeBubble({ edgeBubble, edge_stats }) {
  // Hide bubble if not visible or edge data missing
  if (!edgeBubble.visible || !edgeBubble.edge) return null;

  const edgeKey = `${edgeBubble.fromNode}->${edgeBubble.toNode}`;
  const stats = edge_stats?.[edgeKey];

  // Scroll to table row when bubble is clicked
  const handleClick = () => {
    const el = document.getElementById(`edge-row-${edgeKey}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.style.background = "#fffa90"; // highlight
      setTimeout(() => { el.style.background = ""; }, 1500);
    }
  };

  return (
    <div
      onClick={handleClick}
      style={{
        position: "fixed",
        left: edgeBubble.x,
        top: edgeBubble.y,
        zIndex: 60,
        transform: "translate(-50%, 0)",
        cursor: "pointer",
      }}
    >
      <div style={{ position: "relative", display: "inline-block" }}>
        {/* Triangle pointer */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: -10,
            transform: "translateX(-50%)",
            width: 0,
            height: 0,
            borderLeft: "8px solid transparent",
            borderRight: "8px solid transparent",
            borderBottom: "10px solid #fff",
            zIndex: 61,
          }}
        />

        {/* Bubble container */}
        <div
          style={{
            minWidth: 200,
            maxWidth: 320,
            background: "#fff",
            borderRadius: 12,
            boxShadow: "0 12px 28px rgba(0,0,0,0.18)",
            padding: "12px 16px",
            fontSize: 13,
            color: "#222",
          }}
        >
          {/* Header */}
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Edge Info</div>

          {/* Edge basic info table */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, auto)",
              gap: 6,
              marginBottom: 8,
            }}
          >
            <div style={{ fontWeight: 600 }}>From:</div>
            <div>{edgeBubble.fromNode}</div>
            <div style={{ fontWeight: 600 }}>To:</div>
            <div>{edgeBubble.toNode}</div>
            <div style={{ fontWeight: 600 }}>Frequency:</div>
            <div>{edgeBubble.frequency}</div>
          </div>

          {/* Statistical info table */}
          {stats ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, auto)",
                gap: 8,
                fontSize: 12,
                textAlign: "left",
              }}
            >
              <div style={{ fontWeight: 600 }}>Test</div>
              <div style={{ fontWeight: 600 }}>Stat</div>
              <div style={{ fontWeight: 600 }}>Effect</div>
              <div style={{ fontWeight: 600 }}>p-value</div>

              <div>{stats.test ?? "-"}</div>
              <div>{typeof stats.stat === "number" ? stats.stat.toFixed(3) : "-"}</div>
              <div>{typeof stats.effect_size === "number" ? stats.effect_size.toFixed(3) : "-"}</div>
              <div style={{ color: (stats.p_value ?? 1) < 0.05 ? "#ff4d4d" : "#222", fontWeight: 700 }}>
                {typeof stats.p_value === "number" ? stats.p_value.toFixed(4) : "-"}
              </div>
            </div>
          ) : (
            <div style={{ color: "#666", fontSize: 12, marginTop: 4 }}>No stats available</div>
          )}
        </div>
      </div>
    </div>
  );
}
