// SettingsOverlay.jsx
import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SettingsOverlay({
  settingsOpen,
  setSettingsOpen,
  significanceInput,
  setSignificanceInput,
  setSignificance,
  nodeSizeInput,
  setNodeSizeInput,
  setNodeSize,
  edgeWidthInput,
  setEdgeWidthInput,
  setEdgeWidth,
  nodeColor,
  setNodeColor,
  highlightColor,
  setHighlightColor,
  readableMode,
  setReadableMode,
  metrics,
  setMetrics
}) {
  const innerRef = useRef(null);

  // Detect clicks outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (innerRef.current && !innerRef.current.contains(e.target)) {
        setSettingsOpen(false);
      }
    };

    if (settingsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [settingsOpen, setSettingsOpen]);

  return (
    <AnimatePresence>
      {settingsOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.3)',
            zIndex: 50,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
            overflowY: 'auto'
          }}
        >
          <motion.div
            ref={innerRef} // <-- CHANGED: inner box ref
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            transition={{ duration: 0.3 }}
            style={{
              width: '480px',
              maxHeight: '90vh',
              padding: 40,
              borderRadius: 20,
              background: '#fff',
              boxShadow: '0 16px 48px rgba(0,0,0,0.15)',
              overflowY: 'auto',
              position: 'relative'
            }}
          >
            <h2 style={{ marginBottom: 24, fontWeight: 700, fontSize: 20 }}>Settings</h2>
            <button
              onClick={() => setSettingsOpen(false)}
              style={{
                position: 'absolute',
                top: 20,
                right: 20,
                background: 'none',
                border: 'none',
                fontSize: 20,
                cursor: 'pointer'
              }}
            >
              ✕
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>


              {/* Node Colors */}
              <label>
                Normal Node Color
                <input type="color" value={nodeColor} onChange={(e) => setNodeColor(e.target.value)} style={{ width: '100%' }} />
              </label>
              <label>
                Highlight Node Color
                <input type="color" value={highlightColor} onChange={(e) => setHighlightColor(e.target.value)} style={{ width: '100%' }} />
              </label>

              {/* Readable Mode */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="checkbox"
                  checked={readableMode}
                  onChange={() => setReadableMode(!readableMode)}
                />
                Enable Readable DFG Mode
              </label>

              {/* Metrics Selection */}
              <label style={{ marginTop: 10 }}>
                Metrics:
                <select
                  value={metrics}
                  onChange={(e) => setMetrics(e.target.value)}
                  style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #ccc' }}
                >
                  <option value="frequency">Frequency</option>
                  <option value="elapsed">Elapsed Time</option>
                </select>
              </label>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
