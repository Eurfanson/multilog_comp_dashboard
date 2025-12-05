'use client'
import React, { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { motion } from "framer-motion";

export default function VariantBarCharts({ variants, logNames, selectedVariants, onToggleVariant }) {
  const [menuLoaded, setMenuLoaded] = useState(false);  // Track if the menu has finished loading
  const [sortOrder, setSortOrder] = useState("ascending");  // Track the sort order

  // Simulate menu loading (you can replace this with actual loading logic)
  useEffect(() => {
    const timer = setTimeout(() => {
      setMenuLoaded(true);  // Set to true after 1 second (simulate loading)
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (!variants?.length || !logNames?.length) return null;

  // Function to sort variants based on total frequency across all logs
  const sortVariantsByTotalFrequency = (variants, order) => {
    // Sort variants based on the total frequency across all logs
    return variants
      .map(v => {
        const totalFrequency = v.counts_per_log?.reduce((acc, count) => acc + count, 0) || 0;
        return { ...v, totalFrequency };
      })
      .sort((a, b) => {
        return order === "ascending" ? a.totalFrequency - b.totalFrequency : b.totalFrequency - a.totalFrequency;
      });
  };

  // Sorted variants based on the selected sort order
  const sortedVariants = sortVariantsByTotalFrequency(variants, sortOrder);

  return (
    <div style={{ marginTop: 12, maxHeight: "780px", overflowY: "auto", paddingRight: 8 }}>
      <h3 style={{ fontWeight: 700, marginBottom: 10, fontSize: 13, color: "#333" }}>Variant Selection</h3>

      {/* Sorting Controls */}
      <div style={{ marginBottom: 10 }}>
        <button
          onClick={() => setSortOrder(sortOrder === "ascending" ? "descending" : "ascending")}
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
      </div>

      {/* If menu has not finished loading, don't show bar charts */}
      {!menuLoaded && <div>Loading menu...</div>}

      {/* Once the menu is loaded, display the bar charts with a delay */}
      {menuLoaded && sortedVariants.map((v, idx) => {
        const maxCount = Math.max(0, ...v.counts_per_log);

        let yTicks;
        if (maxCount <= 3) {
          yTicks = [0, 1, 2, 3];
        } else {
          const step = Math.ceil(maxCount / 3);
          yTicks = [0, step, step * 2, Math.max(maxCount, step * 3)];
        }

        // Prepare data for bar chart
        const data = logNames.map((_, idx) => ({
          logIndex: (idx + 1).toString(),
          count: v.counts_per_log?.[idx] || 0
        }));

        return (
          <motion.div
            key={v.key}
            initial={{ opacity: 0 }}   // Start with opacity 0 (hidden)
            animate={{ opacity: 1 }}    // Fade in to opacity 1
            transition={{ delay: idx * 0.2 }} // Stagger the charts with delay based on index
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '14px 12px',
              height: 120,
              marginBottom: 12,
              borderRadius: 12,
              background: '#fff',
              boxShadow: '0 6px 18px rgba(0,0,0,0.06)',
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, cursor: 'pointer' }}>
              <input
                type="checkbox"
                style={{ alignSelf: 'center' }}
                checked={selectedVariants?.has(v.key)}
                onChange={() => onToggleVariant && onToggleVariant(v.key)}
              />
              <div style={{ fontWeight: 600, fontSize: 13, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center' }}>
                {v.sequence.join(' → ')}
              </div>
            </label>

            <div style={{ width: 180, height: '100%', display: 'flex', alignItems: 'stretch', justifyContent: 'stretch' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 2, right: 4, left: 4, bottom: 4 }}>
                  <CartesianGrid horizontal={true} vertical={false} strokeDasharray="3 3" stroke="#f0f0f0" />

                  {/* Custom X-Axis Labels */}
                  <XAxis
                    dataKey="logIndex"
                    height={18}
                    tick={{ fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => `Log ${value}`} // Custom label format
                  />

                  <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} ticks={yTicks} domain={[0, Math.max(3, maxCount)]} width={30} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#4e79a7" radius={[6, 6, 6, 6]} barCategoryGap="10%" maxBarSize={80} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
