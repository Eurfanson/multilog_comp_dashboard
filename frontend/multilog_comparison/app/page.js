"use client";

import { useState, useRef, useEffect } from "react";
import { Network, DataSet } from "vis-network/standalone";

function StatsDashboard({ stats }) {
  if (!stats) return null;

  return (
    <div style={{ marginTop: "40px", background: "rgba(255,255,255,0.25)", backdropFilter: "blur(12px)", borderRadius: "20px", padding: "30px", boxShadow: "0 8px 32px rgba(0,0,0,0.1)", border: "1px solid rgba(255,255,255,0.2)" }}>
      <h2 style={{ fontSize: "1.5rem", marginBottom: "20px", textAlign: "center", fontWeight: "600", color: "#111" }}>Node Statistics</h2>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", borderRadius: "10px", overflow: "hidden" }}>
          <thead style={{ background: "rgba(255,255,255,0.5)", fontWeight: "600", color: "#333" }}>
            <tr>
              <th style={{ padding: "12px" }}>Node</th>
              <th style={{ padding: "12px" }}>Test</th>
              <th style={{ padding: "12px" }}>Statistic</th>
              <th style={{ padding: "12px" }}>p-value</th>
              <th style={{ padding: "12px" }}>Effect Size (η²)</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(stats).map(([node, { stat, p_value, effect_size, test }], i) => (
              <tr key={node} style={{ background: i % 2 ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.3)" }}>
                <td style={{ padding: "10px", textAlign: "center" }}>{node}</td>
                <td style={{ padding: "10px", textAlign: "center" }}>{test ?? "-"}</td>
                <td style={{ padding: "10px", textAlign: "center" }}>{stat?.toFixed(3) ?? "-"}</td>
                <td style={{ padding: "10px", textAlign: "center", color: p_value < 0.05 ? "#ff4d4d" : "#2ecc71", fontWeight: "600" }}>{p_value.toFixed(4)}</td>
                <td style={{ padding: "10px", textAlign: "center" }}>{effect_size?.toFixed(3) ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Home() {
  const [files, setFiles] = useState([]);
  const [dfg, setDfg] = useState(null);
  const [selectedLogs, setSelectedLogs] = useState([]);
  const containerRefs = useRef({});
  const networkInstances = useRef({}); // Keep track of vis.Network instances

  const handleFileChange = async e => {
    const uploadedFiles = Array.from(e.target.files);
    setFiles(uploadedFiles);

    if (!uploadedFiles.length) return;

    const formData = new FormData();
    uploadedFiles.forEach(f => formData.append("files", f));

    try {
      const res = await fetch("http://localhost:8000/dfg_multi", { method: "POST", body: formData });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setDfg(data);
      setSelectedLogs(data.log_names);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch DFGs");
    }
  };

  const toggleLog = logName => {
    setSelectedLogs(prev =>
      prev.includes(logName)
        ? prev.filter(l => l !== logName)
        : [...prev, logName]
    );
  };

  const getNodeColor = (stat) => {
    if (!stat) return "#55efc4";

    const { p_value, effect_size } = stat;
    if (p_value < 0.05 && effect_size > 0.15) return "#ff3b30";
    if (p_value < 0.05 && effect_size <= 0.15) return "#ff9500";
    if (p_value >= 0.05 && effect_size > 0.05) return "#ffd700";
    return "#55efc4";
  };

const renderDFG = (nodes, edges, ref, logName) => {
  if (!ref.current) return;

  // Destroy old network
  if (networkInstances.current[logName]) {
    networkInstances.current[logName].destroy();
    networkInstances.current[logName] = null;
  }

  // Clear the container so vis-network can re-render
  ref.current.innerHTML = "";

  // Create new network
  networkInstances.current[logName] = new Network(ref.current, { nodes, edges }, {
    physics: { stabilization: true },
    edges: { smooth: true },
    nodes: { shape: "dot" },
    layout: { improvedLayout: true },
    interaction: { hover: true }
  });
};


  useEffect(() => {
    if (!dfg) return;

    selectedLogs.forEach(name => {
      const idx = dfg.log_names.indexOf(name);
      if (!containerRefs.current[name]) containerRefs.current[name] = { current: document.getElementById(`dfg_${name}`) };

      const nodes = new DataSet(dfg.nodes.map(n => ({
        id: n,
        label: n,
        color: getNodeColor(dfg.stats[n]),
        size: 22,
        font: { color: "#111", size: 18 }
      })));

      const edges = new DataSet(dfg.dfgs[idx].map(({ from, to, freq }) => ({
        from, to, label: freq.toString(), width: 1 + freq,
        font: { size: 20, color: "#111", strokeWidth: 2 }, arrows: "to"
      })));

      containerRefs.current[name] = { current: document.getElementById(`dfg_${name}`) };
renderDFG(nodes, edges, containerRefs.current[name], name);
    });

    if (selectedLogs.length > 1) {
      const mergedNodes = new DataSet(dfg.nodes.map(n => ({
        id: n,
        label: n,
        color: dfg.stats[n].p_value < 0.05 ? "#ff7675" : "#55efc4",
        size: 22,
        font: { color: "#111", size: 18 }
      })));

      const mergedEdgesMap = {};
      dfg.dfgs.forEach((logDfg, idx) => {
        const logName = dfg.log_names[idx];
        if (!selectedLogs.includes(logName)) return;
        logDfg.forEach(({ from, to, freq }) => {
          const key = `${from}->${to}`;
          mergedEdgesMap[key] = (mergedEdgesMap[key] || 0) + freq;
        });
      });

      const mergedEdges = new DataSet(Object.entries(mergedEdgesMap).map(([k, freq]) => {
        const [from, to] = k.split("->");
        return { from, to, label: freq.toString(), width: 1 + freq, font: { size: 20, color: "#111", strokeWidth: 2 }, arrows: "to" };
      }));

      if (!containerRefs.current["merged"]) containerRefs.current["merged"] = { current: document.getElementById("mergedDFG") };
      renderDFG(mergedNodes, mergedEdges, containerRefs.current["merged"], "merged");
    } else {
      // Destroy merged if only 1 selected
      if (networkInstances.current["merged"]) {
        networkInstances.current["merged"].destroy();
        networkInstances.current["merged"] = null;
      }
    }

  }, [dfg, selectedLogs]);

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" }}>
      <div style={{ width: "240px", padding: "30px 20px", borderRight: "1px solid rgba(255,255,255,0.3)", backdropFilter: "blur(12px)", background: "rgba(255,255,255,0.15)", borderRadius: "0 20px 20px 0", boxShadow: "2px 2px 12px rgba(0,0,0,0.05)" }}>
        <h3 style={{ marginBottom: "20px", color: "#111", fontWeight: 600 }}>Select Logs</h3>
        <input type="file" multiple accept=".csv" onChange={handleFileChange} style={{ marginBottom: "15px", padding: "8px 10px", borderRadius: "12px", border: "1px solid rgba(200,200,200,0.6)", background: "rgba(255,255,255,0.8)", width: "100%" }} />
        {files.map(f => (
          <label key={f.name} style={{ display: "block", marginBottom: "12px", cursor: "pointer", userSelect: "none", fontWeight: 500 }}>
            <input type="checkbox" checked={selectedLogs.includes(f.name)} onChange={() => toggleLog(f.name)} style={{ marginRight: "10px" }} />
            {f.name}
          </label>
        ))}
      </div>

      <div style={{ flex: 1, padding: "50px 30px", overflowY: "auto" }}>
        <h1 style={{ fontWeight: "700", fontSize: "2.3rem", marginBottom: "20px", color: "#111" }}>Multi-Log DFG Dashboard</h1>

        {selectedLogs.length > 1 && <div style={{ marginBottom: "30px" }}>
          <h2 style={{ fontWeight: "600" }}>Merged DFG</h2>
          <div id="mergedDFG" style={{ height: "500px", borderRadius: "16px", background: "rgba(255,255,255,0.8)", marginBottom: "30px" }} />
        </div>}

        {selectedLogs.map(name => (
          <div key={name} style={{ marginBottom: "30px" }}>
            <h2 style={{ fontWeight: "600" }}>{name} DFG</h2>
            <div id={`dfg_${name}`} style={{ height: "400px", borderRadius: "16px", background: "rgba(255,255,255,0.8)" }} />
          </div>
        ))}

        {dfg && <StatsDashboard stats={dfg.stats} />}
      </div>
    </div>
  );
}





/*
"use client";

import { useState, useRef, useEffect } from "react";
import { DataSet, Network } from "vis-network/standalone";

export default function Home() {
  const [file, setFile] = useState(null);
  const [dfg, setDfg] = useState(null);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);

  const handleFileChange = (e) => setFile(e.target.files[0]);

  const handleUpload = async () => {
    if (!file) return alert("Please select a CSV file");
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:8000/dfg_json", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Server error: ${res.status} - ${errText}`);
      }

      const data = await res.json();
      setDfg(data);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch DFG from backend");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!dfg || !containerRef.current) return;

    const nodes = new DataSet(
      dfg.nodes.map((n, idx) => ({
        id: n,
        label: n,
        color: `hsl(${(idx * 100) % 360}, 70%, 60%)`,
      }))
    );

    const edges = new DataSet(
      dfg.edges.map((e) => ({
        from: e.source,
        to: e.target,
        label: `${e.frequency}`,
        width: 1 + e.frequency,
        arrows: "to",
      }))
    );

    new Network(containerRef.current, { nodes, edges }, {
      physics: { stabilization: true },
      edges: { font: { align: "top" }, smooth: true },
      nodes: { shape: "dot", size: 20, font: { size: 16, color: "#000" } },
    });
  }, [dfg]);

  return (
    <div style={{ maxWidth: "800px", margin: "50px auto", fontFamily: "sans-serif" }}>
      <h1 style={{ textAlign: "center" }}>Upload CSV & Generate DFG</h1>

      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <input type="file" accept=".csv" onChange={handleFileChange} />
        <button onClick={handleUpload} disabled={loading} style={{ padding: "5px 15px" }}>
          {loading ? "Generating..." : "Generate DFG"}
        </button>
      </div>

      {dfg && (
        <div>

          <h2>DFG Graph:</h2>
          <div ref={containerRef} style={{ height: "400px", border: "1px solid #ccc" }} />
        </div>
      )}
    </div>
  );
}*/
