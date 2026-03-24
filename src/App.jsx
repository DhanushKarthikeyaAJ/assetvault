import { useState, useEffect, useMemo, useRef } from "react";

// ── Google Fonts: DM Sans (body) + Playfair Display (headings) ───────────────
const fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href = "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Mono:wght@400;500&display=swap";
document.head.appendChild(fontLink);

// ── Helpers ──────────────────────────────────────────────────────────────────
const todayDate = () => new Date();
const daysUntil = (d) => { if (!d) return Infinity; return Math.ceil((new Date(d) - todayDate()) / 86400000); };
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const fmtDateShort = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—";
const statusOf = (exp) => { const d = daysUntil(exp); if (d < 0) return "expired"; if (d <= 30) return "warning"; return "safe"; };
const STATUS_COLOR = { safe: "#10b981", warning: "#f59e0b", expired: "#ef4444" };
const STATUS_LABEL = { safe: "Active", warning: "Expiring Soon", expired: "Expired" };
const STATUS_BG = { safe: "rgba(16,185,129,0.08)", warning: "rgba(245,158,11,0.08)", expired: "rgba(239,68,68,0.08)" };
const CATEGORIES = ["Domain", "SSL Certificate", "License", "Subscription", "SaaS", "API Key", "Other"];
const CAT_ICONS = { Domain: "🌐", "SSL Certificate": "🔒", License: "📋", Subscription: "♻️", SaaS: "☁️", "API Key": "🔑", Other: "📦" };
const CAT_COLOR = { Domain: "#3b82f6", "SSL Certificate": "#10b981", License: "#8b5cf6", Subscription: "#f59e0b", SaaS: "#06b6d4", "API Key": "#ec4899", Other: "#94a3b8" };

const SAMPLE = [
  { id: 1, name: "acmecorp.com", category: "Domain", purchaseDate: "2023-01-15", expirationDate: "2026-01-15", vendor: "Namecheap", cost: 12.99, notes: "Primary domain" },
  { id: 2, name: "*.acmecorp.com Wildcard SSL", category: "SSL Certificate", purchaseDate: "2024-03-01", expirationDate: new Date(Date.now() + 12 * 86400000).toISOString().slice(0,10), vendor: "DigiCert", cost: 299, notes: "Wildcard cert" },
  { id: 3, name: "Adobe Creative Cloud", category: "Subscription", purchaseDate: "2024-01-01", expirationDate: new Date(Date.now() + 45 * 86400000).toISOString().slice(0,10), vendor: "Adobe", cost: 599.88, notes: "Team plan, 10 seats" },
  { id: 4, name: "GitHub Enterprise", category: "License", purchaseDate: "2023-06-01", expirationDate: new Date(Date.now() + 90 * 86400000).toISOString().slice(0,10), vendor: "GitHub", cost: 2100, notes: "50 seats" },
  { id: 5, name: "Datadog Pro", category: "SaaS", purchaseDate: "2023-09-01", expirationDate: new Date(Date.now() - 5 * 86400000).toISOString().slice(0,10), vendor: "Datadog", cost: 1200, notes: "Monitoring & APM" },
  { id: 6, name: "Stripe API Key", category: "API Key", purchaseDate: "2024-01-01", expirationDate: new Date(Date.now() + 200 * 86400000).toISOString().slice(0,10), vendor: "Stripe", cost: 0, notes: "Production key" },
  { id: 7, name: "staging.acmecorp.com", category: "Domain", purchaseDate: "2023-01-15", expirationDate: new Date(Date.now() + 25 * 86400000).toISOString().slice(0,10), vendor: "Namecheap", cost: 12.99, notes: "Staging env" },
  { id: 8, name: "JetBrains All Products", category: "License", purchaseDate: "2024-02-01", expirationDate: new Date(Date.now() + 320 * 86400000).toISOString().slice(0,10), vendor: "JetBrains", cost: 779, notes: "Dev tooling" },
];

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const Ico = ({ p, s = 16, stroke = "currentColor", fill = "none", sw = 1.5 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {Array.isArray(p) ? p.map((d, i) => <path key={i} d={d} />) : <path d={p} />}
  </svg>
);
const I = {
  dashboard: ["M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z", "M9 22V12h6v10"],
  assets: ["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"],
  calendar: ["M8 2v4M16 2v4M3 8h18M3 6a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6z"],
  plus: "M12 5v14M5 12h14",
  search: "M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z",
  edit: ["M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7", "M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"],
  trash: ["M3 6h18", "M19 6l-1 14H6L5 6", "M8 6V4h8v2"],
  x: "M18 6L6 18M6 6l12 12",
  bell: ["M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9", "M13.73 21a2 2 0 01-3.46 0"],
  moon: "M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z",
  sun: ["M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42", "M12 8a4 4 0 100 8 4 4 0 000-8z"],
  download: ["M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4", "M7 10l5 5 5-5", "M12 15V3"],
  grid: ["M3 3h7v7H3z", "M14 3h7v7h-7z", "M14 14h7v7h-7z", "M3 14h7v7H3z"],
  list: ["M9 6h11M9 12h11M9 18h11", "M4 6h.01M4 12h.01M4 18h.01"],
  filter: "M22 3H2l8 9.46V19l4 2v-8.54z",
  sort: ["M3 6h18", "M6 12h12", "M9 18h6"],
  chevronUp: "M18 15l-6-6-6 6",
  chevronDown: "M6 9l6 6 6-6",
  dot: "",
  arrowRight: "M5 12h14M12 5l7 7-7 7",
  alert: ["M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z", "M12 9v4M12 17h.01"],
  check: "M20 6L9 17l-5-5",
  refresh: "M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15",
};

// ── Global CSS ─────────────────────────────────────────────────────────────────
const G = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=DM+Mono:wght@400;500&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --bg: #0d1117;
  --bg2: #161b22;
  --bg3: #1c2333;
  --surface: #161b22;
  --surface2: #1c2333;
  --surface3: #21262d;
  --border: rgba(255,255,255,0.06);
  --border2: rgba(255,255,255,0.10);
  --text: #e6edf3;
  --text2: #8b949e;
  --text3: #6e7681;
  --accent: #2563eb;
  --accent-light: #3b82f6;
  --accent-glow: rgba(37,99,235,0.15);
  --green: #10b981;
  --green-glow: rgba(16,185,129,0.12);
  --amber: #f59e0b;
  --amber-glow: rgba(245,158,11,0.12);
  --red: #ef4444;
  --red-glow: rgba(239,68,68,0.12);
  --font: 'DM Sans', -apple-system, sans-serif;
  --mono: 'DM Mono', monospace;
  --r: 10px;
  --r2: 14px;
  --sh: 0 1px 3px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.3);
  --sh2: 0 0 0 1px rgba(255,255,255,0.05), 0 4px 16px rgba(0,0,0,0.4);
  --trans: all 0.18s cubic-bezier(0.4,0,0.2,1);
}
.light-mode {
  --bg: #f6f8fa;
  --bg2: #ffffff;
  --bg3: #f0f2f5;
  --surface: #ffffff;
  --surface2: #f6f8fa;
  --surface3: #eaeef2;
  --border: rgba(0,0,0,0.07);
  --border2: rgba(0,0,0,0.12);
  --text: #1c2128;
  --text2: #57606a;
  --text3: #8c959f;
  --accent-glow: rgba(37,99,235,0.08);
  --green-glow: rgba(16,185,129,0.08);
  --amber-glow: rgba(245,158,11,0.08);
  --red-glow: rgba(239,68,68,0.08);
  --sh: 0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.06);
  --sh2: 0 0 0 1px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.08);
}
html, body { height: 100%; background: var(--bg); }
.app {
  font-family: var(--font);
  font-size: 14px;
  color: var(--text);
  background: var(--bg);
  min-height: 100vh;
  display: flex;
  transition: background 0.2s, color 0.2s;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

/* ── Sidebar ───────────────────────────────────────────── */
.sb {
  width: 248px;
  min-width: 248px;
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0; left: 0; bottom: 0;
  z-index: 50;
  transition: background 0.2s;
}
.sb-logo {
  padding: 22px 20px 18px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 10px;
}
.sb-logo-icon {
  width: 34px; height: 34px;
  background: var(--accent);
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
  box-shadow: 0 0 0 1px rgba(255,255,255,0.1), 0 4px 12px rgba(37,99,235,0.4);
}
.sb-logo-text { font-size: 15px; font-weight: 700; letter-spacing: -0.3px; color: var(--text); }
.sb-logo-sub { font-size: 11px; color: var(--text3); margin-top: 1px; font-weight: 400; }
.sb-nav { padding: 12px 10px; flex: 1; }
.sb-section { font-size: 10px; font-weight: 600; color: var(--text3); text-transform: uppercase; letter-spacing: 0.8px; padding: 8px 10px 4px; }
.sb-item {
  display: flex; align-items: center; gap: 9px;
  padding: 8px 10px; border-radius: 7px;
  color: var(--text2); font-size: 13.5px; font-weight: 500;
  cursor: pointer; border: none; background: none; width: 100%; text-align: left;
  transition: var(--trans); margin-bottom: 1px;
  position: relative;
}
.sb-item:hover { background: var(--surface3); color: var(--text); }
.sb-item.on { background: var(--accent-glow); color: var(--accent-light); }
.sb-item.on .sb-item-icon { color: var(--accent-light); }
.sb-item-icon { width: 16px; flex-shrink: 0; opacity: 0.8; }
.sb-item.on .sb-item-icon { opacity: 1; }
.sb-badge {
  margin-left: auto; background: var(--red); color: white;
  font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 10px;
  font-family: var(--mono);
}
.sb-footer {
  padding: 12px 10px;
  border-top: 1px solid var(--border);
  display: flex; flex-direction: column; gap: 2px;
}
.sb-divider { height: 1px; background: var(--border); margin: 6px 4px; }
.warn-label { font-size: 10px; font-weight: 600; color: var(--text3); text-transform: uppercase; letter-spacing: 0.8px; padding: 0 10px; margin-bottom: 4px; }
.warn-select {
  margin: 0 10px 8px; padding: 6px 8px;
  background: var(--surface2); border: 1px solid var(--border);
  border-radius: 6px; color: var(--text2); font-family: var(--font); font-size: 12px;
  outline: none; cursor: pointer;
}

/* ── Main ─────────────────────────────────────────────── */
.main { margin-left: 248px; flex: 1; min-height: 100vh; display: flex; flex-direction: column; }
.topbar {
  position: sticky; top: 0; z-index: 40;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  padding: 0 28px;
  height: 56px;
  display: flex; align-items: center; gap: 10px;
  transition: background 0.2s;
}
.topbar-title {
  font-size: 15px; font-weight: 600; color: var(--text);
  flex: 1; letter-spacing: -0.2px;
}
.topbar-breadcrumb { font-size: 12px; color: var(--text3); display: flex; align-items: center; gap: 4px; }
.topbar-breadcrumb span { color: var(--text2); }
.live-indicator {
  display: flex; align-items: center; gap: 6px;
  font-size: 11px; color: var(--text3); font-family: var(--mono);
}
.live-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--green);
  box-shadow: 0 0 0 3px rgba(16,185,129,0.2);
  animation: livePulse 2.5s ease-in-out infinite;
}
@keyframes livePulse { 0%,100%{box-shadow:0 0 0 3px rgba(16,185,129,0.2)} 50%{box-shadow:0 0 0 5px rgba(16,185,129,0.05)} }
.content { padding: 28px; flex: 1; }

/* ── Buttons ──────────────────────────────────────────── */
.btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 14px; border-radius: 7px;
  font-size: 13px; font-weight: 500; font-family: var(--font);
  cursor: pointer; border: 1px solid transparent;
  transition: var(--trans); white-space: nowrap;
}
.btn-primary {
  background: var(--accent); color: #fff; border-color: transparent;
  box-shadow: 0 1px 3px rgba(37,99,235,0.3), inset 0 1px 0 rgba(255,255,255,0.1);
}
.btn-primary:hover { background: var(--accent-light); box-shadow: 0 2px 8px rgba(37,99,235,0.4); }
.btn-ghost { background: var(--surface2); color: var(--text2); border-color: var(--border); }
.btn-ghost:hover { background: var(--surface3); color: var(--text); border-color: var(--border2); }
.btn-danger-ghost { background: transparent; color: var(--red); border-color: transparent; }
.btn-danger-ghost:hover { background: var(--red-glow); }
.icon-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border-radius: 6px;
  border: none; background: none; cursor: pointer;
  color: var(--text3); transition: var(--trans);
}
.icon-btn:hover { background: var(--surface3); color: var(--text2); }
.icon-btn.danger:hover { background: var(--red-glow); color: var(--red); }
.view-tog {
  display: flex; background: var(--surface2);
  border: 1px solid var(--border); border-radius: 7px; overflow: hidden;
}
.view-tog-btn {
  display: flex; align-items: center; justify-content: center;
  padding: 6px 10px; border: none; background: none;
  cursor: pointer; color: var(--text3); transition: var(--trans);
}
.view-tog-btn.on { background: var(--surface3); color: var(--text); }

/* ── Stats Grid ──────────────────────────────────────── */
.stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px; }
.stat-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r2);
  padding: 20px;
  position: relative; overflow: hidden;
  transition: var(--trans);
}
.stat-card:hover { border-color: var(--border2); box-shadow: var(--sh); }
.stat-card::after {
  content: ''; position: absolute;
  top: 0; left: 0; right: 0; height: 2px;
  background: var(--stat-line, transparent);
  opacity: 0.8;
}
.stat-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 14px; }
.stat-icon {
  width: 36px; height: 36px; border-radius: 8px;
  background: var(--stat-bg, var(--surface3));
  display: flex; align-items: center; justify-content: center;
  color: var(--stat-col, var(--text2));
}
.stat-trend { font-size: 11px; font-family: var(--mono); color: var(--text3); }
.stat-num { font-size: 28px; font-weight: 700; letter-spacing: -1px; color: var(--text); line-height: 1; margin-bottom: 4px; }
.stat-label { font-size: 12px; color: var(--text2); font-weight: 500; }

/* ── Charts ──────────────────────────────────────────── */
.chart-row { display: grid; grid-template-columns: 1fr 1fr 1.2fr; gap: 14px; margin-bottom: 24px; }
.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r2);
  padding: 20px;
  transition: var(--trans);
}
.panel:hover { border-color: var(--border2); }
.panel-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
.panel-title { font-size: 12px; font-weight: 600; color: var(--text2); text-transform: uppercase; letter-spacing: 0.6px; }
.panel-action { font-size: 11px; color: var(--accent-light); cursor: pointer; }

/* Bar chart */
.bar-list { display: flex; flex-direction: column; gap: 10px; }
.bar-item { display: flex; flex-direction: column; gap: 5px; }
.bar-meta { display: flex; justify-content: space-between; align-items: center; }
.bar-name { font-size: 12px; font-weight: 500; color: var(--text2); display: flex; align-items: center; gap: 5px; }
.bar-count { font-size: 11px; font-family: var(--mono); color: var(--text3); }
.bar-track { height: 5px; background: var(--surface3); border-radius: 99px; overflow: hidden; }
.bar-fill { height: 100%; border-radius: 99px; transition: width 0.8s cubic-bezier(0.4,0,0.2,1); }

/* Donut */
.donut-wrap { display: flex; flex-direction: column; align-items: center; gap: 16px; }
.donut-legend { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; width: 100%; }
.donut-leg-item { display: flex; align-items: center; gap: 6px; font-size: 12px; }
.donut-leg-dot { width: 8px; height: 8px; border-radius: 2px; flex-shrink: 0; }
.donut-leg-label { color: var(--text2); flex: 1; }
.donut-leg-val { font-family: var(--mono); font-weight: 500; font-size: 12px; }

/* Timeline / upcoming */
.timeline-list { display: flex; flex-direction: column; gap: 8px; }
.timeline-item {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 12px; border-radius: 8px;
  background: var(--surface2);
  border: 1px solid var(--border);
  transition: var(--trans); cursor: default;
}
.timeline-item:hover { border-color: var(--border2); background: var(--surface3); }
.timeline-left { flex: 1; min-width: 0; }
.timeline-name { font-size: 13px; font-weight: 500; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px; }
.timeline-sub { font-size: 11px; color: var(--text3); font-family: var(--mono); }
.timeline-right { flex-shrink: 0; text-align: right; }
.timeline-days { font-size: 13px; font-weight: 600; font-family: var(--mono); }
.timeline-date { font-size: 11px; color: var(--text3); margin-top: 2px; }

/* ── Controls Bar ────────────────────────────────────── */
.controls-bar { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; flex-wrap: wrap; }
.search-box { position: relative; flex: 1; min-width: 200px; }
.search-ico { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: var(--text3); pointer-events: none; }
.search-in {
  width: 100%; padding: 8px 12px 8px 34px;
  background: var(--surface); border: 1px solid var(--border); border-radius: 7px;
  color: var(--text); font-family: var(--font); font-size: 13px; outline: none;
  transition: var(--trans);
}
.search-in:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-glow); }
.search-in::placeholder { color: var(--text3); }
.filter-sel {
  padding: 7px 12px; background: var(--surface); border: 1px solid var(--border);
  border-radius: 7px; color: var(--text2); font-family: var(--font); font-size: 13px;
  outline: none; cursor: pointer; transition: var(--trans);
}
.filter-sel:focus { border-color: var(--accent); }
.count-chip {
  font-size: 11px; font-family: var(--mono); color: var(--text3);
  background: var(--surface2); border: 1px solid var(--border);
  padding: 4px 10px; border-radius: 99px; white-space: nowrap;
}

/* ── Card Grid ───────────────────────────────────────── */
.card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(310px, 1fr)); gap: 14px; }
.asset-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r2);
  padding: 18px;
  position: relative; overflow: hidden;
  transition: var(--trans);
  animation: cardIn 0.25s cubic-bezier(0.4,0,0.2,1) both;
}
@keyframes cardIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
.asset-card:hover { border-color: var(--border2); box-shadow: var(--sh); transform: translateY(-1px); }
.asset-card::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
  background: var(--c-accent, #3b82f6);
  opacity: 0.7;
}
.card-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px; gap: 8px; }
.card-title { font-size: 14px; font-weight: 600; color: var(--text); line-height: 1.3; flex: 1; min-width: 0; }
.card-actions { display: flex; gap: 2px; opacity: 0; transition: opacity 0.15s; flex-shrink: 0; }
.asset-card:hover .card-actions { opacity: 1; }
.card-tags { display: flex; align-items: center; gap: 6px; margin-bottom: 14px; flex-wrap: wrap; }
.tag {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 8px; border-radius: 5px;
  font-size: 11px; font-weight: 500; font-family: var(--mono);
}
.tag-cat { background: var(--surface3); color: var(--text3); }
.tag-status-safe { background: var(--green-glow); color: var(--green); }
.tag-status-warning { background: var(--amber-glow); color: var(--amber); }
.tag-status-expired { background: var(--red-glow); color: var(--red); }
.card-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px; margin-bottom: 14px; }
.card-field label { display: block; font-size: 10px; font-weight: 600; color: var(--text3); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
.card-field span { font-size: 12.5px; font-weight: 500; color: var(--text2); }
.card-notes { font-size: 12px; color: var(--text3); font-style: italic; padding: 8px 0 10px; border-top: 1px solid var(--border); margin-top: 2px; line-height: 1.4; }
/* Expiry bar */
.exp-bar-wrap { border-top: 1px solid var(--border); padding-top: 12px; }
.exp-bar-meta { display: flex; justify-content: space-between; font-size: 11px; font-family: var(--mono); margin-bottom: 6px; }
.exp-bar-track { height: 4px; background: var(--surface3); border-radius: 99px; overflow: hidden; }
.exp-bar-fill { height: 100%; border-radius: 99px; transition: width 0.8s cubic-bezier(0.4,0,0.2,1); }

/* ── Table ───────────────────────────────────────────── */
.tbl-wrap { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r2); overflow: hidden; }
.tbl { width: 100%; border-collapse: collapse; }
.tbl thead { background: var(--surface2); }
.tbl th {
  padding: 10px 16px; text-align: left;
  font-size: 10.5px; font-weight: 600; font-family: var(--mono);
  text-transform: uppercase; letter-spacing: 0.7px; color: var(--text3);
  cursor: pointer; white-space: nowrap; user-select: none; border-bottom: 1px solid var(--border);
  transition: color 0.15s;
}
.tbl th:hover { color: var(--text2); }
.tbl td { padding: 12px 16px; font-size: 13px; border-top: 1px solid var(--border); color: var(--text2); }
.tbl tr { transition: background 0.1s; }
.tbl tr:hover td { background: var(--surface2); }
.tbl-name { font-weight: 500; color: var(--text); }
.tbl-actions { display: flex; gap: 2px; opacity: 0; transition: opacity 0.15s; }
.tbl tr:hover .tbl-actions { opacity: 1; }
.status-pill {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 9px; border-radius: 5px;
  font-size: 11px; font-weight: 500; font-family: var(--mono); white-space: nowrap;
}
.status-pip { width: 5px; height: 5px; border-radius: 50%; }

/* ── Modal ───────────────────────────────────────────── */
.overlay {
  position: fixed; inset: 0; z-index: 200;
  background: rgba(0,0,0,0.65); backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center; padding: 20px;
  animation: fadeIn 0.15s ease;
}
@keyframes fadeIn { from{opacity:0} to{opacity:1} }
.modal {
  background: var(--surface);
  border: 1px solid var(--border2);
  border-radius: 16px; width: 100%; max-width: 560px;
  max-height: 90vh; overflow-y: auto;
  box-shadow: 0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04);
  animation: modalIn 0.2s cubic-bezier(0.4,0,0.2,1);
}
@keyframes modalIn { from{opacity:0;transform:translateY(16px)scale(0.98)} to{opacity:1;transform:none} }
.modal-head {
  padding: 22px 24px 18px;
  border-bottom: 1px solid var(--border);
  display: flex; align-items: center; justify-content: space-between;
}
.modal-title { font-size: 16px; font-weight: 600; letter-spacing: -0.2px; }
.modal-body { padding: 20px 24px 24px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.fg { display: flex; flex-direction: column; gap: 5px; }
.fg.full { grid-column: span 2; }
.fg label { font-size: 11px; font-weight: 600; color: var(--text2); text-transform: uppercase; letter-spacing: 0.5px; }
.fg-in, .fg-sel, .fg-ta {
  padding: 9px 12px; background: var(--surface2);
  border: 1px solid var(--border); border-radius: 7px;
  color: var(--text); font-family: var(--font); font-size: 13.5px;
  outline: none; transition: var(--trans);
}
.fg-in:focus, .fg-sel:focus, .fg-ta:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-glow); }
.fg-ta { resize: vertical; min-height: 80px; }
.modal-foot { padding: 16px 24px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 8px; }

/* ── Notif Panel ─────────────────────────────────────── */
.notif-backdrop { position: fixed; inset: 0; z-index: 149; }
.notif-panel {
  position: fixed; top: 56px; right: 20px; bottom: 20px; width: 340px; z-index: 150;
  background: var(--surface);
  border: 1px solid var(--border2);
  border-radius: var(--r2);
  box-shadow: var(--sh2), 0 24px 64px rgba(0,0,0,0.4);
  display: flex; flex-direction: column;
  animation: panelIn 0.2s cubic-bezier(0.4,0,0.2,1);
  overflow: hidden;
}
@keyframes panelIn { from{opacity:0;transform:translateY(-8px)scale(0.97)} to{opacity:1;transform:none} }
.notif-head {
  padding: 16px 16px 12px;
  border-bottom: 1px solid var(--border);
  display: flex; align-items: center; justify-content: space-between; flex-shrink: 0;
}
.notif-title { font-size: 14px; font-weight: 600; }
.notif-body { flex: 1; overflow-y: auto; padding: 12px; }
.notif-section { font-size: 10px; font-weight: 600; color: var(--text3); text-transform: uppercase; letter-spacing: 0.8px; padding: 0 4px; margin-bottom: 8px; margin-top: 4px; }
.notif-card {
  background: var(--surface2); border: 1px solid var(--border);
  border-radius: 8px; padding: 11px 12px; margin-bottom: 6px;
  border-left: 3px solid;
  transition: var(--trans);
}
.notif-card:hover { background: var(--surface3); }
.notif-card-name { font-size: 13px; font-weight: 500; color: var(--text); margin-bottom: 3px; }
.notif-card-meta { font-size: 11px; font-family: var(--mono); }
.notif-empty { text-align: center; padding: 32px 16px; color: var(--text3); font-size: 13px; }

/* ── Toast ───────────────────────────────────────────── */
.toast {
  position: fixed; bottom: 24px; right: 24px; z-index: 300;
  background: var(--surface2); border: 1px solid var(--border2);
  border-radius: 9px; padding: 12px 18px;
  display: flex; align-items: center; gap: 10px;
  font-size: 13px; font-weight: 500; color: var(--text);
  box-shadow: var(--sh2), 0 8px 32px rgba(0,0,0,0.4);
  animation: toastIn 0.25s cubic-bezier(0.4,0,0.2,1);
  max-width: 320px;
}
@keyframes toastIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
.toast-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

/* ── Calendar ────────────────────────────────────────── */
.cal-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
.cal-month { font-size: 16px; font-weight: 600; flex: 1; }
.cal-days-header { display: grid; grid-template-columns: repeat(7,1fr); gap: 4px; margin-bottom: 4px; }
.cal-day-head { text-align: center; font-size: 10px; font-weight: 600; color: var(--text3); text-transform: uppercase; letter-spacing: 0.5px; padding: 4px 0; }
.cal-grid { display: grid; grid-template-columns: repeat(7,1fr); gap: 4px; }
.cal-cell {
  min-height: 88px; background: var(--surface2); border: 1px solid var(--border);
  border-radius: 8px; padding: 8px; overflow: hidden;
  transition: var(--trans);
}
.cal-cell.today { border-color: var(--accent); background: var(--accent-glow); }
.cal-cell.empty { background: none; border-color: transparent; }
.cal-date { font-size: 12px; font-weight: 600; color: var(--text2); margin-bottom: 4px; }
.cal-cell.today .cal-date { color: var(--accent-light); }
.cal-ev { font-size: 10px; padding: 2px 5px; border-radius: 4px; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: var(--mono); cursor: default; }

/* ── Empty State ─────────────────────────────────────── */
.empty-state { text-align: center; padding: 64px 24px; }
.empty-icon { font-size: 40px; margin-bottom: 14px; opacity: 0.4; }
.empty-title { font-size: 15px; font-weight: 600; color: var(--text2); margin-bottom: 6px; }
.empty-sub { font-size: 13px; color: var(--text3); margin-bottom: 20px; }

/* ── Loading ─────────────────────────────────────────── */
.spinner {
  width: 28px; height: 28px; border-radius: 50%;
  border: 2px solid var(--border2); border-top-color: var(--accent);
  animation: spin 0.7s linear infinite; margin: 0 auto 12px;
}
@keyframes spin { to{transform:rotate(360deg)} }
.loading-state { text-align: center; padding: 80px 24px; }
.loading-text { font-size: 13px; color: var(--text3); font-family: var(--mono); }

/* ── Responsive ──────────────────────────────────────── */
@media(max-width:1100px){ .chart-row{grid-template-columns:1fr 1fr} }
@media(max-width:900px){
  .sb{width:52px;min-width:52px}
  .sb-logo-text,.sb-logo-sub,.sb-item span,.sb-section,.warn-label,.warn-select,.sb-badge{display:none}
  .sb-logo{padding:14px 9px;justify-content:center}
  .sb-logo-icon{margin:0}
  .sb-item{justify-content:center;padding:10px}
  .main{margin-left:52px}
  .stats-row{grid-template-columns:1fr 1fr}
  .chart-row{grid-template-columns:1fr}
}
@media(max-width:600px){
  .topbar{padding:0 16px}
  .content{padding:16px}
  .stats-row{grid-template-columns:1fr}
}
`;

// ── Donut Chart ──────────────────────────────────────────────────────────────
function Donut({ data, size = 100 }) {
  const total = data.reduce((s, d) => s + d.v, 0);
  if (!total) return <div style={{ color: "var(--text3)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>No data yet</div>;
  let angle = -Math.PI / 2;
  const cx = size / 2, cy = size / 2, R = size * 0.38, r = size * 0.22;
  const slices = data.map((d) => {
    const a = (d.v / total) * Math.PI * 2;
    const x1 = cx + R * Math.cos(angle), y1 = cy + R * Math.sin(angle);
    const x2 = cx + R * Math.cos(angle + a), y2 = cy + R * Math.sin(angle + a);
    const ix1 = cx + r * Math.cos(angle), iy1 = cy + r * Math.sin(angle);
    const ix2 = cx + r * Math.cos(angle + a), iy2 = cy + r * Math.sin(angle + a);
    const path = `M${x1},${y1} A${R},${R} 0 ${a > Math.PI ? 1 : 0},1 ${x2},${y2} L${ix2},${iy2} A${r},${r} 0 ${a > Math.PI ? 1 : 0},0 ${ix1},${iy1} Z`;
    angle += a;
    return { ...d, path };
  });
  return (
    <div className="donut-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices.map((s, i) => <path key={i} d={s.path} fill={s.color} opacity="0.9" />)}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize={size * 0.16} fontWeight="700" fill="var(--text)" fontFamily="DM Sans">{total}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize={size * 0.09} fill="var(--text3)" fontFamily="DM Sans">assets</text>
      </svg>
      <div className="donut-legend">
        {slices.map((s, i) => (
          <div key={i} className="donut-leg-item">
            <span className="donut-leg-dot" style={{ background: s.color }} />
            <span className="donut-leg-label">{s.label}</span>
            <span className="donut-leg-val" style={{ color: s.color }}>{s.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Expiry Bar ────────────────────────────────────────────────────────────────
function ExpiryBar({ purchaseDate, expirationDate }) {
  const st = statusOf(expirationDate);
  const d = daysUntil(expirationDate);
  if (!purchaseDate || !expirationDate) return null;
  const total = Math.max(1, (new Date(expirationDate) - new Date(purchaseDate)) / 86400000);
  const elapsed = (todayDate() - new Date(purchaseDate)) / 86400000;
  const pct = Math.min(100, Math.max(0, (elapsed / total) * 100));
  const label = d < 0 ? "Expired" : d === 0 ? "Expires today" : `${d}d remaining`;
  return (
    <div className="exp-bar-wrap">
      <div className="exp-bar-meta">
        <span style={{ color: STATUS_COLOR[st], fontWeight: 500 }}>{label}</span>
        <span style={{ color: "var(--text3)" }}>{Math.round(pct)}% elapsed</span>
      </div>
      <div className="exp-bar-track">
        <div className="exp-bar-fill" style={{ width: `${pct}%`, background: STATUS_COLOR[st] }} />
      </div>
    </div>
  );
}

// ── Calendar ──────────────────────────────────────────────────────────────────
function CalendarView({ items }) {
  const [month, setMonth] = useState(new Date());
  const yr = month.getFullYear(), mo = month.getMonth();
  const firstDay = new Date(yr, mo, 1).getDay();
  const totalDays = new Date(yr, mo + 1, 0).getDate();
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: totalDays }, (_, i) => i + 1)];
  const byDay = {};
  items.forEach(it => {
    if (!it.expirationDate) return;
    const d = new Date(it.expirationDate);
    if (d.getFullYear() === yr && d.getMonth() === mo) {
      const day = d.getDate();
      (byDay[day] = byDay[day] || []).push(it);
    }
  });
  const t = todayDate();
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return (
    <div>
      <div className="cal-header">
        <button className="btn btn-ghost" style={{ padding: "6px 10px" }} onClick={() => setMonth(new Date(yr, mo - 1))}>←</button>
        <span className="cal-month">{MONTHS[mo]} {yr}</span>
        <button className="btn btn-ghost" style={{ padding: "6px 10px" }} onClick={() => setMonth(new Date(yr, mo + 1))}>→</button>
      </div>
      <div className="cal-days-header">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => <div key={d} className="cal-day-head">{d}</div>)}
      </div>
      <div className="cal-grid">
        {cells.map((day, i) => {
          const isToday = day && t.getDate() === day && t.getMonth() === mo && t.getFullYear() === yr;
          const events = day ? (byDay[day] || []) : [];
          return (
            <div key={i} className={`cal-cell${!day ? " empty" : ""}${isToday ? " today" : ""}`}>
              {day && <>
                <div className="cal-date">{day}</div>
                {events.map(ev => {
                  const st = statusOf(ev.expirationDate);
                  return <div key={ev.id} className="cal-ev" style={{ background: STATUS_BG[st], color: STATUS_COLOR[st] }} title={ev.name}>{ev.name}</div>;
                })}
              </>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Item Modal ────────────────────────────────────────────────────────────────
function ItemModal({ item, onSave, onClose, saving }) {
  const blank = { name: "", category: "Domain", purchaseDate: "", expirationDate: "", vendor: "", cost: "", notes: "" };
  const [form, setForm] = useState(item || blank);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const save = () => { if (!form.name.trim() || !form.expirationDate) return alert("Name and Expiration Date are required."); onSave(form); };
  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <div className="modal-title">{item ? "Edit Asset" : "Add New Asset"}</div>
          <button className="icon-btn" onClick={onClose}><Ico p={I.x} s={15} /></button>
        </div>
        <div className="modal-body">
          <div className="form-grid">
            <div className="fg full">
              <label>Asset Name *</label>
              <input className="fg-in" value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. acmecorp.com, Wildcard SSL Cert" />
            </div>
            <div className="fg">
              <label>Category *</label>
              <select className="fg-sel" value={form.category} onChange={e => set("category", e.target.value)}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="fg">
              <label>Vendor / Provider</label>
              <input className="fg-in" value={form.vendor} onChange={e => set("vendor", e.target.value)} placeholder="e.g. Namecheap, DigiCert" />
            </div>
            <div className="fg">
              <label>Purchase Date</label>
              <input className="fg-in" type="date" value={form.purchaseDate} onChange={e => set("purchaseDate", e.target.value)} />
            </div>
            <div className="fg">
              <label>Expiration Date *</label>
              <input className="fg-in" type="date" value={form.expirationDate} onChange={e => set("expirationDate", e.target.value)} />
            </div>
            <div className="fg full">
              <label>Annual Cost (USD)</label>
              <input className="fg-in" type="number" value={form.cost} onChange={e => set("cost", e.target.value)} placeholder="0.00" min="0" step="0.01" />
            </div>
            <div className="fg full">
              <label>Notes</label>
              <textarea className="fg-ta" value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Add any notes or additional context…" />
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? "Saving…" : item ? "Save Changes" : "Add Asset"}</button>
        </div>
      </div>
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [dark, setDark] = useState(true);
  const [page, setPage] = useState("dashboard");
  const [mode, setMode] = useState("card");
  const [items, setItems] = useState(SAMPLE);
  const [search, setSearch] = useState("");
  const [catF, setCatF] = useState("All");
  const [statusF, setStatusF] = useState("All");
  const [sortK, setSortK] = useState("expirationDate");
  const [sortD, setSortD] = useState("asc");
  const [modal, setModal] = useState(null);
  const [notif, setNotif] = useState(false);
  const [toast, setToast] = useState(null);
  const [warnDays, setWarnDays] = useState(30);
  const [saving, setSaving] = useState(false);

  const showToast = (msg, color = "var(--green)") => { setToast({ msg, color }); setTimeout(() => setToast(null), 3000); };

  const saveItem = (form) => {
    setSaving(true);
    setTimeout(() => {
      if (modal === "add") {
        setItems(p => [...p, { ...form, id: Date.now(), cost: parseFloat(form.cost) || 0 }]);
        showToast("Asset added successfully");
      } else {
        setItems(p => p.map(i => i.id === modal.id ? { ...i, ...form, cost: parseFloat(form.cost) || 0 } : i));
        showToast("Asset updated");
      }
      setSaving(false); setModal(null);
    }, 400);
  };

  const delItem = (id) => {
    if (!confirm("Delete this asset? This cannot be undone.")) return;
    setItems(p => p.filter(i => i.id !== id));
    showToast("Asset deleted", "var(--red)");
  };

  const filtered = useMemo(() => items.filter(it => {
    const q = search.toLowerCase();
    const ms = !q || it.name.toLowerCase().includes(q) || (it.vendor || "").toLowerCase().includes(q) || (it.notes || "").toLowerCase().includes(q);
    const mc = catF === "All" || it.category === catF;
    const st = statusOf(it.expirationDate);
    const sm = { safe: "Active", warning: "Expiring Soon", expired: "Expired" };
    return ms && mc && (statusF === "All" || sm[st] === statusF);
  }).sort((a, b) => {
    let va = a[sortK] || "", vb = b[sortK] || "";
    if (sortK === "cost") { va = parseFloat(va) || 0; vb = parseFloat(vb) || 0; }
    const c = va < vb ? -1 : va > vb ? 1 : 0;
    return sortD === "asc" ? c : -c;
  }), [items, search, catF, statusF, sortK, sortD]);

  const stats = useMemo(() => ({
    total: items.length,
    active: items.filter(i => statusOf(i.expirationDate) === "safe").length,
    expiring: items.filter(i => statusOf(i.expirationDate) === "warning").length,
    expired: items.filter(i => statusOf(i.expirationDate) === "expired").length,
    expiring7: items.filter(i => { const d = daysUntil(i.expirationDate); return d >= 0 && d <= 7; }).length,
    cost: items.reduce((s, i) => s + (parseFloat(i.cost) || 0), 0),
  }), [items]);

  const alerts = useMemo(() => items.filter(i => { const d = daysUntil(i.expirationDate); return d >= 0 && d <= warnDays; }).sort((a, b) => daysUntil(a.expirationDate) - daysUntil(b.expirationDate)), [items, warnDays]);

  const catData = useMemo(() => {
    const c = {}; items.forEach(i => { c[i.category] = (c[i.category] || 0) + 1; });
    return Object.entries(c).map(([k, v]) => ({ k, v })).sort((a, b) => b.v - a.v);
  }, [items]);
  const maxCat = Math.max(...catData.map(d => d.v), 1);

  const toggleSort = (k) => { if (sortK === k) setSortD(d => d === "asc" ? "desc" : "asc"); else { setSortK(k); setSortD("asc"); } };
  const sortArrow = (k) => sortK === k ? (sortD === "asc" ? " ↑" : " ↓") : "";

  const exportCSV = () => {
    const h = ["Name", "Category", "Purchase Date", "Expiration Date", "Vendor", "Cost", "Notes", "Status"];
    const rows = items.map(i => [i.name, i.category, i.purchaseDate || "", i.expirationDate, i.vendor || "", i.cost || 0, (i.notes || "").replace(/,/g, ""), STATUS_LABEL[statusOf(i.expirationDate)]]);
    const csv = [h, ...rows].map(r => r.join(",")).join("\n");
    const a = document.createElement("a"); a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv); a.download = "assetvault-export.csv"; a.click();
    showToast("CSV exported");
  };

  return (
    <>
      <style>{G}</style>
      <div className={`app${dark ? "" : " light-mode"}`}>
        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <aside className="sb">
          <div className="sb-logo">
            <div className="sb-logo-icon">🔐</div>
            <div>
              <div className="sb-logo-text">AssetVault</div>
              <div className="sb-logo-sub">IT Asset Management</div>
            </div>
          </div>
          <nav className="sb-nav">
            <div className="sb-section">Navigation</div>
            {[
              { id: "dashboard", label: "Dashboard", icon: I.dashboard },
              { id: "assets", label: "Assets", icon: I.assets },
              { id: "calendar", label: "Calendar", icon: I.calendar },
            ].map(n => (
              <button key={n.id} className={`sb-item${page === n.id ? " on" : ""}`} onClick={() => setPage(n.id)}>
                <span className="sb-item-icon"><Ico p={n.icon} s={15} /></span>
                <span>{n.label}</span>
                {n.id === "assets" && items.length > 0 && <span className="sb-badge" style={{ background: "var(--surface3)", color: "var(--text3)" }}>{items.length}</span>}
              </button>
            ))}
            <div className="sb-divider" />
            <div className="sb-section">Alerts</div>
            <button className="sb-item" onClick={() => setNotif(o => !o)}>
              <span className="sb-item-icon"><Ico p={I.bell} s={15} /></span>
              <span>Notifications</span>
              {alerts.length > 0 && <span className="sb-badge">{alerts.length}</span>}
            </button>
          </nav>
          <div className="sb-footer">
            <div className="warn-label">Alert Threshold</div>
            <select className="warn-select" value={warnDays} onChange={e => setWarnDays(+e.target.value)}>
              <option value={7}>7 days</option>
              <option value={15}>15 days</option>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
            </select>
            <button className="sb-item" onClick={() => setDark(d => !d)}>
              <span className="sb-item-icon"><Ico p={dark ? I.sun : I.moon} s={15} /></span>
              <span>{dark ? "Light Mode" : "Dark Mode"}</span>
            </button>
          </div>
        </aside>

        {/* ── Main ─────────────────────────────────────────────────────────── */}
        <div className="main">
          {/* Topbar */}
          <header className="topbar">
            <div className="topbar-title">
              {page === "dashboard" ? "Dashboard" : page === "assets" ? "Assets" : "Calendar"}
            </div>
            <div className="live-indicator"><span className="live-dot" />Live</div>
            <button className="btn btn-ghost" onClick={exportCSV} style={{ fontSize: 12 }}>
              <Ico p={I.download} s={13} /> Export CSV
            </button>
            <button className="btn btn-ghost" style={{ position: "relative", padding: "7px 10px" }} onClick={() => setNotif(o => !o)}>
              <Ico p={I.bell} s={14} />
              {alerts.length > 0 && <span style={{ position: "absolute", top: 3, right: 3, width: 7, height: 7, background: "var(--red)", borderRadius: "50%", border: "1.5px solid var(--surface)" }} />}
            </button>
            <button className="btn btn-primary" onClick={() => setModal("add")}>
              <Ico p={I.plus} s={13} /> Add Asset
            </button>
          </header>

          <div className="content">
            {/* ── DASHBOARD ──────────────────────────────────────────────── */}
            {page === "dashboard" && <>
              {/* Stats */}
              <div className="stats-row">
                {[
                  { label: "Total Assets", value: stats.total, color: "var(--accent-light)", bg: "var(--accent-glow)", icon: "📦", line: "var(--accent)" },
                  { label: "Active", value: stats.active, color: "var(--green)", bg: "var(--green-glow)", icon: "✅", line: "var(--green)" },
                  { label: "Expiring Soon", value: stats.expiring, color: "var(--amber)", bg: "var(--amber-glow)", icon: "⚠️", line: "var(--amber)", sub: `${stats.expiring7} within 7 days` },
                  { label: "Expired", value: stats.expired, color: "var(--red)", bg: "var(--red-glow)", icon: "🔴", line: "var(--red)" },
                ].map(s => (
                  <div key={s.label} className="stat-card" style={{ "--stat-line": s.line, "--stat-bg": s.bg, "--stat-col": s.color }}>
                    <div className="stat-top">
                      <div className="stat-icon">{s.icon}</div>
                      {s.sub && <div className="stat-trend">{s.sub}</div>}
                    </div>
                    <div className="stat-num" style={{ color: s.color }}>{s.value}</div>
                    <div className="stat-label">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Charts row */}
              <div className="chart-row">
                {/* Bar chart */}
                <div className="panel">
                  <div className="panel-header"><span className="panel-title">By Category</span></div>
                  {catData.length === 0
                    ? <div style={{ color: "var(--text3)", fontSize: 13 }}>No assets yet</div>
                    : <div className="bar-list">
                      {catData.map(d => (
                        <div key={d.k} className="bar-item">
                          <div className="bar-meta">
                            <span className="bar-name"><span>{CAT_ICONS[d.k]}</span>{d.k}</span>
                            <span className="bar-count">{d.v}</span>
                          </div>
                          <div className="bar-track">
                            <div className="bar-fill" style={{ width: `${(d.v / maxCat) * 100}%`, background: CAT_COLOR[d.k] || "#64748b" }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  }
                </div>

                {/* Donut */}
                <div className="panel">
                  <div className="panel-header"><span className="panel-title">Status Overview</span></div>
                  <Donut data={[
                    { label: "Active", v: stats.active, color: "#10b981" },
                    { label: "Expiring", v: stats.expiring, color: "#f59e0b" },
                    { label: "Expired", v: stats.expired, color: "#ef4444" },
                  ].filter(d => d.v > 0)} size={130} />
                </div>

                {/* Upcoming */}
                <div className="panel">
                  <div className="panel-header">
                    <span className="panel-title">Expiring ≤ {warnDays}d</span>
                    <span className="panel-action">{alerts.length} items</span>
                  </div>
                  {alerts.length === 0
                    ? <div style={{ color: "var(--text3)", fontSize: 13, padding: "8px 0" }}>All clear — no upcoming expirations 🎉</div>
                    : <div className="timeline-list" style={{ maxHeight: 280, overflowY: "auto" }}>
                      {alerts.map(item => {
                        const d = daysUntil(item.expirationDate);
                        const c = d <= 7 ? "var(--red)" : "var(--amber)";
                        return (
                          <div key={item.id} className="timeline-item">
                            <span style={{ fontSize: 16 }}>{CAT_ICONS[item.category]}</span>
                            <div className="timeline-left">
                              <div className="timeline-name">{item.name}</div>
                              <div className="timeline-sub" style={{ color: "var(--text3)" }}>{item.category}{item.vendor ? ` · ${item.vendor}` : ""}</div>
                            </div>
                            <div className="timeline-right">
                              <div className="timeline-days" style={{ color: c }}>{d === 0 ? "Today" : `${d}d`}</div>
                              <div className="timeline-date">{fmtDateShort(item.expirationDate)}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  }
                </div>
              </div>

              {/* Annual cost panel */}
              <div className="panel" style={{ display: "flex", alignItems: "center", gap: 24 }}>
                <div>
                  <div className="panel-title" style={{ marginBottom: 8 }}>Total Annual Spend</div>
                  <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: -1, color: "var(--accent-light)" }}>
                    ${stats.cost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>across {stats.total} tracked assets</div>
                </div>
                <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
                  {catData.filter(d => items.find(i => i.category === d.k && i.cost > 0)).map(d => {
                    const catCost = items.filter(i => i.category === d.k).reduce((s, i) => s + (parseFloat(i.cost) || 0), 0);
                    return catCost > 0 ? (
                      <div key={d.k} style={{ background: "var(--surface2)", borderRadius: 8, padding: "10px 12px", border: "1px solid var(--border)" }}>
                        <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4 }}>{CAT_ICONS[d.k]} {d.k}</div>
                        <div style={{ fontSize: 14, fontWeight: 600, fontFamily: "var(--mono)", color: "var(--text2)" }}>${catCost.toLocaleString("en-US", { maximumFractionDigits: 0 })}</div>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            </>}

            {/* ── ASSETS ─────────────────────────────────────────────────── */}
            {page === "assets" && <>
              <div className="controls-bar">
                <div className="search-box">
                  <span className="search-ico"><Ico p={I.search} s={13} /></span>
                  <input className="search-in" placeholder="Search by name, vendor, notes…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="filter-sel" value={catF} onChange={e => setCatF(e.target.value)}>
                  <option value="All">All Categories</option>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
                <select className="filter-sel" value={statusF} onChange={e => setStatusF(e.target.value)}>
                  <option value="All">All Statuses</option>
                  <option>Active</option><option>Expiring Soon</option><option>Expired</option>
                </select>
                <div className="view-tog">
                  <button className={`view-tog-btn${mode === "card" ? " on" : ""}`} onClick={() => setMode("card")} title="Card view"><Ico p={I.grid} s={13} /></button>
                  <button className={`view-tog-btn${mode === "table" ? " on" : ""}`} onClick={() => setMode("table")} title="Table view"><Ico p={I.list} s={13} /></button>
                </div>
                <span className="count-chip">{filtered.length} item{filtered.length !== 1 ? "s" : ""}</span>
              </div>

              {filtered.length === 0
                ? <div className="empty-state">
                  <div className="empty-icon">📭</div>
                  <div className="empty-title">{items.length === 0 ? "No assets yet" : "No results found"}</div>
                  <div className="empty-sub">{items.length === 0 ? "Start tracking your IT assets by adding the first one." : "Try adjusting your search filters."}</div>
                  {items.length === 0 && <button className="btn btn-primary" onClick={() => setModal("add")}><Ico p={I.plus} s={13} /> Add Your First Asset</button>}
                </div>
                : mode === "card"
                  ? <div className="card-grid">
                    {filtered.map((item, idx) => {
                      const st = statusOf(item.expirationDate);
                      const ac = CAT_COLOR[item.category] || "#64748b";
                      return (
                        <div key={item.id} className="asset-card" style={{ "--c-accent": ac, animationDelay: `${idx * 0.03}s` }}>
                          <div className="card-header">
                            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, flex: 1, minWidth: 0 }}>
                              <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{CAT_ICONS[item.category]}</span>
                              <div className="card-title">{item.name}</div>
                            </div>
                            <div className="card-actions">
                              <button className="icon-btn" onClick={() => setModal(item)} title="Edit"><Ico p={I.edit} s={13} /></button>
                              <button className="icon-btn danger" onClick={() => delItem(item.id)} title="Delete"><Ico p={I.trash} s={13} /></button>
                            </div>
                          </div>
                          <div className="card-tags">
                            <span className="tag tag-cat">{item.category}</span>
                            <span className={`tag tag-status-${st}`}>
                              <span style={{ width: 5, height: 5, borderRadius: "50%", background: STATUS_COLOR[st], display: "inline-block" }} />
                              {STATUS_LABEL[st]}
                            </span>
                          </div>
                          <div className="card-grid2">
                            <div className="card-field">
                              <label>Expires</label>
                              <span style={{ color: STATUS_COLOR[st], fontWeight: 600 }}>{fmtDate(item.expirationDate)}</span>
                            </div>
                            <div className="card-field">
                              <label>Cost / yr</label>
                              <span>{item.cost ? `$${parseFloat(item.cost).toFixed(2)}` : "—"}</span>
                            </div>
                            {item.vendor && <div className="card-field"><label>Vendor</label><span>{item.vendor}</span></div>}
                            {item.purchaseDate && <div className="card-field"><label>Purchased</label><span>{fmtDate(item.purchaseDate)}</span></div>}
                          </div>
                          {item.notes && <div className="card-notes">{item.notes}</div>}
                          {item.purchaseDate && <ExpiryBar purchaseDate={item.purchaseDate} expirationDate={item.expirationDate} />}
                        </div>
                      );
                    })}
                  </div>
                  : <div className="tbl-wrap">
                    <table className="tbl">
                      <thead>
                        <tr>
                          {[["name", "Asset"], ["category", "Category"], ["expirationDate", "Expiration"], ["vendor", "Vendor"], ["cost", "Cost / yr"], ["", "Status"]].map(([k, l]) => (
                            <th key={l} onClick={() => k && toggleSort(k)}>{l}{sortArrow(k)}</th>
                          ))}
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map(item => {
                          const st = statusOf(item.expirationDate);
                          const d = daysUntil(item.expirationDate);
                          return (
                            <tr key={item.id}>
                              <td>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <span>{CAT_ICONS[item.category]}</span>
                                  <span className="tbl-name">{item.name}</span>
                                </div>
                              </td>
                              <td><span style={{ color: CAT_COLOR[item.category], fontSize: 12, fontFamily: "var(--mono)", fontWeight: 500 }}>{item.category}</span></td>
                              <td style={{ fontFamily: "var(--mono)", fontSize: 12, color: STATUS_COLOR[st], fontWeight: 500 }}>{fmtDate(item.expirationDate)}</td>
                              <td style={{ color: "var(--text3)" }}>{item.vendor || "—"}</td>
                              <td style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{item.cost ? `$${parseFloat(item.cost).toFixed(2)}` : "—"}</td>
                              <td>
                                <span className="status-pill" style={{ background: STATUS_BG[st], color: STATUS_COLOR[st] }}>
                                  <span className="status-pip" style={{ background: STATUS_COLOR[st] }} />
                                  {d < 0 ? "Expired" : d <= 30 ? `${d}d left` : STATUS_LABEL[st]}
                                </span>
                              </td>
                              <td>
                                <div className="tbl-actions">
                                  <button className="icon-btn" onClick={() => setModal(item)}><Ico p={I.edit} s={13} /></button>
                                  <button className="icon-btn danger" onClick={() => delItem(item.id)}><Ico p={I.trash} s={13} /></button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
              }
            </>}

            {/* ── CALENDAR ───────────────────────────────────────────────── */}
            {page === "calendar" && (
              <div className="panel"><CalendarView items={items} /></div>
            )}
          </div>
        </div>

        {/* ── Notification Panel ─────────────────────────────────────────── */}
        {notif && <>
          <div className="notif-backdrop" onClick={() => setNotif(false)} />
          <div className="notif-panel">
            <div className="notif-head">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Ico p={I.bell} s={15} />
                <span className="notif-title">Notifications</span>
                {alerts.length > 0 && <span style={{ background: "var(--red)", color: "white", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 10, fontFamily: "var(--mono)" }}>{alerts.length}</span>}
              </div>
              <button className="icon-btn" onClick={() => setNotif(false)}><Ico p={I.x} s={14} /></button>
            </div>
            <div className="notif-body">
              {alerts.length === 0
                ? <div className="notif-empty">
                  <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
                  <div>All assets are healthy</div>
                  <div style={{ fontSize: 12, marginTop: 4, color: "var(--text3)" }}>Nothing expiring within {warnDays} days</div>
                </div>
                : <>
                  {[{ label: "Critical (≤ 7 days)", items: alerts.filter(i => daysUntil(i.expirationDate) <= 7), color: "var(--red)" },
                    { label: `Warning (8–${warnDays} days)`, items: alerts.filter(i => { const d = daysUntil(i.expirationDate); return d > 7 && d <= warnDays; }), color: "var(--amber)" }
                  ].map(grp => grp.items.length > 0 && (
                    <div key={grp.label}>
                      <div className="notif-section" style={{ color: grp.color }}>{grp.label}</div>
                      {grp.items.map(item => {
                        const d = daysUntil(item.expirationDate);
                        return (
                          <div key={item.id} className="notif-card" style={{ borderColor: grp.color }}>
                            <div className="notif-card-name">{item.name}</div>
                            <div className="notif-card-meta" style={{ color: grp.color }}>
                              {d === 0 ? "Expires TODAY" : `${d} day${d !== 1 ? "s" : ""} left`}
                              <span style={{ color: "var(--text3)" }}> · {fmtDate(item.expirationDate)}</span>
                            </div>
                            <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 3 }}>{item.category}{item.vendor ? ` · ${item.vendor}` : ""}</div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </>
              }
            </div>
          </div>
        </>}

        {/* ── Modal ─────────────────────────────────────────────────────── */}
        {modal && <ItemModal item={modal === "add" ? null : modal} onSave={saveItem} onClose={() => setModal(null)} saving={saving} />}

        {/* ── Toast ─────────────────────────────────────────────────────── */}
        {toast && (
          <div className="toast">
            <span className="toast-dot" style={{ background: toast.color }} />
            {toast.msg}
          </div>
        )}
      </div>
    </>
  );
}
