// EdgeBubble.jsx
import React from 'react';

export default function EdgeBubble({ edgeBubble }) {
  if (!edgeBubble.visible || !edgeBubble.edge) return null;

  return (
    <div style={{ position: "fixed", left: edgeBubble.x, top: edgeBubble.y, zIndex: 60, transform: "translate(-50%, 0)" }}>
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
            minWidth: 80,
            maxWidth: 220,
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
            </div>
        </div>
      </div>
    </div>
  );
}
