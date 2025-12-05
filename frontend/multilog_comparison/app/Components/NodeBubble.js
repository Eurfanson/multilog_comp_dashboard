import React from 'react';

const NodeBubble = ({ nodeBubble, significance }) => {
  if (!nodeBubble.visible || !nodeBubble.node || nodeBubble.logName !== "merged") {
    return null;
  }

  return (
    <div style={{ position: "fixed", left: nodeBubble.x, top: nodeBubble.y, zIndex: 60, transform: "translate(-50%, 0)" }}>
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
            minWidth: 200,
            maxWidth: 360,
            background: "#efefef",
            borderRadius: 8,
            boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
            padding: "8px 12px",
            fontSize: 13,
          }}
        >
          <div style={{ fontWeight: 700, color: "#000", marginBottom: 6 }}>
            {nodeBubble.node}
          </div>

          {nodeBubble.stats ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, auto)",
                gap: 8,
                alignItems: "center",
                fontSize: 12,
              }}
            >
              <div style={{ fontWeight: 700, color: "#000" }}>Test</div>
              <div style={{ fontWeight: 700, color: "#000" }}>Test Statistic</div>
              <div style={{ fontWeight: 700, color: "#000" }}>p-value</div>
              <div style={{ fontWeight: 700, color: "#000" }}>Effect Size</div>

              <div style={{ gridColumn: "1 / 2", color: "#000" }}>
                {nodeBubble.stats.test ?? "-"}
              </div>
              <div style={{ gridColumn: "2 / 3", color: "#000" }}>
                {typeof nodeBubble.stats.stat === "number"
                  ? nodeBubble.stats.stat.toFixed(3)
                  : "-"}
              </div>
              <div
                style={{
                  gridColumn: "3 / 4",
                  color: (nodeBubble.stats.p_value ?? 1) < significance ? "#ff4d4d" : "#000",
                  fontWeight: 700,
                }}
              >
                {typeof nodeBubble.stats.p_value === "number"
                  ? nodeBubble.stats.p_value.toFixed(4)
                  : "-"}
              </div>
              <div style={{ gridColumn: "4 / 5", color: "#000" }}>
                {typeof nodeBubble.stats.effect_size === "number"
                  ? nodeBubble.stats.effect_size.toFixed(3)
                  : "-"}
              </div>

              <div style={{ gridColumn: "1 / 5", marginTop: 8, fontSize: 12, color: "#111" }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Post-hoc</div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#333",
                    whiteSpace: "pre-wrap",
                    maxHeight: 120,
                    overflow: "auto",
                  }}
                >
                  {nodeBubble.stats.posthoc
                    ? typeof nodeBubble.stats.posthoc === "string"
                      ? nodeBubble.stats.posthoc
                      : JSON.stringify(nodeBubble.stats.posthoc, null, 2)
                    : "-"}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ color: "#666", fontSize: 12 }}>No stats available</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NodeBubble;
