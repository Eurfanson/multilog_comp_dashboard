'use client';
import React from 'react';

export default function EdgeBubble({ edgeBubble, edge_stats, dfg, metrics, significance }) {
  if (!edgeBubble.visible || !edgeBubble.edge) return null;

  const { fromNode, toNode, frequency, logName } = edgeBubble;
  const edgeKey = `${fromNode}->${toNode}`;

  const freqStats = edge_stats?.[edgeKey]; // original frequency stats

  // === New: Transition time data (only when in elapsed mode) ===
  let avgTimeLabel = "";
  let perLogTimes = [];
  let timePValue = undefined;
  let timeSignificant = false;

  if (metrics === "elapsed" && dfg) {
    const timeLists = dfg.edge_time_data?.[edgeKey] || [];
    const timeStats = dfg.stats_edge_time?.[edgeKey] || {};

    const allTimes = timeLists.flat().filter(t => t > 0);
    if (allTimes.length > 0) {
      const avgSeconds = allTimes.reduce((a, b) => a + b, 0) / allTimes.length;
      if (avgSeconds >= 86400) {
        avgTimeLabel = `${(avgSeconds / 86400).toFixed(1)} days`;
      } else if (avgSeconds >= 3600) {
        avgTimeLabel = `${(avgSeconds / 3600).toFixed(1)} hours`;
      } else if (avgSeconds >= 60) {
        avgTimeLabel = `${Math.round(avgSeconds / 60)} minutes`;
      } else {
        avgTimeLabel = `${Math.round(avgSeconds)} seconds`;
      }
    } else {
      avgTimeLabel = "No data";
    }

    // Per-log average times
    perLogTimes = timeLists.map((list, i) => {
      if (list.length === 0) return { log: dfg.log_names[i], time: "No data" };
      const avg = list.reduce((a, b) => a + b, 0) / list.length;
      let label = "";
      if (avg >= 86400) label = `${(avg / 86400).toFixed(1)}d`;
      else if (avg >= 3600) label = `${(avg / 3600).toFixed(1)}h`;
      else if (avg >= 60) label = `${Math.round(avg / 60)}m`;
      else label = `${Math.round(avg)}s`;
      return { log: dfg.log_names[i], time: label };
    });

    timePValue = timeStats.p_value;
    timeSignificant = timePValue !== undefined && timePValue < significance;
  }

  const handleClick = () => {
    const el = document.getElementById(`edge-row-${edgeKey}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.style.background = "#fffa90";
      setTimeout(() => { el.style.background = ""; }, 1500);
    }
  };

  return (
    <div onClick={handleClick} style={{
      position: "fixed",
      left: edgeBubble.x,
      top: edgeBubble.y,
      zIndex: 60,
      transform: "translate(-50%, 0)",
      cursor: "pointer",
    }}>
      <div style={{ position: "relative", display: "inline-block" }}>
        {/* Triangle pointer */}
        <div style={{
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
        }} />

        {/* Bubble container */}
        <div style={{
          minWidth: 220,
          maxWidth: 340,
          background: "#fff",
          borderRadius: 12,
          boxShadow: "0 12px 28px rgba(0,0,0,0.18)",
          padding: "12px 16px",
          fontSize: 13,
          color: "#222",
        }}>
          {/* Header */}
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Edge Info</div>

          {/* Basic info */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, auto)", gap: 6, marginBottom: 12 }}>
            <div style={{ fontWeight: 600 }}>From:</div> <div>{fromNode}</div>
            <div style={{ fontWeight: 600 }}>To:</div> <div>{toNode}</div>
            <div style={{ fontWeight: 600 }}>Frequency:</div> <div>{frequency}</div>
          </div>

          {/* Frequency stats (always shown) */}
          {freqStats ? (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>Frequency Stats</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, auto)", gap: 8, fontSize: 12 }}>
                <div>Test</div><div>Stat</div><div>Effect</div><div>p-value</div>
                <div>{freqStats.test ?? "-"}</div>
                <div>{typeof freqStats.stat === "number" ? freqStats.stat.toFixed(3) : "-"}</div>
                <div>{typeof freqStats.effect_size === "number" ? freqStats.effect_size.toFixed(3) : "-"}</div>
                <div style={{ color: (freqStats.p_value ?? 1) < 0.05 ? "#ff4d4d" : "#222", fontWeight: 700 }}>
                  {typeof freqStats.p_value === "number" ? freqStats.p_value.toFixed(4) : "-"}
                </div>
              </div>
            </div>
          ) : null}

          {/* Transition Time section (only in elapsed mode) */}
          {metrics === "elapsed" && dfg && (
            <div style={{ borderTop: "1px solid #eee", paddingTop: 10 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Transition Time</div>
              <div style={{ marginBottom: 8 }}>
                <strong>Average:</strong> {avgTimeLabel}
              </div>
              {perLogTimes.length > 0 && (
                <div style={{ fontSize: 12 }}>
                  <strong>Per log:</strong>
                  {perLogTimes.map((item, i) => (
                    <div key={i}>• {item.log}: {item.time}</div>
                  ))}
                </div>
              )}
              
            </div>
          )}
        </div>
      </div>
    </div>
  );
}