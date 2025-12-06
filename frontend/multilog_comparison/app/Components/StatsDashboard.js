'use client'
import React from "react";
import { useState, useRef, useEffect } from "react";



// ---------------- Stats Dashboard ----------------
export default function StatsDashboard({ stats }) {
  const [expandedNodes, setExpandedNodes] = useState({});
  const togglePosthoc = (node) => setExpandedNodes(prev => ({ ...prev, [node]: !prev[node] }));

  if (!stats) return null;
  return (
    <div style={{ marginTop: 30, padding: 22, borderRadius: 16, background: "rgba(255,255,255,0.18)", backdropFilter: "blur(10px)", boxShadow: "0 12px 30px rgba(0,0,0,0.06)" }}>
      <h2 style={{ fontWeight: 700, fontSize: 16, marginBottom: 15, textAlign: "center", color: "#222" }}>Node Statistics</h2>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ fontWeight: 600, background: "#f5f5f5" }}>
            <tr>
              <th style={{ padding: 10 }}>Node</th>
              <th style={{ padding: 10 }}>Test</th>
              <th style={{ padding: 10 }}>Test Stats</th>
              <th style={{ padding: 10 }}>p-value</th>
              <th style={{ padding: 10 }}>Effect Size (η² / ε² / ω²)</th>
              <th style={{ padding: 10 }}>Post-hoc</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(stats).map(([node, { stat, p_value, effect_size, test, posthoc }], i) => (
              <React.Fragment key={node}>
                <tr style={{ background: i % 2 ? "#fff" : "#f9f9f9" }}>
                  <td style={{ padding: 8, textAlign: "center" }}>{node}</td>
                  <td style={{ padding: 8, textAlign: "center" }}>{test ?? "-"}</td>
                  <td style={{ padding: 8, textAlign: "center" }}>{stat !== null && stat !== undefined ? stat.toFixed(3) : "-"}</td>
                  <td style={{ padding: 8, textAlign: "center", color: p_value < 0.05 ? "#ff4d4d" : "#2ecc71", fontWeight: 600 }}>
                    {p_value !== null && p_value !== undefined ? p_value.toFixed(4) : "-"}
                  </td>
                  <td style={{ padding: 8, textAlign: "center" }}>{typeof effect_size === "number" ? effect_size.toFixed(3) : "-"}</td>
                  <td style={{ padding: 8, textAlign: "center" }}>
                    {posthoc ? <button onClick={() => togglePosthoc(node)} style={{ cursor: "pointer" }}>{expandedNodes[node] ? "Hide" : "Show"}</button> : "-"}
                  </td>
                </tr>
                {expandedNodes[node] && posthoc && (
                  <tr>
                    <td colSpan={6} style={{ padding: 8, background: "#f0f0f0", fontSize: 12, fontFamily: "monospace" }}>
                      <pre style={{ margin: 0 }}>{typeof posthoc === "string" ? posthoc : JSON.stringify(posthoc, null, 2)}</pre>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}