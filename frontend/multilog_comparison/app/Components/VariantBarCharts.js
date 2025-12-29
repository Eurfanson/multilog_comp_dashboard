'use client'
import React, { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { motion } from "framer-motion";

export default function VariantBarCharts({ variants, logNames, selectedVariants, onToggleVariant }) {
  const [menuLoaded, setMenuLoaded] = useState(false);
  const [sortOrder, setSortOrder] = useState("ascending");

  const [chevronTooltip, setChevronTooltip] = useState({
    visible: false,
    text: "",
    x: 0,
    y: 0
  });

  const [variantPage, setVariantPage] = useState(0);
  const variantPageSize = 5;
  const [logPage, setLogPage] = useState(0);
  const logPageSize = 3;

  useEffect(() => {
    const timer = setTimeout(() => setMenuLoaded(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (!variants?.length || !logNames?.length) return null;

  // Collect all unique activities and assign fixed colors
  const allActivities = new Set();
  variants.forEach(v => {
    v.sequence.forEach(s => allActivities.add(s));
  });
  const uniqueActivities = Array.from(allActivities);

  const activityColors = [
    "#e74c3c", // red
    "#ff8c00", // dark vibrant orange
    "#ffd700", // bright gold yellow
    "#27ae60", // green
    "#3498db", // blue
    "#9b59b6", // purple
    "#d35400", // darker orange
    "#1abc9c", // teal
  ];

  const activityColorMap = {};
  uniqueActivities.forEach((act, i) => {
    activityColorMap[act] = activityColors[i % activityColors.length];
  });

  const getColorForActivity = (activityName) => {
    return activityColorMap[activityName] || '#999';
  };

  const sortVariantsByTotalFrequency = (variants, order) => {
    return variants
      .map(v => {
        const totalFrequency = v.counts_per_log?.reduce((acc, count) => acc + count, 0) || 0;
        return { ...v, totalFrequency };
      })
      .sort((a, b) => order === "ascending" ? a.totalFrequency - b.totalFrequency : b.totalFrequency - a.totalFrequency);
  };

  const sortedVariants = sortVariantsByTotalFrequency(variants, sortOrder);

  const totalVariantPages = Math.ceil(sortedVariants.length / variantPageSize);
  const variantsPage = sortedVariants.slice(variantPage * variantPageSize, (variantPage + 1) * variantPageSize);

  const totalLogPages = Math.ceil(logNames.length / logPageSize);
  const logNamesPage = logNames.length > logPageSize ? logNames.slice(logPage * logPageSize, (logPage + 1) * logPageSize) : logNames;

  const logsPerPagination = 3;
  const totalPaginationPages = Math.ceil(logNames.length / logsPerPagination);

  return (
    <div style={{ marginTop: 5, maxHeight: "700px", overflowY: "hidden", paddingRight: 8, paddingBottom: 5, position: "relative" }}>
      <h3 style={{ fontWeight: 700, marginBottom: 10, fontSize: 13, color: "#333" }}>Variant Selection</h3>

      {/* Controls container */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6, flexWrap: 'wrap' }}>
        <button
          onClick={() => { setSortOrder(sortOrder === "ascending" ? "descending" : "ascending"); setVariantPage(0); }}
          style={{
            padding: "6px 12px",
            backgroundColor: "#4e79a7",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "bold",
          }}
        >
          {sortOrder === "ascending" ? "Sort Descending" : "Sort Ascending"}
        </button>

        {sortedVariants.length > variantPageSize && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Variants:</span>
            <button disabled={variantPage === 0} onClick={() => setVariantPage(variantPage - 1)} style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid #ccc', cursor: variantPage === 0 ? 'not-allowed' : 'pointer' }}>Prev</button>
            <span style={{ fontSize: 12 }}>{variantPage + 1}/{totalVariantPages}</span>
            <button disabled={variantPage === totalVariantPages - 1} onClick={() => setVariantPage(variantPage + 1)} style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid #ccc', cursor: variantPage === totalVariantPages - 1 ? 'not-allowed' : 'pointer' }}>Next</button>
          </div>
        )}

        {logNames.length > logsPerPagination && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Logs:</span>
            <button disabled={logPage === 0} onClick={() => setLogPage(logPage - 1)} style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid #ccc', cursor: logPage === 0 ? 'not-allowed' : 'pointer' }}>Prev</button>
            <span style={{ fontSize: 12 }}>{logPage + 1}/{totalPaginationPages}</span>
            <button disabled={logPage === totalPaginationPages - 1} onClick={() => setLogPage(logPage + 1)} style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid #ccc', cursor: logPage === totalPaginationPages - 1 ? 'not-allowed' : 'pointer' }}>Next</button>
          </div>
        )}

{/* Activity Legend - Top Right, Horizontal Scrollable */}
<div
  style={{
    position: "absolute",
    top: 0,
    right: 16,
    background: "rgba(255, 255, 255, 0.95)",
    border: "1px solid #e0e0e0",
    borderRadius: "8px",
    padding: "10px 12px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    maxWidth: "35%",          // limits width so it doesn't stretch too far left
    maxHeight: "80px",        // keeps it compact vertically
    overflowX: "auto",        // horizontal scroll
    overflowY: "hidden",
    zIndex: 9999,
    fontSize: "12px",
    display: "flex",
    flexDirection: "column",
  }}
>
  <div style={{ fontWeight: 700, marginBottom: 5, fontSize: "13px", color: "#333", flexShrink: 0 }}>
    Activity Legend
  </div>
  <div
    style={{
      display: "flex",
      gap: 12,
      paddingBottom: 4,       // small space for scrollbar
      minWidth: "max-content", // ensures items don't wrap or shrink
    }}
  >
    {uniqueActivities.map((activity) => (
      <div
        key={activity}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexShrink: 0,
          whiteSpace: "nowrap",
        }}
      >
        <div
          style={{
            width: 14,
            height: 14,
            backgroundColor: getColorForActivity(activity),
            borderRadius: "3px",
            flexShrink: 0,
          }}
        />
        <span style={{ color: "#444" }}>{activity}</span>
      </div>
    ))}
  </div>
</div>

      </div>



      {!menuLoaded && <div>Loading menu...</div>}

      {menuLoaded && variantsPage.map((v, idx) => {
        const maxCount = Math.max(0, ...v.counts_per_log);
        const yTicks = maxCount <= 3 ? [0, 1, 2, 3] : [0, Math.ceil(maxCount / 3), Math.ceil(maxCount / 3) * 2, Math.max(maxCount, Math.ceil(maxCount / 3) * 3)];

        const countsPage = logNames.length > logPageSize ? v.counts_per_log.slice(logPage * logPageSize, (logPage + 1) * logPageSize) : v.counts_per_log;

        const data = logNamesPage.map((_, i) => ({
          logIndex: (logPage * logPageSize + i + 1).toString(),
          count: countsPage[i] || 0
        }));

        return (
          <motion.div
            key={v.key}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: idx * 0.2 }}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 12px', height: 120, marginBottom: 12, borderRadius: 12, background: '#fff', boxShadow: '0 6px 18px rgba(0,0,0,0.06)', position: 'relative' }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, cursor: 'pointer' }}>
              <input
                type="checkbox"
                style={{ alignSelf: 'center' }}
                checked={selectedVariants?.has(v.key)}
                onChange={() => onToggleVariant && onToggleVariant(v.key)}
              />

              <div style={{ display: 'flex', alignItems: 'center', gap: 0, position: 'relative' }}>
                {v.sequence.map((s, i) => (
                  <div
                    key={i}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setChevronTooltip({
                        visible: true,
                        text: s,
                        x: rect.left + rect.width / 2,
                        y: rect.top - 10
                      });
                    }}
                    onMouseLeave={() => setChevronTooltip({ visible: false, text: "", x: 0, y: 0 })}
                    style={{
                      padding: '4px 20px 10px 30px',
                      background: getColorForActivity(s),
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 600,
                      clipPath: 'polygon(12px 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 12px 100%, 18% 50%)',
                      marginLeft: i === 0 ? 0 : -17,
                      whiteSpace: 'nowrap',
                      cursor: 'default',
                      transition: 'transform 0.1s',
                    }}
                    onMouseMove={(e) => {
                      if (chevronTooltip.visible && chevronTooltip.text === s) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setChevronTooltip(prev => ({
                          ...prev,
                          x: rect.left + rect.width / 2,
                          y: rect.top - 10
                        }));
                      }
                    }}
                  >
                    {s}
                  </div>
                ))}
              </div>
            </label>

            <div style={{ width: 180, height: '100%', display: 'flex', alignItems: 'stretch', justifyContent: 'stretch', overflow: 'hidden' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 2, right: 4, left: 4, bottom: 4 }}>
                  <CartesianGrid horizontal={true} vertical={false} strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="logIndex" height={18} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(value) => `Log ${value}`} />
                  <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} ticks={yTicks} domain={[0, Math.max(3, maxCount)]} width={30} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#4e79a7" radius={[6, 6, 6, 6]} barCategoryGap="10%" maxBarSize={80} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        );
      })}

      {/* Tooltip Bubble */}
      {chevronTooltip.visible && (
        <div
          style={{
            position: "fixed",
            left: chevronTooltip.x,
            top: chevronTooltip.y,
            transform: "translate(-50%, -100%)",
            background: "white",
            color: "#333",
            padding: "6px 12px",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            fontSize: 13,
            fontWeight: 600,
            pointerEvents: "none",
            zIndex: 10000,
            whiteSpace: "nowrap",
          }}
        >
          {chevronTooltip.text}
        </div>
      )}
    </div>
  );
}