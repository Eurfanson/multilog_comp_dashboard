// EdgeBubble.jsx
'use client'
import React from 'react';

export default function EdgeBubble({ edgeBubble, edge_stats }) {
  if (!edgeBubble.visible || !edgeBubble.edge) return null;

  const edgeKey = `${edgeBubble.fromNode}->${edgeBubble.toNode}`;
  const stats = edge_stats?.[edgeKey];

  const handleClick = () => {
    const el = document.getElementById(`edge-row-${edgeKey}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.style.background = "#fffa90";
      setTimeout(() => { el.style.background = ""; }, 1500);
    }
  };

  return (
    <div
      onClick={handleClick}
      style={{ position: "fixed", left: edgeBubble.x, top: edgeBubble.y, zIndex: 60, transform: "translate(-50%, 0)", cursor: "pointer" }}
    >
      <div style={{ position: "relative", display: "inline-block" }}>
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: -8,
            transform: "translateX(-50%)",
            width: 0,
            height: 0,
            borderLeft: "7px solid transparent",
            borderRight: "7px solid transparent",
            borderBottom: "8px solid #efefef",
            zIndex: 61,
          }}
        />
        <div
          style={{
            minWidth: 120,
            maxWidth: 240,
            background: "#efefef",
            borderRadius: 8,
            boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
            padding: "6px 10px",
            fontSize: 13,
            textAlign: "center",
          }}
        >
          <div style={{ color: "#333", fontWeight: 700 }}>
            <div>{`From: ${edgeBubble.fromNode}`}</div>
            <div>{`To: ${edgeBubble.toNode}`}</div>
            <div>{`Frequency: ${edgeBubble.frequency}`}</div>
            {stats && (
              <>
                <div>{`Test: ${stats.test ?? "-"}`}</div>
                {stats.stat !== undefined && <div>{`Stat: ${stats.stat?.toFixed(3) ?? "-"}`}</div>}
                {stats.effect_size !== undefined && <div>{`Effect: ${stats.effect_size?.toFixed(3) ?? "-"}`}</div>}
                {stats.p_value !== undefined && <div>{`p-value: ${stats.p_value?.toFixed(4) ?? "-"}`}</div>}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
