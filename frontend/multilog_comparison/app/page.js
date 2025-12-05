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
import { useSession, signIn, signOut } from "next-auth/react"; // 引入useSession和signIn、signOut

// ---------------- Home / Main Component ----------------
export default function Home() {
  const { data: session, status } = useSession(); // 使用useSession钩子获取用户的登录状态

  const {
    files, setFiles, dfg, setDfg, selectedLogs, setSelectedLogs,
    selectedVariants, setSelectedVariants, nodeSize, setNodeSize, 
    nodeSizeInput, setNodeSizeInput, edgeWidth, setEdgeWidth,
    edgeWidthInput, setEdgeWidthInput, significance, setSignificance,
    significanceInput, setSignificanceInput, nodeColor, setNodeColor,
    highlightColor, setHighlightColor, readableMode, setReadableMode,
    containerRefs, networkInstances, nodePositions, edgeBubble, setEdgeBubble,
    edgeBubbleRef, nodeBubble, setNodeBubble, nodeBubbleRef,settingsOpen, setSettingsOpen,sidebarOpen, setSidebarOpen
  } = useDfgState();

   useEffect(() => {
    if (status === "loading") return; // 等待加载完成

    if (!session) {
      // 如果未登录，直接调用GitHub登录
      signIn("github");
    }
  }, [session, status]); // 依赖 session 和 status
  
  useEffect(() => { edgeBubbleRef.current = edgeBubble; }, [edgeBubble]); // keep a ref in sync so vis event handlers can read latest bubble state
 
  useEffect(() => { nodeBubbleRef.current = nodeBubble; }, [nodeBubble]);

useEffect(() => {
    if (!dfg) return;

    // Check if we have already calculated the node positions
    if (Object.keys(nodePositions.current).length > 0) return;

    const nodeIds = dfg.nodes || [];
    if (!nodeIds.length) return;

    // Prepare start and end node lists
    const mergedStartNodes = new Set();
    const mergedEndNodes = new Set();

    selectedLogs.forEach(name => {
        const idx = dfg.log_names.indexOf(name);
        dfg.dfgs_start_nodes?.[idx]?.forEach(n => mergedStartNodes.add(n));
        dfg.dfgs_end_nodes?.[idx]?.forEach(n => mergedEndNodes.add(n));
    });

    // Define spacing for nodes

    const horizontalSpacing = 500; // Space between nodes horizontally for middle nodes
    const individualVerticalSpacing = 60; // Adjusted vertical spacing for individual DFGs (closer to connected nodes)

    // Group nodes by their type (start, end, both)
    const startNodes = Array.from(mergedStartNodes);
    const endNodes = Array.from(mergedEndNodes);
    const middleNodes = nodeIds.filter(id => mergedStartNodes.has(id) && mergedEndNodes.has(id));

    // Position start nodes (upper half)
    startNodes.forEach((id, idx) => {
        nodePositions.current[id] = {
            x: 100, // Place at the center horizontally
            y: -individualVerticalSpacing * (idx + 1), // Adjusted vertical spacing for each start node
        };
    });

    // Position end nodes (lower half)
    endNodes.forEach((id, idx) => {
        nodePositions.current[id] = {
            x: 0, // Place at the center horizontally
            y: individualVerticalSpacing * (idx + 1), // Adjusted vertical spacing for each end node
        };
    });

    // Position middle nodes (spread horizontally with enough space)
    const horizontalStartX = -(middleNodes.length - 1) * horizontalSpacing / 2; // Center the middle nodes horizontally
    middleNodes.forEach((id, idx) => {
        nodePositions.current[id] = {
            x: horizontalStartX + idx * horizontalSpacing, // Horizontal spacing
            y: 0, // All placed on the same vertical level
        };
    });



    // Add positions for START and END nodes for individual DFGs (closer to connected nodes)
    nodePositions.current["START"] = {
        x: 0, // Place START node at the center horizontally
        y: -individualVerticalSpacing * (startNodes.length + 2), // Place it above all start nodes
    };
    nodePositions.current["END"] = {
        x: 0, // Place END node at the center horizontally
        y: individualVerticalSpacing * (endNodes.length+2), // Place it below all end nodes
    };

    // Log for debugging
    console.log(`Start Nodes: ${JSON.stringify(startNodes)}`);
    console.log(`End Nodes: ${JSON.stringify(endNodes)}`);
    console.log(`Middle Nodes: ${JSON.stringify(middleNodes)}`);
    console.log(`Node Positions:`, nodePositions.current);

}, [dfg, selectedLogs]);



useEffect(() => {
    if (!dfg) return;

    const effectiveNodeSize = readableMode ? Math.max(nodeSize, 28) : nodeSize;
    const effectiveFontSize = readableMode ? 22 : 18;
    const effectiveEdgeWidth = readableMode ? Math.max(edgeWidth, 3) : edgeWidth;
    const showEdgeLabels = readableMode;

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
            size: effectiveNodeSize,
            font: { color: "#111", size: effectiveFontSize },
            shape: "box",
          })),
          {
            id: "START",
            label: "START",
            shape: "triangle", // Triangle shape for START node
            size: effectiveNodeSize,
            font: { color: "#111", size: effectiveFontSize },
          },
          {
            id: "END",
            label: "END",
            shape: "box", // Box shape for END node
            size: effectiveNodeSize,
            font: { color: "#111", size: effectiveFontSize },
          }
        ]
      );

      const edges = new DataSet(
        [
          ...dfg.dfgs[idx].map(({ from, to, freq }) => ({
            from, to, freq,
            label: showEdgeLabels ? String(freq) : undefined,
            font: showEdgeLabels ? { size: 14, strokeWidth: 2, strokeColor: "#ffffff" } : undefined,
            width: Math.min((freq*1.1 + 1),7),
            arrows: { to: { enabled: true, scaleFactor: 0.5 } },
            smooth: { type: 'continuous', roundness: 0.7, offset: 0.7 }
          })),
          ...startNodes.map(node => ({
            from: "START",
            to: node,
            dashes: true, // Add dashed lines for connections from START node,
            arrows: { to: { enabled: true, scaleFactor: 0.5 } } ,// Add arrows for connections from START
            width: 2,
            smooth: { type: 'continuous', roundness: 0.5, offset: 0.8 } // Slight offset to prevent overlap
          })),
          ...endNodes.map(node => ({
            from: node,
            to: "END",
            color: "#97c2fc",
            dashes: true, // Add dashed lines for connections from END node
            arrows: { to: { enabled: true, scaleFactor: 0.5 } }, // Add arrows for connections from START
            width: 2,
             smooth: { type: 'continuous', roundness: 0.3, offset: 0.3 } // Slight offset to prevent overlap
          }))
        ]
      );

      renderDFG(nodes, edges, containerRefs.current[name], name);
    });

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
            color: getNodeColor(dfg.stats[n], true),
            size: effectiveNodeSize,
            font: { color: "#111", size: readableMode ? 20 : 18 },
            shape: "box"
          })),
          {
            id: "START",
            label: "START",
            shape: "triangle", // Triangle shape for START node
            size: effectiveNodeSize,
            font: { color: "#111", size: readableMode ? 20 : 18 }
          },
          {
            id: "END",
            label: "END",
            shape: "box", // Box shape for END node
            size: effectiveNodeSize,
            font: { color: "#111", size: readableMode ? 20 : 18 }
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
          if (mergedEdgesMap[key] || mergedEdgesMap[revKey]) return; // skip reverse
          mergedEdgesMap[key] = (mergedEdgesMap[key] || 0) + freq;
        });
      });

      const mergedEdges = new DataSet(
        [
          ...Object.entries(mergedEdgesMap).map(([k, freq]) => {
            const [from, to] = k.split("->");
            return {
              from, to, freq,
              label: showEdgeLabels ? String(freq) : undefined,
              font: showEdgeLabels ? { size: 14, strokeWidth: 2, strokeColor: "#ffffff" } : undefined,
              width: Math.min(freq * 1.1 + 1, 7),
              arrows: { to: { enabled: true, scaleFactor: 0.3 } },
             
            };
          }),
          ...Array.from(mergedStartNodes).map(node => ({
            from: "START",
            to: node,
            dashes: true, // Add dashed lines for connections from START node
            width: 2,
            arrows: { to: { enabled: true, scaleFactor: 0.5 } }, // Arrows added to dashed edges from START
              smooth: { type: 'continuous', roundness: 0.7, offset: 1} // Slight offset to prevent overlap
          })),
          ...Array.from(mergedEndNodes).map(node => ({
            from: node,
            to: "END",
            dashes: true, // Add dashed lines for connections from END node
            width: 2,
             color: "#97c2fc",
             arrows: { to: { enabled: true, scaleFactor: 0.5 } }, // Arrows added to dashed edges from END
             smooth: { type: 'continuous', roundness: 0.9, offset: 1 } // Slight offset to prevent overlap
          }))
        ]
      );

      renderDFG(mergedNodes, mergedEdges, containerRefs.current["merged"], "merged");
    }
  }, [dfg, selectedLogs, nodeSize, edgeWidth, significance, nodeColor, highlightColor, readableMode]);


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
    edges: { smooth: true }, // force straight
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

      setNodeBubble({ visible: true, node: nodeId, stats: statsRow, x: bubbleX, y: bubbleY, logName });
      

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

  return (
    <div style={{ minHeight: "100vh", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif", background: "#f3f3f7" }}>
      {/* Edge context bubble */}
      <EdgeBubble edgeBubble={edgeBubble} />

      {/* Node context bubble (merged DFG only) */}
      <NodeBubble nodeBubble={nodeBubble} significance={significance} />

      {/* Interface before & after file upload*/}
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
      />
    </div>
  );
}
