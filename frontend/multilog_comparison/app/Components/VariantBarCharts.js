'use client'
import React, { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { motion } from "framer-motion";

export default function VariantBarCharts({ variants, logNames, selectedVariants, onToggleVariant }) {
  const [menuLoaded, setMenuLoaded] = useState(false);
  const [sortOrder, setSortOrder] = useState("ascending");

  // Pagination states
  const [variantPage, setVariantPage] = useState(0);
  const variantPageSize = 5;
  const [logPage, setLogPage] = useState(0);
  const logPageSize = 3;

  useEffect(() => {
    const timer = setTimeout(() => setMenuLoaded(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (!variants?.length || !logNames?.length) return null;

  const sortVariantsByTotalFrequency = (variants, order) => {
    return variants
      .map(v => {
        const totalFrequency = v.counts_per_log?.reduce((acc, count) => acc + count, 0) || 0;
        return { ...v, totalFrequency };
      })
      .sort((a, b) => order === "ascending" ? a.totalFrequency - b.totalFrequency : b.totalFrequency - a.totalFrequency);
  };

  const sortedVariants = sortVariantsByTotalFrequency(variants, sortOrder);

  // Variant pagination
  const totalVariantPages = Math.ceil(sortedVariants.length / variantPageSize);
  const variantsPage = sortedVariants.slice(variantPage * variantPageSize, (variantPage + 1) * variantPageSize);

  // Log pagination
  const totalLogPages = Math.ceil(logNames.length / logPageSize);
  const logNamesPage = logNames.length > logPageSize ? logNames.slice(logPage * logPageSize, (logPage + 1) * logPageSize) : logNames;

  return (
    <div style={{ marginTop: 5, maxHeight: "700px", overflowY: "hidden", paddingRight: 8,  paddingBottom:5}}>
      <h3 style={{ fontWeight: 700, marginBottom: 10, fontSize: 13, color: "#333" }}>Variant Selection</h3>

      {/* Controls container */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6, flexWrap: 'wrap' }}>
        {/* Sort Button */}
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

        {/* Variant Pagination */}
        {sortedVariants.length > variantPageSize && (
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ fontSize:12, fontWeight:600 }}>Variants:</span>
            <button disabled={variantPage === 0} onClick={() => setVariantPage(variantPage - 1)} style={{ padding:'4px 10px', borderRadius:4, border:'1px solid #ccc', cursor: variantPage===0?'not-allowed':'pointer' }}>Prev</button>
            <span style={{ fontSize:12 }}>{variantPage+1}/{totalVariantPages}</span>
            <button disabled={variantPage===totalVariantPages-1} onClick={() => setVariantPage(variantPage + 1)} style={{ padding:'4px 10px', borderRadius:4, border:'1px solid #ccc', cursor: variantPage===totalVariantPages-1?'not-allowed':'pointer' }}>Next</button>
          </div>
        )}

        {/* Log Pagination */}
        {logNames.length > logPageSize && (
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ fontSize:12, fontWeight:600 }}>Logs:</span>
            <button disabled={logPage===0} onClick={()=>setLogPage(logPage-1)} style={{ padding:'4px 10px', borderRadius:4, border:'1px solid #ccc', cursor: logPage===0?'not-allowed':'pointer' }}>Prev</button>
            <span style={{ fontSize:12 }}>{logPage+1}/{totalLogPages}</span>
            <button disabled={logPage===totalLogPages-1} onClick={()=>setLogPage(logPage+1)} style={{ padding:'4px 10px', borderRadius:4, border:'1px solid #ccc', cursor: logPage===totalLogPages-1?'not-allowed':'pointer' }}>Next</button>
          </div>
        )}
      </div>

      {!menuLoaded && <div>Loading menu...</div>}

      {menuLoaded && variantsPage.map((v, idx) => {
        const maxCount = Math.max(0, ...v.counts_per_log);
        const yTicks = maxCount <= 3 ? [0,1,2,3] : [0, Math.ceil(maxCount/3), Math.ceil(maxCount/3)*2, Math.max(maxCount, Math.ceil(maxCount/3)*3)];

        // Slice counts for current log page
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
            style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 12px', height:120, marginBottom:12, borderRadius:12, background:'#fff', boxShadow:'0 6px 18px rgba(0,0,0,0.06)' }}
          >
            <label style={{ display:'flex', alignItems:'center', gap:8, flex:1, cursor:'pointer' }}>
              <input type="checkbox" style={{ alignSelf:'center' }} checked={selectedVariants?.has(v.key)} onChange={() => onToggleVariant && onToggleVariant(v.key)} />
              <div style={{ fontWeight:600, fontSize:13, color:'#111', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', display:'flex', alignItems:'center' }}>
                {v.sequence.join(' → ')}
              </div>
            </label>

            <div style={{ width:180, height:'100%', display:'flex', alignItems:'stretch', justifyContent:'stretch', overflow:'hidden' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top:2, right:4, left:4, bottom:4 }}>
                  <CartesianGrid horizontal={true} vertical={false} strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="logIndex" height={18} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(value)=>`Log ${value}`} />
                  <YAxis tick={{ fontSize:10 }} axisLine={false} tickLine={false} ticks={yTicks} domain={[0, Math.max(3, maxCount)]} width={30} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#4e79a7" radius={[6,6,6,6]} barCategoryGap="10%" maxBarSize={80} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
