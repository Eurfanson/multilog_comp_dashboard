'use client'
import React, { useState } from "react";

export default function StatsDashboard({ stats, edge_stats }) {
  const [expandedNodes, setExpandedNodes] = useState({});
  const [activeTab, setActiveTab] = useState("nodes"); // 'nodes' or 'edges'
  const togglePosthoc = (node) => setExpandedNodes(prev => ({ ...prev, [node]: !prev[node] }));

  if (!stats && !edge_stats) return null;

  return (
    <div style={{ marginTop: 30, padding: 22, borderRadius: 16, background: "rgba(255,255,255,0.18)", backdropFilter: "blur(10px)", boxShadow: "0 12px 30px rgba(0,0,0,0.06)" }}>

      {/* Tabs */}
      <div style={{ display: "flex", justifyContent: "right", marginBottom: 20 }}>
        {stats && (
          <button
            onClick={() => setActiveTab("nodes")}
            style={{
              marginRight: 10,
              padding: "8px 16px",
              cursor: "pointer",
              fontWeight: activeTab === "nodes" ? 700 : 400,
              background: activeTab === "nodes" ? "#eee" : "#fff",
              borderRadius: 8,
              border: "1px solid #ccc"
            }}
          >Node Stats</button>
        )}
        {edge_stats && (
          <button
            onClick={() => setActiveTab("edges")}
            style={{
              padding: "8px 16px",
              cursor: "pointer",
              fontWeight: activeTab === "edges" ? 700 : 400,
              background: activeTab === "edges" ? "#eee" : "#fff",
              borderRadius: 8,
              border: "1px solid #ccc"
            }}
          >Edge Stats</button>
        )}
      </div>

      {/* Node Table */}
      {activeTab === "nodes" && stats && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ fontWeight: 600, background: "#f5f5f5" }}>
              <tr>
                <th style={{ padding: 10 }}>Node</th>
                <th style={{ padding: 10 }}>Test</th>
                <th style={{ padding: 10 }}>Test Stats</th>
                <th style={{ padding: 10 }}>p-value</th>
                <th style={{ padding: 10 }}>Effect Size</th>
                <th style={{ padding: 10 }}>Post-hoc</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(stats).map(([node, { stat, p_value, effect_size, test, posthoc }], i) => (
                <React.Fragment key={node}>
                  <tr style={{ background: i % 2 ? "#fff" : "#f9f9f9" }}>
                    <td style={{ padding: 8, textAlign: "center" }}>{node}</td>
                    <td style={{ padding: 8, textAlign: "center" }}>{test ?? "-"}</td>
                    <td style={{ padding: 8, textAlign: "center" }}>{stat !== null ? stat.toFixed(3) : "-"}</td>
                    <td style={{ padding: 8, textAlign: "center", color: p_value < 0.05 ? "#ff4d4d" : "#2ecc71", fontWeight: 600 }}>
                      {p_value !== null ? p_value.toFixed(4) : "-"}
                    </td>
                    <td style={{ padding: 8, textAlign: "center" }}>{effect_size !== null ? effect_size.toFixed(3) : "-"}</td>
                    <td style={{ padding: 8, textAlign: "center" }}>
                      {posthoc ? <button onClick={() => togglePosthoc(node)}>{expandedNodes[node] ? "Hide" : "Show"}</button> : "-"}
                    </td>
                  </tr>
                  {expandedNodes[node] && posthoc && (
                    <tr>
                      <td colSpan={6} style={{ padding: 8, background: "#f0f0f0", fontSize: 12, fontFamily: "monospace" }}>
                        <pre style={{ margin: 0 }}>{JSON.stringify(posthoc, null, 2)}</pre>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edge Table */}
      {activeTab === "edges" && edge_stats && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ fontWeight: 600, background: "#f5f5f5" }}>
              <tr>
                <th style={{ padding: 10 }}>Edge</th>
                <th style={{ padding: 10 }}>Test</th>
                <th style={{ padding: 10 }}>Test Stats</th>
                <th style={{ padding: 10 }}>p-value</th>
                <th style={{ padding: 10 }}>Effect Size</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(edge_stats).map(([edge, { test, stat, p_value, effect_size }], i) => (
                <tr key={edge} style={{ background: i % 2 ? "#fff" : "#f9f9f9" }}>
                  <td style={{ padding: 8, textAlign: "center" }}>{edge}</td>
                  <td style={{ padding: 8, textAlign: "center" }}>{test ?? "-"}</td>
                  <td style={{ padding: 8, textAlign: "center" }}>{stat !== null ? stat.toFixed(3) : "-"}</td>
                  <td style={{ padding: 8, textAlign: "center", color: p_value < 0.05 ? "#ff4d4d" : "#2ecc71", fontWeight: 600 }}>
                    {p_value !== null ? p_value.toFixed(4) : "-"}
                  </td>
                  <td style={{ padding: 8, textAlign: "center" }}>{effect_size !== null ? effect_size.toFixed(3) : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
