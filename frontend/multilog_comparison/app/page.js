"use client";
import React from "react";
import { useState, useRef, useEffect } from "react";
import { Network, DataSet } from "vis-network/standalone";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { motion, AnimatePresence } from "framer-motion";

// ---------------- Variant Bar Charts ----------------
function VariantBarCharts({ variants, logNames, selectedVariants, onToggleVariant }) {
  if (!variants?.length || !logNames?.length) return null;

  return (
    <div style={{ marginTop: 12, maxHeight: "780px", overflowY: "auto", paddingRight: 8 }}>
      <h3 style={{ fontWeight: 700, marginBottom: 10, fontSize: 13, color: "#333" }}>Variant Selection</h3>
      {variants.map(v => {
        const data = logNames.map((_, idx) => ({ logIndex: (idx + 1).toString(), count: v.counts_per_log?.[idx] || 0 }));
        const maxCount = Math.max(0, ...data.map(d => d.count));
        // ticks: at least 0..3; if max > 3 create 4 ticks spaced by thirds
        let yTicks;
        if (maxCount <= 3) {
          yTicks = [0, 1, 2, 3];
        } else {
          const step = Math.ceil(maxCount / 3);
          yTicks = [0, step, step * 2, Math.max(maxCount, step * 3)];
        }

        return (
          <div key={v.key} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 12px',
            height: 120,
            marginBottom: 12,
            borderRadius: 12,
            background: '#fff',
            boxShadow: '0 6px 18px rgba(0,0,0,0.06)'
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, cursor: 'pointer' }}>
              <input type="checkbox" style={{ alignSelf: 'center' }} checked={selectedVariants?.has(v.key)} onChange={() => onToggleVariant && onToggleVariant(v.key)} />
              <div style={{ fontWeight: 600, fontSize: 13, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center' }}>{v.sequence.join(' → ')}</div>
            </label>

            <div style={{ width: 180, height: '100%', display: 'flex', alignItems: 'stretch', justifyContent: 'stretch' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 2, right: 4, left: 4, bottom: 4 }}>
                  <CartesianGrid horizontal={true} vertical={false} strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="logIndex" height={18} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} ticks={yTicks} domain={[0, Math.max(3, maxCount)]} width={30} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#4e79a7" radius={[6, 6, 6, 6]} barCategoryGap="10%" maxBarSize={80} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* total removed per request */}
          </div>
        );
      })}
    </div>
  );
}

// ---------------- Stats Dashboard ----------------
function StatsDashboard({ stats }) {
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
              <th style={{ padding: 10 }}>Test Statistic</th>
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

// ---------------- Home / Main Component ----------------
export default function Home() {
  const [files, setFiles] = useState([]);
  const [dfg, setDfg] = useState(null);
  const [selectedLogs, setSelectedLogs] = useState([]);
  const [selectedVariants, setSelectedVariants] = useState(new Set());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [nodeSize, setNodeSize] = useState(22);
  const [nodeSizeInput, setNodeSizeInput] = useState("22");
  const [edgeWidth, setEdgeWidth] = useState(2);
  const [edgeWidthInput, setEdgeWidthInput] = useState("2");
  const [significance, setSignificance] = useState(0.05);
  const [significanceInput, setSignificanceInput] = useState("0.05");
  const [nodeColor, setNodeColor] = useState("#55efc4");
  const [highlightColor, setHighlightColor] = useState("#ff3b30");

  const containerRefs = useRef({});
  const networkInstances = useRef({});
  const nodePositions = useRef({}); // store global node positions
  const labeledEdge = useRef({}); // (kept for compatibility but unused)
  const [edgeBubble, setEdgeBubble] = useState({ visible: false, edge: null, x: 0, y: 0, logName: null });
  const edgeBubbleRef = useRef(edgeBubble);
  const [nodeBubble, setNodeBubble] = useState({ visible: false, node: null, x: 0, y: 0, logName: null });
  const nodeBubbleRef = useRef(nodeBubble);

  // keep a ref in sync so vis event handlers can read latest bubble state
  useEffect(() => { edgeBubbleRef.current = edgeBubble; }, [edgeBubble]);
  useEffect(() => { nodeBubbleRef.current = nodeBubble; }, [nodeBubble]);

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
      setSelectedVariants(new Set());
    } catch (err) {
      console.error(err);
      alert("Failed to fetch DFGs");
    }
  };

  const toggleLog = logName => setSelectedLogs(prev => prev.includes(logName) ? prev.filter(l => l !== logName) : [...prev, logName]);

  const toggleVariant = async (key) => {
    const nextSet = new Set(selectedVariants);
    nextSet.has(key) ? nextSet.delete(key) : nextSet.add(key);
    setSelectedVariants(nextSet);

    if (!files.length) return;

    const formData = new FormData();
    files.forEach(f => formData.append("files", f));
    if (nextSet.size) formData.append("selected_variants_raw", Array.from(nextSet).join(","));

    try {
      const res = await fetch("http://localhost:8000/dfg_multi", { method: "POST", body: formData });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      if (data) setDfg(data);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch DFGs");
    }
  };

  // ---------------- Node color logic ----------------
  const getNodeColor = (stat, isMerged = false) => {
    if (!isMerged || !stat) return nodeColor;
    const { p_value, effect_size } = stat;
    if (p_value >= significance) return nodeColor; // green
    if (effect_size <= 0.15) return "#f6e58d";    // yellow
    if (effect_size <= 0.5) return "#ffbe76";     // orange
    return highlightColor;                         // red
  };

  const renderDFG = (nodes, edges, ref, logName) => {
    if (!ref.current) return;
    if (networkInstances.current[logName]) networkInstances.current[logName].destroy();
    ref.current.innerHTML = "";

    // Fix positions if already computed
    nodes.forEach(n => {
      if (nodePositions.current[n.id]) {
        n.x = nodePositions.current[n.id].x;
        n.y = nodePositions.current[n.id].y;
        n.fixed = { x: true, y: true };
      }
    });

    const physicsEnabled = Object.keys(nodePositions.current).length === 0;

    const network = new Network(ref.current, { nodes, edges }, {
      physics: { enabled: physicsEnabled, barnesHut: { springLength: 250, centralGravity: 0.3, avoidOverlap: 1.2 } },
      edges: { smooth: true },
      nodes: { shape: "dot" },
      layout: { improvedLayout: false },
      interaction: { hover: true }
    });

    networkInstances.current[logName] = network;
    // Simplified helper: always use straight midpoint between source and target nodes
    function getEdgeCanvasMidpoint(edgeId) {
      try {
        const e = network.body && network.body.data && network.body.data.edges && network.body.data.edges.get(edgeId);
        if (!e) return null;
        const pos = network.getPositions([e.from, e.to]);
        const pFrom = pos && pos[e.from];
        const pTo = pos && pos[e.to];
        if (pFrom && pTo) {
          return { x: (pFrom.x + pTo.x) / 2, y: (pFrom.y + pTo.y) / 2 };
        }
      } catch (err) {
        // ignore
      }
      return null;
    }

    // Show a small context bubble under the clicked edge (hide otherwise)
    network.on("click", params => {
      try {
        // If user clicked a node on merged DFG, show node info bubble
        const clickedNodes = params.nodes || [];
        if (clickedNodes.length > 0 && logName === "merged") {
          const nodeId = clickedNodes[0];
          // get stats row for this node from the dfg state
          const statsRow = dfg && dfg.stats && dfg.stats[nodeId];

          // compute node canvas position and convert to page coords
          const positions = network.getPositions([nodeId]);
          const p = positions && positions[nodeId];
          let bubbleX = 0, bubbleY = 0;
          if (p) {
            const midDOM = network.canvasToDOM(p);
            const canvasElem = ref.current.querySelector && ref.current.querySelector('canvas');
            const canvasRect = canvasElem ? canvasElem.getBoundingClientRect() : ref.current.getBoundingClientRect();
            bubbleX = canvasRect.left + midDOM.x;
            bubbleY = canvasRect.top + midDOM.y + 10;
          } else {
            const { x = 0, y = 0 } = (params.pointer && params.pointer.DOM) || {};
            bubbleX = x; bubbleY = y;
          }

          setNodeBubble({ visible: true, node: nodeId, stats: statsRow, x: bubbleX, y: bubbleY, logName });
          // hide edge bubble when node selected
          setEdgeBubble({ visible: false, edge: null, x: 0, y: 0, logName: null });
          return;
        }

        // Otherwise handle edge clicks (existing behavior)
        const clickedEdges = params.edges || [];
        if (clickedEdges.length > 0) {
          const edgeId = clickedEdges[0];
          const edgeObj = edges.get(edgeId);
          if (!edgeObj) return;

          // compute straight midpoint between nodes
          let midCanvas = getEdgeCanvasMidpoint(edgeId);
          if (!midCanvas) {
            const fromId = edgeObj.from;
            const toId = edgeObj.to;
            const positions = network.getPositions([fromId, toId]);
            const pFrom = positions[fromId];
            const pTo = positions[toId];
            if (!pFrom || !pTo) {
              const { x = 0, y = 0 } = (params.pointer && params.pointer.DOM) || {};
              setEdgeBubble({ visible: true, edge: edgeObj, x, y, logName });
              return;
            }
            midCanvas = { x: (pFrom.x + pTo.x) / 2, y: (pFrom.y + pTo.y) / 2 };
          }

          const midDOM = network.canvasToDOM(midCanvas);
          const canvasElem = ref.current.querySelector && ref.current.querySelector('canvas');
          const canvasRect = canvasElem ? canvasElem.getBoundingClientRect() : ref.current.getBoundingClientRect();
          const bubbleX = canvasRect.left + midDOM.x;
          const bubbleY = canvasRect.top + midDOM.y + 10;

          setEdgeBubble({ visible: true, edge: edgeObj, edgeId, x: bubbleX, y: bubbleY, logName });
          // hide node bubble when edge selected
          setNodeBubble({ visible: false, node: null, x: 0, y: 0, logName: null });
        } else {
          // clicked outside an edge/node -> hide both bubbles
          setEdgeBubble({ visible: false, edge: null, x: 0, y: 0, logName: null });
          setNodeBubble({ visible: false, node: null, x: 0, y: 0, logName: null });
        }
      } catch (err) {
        console.error("Error showing bubble:", err);
      }
    });

    // Save positions after first stabilization
    if (physicsEnabled) {
      network.once("stabilizationIterationsDone", () => {
        nodes.forEach(n => {
          nodePositions.current[n.id] = network.getPositions([n.id])[n.id];
        });
      });
    }
    // (curve-midpoint helper is defined earlier as `function getEdgeCanvasMidpoint`) — use that implementation

    // Reposition bubble when network view changes (drag, zoom, stabilization)
    const repositionBubble = (edgeIdToPos) => {
      const cur = edgeBubbleRef.current;
      if (!cur || !cur.visible || cur.logName !== logName) return;
      const eid = edgeIdToPos || cur.edgeId;
      if (!eid) return;
      try {
        const edgeObjNow = network.body.data.edges.get(eid);
        if (!edgeObjNow) return;
        // compute midpoint using curve-aware helper with fallback
        let midCanvas = getEdgeCanvasMidpoint(eid);
        if (!midCanvas) {
          const fromId = edgeObjNow.from;
          const toId = edgeObjNow.to;
          const positions = network.getPositions([fromId, toId]);
          const pFrom = positions[fromId];
          const pTo = positions[toId];
          if (!pFrom || !pTo) return;
          midCanvas = { x: (pFrom.x + pTo.x) / 2, y: (pFrom.y + pTo.y) / 2 };
        }
        const midDOM = network.canvasToDOM(midCanvas);
        const canvasElem = ref.current.querySelector && ref.current.querySelector('canvas');
        const canvasRect = canvasElem ? canvasElem.getBoundingClientRect() : ref.current.getBoundingClientRect();
        const bubbleX = canvasRect.left + midDOM.x;
        const bubbleY = canvasRect.top + midDOM.y + 10;
        setEdgeBubble(prev => ({ ...prev, x: bubbleX, y: bubbleY, edge: edgeObjNow }));
      } catch (err) {
        // ignore reposition errors
      }
    };

    // Reposition node bubble when network view changes (only relevant for merged DFG)
    const repositionNodeBubble = () => {
      const cur = nodeBubbleRef.current;
      if (!cur || !cur.visible || cur.logName !== logName) return;
      const nodeId = cur.node;
      if (!nodeId) return;
      try {
        const positions = network.getPositions([nodeId]);
        const p = positions && positions[nodeId];
        if (!p) return;
        const midDOM = network.canvasToDOM(p);
        const canvasElem = ref.current.querySelector && ref.current.querySelector('canvas');
        const canvasRect = canvasElem ? canvasElem.getBoundingClientRect() : ref.current.getBoundingClientRect();
        const bubbleX = canvasRect.left + midDOM.x;
        const bubbleY = canvasRect.top + midDOM.y + 10;
        setNodeBubble(prev => ({ ...prev, x: bubbleX, y: bubbleY }));
      } catch (err) {
        // ignore
      }
    };

    network.on("dragEnd", () => repositionBubble());
    network.on("zoom", () => repositionBubble());
    network.on("stabilizationIterationsDone", () => repositionBubble());
    network.on("dragEnd", () => repositionNodeBubble());
    network.on("zoom", () => repositionNodeBubble());
    network.on("stabilizationIterationsDone", () => repositionNodeBubble());
  };

  useEffect(() => {
    if (!dfg) return;

    selectedLogs.forEach(name => {
      const idx = dfg.log_names.indexOf(name);
      if (!containerRefs.current[name]) containerRefs.current[name] = { current: document.getElementById(`dfg_${name}`) };

      const nodes = new DataSet(dfg.nodes.map(n => ({
        id: n,
        label: n,
        color: nodeColor,
        size: nodeSize,
        font: { color: "#111", size: 18 }
      })));

      const edges = new DataSet(dfg.dfgs[idx].map(({ from, to, freq }) => ({
        from,
        to,
        freq,
        // label hidden by default; shown on click
        width: Math.min(edgeWidth, 1 + Math.log10(freq + 1)),
        arrows: { to: { enabled: true, scaleFactor: 0.5 } }
      })));

      renderDFG(nodes, edges, containerRefs.current[name], name);
    });

    if (selectedLogs.length > 1) {
      if (!containerRefs.current["merged"]) containerRefs.current["merged"] = { current: document.getElementById("mergedDFG") };

      const mergedNodes = new DataSet(
        dfg.nodes.map(n => ({
          id: n,
          label: n,
          color: getNodeColor(dfg.stats[n], true),
          size: nodeSize,
          font: { color: "#111", size: 18 }
        }))
      );

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
        return {
          from,
          to,
          freq,
          // label hidden by default; shown on click
          width: Math.min(edgeWidth, 1 + Math.log10(freq + 1)),
          arrows: { to: { enabled: true, scaleFactor: 0.5 } }
        };
      }));

      renderDFG(mergedNodes, mergedEdges, containerRefs.current["merged"], "merged");
    }
  }, [dfg, selectedLogs, nodeSize, edgeWidth, significance, nodeColor, highlightColor]);

  return (
    <div style={{ minHeight: "100vh", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif", background: "#f3f3f7" }}>
      {/* Edge context bubble */}
      {edgeBubble.visible && edgeBubble.edge && (
        <div style={{ position: "fixed", left: edgeBubble.x, top: edgeBubble.y, zIndex: 60, transform: "translate(-50%, 0)" }}>
          <div style={{ position: "relative", display: "inline-block" }}>
            <div style={{ position: "absolute", left: "50%", top: -8, transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "7px solid transparent", borderRight: "7px solid transparent", borderBottom: "8px solid #efefef", zIndex: 61 }} />
            <div style={{ minWidth: 80, maxWidth: 220, background: "#efefef", borderRadius: 8, boxShadow: "0 10px 30px rgba(0,0,0,0.12)", padding: "6px 10px", fontSize: 13, textAlign: "center" }}>
              <div style={{ color: "#333", fontWeight: 700 }}>{edgeBubble.edge.freq}</div>
            </div>
          </div>
        </div>
      )}
      {/* Node context bubble (merged DFG only) */}
      {nodeBubble.visible && nodeBubble.node && nodeBubble.logName === "merged" && (
        <div style={{ position: "fixed", left: nodeBubble.x, top: nodeBubble.y, zIndex: 60, transform: "translate(-50%, 0)" }}>
          <div style={{ position: "relative", display: "inline-block" }}>
            <div style={{ position: "absolute", left: "50%", top: -8, transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "7px solid transparent", borderRight: "7px solid transparent", borderBottom: "8px solid #efefef", zIndex: 61 }} />
            <div style={{ minWidth: 200, maxWidth: 360, background: "#efefef", borderRadius: 8, boxShadow: "0 10px 30px rgba(0,0,0,0.12)", padding: "8px 12px", fontSize: 13 }}>
              <div style={{ fontWeight: 700, color: "#000", marginBottom: 6 }}>{nodeBubble.node}</div>
                {nodeBubble.stats ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, auto)", gap: 8, alignItems: "center", fontSize: 12 }}>
                    <div style={{ fontWeight: 700, color: "#000" }}>Test</div>
                    <div style={{ fontWeight: 700, color: "#000" }}>Test Statistic</div>
                    <div style={{ fontWeight: 700, color: "#000" }}>p-value</div>
                    <div style={{ fontWeight: 700, color: "#000" }}>Effect Size</div>

                    <div style={{ gridColumn: "1 / 2", color: "#000" }}>{nodeBubble.stats.test ?? "-"}</div>
                    <div style={{ gridColumn: "2 / 3", color: "#000" }}>{typeof nodeBubble.stats.stat === "number" ? nodeBubble.stats.stat.toFixed(3) : "-"}</div>
                    <div style={{ gridColumn: "3 / 4", color: (nodeBubble.stats.p_value ?? 1) < significance ? "#ff4d4d" : "#000", fontWeight: 700 }}>{typeof nodeBubble.stats.p_value === "number" ? nodeBubble.stats.p_value.toFixed(4) : "-"}</div>
                    <div style={{ gridColumn: "4 / 5", color: "#000" }}>{typeof nodeBubble.stats.effect_size === "number" ? nodeBubble.stats.effect_size.toFixed(3) : "-"}</div>

                    <div style={{ gridColumn: "1 / 5", marginTop: 8, fontSize: 12, color: "#111" }}>
                      <div style={{ fontWeight: 700, marginBottom: 6 }}>Post-hoc</div>
                      <div style={{ fontSize: 12, color: "#333", whiteSpace: "pre-wrap", maxHeight: 120, overflow: "auto" }}>
                        {nodeBubble.stats.posthoc ? (typeof nodeBubble.stats.posthoc === "string" ? nodeBubble.stats.posthoc : JSON.stringify(nodeBubble.stats.posthoc, null, 2)) : "-"}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ color: "#666", fontSize: 12 }}>No stats available</div>
                )}
            </div>
          </div>
        </div>
      )}
      {!files.length ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: "100vh", gap: 20, color: "#333" }}
        >
          <motion.h1 initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ duration: 0.6 }} style={{ fontWeight: 700, fontSize: 28 }}>
            Multi-Log DFG Dashboard
          </motion.h1>
          <motion.input type="file" multiple accept=".csv" onChange={handleFileChange}
            style={{ padding: 14, borderRadius: 14, border: "1px solid #ccc", background: "#fff", cursor: "pointer", fontWeight: 600, boxShadow: "0 8px 20px rgba(0,0,0,0.08)" }}
            whileHover={{ scale: 1.02 }}
          />
        </motion.div>
      ) : (
        <div style={{ display: "flex", minHeight: "100vh" }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: sidebarOpen ? '50vw' : 0, padding: sidebarOpen ? 20 : 0, opacity: sidebarOpen ? 1 : 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            style={{ position: 'fixed', left: 0, top: 0, height: '100vh', background: '#fff', borderRadius: '0 20px 20px 0', boxShadow: sidebarOpen ? '4px 0 30px rgba(0,0,0,0.05)' : 'none', overflow: 'hidden', zIndex: 1000 }}
          >
            {sidebarOpen && (
              <div style={{ height: '100vh', overflowY: 'auto' }}>
                <h3 style={{ marginBottom: 20, fontWeight: 700, fontSize: 16 }}>Logs</h3>
                {files.map(f => (
                  <label key={f.name} style={{ display: "block", marginBottom: 10, cursor: "pointer" }}>
                    <input type="checkbox" checked={selectedLogs.includes(f.name)} onChange={() => toggleLog(f.name)} style={{ marginRight: 8 }} />
                    {f.name}
                  </label>
                ))}
                <VariantBarCharts variants={dfg?.variants} logNames={selectedLogs} selectedVariants={selectedVariants} onToggleVariant={toggleVariant} />
              </div>
            )}
          </motion.div>

          {/* Move toggle outside the transformed sidebar so fixed positioning remains relative to viewport */}
          <button aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'} onClick={() => setSidebarOpen(s => !s)}
            style={{
              position: 'fixed',
              left: sidebarOpen ? 'calc(50vw - 24px)' : 0,
              top: 20,
              width: 48,
              height: 48,
              borderRadius: '0 24px 24px 0',
              background: '#fff',
              border: '1px solid rgba(0,0,0,0.06)',
              borderLeft: sidebarOpen ? 'none' : '1px solid rgba(0,0,0,0.08)',
              boxShadow: sidebarOpen ? 'inset -1px 0 0 rgba(0,0,0,0.04)' : '0 6px 20px rgba(0,0,0,0.10)',
              zIndex: 99999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'left 0.35s cubic-bezier(.2,.8,.2,1), box-shadow 0.2s, border 0.2s, background 0.2s'
            }}>
            {/* decorative seam to blend with sidebar when open */}
            <div style={{ position: 'absolute', left: -8, top: 4, bottom: 4, width: 8, borderTopRightRadius: 6, borderBottomRightRadius: 6, background: sidebarOpen ? '#fff' : 'transparent', pointerEvents: 'none', boxShadow: sidebarOpen ? 'none' : 'none' }} />
            <div style={{ width: 18, height: 12, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transform: sidebarOpen ? 'none' : 'rotateY(180deg)', transition: 'transform 0.2s' }}>
              <span style={{ display: 'block', height: 2, background: '#222', borderRadius: 2 }} />
              <span style={{ display: 'block', height: 2, background: '#222', borderRadius: 2 }} />
              <span style={{ display: 'block', height: 2, background: '#222', borderRadius: 2 }} />
            </div>
          </button>

          <div style={{ flex: 1, padding: 30, overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h1 style={{ fontWeight: 700, fontSize: 22 }}>Dashboard</h1>
              <button onClick={() => setSettingsOpen(true)} aria-label="Open settings" title="Settings" style={{ padding: 8, borderRadius: 10, background: 'transparent', color: 'inherit', fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}>
                <img src="/gear.png" alt="Settings" style={{ width: 40, height: 40, display: 'block' }} />
              </button>
            </div>

            {selectedLogs.length > 1 && (
              <div style={{ marginBottom: 30 }}>
                <h2 style={{ fontWeight: 700, fontSize: 16 }}>Merged DFG</h2>
                <div id="mergedDFG" style={{ height: 500, borderRadius: 16, background: "#fff", boxShadow: "0 8px 24px rgba(0,0,0,0.06)", marginBottom: 30 }} />
              </div>
            )}

            {selectedLogs.map(name => (
              <div key={name} style={{ marginBottom: 30 }}>
                <h2 style={{ fontWeight: 700, fontSize: 16 }}>{name} DFG</h2>
                <div id={`dfg_${name}`} style={{ height: 400, borderRadius: 16, background: "#fff", boxShadow: "0 8px 24px rgba(0,0,0,0.06)" }} />
              </div>
            ))}

            {dfg && <StatsDashboard stats={dfg.stats} />}
          </div>
        </div>
      )}
      
            {/* Settings Overlay */}
      <AnimatePresence>
        {settingsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              background: "rgba(0,0,0,0.3)",
              zIndex: 50,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              padding: 20,
              overflowY: "auto"
            }}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              transition={{ duration: 0.3 }}
              style={{
                width: "480px",
                maxHeight: "90vh",
                padding: 40,
                borderRadius: 20,
                background: "#fff",
                boxShadow: "0 16px 48px rgba(0,0,0,0.15)",
                overflowY: "auto",
                position: "relative"
              }}
            >
              <h2 style={{ marginBottom: 24, fontWeight: 700, fontSize: 20 }}>Settings</h2>
              <button onClick={() => setSettingsOpen(false)} style={{ position: "absolute", top: 20, right: 20, background: "none", border: "none", fontSize: 20, cursor: "pointer" }}>✕</button>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Inputs with temporary string states */}
                <label>Significance Threshold
                  <input
                    type="text"
                    value={significanceInput}
                    onChange={e => setSignificanceInput(e.target.value)}
                    onBlur={() => {
                      let val = parseFloat(significanceInput);
                      if (isNaN(val)) val = 0.05;
                      val = Math.min(Math.max(val, 0), 1);
                      setSignificance(val);
                      setSignificanceInput(val.toString());
                    }}
                    style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #ccc" }}
                  />
                </label>

                <label>Node Size
                  <input
                    type="text"
                    value={nodeSizeInput}
                    onChange={e => setNodeSizeInput(e.target.value)}
                    onBlur={() => {
                      let val = parseInt(nodeSizeInput);
                      if (isNaN(val)) val = 22;
                      val = Math.min(Math.max(val, 5), 50);
                      setNodeSize(val);
                      setNodeSizeInput(val.toString());
                    }}
                    style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #ccc" }}
                  />
                </label>

                <label>Edge Width
                  <input
                    type="text"
                    value={edgeWidthInput}
                    onChange={e => setEdgeWidthInput(e.target.value)}
                    onBlur={() => {
                      let val = parseInt(edgeWidthInput);
                      if (isNaN(val)) val = 2;
                      val = Math.min(Math.max(val, 1), 10);
                      setEdgeWidth(val);
                      setEdgeWidthInput(val.toString());
                    }}
                    style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #ccc" }}
                  />
                </label>

                <label>Normal Node Color
                  <input type="color" value={nodeColor} onChange={e => setNodeColor(e.target.value)} style={{ width: "100%" }} />
                </label>

                <label>Highlight Node Color
                  <input type="color" value={highlightColor} onChange={e => setHighlightColor(e.target.value)} style={{ width: "100%" }} />
                </label>

                {/* Variant selection moved to sidebar */}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
