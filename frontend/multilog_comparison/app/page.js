"use client";
import React from "react";
import { useState, useRef, useEffect } from "react";
import { Network, DataSet } from "vis-network/standalone";
import { motion, AnimatePresence } from "framer-motion";
import { useDfgState } from "./Hooks/hooks";
import StatsDashboard from "./Components/StatsDashboard";
import VariantBarCharts from "./Components/VariantBarCharts";
import EdgeBubble from "./Components/EdgeBubble";
import NodeBubble from "./Components/NodeBubble";
import SettingsOverlay from "./Components/SettingsOverlay";
import { useSession, signIn, signOut } from "next-auth/react"; 
import { getSteps } from "./Hooks/steps";

// ---------------- Home / Main Component ----------------
export default function Home() {

  const {
    files, setFiles, dfg, setDfg, selectedLogs, setSelectedLogs,
    selectedVariants, setSelectedVariants, nodeSize, setNodeSize, 
    nodeSizeInput, setNodeSizeInput, edgeWidth, setEdgeWidth,
    edgeWidthInput, setEdgeWidthInput, significance, setSignificance,
    significanceInput, setSignificanceInput, nodeColor, setNodeColor,
    highlightColor, setHighlightColor, readableMode, setReadableMode,
    containerRefs, networkInstances, nodePositions, edgeBubble, setEdgeBubble,
    edgeBubbleRef, nodeBubble, setNodeBubble, nodeBubbleRef,settingsOpen, setSettingsOpen,sidebarOpen, setSidebarOpen,step, setStep, nodeFreq, setNodeFreq,logPage,
    setLogPage, metrics, setMetrics
  } = useDfgState();

    //const [metrics, setMetrics] = useState("frequency"); // "frequency" or "elapsed"
// Keep this state in your component
const [layoutKey, setLayoutKey] = useState(0);

const [layout, setLayout] = useState("vertical");

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
  // Onboarding steps
  const steps = getSteps({ handleFileChange, setStep });

  // ---------------- Auth Logic ----------------
  const { data: session, status } = useSession(); 

  // Authentication effect
   useEffect(() => {
    if (status === "loading") return; // 等待加载完成

    if (!session) {
      // 如果未登录，直接调用GitHub登录
      signIn("github");
    }
  }, [session, status]); //  session, status for auth check
  
  useEffect(() => { edgeBubbleRef.current = edgeBubble; }, [edgeBubble]); // keep a ref in sync so vis event handlers can read latest bubble state
 
  useEffect(() => { nodeBubbleRef.current = nodeBubble; }, [nodeBubble]);


//layout generation
useEffect(() => {
    if (!dfg) return;

    nodePositions.current = {};

    const nodeIds = dfg.nodes || [];
    if (nodeIds.length === 0) return;

    // Collect start/end nodes from selected logs
    const mergedStartNodes = new Set();
    const mergedEndNodes = new Set();

    selectedLogs.forEach(name => {
        const idx = dfg.log_names.indexOf(name);
        if (idx !== -1) {
            dfg.dfgs_start_nodes?.[idx]?.forEach(n => mergedStartNodes.add(n));
            dfg.dfgs_end_nodes?.[idx]?.forEach(n => mergedEndNodes.add(n));
        }
    });

    const startNodes = Array.from(mergedStartNodes);
    const endNodes = Array.from(mergedEndNodes);
    const middleNodes = nodeIds.filter(id => !["START", "END"].includes(id));

    // Tuned spacing
    const groupVerticalSpread = 230;       // Strong vertical fan in start/end groups
    const middleHorizontalSpacing = 450;   // Wide middle row
    const levelGap = 320;                  // Distance between levels
    const middleJitter = 60;               // Subtle wave in middle

    // Symmetric vertical spread helper
    const spreadVertically = (baseY, index, total) => {
        if (total <= 1) return baseY;
        const progress = (index / (total - 1)) - 0.5; // -0.5 to +0.5
        return baseY + progress * groupVerticalSpread * 2;
    };

    const middleJitterFunc = (index, total) => {
        if (total <= 1) return 0;
        const progress = (index / (total - 1)) - 0.5;
        return progress * middleJitter * 2;
    };

    // 1. START node — highest point
    nodePositions.current["START"] = {
        x: 0,
        y: -levelGap - 80, // A bit more padding above
    };

    // 2. Start nodes — fanned above the middle level
    const startBaseY = -levelGap / 2;
    startNodes.forEach((id, i) => {
        nodePositions.current[id] = {
            x: (i - (startNodes.length - 1) / 2) * 220,
            y: spreadVertically(startBaseY, i, startNodes.length),
        };
    });

    // 3. Middle nodes — center horizontal flow
    if (middleNodes.length > 0) {
        const totalWidth = (middleNodes.length - 1) * middleHorizontalSpacing;
        const startX = -totalWidth / 2;

        middleNodes.forEach((id, i) => {
            nodePositions.current[id] = {
                x: startX + i * middleHorizontalSpacing,
                y: middleJitterFunc(i, middleNodes.length),
            };
        });
    }

    // 4. End nodes — fanned, but strictly above END node
    const endBaseY = levelGap / 2;
    endNodes.forEach((id, i) => {
        nodePositions.current[id] = {
            x: (i - (endNodes.length - 1) / 2) * 220,
            y: spreadVertically(endBaseY, i, endNodes.length),
        };
    });

    // 5. END node — dynamically placed BELOW the lowest end node
    let maxEndY = levelGap + 60; // fallback if no end nodes

    if (endNodes.length > 0) {
        const endYs = endNodes.map(id => nodePositions.current[id].y);
        const lowestEndY = Math.max(...endYs);
        maxEndY = lowestEndY + 120; // Safe padding below the lowest end node
    }

    nodePositions.current["END"] = {
        x: 0,
        y: maxEndY,
    };

    // Force re-render
    setLayoutKey(prev => prev + 1);

}, [dfg, selectedLogs]);

  //vis network rendering logic
useEffect(() => {
  if (!dfg) return;

  const effectiveNodeSize = readableMode ? Math.max(nodeSize, 28) : nodeSize;
  const effectiveFontSize = readableMode ? 22 : 18;
  const effectiveEdgeWidth = readableMode ? Math.max(edgeWidth, 3) : edgeWidth;
  const showEdgeLabels = readableMode;

  // Render each selected log separately
  selectedLogs.forEach(name => {
    const idx = dfg.log_names.indexOf(name);
    if (idx === -1) return;

    if (!containerRefs.current[name]) {
      containerRefs.current[name] = { current: document.getElementById(`dfg_${name}`) };
    }

    const startNodes = dfg.dfgs_start_nodes?.[idx] || [];
    const endNodes = dfg.dfgs_end_nodes?.[idx] || [];

    const nodes = new DataSet(
      [
        ...dfg.nodes.map(n => ({
          id: n,
          label: n,
          color: nodeColor,
          size: effectiveNodeSize, // <- now uses settings
          font: { color: "#111", size: Math.min(Math.max((dfg.node_freq[n]?.flat().reduce((a,b)=>a+b,0)||1)*1.5, 18), 25) },
          shape: "box",
        })),
        {
          id: "START",
          label: "START",
          shape: "triangle",
          size: effectiveNodeSize,
          font: { color: "#111", size: effectiveFontSize },
        },
        {
          id: "END",
          label: "END",
          shape: "box",
          size: effectiveNodeSize,
          font: { color: "#111", size: effectiveFontSize },
        }
      ]
    );

// find the maximum frequency for this DFG
const maxFreq = Math.max(...dfg.dfgs[idx].map(e => e.freq));

const edges = new DataSet(
  [
    ...dfg.dfgs[idx].map(({ from, to, freq }) => {
      const minWidth = 0.5;  // minimum width for tiny freq
      const maxWidth = 3.5;  // maximum width for edges
      const exponent = 0.5;  // sqrt scaling
      const width = minWidth + Math.pow(freq / maxFreq, exponent) * (maxWidth - minWidth);

      return {
        from, to, freq,
        label: showEdgeLabels ? String(freq) : "",
        font: showEdgeLabels ? { size: 20, strokeWidth: 2, strokeColor: "#ffffff" } : "",
        width, // <- scaled width
        arrows: { to: { enabled: true, scaleFactor: 0.5 } },
        smooth: { type: 'continuous', roundness: 0.7, offset: 0.7 }
      };
    }),
    ...startNodes.map(node => ({
      from: "START",
      to: node,
      dashes: true,
      arrows: { to: { enabled: true, scaleFactor: 0.5 } },
      width: effectiveEdgeWidth,
      smooth: { type: 'continuous', roundness: 0.5, offset: 0.8 }
    })),
    ...endNodes.map(node => ({
      from: node,
      to: "END",
      color: "#97c2fc",
      dashes: true,
      arrows: { to: { enabled: true, scaleFactor: 0.5 } },
      width: effectiveEdgeWidth,
      smooth: { type: 'continuous', roundness: 0.3, offset: 0.3 }
    }))
  ]
);


    renderDFG(nodes, edges, containerRefs.current[name], name);
  });

  // Merge logs if more than 1
  if (selectedLogs.length > 1) {
    if (!containerRefs.current["merged"]) containerRefs.current["merged"] = { current: document.getElementById("mergedDFG") };

    const mergedStartNodes = new Set();
    const mergedEndNodes = new Set();

    selectedLogs.forEach(name => {
      const idx = dfg.log_names.indexOf(name);
      dfg.dfgs_start_nodes?.[idx]?.forEach(n => mergedStartNodes.add(n));
      dfg.dfgs_end_nodes?.[idx]?.forEach(n => mergedEndNodes.add(n));
    });

    const mergedNodes = new DataSet(
      [
        ...dfg.nodes.map(n => ({
          id: n,
          label: n,
          color: getNodeColor(metrics === "elapsed" ? dfg.stats_elapsed[n] : dfg.stats[n], true),
          size: effectiveNodeSize,
          font: { color: "#111", size: Math.min(Math.max((dfg.node_freq[n]?.flat().reduce((a,b)=>a+b,0)||1)*1.5, 18), 25) },
          shape: "box"
        })),
        {
          id: "START",
          label: "START",
          shape: "triangle",
          size: effectiveNodeSize,
          font: { color: "#111", size: effectiveFontSize }
        },
        {
          id: "END",
          label: "END",
          shape: "box",
          size: effectiveNodeSize,
          font: { color: "#111", size: effectiveFontSize }
        }
      ]
    );

    const mergedEdgesMap = {};
    dfg.dfgs.forEach((logDfg, idx) => {
      const logName = dfg.log_names[idx];
      if (!selectedLogs.includes(logName)) return;
      logDfg.forEach(({ from, to, freq }) => {
        const key = `${from}->${to}`;
        const revKey = `${to}->${from}`;
        if (mergedEdgesMap[key] || mergedEdgesMap[revKey]) return;
        mergedEdgesMap[key] = (mergedEdgesMap[key] || 0) + freq;
      });
    });

// find the maximum frequency in mergedEdgesMap
const maxFreq = Math.max(...Object.values(mergedEdgesMap));

const mergedEdges = new DataSet(
  [
    ...Object.entries(mergedEdgesMap).map(([k, freq]) => {
      const [from, to] = k.split("->");

      // edge width scaling using power (sqrt) for better large freq contrast
      const minWidth = 0.5;  // minimum width for tiny freq
      const maxWidth = 8;    // maximum width for very high freq
      const exponent = 0.5;  // sqrt scaling
      const width = minWidth + Math.pow(freq / maxFreq, exponent) * (maxWidth - minWidth);

      return {
        from, to, freq,
        label: showEdgeLabels 
          ? metrics === "elapsed" 
            ? String(dfg.edge_stats?.[`${from}->${to}`]?.elapsed ) 
            : String(freq) 
          : "",
        font: showEdgeLabels ? { size: 25, strokeWidth: 3, strokeColor: "#ffffff" ,align: "horizontal", zIndex: 999} : "",
        width, // <- scaled width
        arrows: { to: { enabled: true, scaleFactor: 0.7 } },
        smooth: { type: 'continuous', roundness: 0.5, offset: 0.8 + (Math.random() * 0.1) },
        labelOffset: { x: 10, y: 0 } 
      };
    }),
    ...Array.from(mergedStartNodes).map(node => ({
      from: "START",
      to: node,
      dashes: true,
      width: 2,
      arrows: { to: { enabled: true, scaleFactor: 0.5 } },
      smooth: { type: 'continuous', roundness: 0.7, offset: 1 }
    })),
    ...Array.from(mergedEndNodes).map(node => ({
      from: node,
      to: "END",
      dashes: true,
      width: 2,
      color: "#97c2fc",
      arrows: { to: { enabled: true, scaleFactor: 0.5 } },
      smooth: { type: 'continuous', roundness: 0.9, offset: 1 }
    }))
  ]
);


    renderDFG(mergedNodes, mergedEdges, containerRefs.current["merged"], "merged");
  }
}, [dfg, selectedLogs, nodeSize, edgeWidth, significance, nodeColor, highlightColor, readableMode, metrics]);

  // ---------------- Log / Variant Toggle Logic ----------------
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

const getNodeColor = (stat, isMerged = false) => {
  if (!isMerged || !stat) return nodeColor;

  const es = Math.abs(stat.effect_size ?? 0);
  const p = stat.p_value ?? 1;

  // for elapsed: show effect even if not significant
  if (metrics === "frequency" && p >= significance) {
    return nodeColor;
  }

  if (es <= 0.15) return "#f6e58d";   // weak
  if (es <= 0.5) return "#ffbe76";    // medium
  return highlightColor;              // strong
};



  const renderDFG = (nodes, edges, ref, logName) => {
  if (!ref.current) return;
  // Force canvas reset safely

  if (networkInstances.current[logName]) networkInstances.current[logName].destroy(); 
  ref.current.innerHTML = "";


  // Get all nodes as an array from the DataSet
  const allNodes = nodes.get();

  // Create a set of node ids that have edges
  const connectedNodes = new Set();
  edges.forEach(edge => {
    connectedNodes.add(edge.from);
    connectedNodes.add(edge.to);
  });

  // Filter out isolated nodes (nodes that don't appear in any edge)
  const filteredNodes = allNodes.filter(node => connectedNodes.has(node.id));

  // Fix positions if already computed
  filteredNodes.forEach(n => {
    if (nodePositions.current[n.id]) {
      n.x = nodePositions.current[n.id].x;
      n.y = nodePositions.current[n.id].y;
      n.fixed = { x: true, y: true };
    }
  });

  const physicsEnabled = false;

  const network = new Network(ref.current, { nodes: new DataSet(filteredNodes), edges }, {
    physics: { enabled: physicsEnabled, barnesHut: { springLength: 250, centralGravity: 0.3, avoidOverlap: 2 } },

    nodes: { shape: "dot"},
    layout: { improvedLayout: true },
    interaction: { hover: true}
  });

  networkInstances.current[logName] = network;

  function getEdgeCanvasMidpoint(edgeId) {
    try {
      const positions = network.getEdgePositions(edgeId);
      if (!positions || !positions.length) return null;
      const midIndex = Math.floor(positions.length / 2);
      const mid = positions[midIndex];
      return { x: mid.x, y: mid.y };
    } catch (err) {
      return null;
    }
  }

network.on("click", params => {
  try {
    const clickedNodes = params.nodes || [];
    
    // Handle node click
    if (clickedNodes.length > 0 && logName === "merged") {
      const nodeId = clickedNodes[0];
      const statsRow = dfg?.stats?.[nodeId];

      const pos = network.getPositions([nodeId])[nodeId];
      const midDOM = pos ? network.canvasToDOM(pos) : (params.pointer?.DOM || { x: 0, y: 0 });
      const canvasElem = ref.current.querySelector('canvas');
      const rect = canvasElem?.getBoundingClientRect() || ref.current.getBoundingClientRect();
      const bubbleX = rect.left + midDOM.x;
      const bubbleY = rect.top + midDOM.y + 10;
      const frequency = dfg.node_freq?.[nodeId]?.flat().reduce((a, b) => a + b, 0) ?? 0;

      setNodeBubble({ visible: true, node: nodeId, stats: statsRow, x: bubbleX, y: bubbleY, logName,frequency });
      

      return;
    }

    // Handle edge click
    const clickedEdges = params.edges || [];
    if (clickedEdges.length > 0) {
      const edgeId = clickedEdges[0];
      const edgeObj = edges.get(edgeId);
      if (!edgeObj) return;

      const fromNode = edgeObj.from;
      const toNode = edgeObj.to;
      const frequency = edgeObj.freq;

      // Get the midpoint of the edge for positioning the bubble
      let midCanvas = getEdgeCanvasMidpoint(edgeId);
      if (!midCanvas) {
        const positions = network.getPositions([fromNode, toNode]);
        const pFrom = positions[fromNode];
        const pTo = positions[toNode];
        if (!pFrom || !pTo) {
          const { x = 0, y = 0 } = params.pointer?.DOM || {};
          setEdgeBubble({         
        visible: true,
        edge: edgeObj,
        edgeId,
        fromNode,
        toNode,
        frequency,
        x: bubbleX,
        y: bubbleY,
        logName});
          return;
        }
        midCanvas = { x: (pFrom.x + pTo.x) / 2, y: (pFrom.y + pTo.y) / 2 };
      }

      const midDOM = network.canvasToDOM(midCanvas);
      const canvasElem = ref.current.querySelector('canvas');
      const rect = canvasElem?.getBoundingClientRect() || ref.current.getBoundingClientRect();
      const bubbleX = rect.left + midDOM.x;
      const bubbleY = rect.top + midDOM.y + 10;

      // Show the edge information (from node, to node, and frequency) in the bubble
      setEdgeBubble({
        visible: true,
        edge: edgeObj,
        edgeId,
        fromNode,
        toNode,
        frequency,
        x: bubbleX,
        y: bubbleY,
        logName
      });

      setNodeBubble({ visible: false, node: null, x: 0, y: 0, logName: null });
    } else {
      // Hide the bubbles if nothing is clicked
      setEdgeBubble({ visible: false, edge: null, x: 0, y: 0, logName: null });
      setNodeBubble({ visible: false, node: null, x: 0, y: 0, logName: null });
    }
  } catch (err) {
    console.error("Error showing bubble:", err);
  }
});



  if (physicsEnabled) {
    network.once("stabilizationIterationsDone", () => {
      filteredNodes.forEach(n => nodePositions.current[n.id] = network.getPositions([n.id])[n.id]);
    });
  }

  const repositionEdgeBubble = (edgeIdToPos) => {
    const cur = edgeBubbleRef.current;
    if (!cur?.visible || cur.logName !== logName) return;
    const eid = edgeIdToPos || cur.edgeId;
    if (!eid) return;
    const edgeObjNow = network.body.data.edges.get(eid);
    if (!edgeObjNow) return;

    let midCanvas = getEdgeCanvasMidpoint(eid);
    if (!midCanvas) return;

    const midDOM = network.canvasToDOM(midCanvas);
    const canvasElem = ref.current.querySelector('canvas');
    const rect = canvasElem?.getBoundingClientRect() || ref.current.getBoundingClientRect();
    const bubbleX = rect.left + midDOM.x;
    const bubbleY = rect.top + midDOM.y + 10;

    setEdgeBubble(prev => ({ ...prev, x: bubbleX, y: bubbleY, edge: edgeObjNow }));
  };

  const repositionNodeBubble = () => {
    const cur = nodeBubbleRef.current;
    if (!cur?.visible || cur.logName !== logName) return;
    const nodeId = cur.node;
    if (!nodeId) return;
    const pos = network.getPositions([nodeId])[nodeId];
    if (!pos) return;

    const midDOM = network.canvasToDOM(pos);
    const canvasElem = ref.current.querySelector('canvas');
    const rect = canvasElem?.getBoundingClientRect() || ref.current.getBoundingClientRect();
    const bubbleX = rect.left + midDOM.x;
    const bubbleY = rect.top + midDOM.y + 10;
    setNodeBubble(prev => ({ ...prev, x: bubbleX, y: bubbleY }));
  };

  ["dragEnd", "zoom", "stabilizationIterationsDone"].forEach(event => {
    network.on(event, () => repositionEdgeBubble());
    network.on(event, () => repositionNodeBubble());
  });
};


 const logsPerPage = 3;
 const totalPages = Math.ceil(files.length / logsPerPage);
  const paginatedLogs = files.slice(logPage * logsPerPage, (logPage + 1) * logsPerPage);

  //color palette for variant steps
const nodeColorMap = {};
if (dfg?.nodes) {
  dfg.nodes.forEach((n) => {
    nodeColorMap[n] = getNodeColor(dfg.stats[n], true);
  });
}


  return (
    <div style={{ minHeight: "100vh", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif", background: "#f3f3f7" }}>
      {/* Edge context bubble */}
      {dfg &&<EdgeBubble edgeBubble={edgeBubble} edge_stats={dfg.edge_stats} />}

      {/* Node context bubble (merged DFG only) */}
      <NodeBubble nodeBubble={nodeBubble} significance={significance} />

      {/* Interface before & after file upload*/}
      {!files.length ? (
        <div style={{ position: "relative", width: "100%", height: "100vh" }}>
      <AnimatePresence mode="wait">
        {steps.map((s, i) => i === step && s)}
      </AnimatePresence>
    </div>
      ) : (
        <div style={{ display: "flex", minHeight: "100vh" }}>
          {/* Sidebar */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: sidebarOpen ? '80vw' : 0, padding: sidebarOpen ? 20 : 0, opacity: sidebarOpen ? 1 : 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            style={{ position: 'fixed', left: 0, top: 0, height: '100vh', background: '#fff', borderRadius: '0 20px 20px 0', boxShadow: sidebarOpen ? '4px 0 30px rgba(0,0,0,0.05)' : 'none', overflow: 'hidden', zIndex: 1000 }}
          >
            {sidebarOpen && (
              <div style={{ height: '100vh', overflowY: 'auto', paddingRight: 12 }}>
                    <h3 style={{ marginBottom: 20, fontWeight: 700, fontSize: 16 }}>Logs</h3>

                    {paginatedLogs.map(f => (
                      <label key={f.name} style={{ display: "block", marginBottom: 10, cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={selectedLogs.includes(f.name)}
                          onChange={() => toggleLog(f.name)}
                          style={{ marginRight: 8 }}
                        />
                        {f.name}
                      </label>
                    ))}


                    {/* Pagination buttons */}
                    {files.length > logsPerPage && (
                      <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 6, marginBottom: 20 }}>
                        <button
                          disabled={logPage === 0}
                          onClick={() => setLogPage(logPage - 1)}
                          style={{ padding:'4px 10px', borderRadius:4, border:'1px solid #ccc', cursor: logPage===0?'not-allowed':'pointer' }}
                        >
                          Prev
                        </button>
                        <span style={{ fontSize:12, alignSelf:'center' }}>{logPage + 1}/{totalPages}</span>
                        <button
                          disabled={logPage === totalPages - 1}
                          onClick={() => setLogPage(logPage + 1)}
                          style={{ padding:'4px 10px', borderRadius:4, border:'1px solid #ccc', cursor: logPage===totalPages-1?'not-allowed':'pointer' }}
                        >
                          Next
                        </button>
                      </div>
                    )}

                    <VariantBarCharts
                      variants={dfg?.variants}
                      logNames={selectedLogs}
                      selectedVariants={selectedVariants}
                      onToggleVariant={toggleVariant}
                      nodeColors={nodeColorMap}
                    />
                  </div>
            )}
          </motion.div>

          {/* Sidebar toggle */}
          <button aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'} onClick={() => setSidebarOpen(s => !s)}
            style={{
              position: 'fixed',
              left: sidebarOpen ? 'calc(80vw - 24px)' : 0,
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
            <div style={{ position: 'absolute', left: -8, top: 4, bottom: 4, width: 8, borderTopRightRadius: 6, borderBottomRightRadius: 6, background: sidebarOpen ? '#fff' : 'transparent', pointerEvents: 'none' }} />
            <div style={{ width: 18, height: 12, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transform: sidebarOpen ? 'none' : 'rotateY(180deg)', transition: 'transform 0.2s' }}>
              <span style={{ display: 'block', height: 2, background: '#222', borderRadius: 2 }} />
              <span style={{ display: 'block', height: 2, background: '#222', borderRadius: 2 }} />
              <span style={{ display: 'block', height: 2, background: '#222', borderRadius: 2 }} />
            </div>
          </button>

          {/* Main content area */}
          <div style={{ flex: 1, padding: 30, overflowY: "auto", position: "relative" }}>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h1 style={{ fontWeight: 700, fontSize: 22 }}>Dashboard</h1>
              <button onClick={() => setSettingsOpen(true)} aria-label="Open settings" title="Settings" style={{ padding: 8, borderRadius: 10, background: 'transparent', color: 'inherit', fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}>
                <img src="/gear.png" alt="Settings" style={{ width: 40, height: 40, display: 'block' }} />
              </button>
            </div>

            {/* === NODE COLOR LEGEND (only for Merged DFG) === */}
            {selectedLogs.length > 1 && dfg && (
              <div style={{
                position: "fixed",
                top: 20,
                right: 80, // leaves space for the gear button (40px wide + padding)
                background: "rgba(255, 255, 255, 0.95)",
                backdropFilter: "blur(10px)",
                padding: "12px 16px",
                borderRadius: 12,
                boxShadow: "0 6px 20px rgba(0,0,0,0.1)",
                fontSize: 13,
                fontWeight: 600,
                color: "#333",
                zIndex: 9999,
                border: "1px solid rgba(0,0,0,0.08)",
                maxWidth: 260
              }}>
                <div style={{ marginBottom: 8, fontWeight: 700 }}>Node Significance (Merged)</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <div style={{ width: 16, height: 16, borderRadius: 8, background: nodeColor }} />
                  <span>Default / Not significant</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <div style={{ width: 16, height: 16, borderRadius: 8, background: "#f6e58d" }} />
                  <span>Weak difference (|ES| ≤ 0.15)</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <div style={{ width: 16, height: 16, borderRadius: 8, background: "#ffbe76" }} />
                  <span>Medium difference (0.15 &lt; |ES| ≤ 0.5)</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 16, height: 16, borderRadius: 8, background: highlightColor }} />
                  <span>Strong difference (|ES| &gt; 0.5)</span>
                </div>
                <button
                  onClick={() => setLayout(l => (l === "vertical" ? "horizontal" : "vertical"))}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    background: "#fff",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                    marginBottom: 20,
                    marginTop: 20
                  }}
                >
                  {layout === "vertical" ? "Horizontal Grid View" : "Vertical List View"}
                </button>

              </div>
            )}

            {selectedLogs.length > 1 && (
              <div style={{ marginBottom: 30 }}>
                <h2 style={{ fontWeight: 700, fontSize: 16 }}>Merged DFG</h2>
                <div id="mergedDFG" style={{ height: 500, borderRadius: 16, background: "#fff", boxShadow: "0 8px 24px rgba(0,0,0,0.06)", marginBottom: 30 }} />
              </div>
            )}

            <div
              style={{
                display: layout === "horizontal" ? "grid" : "block",
                gridTemplateColumns:
                  layout === "horizontal" ? "repeat(3, 1fr)" : "none",
                gap: 20
              }}
            >
              {selectedLogs.map(name => (
                <div key={name}>
                  <h2 style={{ fontWeight: 700, fontSize: 16 }}>{name} DFG</h2>
                  <div
                    id={`dfg_${name}`}
                    style={{
                      height: layout === "horizontal" ? 250 : 400,
                      borderRadius: 16,
                      background: "#fff",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.06)"
                    }}
                  />
                </div>
              ))}
            </div>


            {dfg && <StatsDashboard stats={metrics === "frequency" ? dfg.stats : dfg.stats_elapsed} edge_stats={dfg.edge_stats} />}
          </div>

        </div>
      )}
      
        {/* Settings Overlay */}
      <SettingsOverlay
        settingsOpen={settingsOpen}
        setSettingsOpen={setSettingsOpen}
        significanceInput={significanceInput}
        setSignificanceInput={setSignificanceInput}
        setSignificance={setSignificance}
        nodeSizeInput={nodeSizeInput}
        setNodeSizeInput={setNodeSizeInput}
        setNodeSize={setNodeSize}
        edgeWidthInput={edgeWidthInput}
        setEdgeWidthInput={setEdgeWidthInput}
        setEdgeWidth={setEdgeWidth}
        nodeColor={nodeColor}
        setNodeColor={setNodeColor}
        highlightColor={highlightColor}
        setHighlightColor={setHighlightColor}
        readableMode={readableMode}
        setReadableMode={setReadableMode}
        metrics={metrics}                
        setMetrics={setMetrics}          
      />
    </div>
  );
}
