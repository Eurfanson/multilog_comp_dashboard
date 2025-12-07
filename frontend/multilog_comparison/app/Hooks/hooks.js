import { useState, useEffect, useRef } from "react";

export const useDfgState = () => {
  const [files, setFiles] = useState([]);
  const [dfg, setDfg] = useState(null);
  const [selectedLogs, setSelectedLogs] = useState([]);
  const [selectedVariants, setSelectedVariants] = useState(new Set());
  const [nodeSize, setNodeSize] = useState(22);
  const [nodeSizeInput, setNodeSizeInput] = useState("22");
  const [edgeWidth, setEdgeWidth] = useState(2);
  const [edgeWidthInput, setEdgeWidthInput] = useState("2");
  const [significance, setSignificance] = useState(0.05);
  const [significanceInput, setSignificanceInput] = useState("0.05");
  const [nodeColor, setNodeColor] = useState("#55efc4");
  const [nodeFreq, setNodeFreq] = useState({});
  const [highlightColor, setHighlightColor] = useState("#ff3b30");
  const [readableMode, setReadableMode] = useState(false);

  const containerRefs = useRef({});
  const networkInstances = useRef({});
  const nodePositions = useRef({});
  const [edgeBubble, setEdgeBubble] = useState({
  visible: false,
  edge: null,
  x: 0,
  y: 0,
  logName: null,
  fromNode: null,  // Add fromNode
  toNode: null,    // Add toNode
  frequency: null,  // Add frequency
  
});

  const edgeBubbleRef = useRef(edgeBubble);
  const [nodeBubble, setNodeBubble] = useState({ visible: false, node: null, x: 0, y: 0, logName: null });
  const nodeBubbleRef = useRef(nodeBubble);
  const [settingsOpen, setSettingsOpen] = useState(false); // Declare settingsOpen
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [step, setStep] = useState(0);
  return {
    files,
    setFiles,
    dfg,
    setDfg,
    selectedLogs,
    setSelectedLogs,
    selectedVariants,
    setSelectedVariants,
    nodeSize,
    setNodeSize,
    nodeSizeInput,
    setNodeSizeInput,
    edgeWidth,
    setEdgeWidth,
    edgeWidthInput,
    setEdgeWidthInput,
    significance,
    setSignificance,
    significanceInput,
    setSignificanceInput,
    nodeColor,
    setNodeColor,
    highlightColor,
    setHighlightColor,
    readableMode,
    setReadableMode,
    containerRefs,
    networkInstances,
    nodePositions,
    edgeBubble,
    setEdgeBubble,
    edgeBubbleRef,
    nodeBubble,
    setNodeBubble,
    nodeBubbleRef,
    settingsOpen,
    setSettingsOpen,
    sidebarOpen,
    setSidebarOpen,
    step,
    setStep,
    nodeFreq, 
    setNodeFreq
  };
};

export const useAuth = () => {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") {
      signIn("github"); // triggers GitHub login redirect
    }
  }, [status]);

  return session;
};
