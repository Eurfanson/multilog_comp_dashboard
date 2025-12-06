import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Floating animated circles
const FloatingCircle = ({ size = 100, x, y, delay = 0, color1 = "#4f46e5", color2 = "#6366f1" }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.5 }}
    animate={{ opacity: 0.2, scale: 1, y: [0, 20, 0] }}
    transition={{ repeat: Infinity, duration: 6, delay }}
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: `radial-gradient(circle, ${color1}, ${color2})`,
      position: "absolute",
      top: y,
      left: x,
      zIndex: 0,
    }}
  />
);

// Steps generator
export const getSteps = ({ handleFileChange, setStep }) => [
  // Intro Step
  <motion.div
    key="intro"
    initial={{ opacity: 0, y: 40 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -40 }}
    transition={{ duration: 0.8 }}
    style={{
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 24,
      color: "#fff",
      overflow: "hidden",
      background: "linear-gradient(135deg, #4f46e5, #6366f1, #a78bfa)",
    }}
  >
    <FloatingCircle size={150} x="10%" y="20%" delay={0} />
    <FloatingCircle size={200} x="70%" y="10%" delay={2} />
    <FloatingCircle size={100} x="50%" y="70%" delay={4} />

    <motion.h1
      initial={{ scale: 0.8 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.6 }}
      style={{ fontSize: 36, fontWeight: 800, textShadow: "0 4px 20px rgba(0,0,0,0.3)" }}
    >
      Multi-Log DFG Dashboard
    </motion.h1>
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5, duration: 0.6, ease: "easeOut" }}
      style={{ fontSize: 18, textAlign: "center", maxWidth: 500, textShadow: "0 2px 8px rgba(0,0,0,0.2)" }}
    >
      Visualize and compare multiple event logs. Identify differences in process flows and execution times effortlessly.
    </motion.p>
    <motion.button
      onClick={() => setStep(1)}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      style={{
        padding: "14px 36px",
        borderRadius: 16,
        background: "#fff",
        color: "#4f46e5",
        fontWeight: 700,
        fontSize: 16,
        cursor: "pointer",
        boxShadow: "0 12px 28px rgba(0,0,0,0.2)",
      }}
    >
      Get Started
    </motion.button>
  </motion.div>,

  // Features Step
  <motion.div
    key="features"
    initial={{ opacity: 0, y: 40 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -40 }}
    transition={{ duration: 0.8 }}
    style={{
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 40,
      color: "#fff",
      overflow: "hidden",
      background: "linear-gradient(135deg, #6366f1, #a78bfa, #8b5cf6)",
    }}
  >
    <FloatingCircle size={120} x="15%" y="30%" delay={1} />
    <FloatingCircle size={160} x="75%" y="20%" delay={3} />

    <motion.h2 style={{ fontSize: 32, fontWeight: 700, textShadow: "0 3px 12px rgba(0,0,0,0.2)" }}>
      Features
    </motion.h2>

    <motion.div
      style={{
        display: "flex",
        gap: 30,
        flexWrap: "wrap",
        justifyContent: "center",
      }}
    >
      {[
        { title: "Upload CSV Logs", desc: "Import multiple event logs in seconds." },
        { title: "Compare Processes", desc: "Use DFGs to see differences between logs." },
        { title: "Statistical Insights", desc: "Automatically detect significant differences." },
      ].map((f, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.2 }}
          whileHover={{ scale: 1.05 }}
          style={{
            background: "rgba(255,255,255,0.15)",
            backdropFilter: "blur(10px)",
            padding: 24,
            borderRadius: 24,
            boxShadow: "0 12px 24px rgba(0,0,0,0.2)",
            width: 220,
            textAlign: "center",
            color: "#fff",
          }}
        >
          <h3 style={{ fontWeight: 700, fontSize: 20 }}>{f.title}</h3>
          <p style={{ fontSize: 14, marginTop: 8 }}>{f.desc}</p>
        </motion.div>
      ))}
    </motion.div>

    <motion.button
      onClick={() => setStep(2)}
      whileHover={{ scale: 1.05 }}
      style={{
        padding: "14px 32px",
        borderRadius: 16,
        background: "#fff",
        color: "#6366f1",
        fontWeight: 700,
        fontSize: 16,
        cursor: "pointer",
        boxShadow: "0 12px 28px rgba(0,0,0,0.2)",
        marginTop: 40,
      }}
    >
      Upload Your Logs
    </motion.button>
  </motion.div>,

  // Upload Step
  <motion.div
    key="upload"
    initial={{ opacity: 0, y: 40 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -40 }}
    transition={{ duration: 0.8 }}
    style={{
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      gap: 24,
      color: "#fff",
      overflow: "hidden",
      background: "linear-gradient(135deg, #a78bfa, #8b5cf6, #c084fc)",
    }}
  >
    <FloatingCircle size={100} x="10%" y="20%" delay={0.5} />
    <FloatingCircle size={140} x="70%" y="10%" delay={2.5} />

    <motion.h2 style={{ fontSize: 32, fontWeight: 700, textShadow: "0 2px 12px rgba(0,0,0,0.3)" }}>
      Upload CSV Logs
    </motion.h2>

    <motion.label
      style={{
        display: "inline-block",
        padding: "16px 32px",
        borderRadius: 18,
        background: "#fff",
        color: "#4f46e5",
        fontWeight: 600,
        cursor: "pointer",
        boxShadow: "0 8px 20px rgba(0,0,0,0.2)",
        userSelect: "none",
      }}
      whileHover={{ scale: 1.03 }}
    >
      Start Process Discovery
      <input
        type="file"
        multiple
        accept=".csv"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
    </motion.label>

    <motion.p style={{ fontSize: 14, marginTop: 12, color: "#fff" }}>
      Drag & drop your CSV files or click to select
    </motion.p>
  </motion.div>,
];


