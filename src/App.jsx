import { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabase.js";

// ── Fonts ────────────────────────────────────────────────────────────────────
const fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href = "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Syne:wght@400;600;700;800&display=swap";
document.head.appendChild(fontLink);

// ── Helpers ──────────────────────────────────────────────────────────────────
const today = () => new Date();
const daysUntil = (d) => { if (!d) return Infinity; return Math.ceil((new Date(d) - today()) / 86400000); };
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
const statusOf = (exp) => { const d = daysUntil(exp); if (d < 0) return "expired"; if (d <= 30) return "warning"; return "safe"; };
const statusColor = { safe: "#22d3a0", warning: "#f59e0b", expired: "#ef4444" };
const statusLabel = { safe: "Active", warning: "Expiring Soon", expired: "Expired" };
const CATEGORIES = ["Domain", "SSL Certificate", "License", "Subscription", "SaaS", "API Key", "Other"];

// Map DB snake_case → camelCase
const fromDB = (r) => ({ id: r.id, name: r.name, category: r.category, purchaseDate: r.purchase_date, expirationDate: r.expiration_date, vendor: r.vendor, cost: r.cost, notes: r.notes });
const toDB = (f) => ({ name: f.name, category: f.category, purchase_date: f.purchaseDate || null, expiration_date: f.expirationDate, vendor: f.vendor || null, cost: parseFloat(f.cost) || 0, notes: f.notes || null });

// ── Icons ────────────────────────────────────────────────────────────────────
const Icon = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);
const icons = {
  grid: ["M3 3h7v7H3z","M14 3h7v7h-7z","M14 14h7v7h-7z","M3 14h7v7H3z"],
  list: ["M8 6h13","M8 12h13","M8 18h13","M3 6h.01","M3 12h.01","M3 18h.01"],
  plus: "M12 5v14M5 12h14",
  search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0",
  edit: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  trash: ["M3 6h18","M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6","M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2"],
  x: "M18 6L6 18M6 6l12 12",
  bell: ["M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9","M13.73 21a2 2 0 01-3.46 0"],
  moon: "M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z",
  sun: ["M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42","M12 8a4 4 0 100 8 4 4 0 000-8z"],
  download: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3",
  calendar: ["M8 2v4M16 2v4M3 8h18M3 6a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6z"],
  refresh: "M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15",
  chart: ["M18 20V10","M12 20V4","M6 20v-6"],
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  wifi: ["M5 12.55a11 11 0 0114.08 0","M1.42 9a16 16 0 0121.16 0","M8.53 16.11a6 6 0 016.95 0","M12 20h.01"],
};

// ── CSS ───────────────────────────────────────────────────────────────────────
const css = `
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #0a0e1a; }
:root {
  --bg:#0a0e1a; --surface:#111827; --surface2:#1a2236; --border:#1f2d45;
  --text:#e2e8f0; --muted:#64748b; --accent:#22d3a0; --accent2:#3b82f6;
  --warn:#f59e0b; --danger:#ef4444;
  --font-mono:'JetBrains Mono',monospace; --font-sans:'Syne',sans-serif;
  --radius:12px; --shadow:0 4px 24px rgba(0,0,0,0.4);
}
.light { --bg:#f0f4f8; --surface:#fff; --surface2:#e8edf5; --border:#d1dbe8; --text:#1e293b; --shadow:0 4px 24px rgba(0,0,0,0.08); }
.app { min-height:100vh; background:var(--bg); color:var(--text); font-family:var(--font-sans); transition:background 0.3s,color 0.3s; }
.sidebar { position:fixed;top:0;left:0;bottom:0;width:240px;background:var(--surface);border-right:1px solid var(--border);padding:24px 0;display:flex;flex-direction:column;z-index:100;transition:background 0.3s; }
.logo { padding:0 24px 24px;border-bottom:1px solid var(--border); }
.logo-text { font-size:18px;font-weight:800;letter-spacing:-0.5px;background:linear-gradient(135deg,var(--accent),var(--accent2));-webkit-background-clip:text;-webkit-text-fill-color:transparent; }
.logo-sub { font-size:11px;color:var(--muted);font-family:var(--font-mono);margin-top:2px; }
.nav { padding:16px 12px;flex:1; }
.nav-item { display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;color:var(--muted);transition:all 0.15s;margin-bottom:4px;border:none;background:none;width:100%;text-align:left; }
.nav-item:hover { background:var(--surface2);color:var(--text); }
.nav-item.active { background:rgba(34,211,160,0.12);color:var(--accent); }
.sidebar-footer { padding:16px 12px;border-top:1px solid var(--border); }
.main { margin-left:240px;min-height:100vh; }
.topbar { position:sticky;top:0;z-index:90;background:var(--surface);border-bottom:1px solid var(--border);padding:16px 32px;display:flex;align-items:center;gap:16px;transition:background 0.3s; }
.topbar-title { font-size:20px;font-weight:800;flex:1; }
.content { padding:32px; }
.stats-grid { display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:32px; }
.stat-card { background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:20px;transition:transform 0.15s,box-shadow 0.15s;cursor:default; }
.stat-card:hover { transform:translateY(-2px);box-shadow:var(--shadow); }
.stat-label { font-size:11px;font-family:var(--font-mono);color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px; }
.stat-value { font-size:36px;font-weight:800;line-height:1;margin-bottom:4px; }
.stat-sub { font-size:12px;color:var(--muted); }
.controls { display:flex;align-items:center;gap:12px;margin-bottom:24px;flex-wrap:wrap; }
.search-wrap { position:relative;flex:1;min-width:200px; }
.search-icon { position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--muted); }
.search-input { width:100%;padding:10px 12px 10px 38px;background:var(--surface);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:var(--font-sans);font-size:14px;outline:none;transition:border 0.15s; }
.search-input:focus { border-color:var(--accent); }
.select { padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:var(--font-sans);font-size:14px;outline:none;cursor:pointer;min-width:140px; }
.btn { display:inline-flex;align-items:center;gap:8px;padding:10px 16px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;border:none;font-family:var(--font-sans);transition:all 0.15s; }
.btn-primary { background:var(--accent);color:#0a1a14; }
.btn-primary:hover { opacity:0.9;transform:translateY(-1px); }
.btn-ghost { background:var(--surface);border:1px solid var(--border);color:var(--text); }
.btn-ghost:hover { background:var(--surface2); }
.view-toggle { display:flex;gap:4px;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:4px; }
.view-btn { padding:6px 8px;border-radius:6px;cursor:pointer;color:var(--muted);background:none;border:none;transition:all 0.15s; }
.view-btn.active { background:var(--accent);color:#0a1a14; }
.items-grid { display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px; }
.item-card { background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:20px;position:relative;overflow:hidden;transition:transform 0.15s,box-shadow 0.15s;animation:fadeIn 0.3s ease; }
@keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
.item-card:hover { transform:translateY(-2px);box-shadow:var(--shadow); }
.item-card::before { content:'';position:absolute;top:0;left:0;right:0;height:3px;background:var(--card-accent,var(--accent)); }
.item-header { display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px; }
.item-name { font-size:15px;font-weight:700;line-height:1.3;flex:1; }
.item-actions { display:flex;gap:4px;opacity:0;transition:opacity 0.15s; }
.item-card:hover .item-actions { opacity:1; }
.icon-btn { padding:4px;border-radius:6px;cursor:pointer;background:none;border:none;color:var(--muted);transition:all 0.15s; }
.icon-btn:hover { background:var(--surface2);color:var(--text); }
.icon-btn.del:hover { color:var(--danger); }
.badge { display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;font-family:var(--font-mono);text-transform:uppercase;letter-spacing:0.5px; }
.badge-category { background:var(--surface2);color:var(--muted);margin-bottom:12px; }
.badge-safe { background:rgba(34,211,160,0.12);color:var(--accent); }
.badge-warning { background:rgba(245,158,11,0.12);color:var(--warn); }
.badge-expired { background:rgba(239,68,68,0.12);color:var(--danger); }
.item-meta { display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px; }
.meta-item { font-size:12px; }
.meta-label { color:var(--muted);font-family:var(--font-mono);font-size:10px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px; }
.meta-value { font-weight:600; }
.progress-wrap { margin-top:12px; }
.progress-label { display:flex;justify-content:space-between;font-size:11px;color:var(--muted);font-family:var(--font-mono);margin-bottom:6px; }
.progress-track { background:var(--surface2);border-radius:4px;height:6px;overflow:hidden; }
.progress-fill { height:100%;border-radius:4px;transition:width 0.6s cubic-bezier(0.4,0,0.2,1); }
.table-wrap { background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden; }
table { width:100%;border-collapse:collapse; }
thead { background:var(--surface2); }
th { padding:12px 16px;text-align:left;font-size:11px;font-family:var(--font-mono);text-transform:uppercase;letter-spacing:1px;color:var(--muted);cursor:pointer;white-space:nowrap;user-select:none; }
th:hover { color:var(--text); }
td { padding:14px 16px;font-size:13px;border-top:1px solid var(--border); }
tr:hover td { background:var(--surface2); }
.modal-overlay { position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeInOverlay 0.2s ease; }
@keyframes fadeInOverlay { from{opacity:0} to{opacity:1} }
.modal { background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:32px;width:100%;max-width:560px;max-height:90vh;overflow-y:auto;box-shadow:0 24px 80px rgba(0,0,0,0.5);animation:slideUp 0.25s cubic-bezier(0.4,0,0.2,1); }
@keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
.modal-title { font-size:20px;font-weight:800;margin-bottom:24px;display:flex;align-items:center;justify-content:space-between; }
.form-grid { display:grid;grid-template-columns:1fr 1fr;gap:16px; }
.form-group { display:flex;flex-direction:column;gap:6px; }
.form-group.full { grid-column:span 2; }
label { font-size:12px;font-family:var(--font-mono);color:var(--muted);text-transform:uppercase;letter-spacing:0.5px; }
.input { padding:10px 12px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:var(--font-sans);font-size:14px;outline:none;transition:border 0.15s;width:100%; }
.input:focus { border-color:var(--accent); }
textarea.input { resize:vertical;min-height:80px; }
.form-actions { display:flex;justify-content:flex-end;gap:12px;margin-top:24px; }
.charts-grid { display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:32px; }
.chart-card { background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:24px; }
.chart-title { font-size:13px;font-weight:700;color:var(--muted);font-family:var(--font-mono);text-transform:uppercase;letter-spacing:1px;margin-bottom:20px; }
.bar-chart { display:flex;flex-direction:column;gap:12px; }
.bar-row { display:flex;align-items:center;gap:12px; }
.bar-label { font-size:12px;font-weight:600;min-width:110px;text-align:right;color:var(--muted);font-family:var(--font-mono); }
.bar-track { flex:1;background:var(--surface2);border-radius:4px;height:20px;overflow:hidden; }
.bar-fill { height:100%;border-radius:4px;display:flex;align-items:center;justify-content:flex-end;padding-right:8px;font-size:10px;font-weight:700;color:rgba(0,0,0,0.6);transition:width 0.8s cubic-bezier(0.4,0,0.2,1);font-family:var(--font-mono); }
.pie-wrap { display:flex;align-items:center;gap:24px; }
.pie-legend { display:flex;flex-direction:column;gap:8px; }
.legend-item { display:flex;align-items:center;gap:8px;font-size:12px; }
.legend-dot { width:10px;height:10px;border-radius:50%;flex-shrink:0; }
.legend-count { font-family:var(--font-mono);font-weight:700;margin-left:auto;padding-left:16px; }
.notif-badge { position:absolute;top:-4px;right:-4px;background:var(--danger);color:white;font-size:10px;width:16px;height:16px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700; }
.notif-panel { position:fixed;top:0;right:0;bottom:0;width:360px;background:var(--surface);border-left:1px solid var(--border);z-index:150;padding:24px;overflow-y:auto;animation:slideLeft 0.25s cubic-bezier(0.4,0,0.2,1); }
@keyframes slideLeft { from{transform:translateX(100%)} to{transform:translateX(0)} }
.notif-title { font-size:18px;font-weight:800;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between; }
.notif-item { background:var(--surface2);border-radius:10px;padding:14px;margin-bottom:10px;border-left:3px solid; }
.toast { position:fixed;bottom:24px;right:24px;z-index:300;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px 20px;font-size:14px;font-weight:600;box-shadow:var(--shadow);animation:toastIn 0.3s ease;display:flex;align-items:center;gap:10px; }
@keyframes toastIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
.empty { text-align:center;padding:60px 20px;color:var(--muted); }
.spinner { width:32px;height:32px;border:3px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 12px; }
@keyframes spin { to{transform:rotate(360deg)} }
.sync-dot { width:8px;height:8px;border-radius:50%;background:var(--accent);animation:pulse 2s infinite; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
@media(max-width:900px){
  .sidebar{width:60px} .logo,.nav-item span,.logo-sub{display:none}
  .main{margin-left:60px} .stats-grid{grid-template-columns:1fr 1fr} .charts-grid{grid-template-columns:1fr}
}
`;

const PIE_COLORS = ["#22d3a0","#3b82f6","#f59e0b","#ef4444","#8b5cf6","#ec4899","#06b6d4"];
const catColors = { Domain:"#3b82f6","SSL Certificate":"#22d3a0",License:"#8b5cf6",Subscription:"#f59e0b",SaaS:"#ec4899","API Key":"#06b6d4",Other:"#64748b" };
const NAV = [{ id:"dashboard",label:"Dashboard",icon:icons.chart },{ id:"assets",label:"Assets",icon:icons.shield },{ id:"calendar",label:"Calendar",icon:icons.calendar }];

// ── Pie Chart ─────────────────────────────────────────────────────────────────
function PieChart({ data }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <div style={{ color:"var(--muted)",fontSize:13 }}>No data yet</div>;
  let angle = -90;
  const slices = data.map((d, i) => {
    const pct = d.value / total;
    const a1 = angle; const a2 = angle + pct * 360; angle = a2;
    const r = 60, cx = 70, cy = 70;
    const x1 = cx + r * Math.cos(Math.PI/180*a1), y1 = cy + r * Math.sin(Math.PI/180*a1);
    const x2 = cx + r * Math.cos(Math.PI/180*a2), y2 = cy + r * Math.sin(Math.PI/180*a2);
    return { ...d, path:`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${pct>0.5?1:0},1 ${x2},${y2} Z`, color: PIE_COLORS[i % PIE_COLORS.length] };
  });
  return (
    <div className="pie-wrap">
      <svg width="140" height="140" viewBox="0 0 140 140">
        {slices.map((s,i) => <path key={i} d={s.path} fill={s.color} opacity="0.9"/>)}
        <circle cx="70" cy="70" r="30" fill="var(--surface)"/>
        <text x="70" y="74" textAnchor="middle" fontSize="14" fontWeight="800" fill="var(--text)" fontFamily="Syne">{total}</text>
      </svg>
      <div className="pie-legend">
        {slices.map((s,i) => (
          <div key={i} className="legend-item">
            <span className="legend-dot" style={{ background:s.color }}/>
            <span style={{ color:"var(--muted)" }}>{s.label}</span>
            <span className="legend-count" style={{ color:s.color }}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Calendar ──────────────────────────────────────────────────────────────────
function CalendarView({ items }) {
  const [month, setMonth] = useState(new Date());
  const yr = month.getFullYear(), mo = month.getMonth();
  const firstDay = new Date(yr,mo,1).getDay();
  const daysInMonth = new Date(yr,mo+1,0).getDate();
  const cells = [...Array(firstDay).fill(null), ...Array.from({length:daysInMonth},(_,i)=>i+1)];
  const evByDay = {};
  items.forEach(it => {
    if (!it.expirationDate) return;
    const d = new Date(it.expirationDate);
    if (d.getFullYear()===yr && d.getMonth()===mo) { const day=d.getDate(); (evByDay[day]=evByDay[day]||[]).push(it); }
  });
  const t = today();
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  return (
    <div>
      <div style={{ display:"flex",alignItems:"center",gap:16,marginBottom:24 }}>
        <button className="btn btn-ghost" onClick={()=>setMonth(new Date(yr,mo-1))}>←</button>
        <span style={{ fontWeight:800,fontSize:20 }}>{months[mo]} {yr}</span>
        <button className="btn btn-ghost" onClick={()=>setMonth(new Date(yr,mo+1))}>→</button>
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:8,marginBottom:8 }}>
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=><div key={d} style={{ textAlign:"center",fontSize:11,fontFamily:"var(--font-mono)",color:"var(--muted)",textTransform:"uppercase",padding:"4px 0" }}>{d}</div>)}
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:8 }}>
        {cells.map((day,i)=>{
          const isToday = day&&t.getDate()===day&&t.getMonth()===mo&&t.getFullYear()===yr;
          const events = day?(evByDay[day]||[]):[];
          return <div key={i} style={{ minHeight:80,background:"var(--surface)",border:`1px solid ${isToday?"var(--accent)":"var(--border)"}`,borderRadius:8,padding:8,opacity:day?1:0 }}>
            {day&&<>
              <div style={{ fontSize:13,fontWeight:isToday?800:600,color:isToday?"var(--accent)":"var(--text)",marginBottom:4 }}>{day}</div>
              {events.map(ev=>{const st=statusOf(ev.expirationDate);return<div key={ev.id} style={{ fontSize:10,background:`rgba(${st==="safe"?"34,211,160":st==="warning"?"245,158,11":"239,68,68"},0.15)`,color:statusColor[st],borderRadius:4,padding:"2px 4px",marginBottom:2,fontFamily:"var(--font-mono)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{ev.name}</div>;})}
            </>}
          </div>;
        })}
      </div>
    </div>
  );
}

// ── Item Modal ────────────────────────────────────────────────────────────────
function ItemModal({ item, onSave, onClose, saving }) {
  const blank = { name:"",category:"Domain",purchaseDate:"",expirationDate:"",vendor:"",cost:"",notes:"" };
  const [form,setForm] = useState(item||blank);
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const save=()=>{ if(!form.name||!form.expirationDate) return alert("Name and Expiration Date are required."); onSave(form); };
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div className="modal-title">{item?"Edit Asset":"Add Asset"}<button className="icon-btn" onClick={onClose}><Icon d={icons.x} size={18}/></button></div>
        <div className="form-grid">
          <div className="form-group full"><label>Name *</label><input className="input" value={form.name} onChange={e=>set("name",e.target.value)} placeholder="e.g. acmecorp.com"/></div>
          <div className="form-group"><label>Category *</label><select className="input select" value={form.category} onChange={e=>set("category",e.target.value)}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
          <div className="form-group"><label>Vendor / Provider</label><input className="input" value={form.vendor} onChange={e=>set("vendor",e.target.value)} placeholder="e.g. Namecheap"/></div>
          <div className="form-group"><label>Purchase Date</label><input className="input" type="date" value={form.purchaseDate} onChange={e=>set("purchaseDate",e.target.value)}/></div>
          <div className="form-group"><label>Expiration Date *</label><input className="input" type="date" value={form.expirationDate} onChange={e=>set("expirationDate",e.target.value)}/></div>
          <div className="form-group full"><label>Cost (USD / year)</label><input className="input" type="number" value={form.cost} onChange={e=>set("cost",e.target.value)} placeholder="0.00"/></div>
          <div className="form-group full"><label>Notes</label><textarea className="input" value={form.notes} onChange={e=>set("notes",e.target.value)} placeholder="Any additional notes..."/></div>
        </div>
        <div className="form-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving?"Saving…":item?"Save Changes":"Add Asset"}</button>
        </div>
      </div>
    </div>
  );
}

// ── Expiry Bar ────────────────────────────────────────────────────────────────
function ExpiryBar({ purchaseDate, expirationDate }) {
  const st = statusOf(expirationDate);
  const d = daysUntil(expirationDate);
  if (!purchaseDate||!expirationDate) return null;
  const total = (new Date(expirationDate)-new Date(purchaseDate))/86400000;
  const elapsed = (today()-new Date(purchaseDate))/86400000;
  const pct = Math.min(100,Math.max(0,(elapsed/total)*100));
  const label = d<0?"Expired":d===0?"Expires today":`${d}d left`;
  const c = statusColor[st];
  return (
    <div className="progress-wrap">
      <div className="progress-label"><span style={{color:c}}>{label}</span><span>{Math.round(pct)}% elapsed</span></div>
      <div className="progress-track"><div className="progress-fill" style={{width:`${pct}%`,background:c}}/></div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [dark,setDark] = useState(true);
  const [view,setView] = useState("dashboard");
  const [displayMode,setDisplayMode] = useState("card");
  const [items,setItems] = useState([]);
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [search,setSearch] = useState("");
  const [catFilter,setCatFilter] = useState("All");
  const [statusFilter,setStatusFilter] = useState("All");
  const [sortBy,setSortBy] = useState("expiration_date");
  const [sortDir,setSortDir] = useState("asc");
  const [modal,setModal] = useState(null);
  const [notifOpen,setNotifOpen] = useState(false);
  const [toast,setToast] = useState(null);
  const [warnDays,setWarnDays] = useState(30);

  const showToast = (msg,color="var(--accent)")=>{ setToast({msg,color}); setTimeout(()=>setToast(null),3000); };

  // ── Load & realtime ─────────────────────────────────────────────────────────
  useEffect(()=>{
    fetchItems();
    // Subscribe to realtime changes so all teammates see updates instantly
    const channel = supabase.channel("assets-changes")
      .on("postgres_changes",{event:"*",schema:"public",table:"assets"},()=>fetchItems())
      .subscribe();
    return ()=>supabase.removeChannel(channel);
  },[]);

  const fetchItems = async()=>{
    const { data,error } = await supabase.from("assets").select("*").order("expiration_date",{ascending:true});
    if (!error) setItems((data||[]).map(fromDB));
    setLoading(false);
  };

  // ── CRUD ────────────────────────────────────────────────────────────────────
  const saveItem = async(form)=>{
    setSaving(true);
    if (modal==="add") {
      const { error } = await supabase.from("assets").insert([toDB(form)]);
      if (error) showToast("Error: "+error.message,"var(--danger)");
      else showToast("✓ Asset added");
    } else {
      const { error } = await supabase.from("assets").update(toDB(form)).eq("id",modal.id);
      if (error) showToast("Error: "+error.message,"var(--danger)");
      else showToast("✓ Asset updated");
    }
    setSaving(false); setModal(null);
  };

  const delItem = async(id)=>{
    if (!confirm("Delete this asset?")) return;
    const { error } = await supabase.from("assets").delete().eq("id",id);
    if (error) showToast("Error: "+error.message,"var(--danger)");
    else showToast("Asset deleted","var(--danger)");
  };

  // ── Derived data ─────────────────────────────────────────────────────────────
  const filtered = useMemo(()=>{
    return items.filter(it=>{
      const q=search.toLowerCase();
      const ms=!q||it.name.toLowerCase().includes(q)||(it.vendor||"").toLowerCase().includes(q)||(it.notes||"").toLowerCase().includes(q);
      const mc=catFilter==="All"||it.category===catFilter;
      const st=statusOf(it.expirationDate);
      const sm={safe:"Active",warning:"Expiring Soon",expired:"Expired"};
      const mst=statusFilter==="All"||sm[st]===statusFilter;
      return ms&&mc&&mst;
    }).sort((a,b)=>{
      let va=a[sortBy==="expiration_date"?"expirationDate":sortBy]||"";
      let vb=b[sortBy==="expiration_date"?"expirationDate":sortBy]||"";
      if(sortBy==="cost"){va=parseFloat(va)||0;vb=parseFloat(vb)||0;}
      const c=va<vb?-1:va>vb?1:0;
      return sortDir==="asc"?c:-c;
    });
  },[items,search,catFilter,statusFilter,sortBy,sortDir]);

  const stats = useMemo(()=>({
    total:items.length,
    expired:items.filter(i=>statusOf(i.expirationDate)==="expired").length,
    expiring7:items.filter(i=>{const d=daysUntil(i.expirationDate);return d>=0&&d<=7;}).length,
    expiring30:items.filter(i=>{const d=daysUntil(i.expirationDate);return d>=0&&d<=30;}).length,
    totalCost:items.reduce((s,i)=>s+(parseFloat(i.cost)||0),0),
  }),[items]);

  const alerts = useMemo(()=>items.filter(i=>{const d=daysUntil(i.expirationDate);return d>=0&&d<=warnDays;}).sort((a,b)=>daysUntil(a.expirationDate)-daysUntil(b.expirationDate)),[items,warnDays]);

  const catData = useMemo(()=>{
    const c={};items.forEach(i=>{c[i.category]=(c[i.category]||0)+1;});
    return Object.entries(c).map(([label,value])=>({label,value})).sort((a,b)=>b.value-a.value);
  },[items]);

  const toggle=(f)=>{ if(sortBy===f)setSortDir(d=>d==="asc"?"desc":"asc"); else{setSortBy(f);setSortDir("asc");} };
  const sortIcon=(f)=>sortBy===f?(sortDir==="asc"?" ↑":" ↓"):"";

  const exportCSV=()=>{
    const h=["Name","Category","Purchase Date","Expiration Date","Vendor","Cost","Notes","Status"];
    const rows=items.map(i=>[i.name,i.category,i.purchaseDate,i.expirationDate,i.vendor||"",i.cost||0,(i.notes||"").replace(/,/g,""),statusLabel[statusOf(i.expirationDate)]]);
    const csv=[h,...rows].map(r=>r.join(",")).join("\n");
    const a=document.createElement("a");a.href="data:text/csv;charset=utf-8,"+encodeURIComponent(csv);a.download="it-assets.csv";a.click();
    showToast("✓ CSV exported");
  };

  const maxCat = Math.max(...catData.map(d=>d.value),1);

  return (
    <>
      <style>{css}</style>
      <div className={`app${dark?"":" light"}`}>
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="logo">
            <div className="logo-text">AssetVault</div>
            <div className="logo-sub">Team Asset Tracker</div>
          </div>
          <nav className="nav">
            {NAV.map(n=>(
              <button key={n.id} className={`nav-item${view===n.id?" active":""}`} onClick={()=>setView(n.id)}>
                <Icon d={n.icon} size={16}/><span>{n.label}</span>
              </button>
            ))}
          </nav>
          <div className="sidebar-footer">
            <div style={{ fontSize:11,fontFamily:"var(--font-mono)",color:"var(--muted)",marginBottom:8,textTransform:"uppercase",letterSpacing:1 }}>Warn before (days)</div>
            <select className="select" style={{ width:"100%",marginBottom:12,fontSize:12 }} value={warnDays} onChange={e=>setWarnDays(+e.target.value)}>
              <option value={7}>7 days</option><option value={15}>15 days</option><option value={30}>30 days</option><option value={60}>60 days</option>
            </select>
            <button className="nav-item" onClick={()=>setDark(d=>!d)}>
              <Icon d={dark?icons.sun:icons.moon} size={16}/><span>{dark?"Light Mode":"Dark Mode"}</span>
            </button>
            <button className="nav-item" onClick={fetchItems} style={{ marginTop:4 }}>
              <Icon d={icons.refresh} size={16}/><span>Refresh</span>
            </button>
          </div>
        </aside>

        {/* Main */}
        <div className="main">
          <div className="topbar">
            <div className="topbar-title">
              {view==="dashboard"?"Dashboard":view==="assets"?"Assets":"Calendar"}
            </div>
            {/* Live sync indicator */}
            <div style={{ display:"flex",alignItems:"center",gap:6,fontSize:12,color:"var(--muted)",fontFamily:"var(--font-mono)" }}>
              <span className="sync-dot"/><span>Live sync</span>
            </div>
            <button className="btn btn-ghost" onClick={exportCSV}><Icon d={icons.download} size={14}/> Export CSV</button>
            <button className="btn btn-ghost" style={{ position:"relative" }} onClick={()=>setNotifOpen(o=>!o)}>
              <Icon d={icons.bell} size={16}/>
              {alerts.length>0&&<span className="notif-badge">{alerts.length}</span>}
            </button>
            <button className="btn btn-primary" onClick={()=>setModal("add")}><Icon d={icons.plus} size={14}/> Add Asset</button>
          </div>

          <div className="content">
            {loading ? (
              <div style={{ textAlign:"center",paddingTop:80 }}>
                <div className="spinner"/>
                <div style={{ color:"var(--muted)",fontSize:14,fontFamily:"var(--font-mono)" }}>Loading assets…</div>
              </div>
            ) : <>

            {/* DASHBOARD */}
            {view==="dashboard"&&<>
              <div className="stats-grid">
                {[
                  { label:"Total Assets",value:stats.total,color:"var(--accent2)",sub:"across all categories" },
                  { label:"Expiring ≤ 30d",value:stats.expiring30,color:"var(--warn)",sub:`${stats.expiring7} within 7 days` },
                  { label:"Expired",value:stats.expired,color:"var(--danger)",sub:"require immediate action" },
                  { label:"Annual Cost",value:`$${stats.totalCost.toLocaleString("en-US",{maximumFractionDigits:0})}`,color:"var(--accent)",sub:"total tracked spend" },
                ].map(s=>(
                  <div key={s.label} className="stat-card">
                    <div className="stat-label">{s.label}</div>
                    <div className="stat-value" style={{ color:s.color }}>{s.value}</div>
                    <div className="stat-sub">{s.sub}</div>
                  </div>
                ))}
              </div>
              <div className="charts-grid">
                <div className="chart-card">
                  <div className="chart-title">Assets by Category</div>
                  {catData.length===0?<div style={{color:"var(--muted)",fontSize:13}}>No assets yet — add some!</div>:
                  <div className="bar-chart">
                    {catData.map(d=>(
                      <div key={d.label} className="bar-row">
                        <span className="bar-label">{d.label}</span>
                        <div className="bar-track"><div className="bar-fill" style={{ width:`${(d.value/maxCat)*100}%`,background:catColors[d.label]||"#64748b" }}>{d.value}</div></div>
                      </div>
                    ))}
                  </div>}
                </div>
                <div className="chart-card">
                  <div className="chart-title">Expiry Distribution</div>
                  <PieChart data={[
                    {label:"Active",value:items.filter(i=>statusOf(i.expirationDate)==="safe").length},
                    {label:"Expiring Soon",value:items.filter(i=>statusOf(i.expirationDate)==="warning").length},
                    {label:"Expired",value:items.filter(i=>statusOf(i.expirationDate)==="expired").length},
                  ].filter(d=>d.value>0)}/>
                </div>
              </div>
              <div className="chart-card">
                <div className="chart-title">Upcoming Expirations (within {warnDays} days)</div>
                {alerts.length===0
                  ?<div style={{color:"var(--muted)",fontSize:14}}>No assets expiring within {warnDays} days 🎉</div>
                  :<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12}}>
                    {alerts.map(item=>{
                      const d=daysUntil(item.expirationDate);
                      const c=d<=7?"var(--danger)":"var(--warn)";
                      return<div key={item.id} style={{background:"var(--surface2)",borderRadius:8,padding:14,borderLeft:`3px solid ${c}`}}>
                        <div style={{fontWeight:700,fontSize:13,marginBottom:4}}>{item.name}</div>
                        <div style={{fontSize:11,fontFamily:"var(--font-mono)",color:c}}>{d===0?"Expires TODAY":`Expires in ${d} day${d!==1?"s":""}`} · {fmtDate(item.expirationDate)}</div>
                        <div style={{fontSize:11,color:"var(--muted)",marginTop:4}}>{item.category}{item.vendor?" · "+item.vendor:""}</div>
                      </div>;
                    })}
                  </div>
                }
              </div>
            </>}

            {/* ASSETS */}
            {view==="assets"&&<>
              <div className="controls">
                <div className="search-wrap">
                  <span className="search-icon"><Icon d={icons.search} size={14}/></span>
                  <input className="search-input" placeholder="Search assets…" value={search} onChange={e=>setSearch(e.target.value)}/>
                </div>
                <select className="select" value={catFilter} onChange={e=>setCatFilter(e.target.value)}>
                  <option>All</option>{CATEGORIES.map(c=><option key={c}>{c}</option>)}
                </select>
                <select className="select" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
                  <option>All</option><option>Active</option><option>Expiring Soon</option><option>Expired</option>
                </select>
                <div className="view-toggle">
                  <button className={`view-btn${displayMode==="card"?" active":""}`} onClick={()=>setDisplayMode("card")} title="Card view"><Icon d={icons.grid} size={14}/></button>
                  <button className={`view-btn${displayMode==="table"?" active":""}`} onClick={()=>setDisplayMode("table")} title="Table view"><Icon d={icons.list} size={14}/></button>
                </div>
                <div style={{fontSize:12,color:"var(--muted)",fontFamily:"var(--font-mono)",whiteSpace:"nowrap"}}>{filtered.length} item{filtered.length!==1?"s":""}</div>
              </div>
              {filtered.length===0
                ?<div className="empty">
                  <div style={{fontSize:48,marginBottom:12,opacity:0.3}}>📭</div>
                  <div style={{fontSize:16,fontWeight:600,marginBottom:4}}>{items.length===0?"No assets yet":"No assets match your filters"}</div>
                  <div style={{fontSize:13}}>{items.length===0?"Click 'Add Asset' to get started":"Try adjusting your search or filters"}</div>
                  {items.length===0&&<button className="btn btn-primary" style={{marginTop:20}} onClick={()=>setModal("add")}><Icon d={icons.plus} size={14}/> Add Your First Asset</button>}
                </div>
                :displayMode==="card"
                  ?<div className="items-grid">
                    {filtered.map(item=>{
                      const st=statusOf(item.expirationDate);
                      return<div key={item.id} className="item-card" style={{"--card-accent":statusColor[st]}}>
                        <div className="item-header">
                          <div className="item-name">{item.name}</div>
                          <div className="item-actions">
                            <button className="icon-btn" onClick={()=>setModal(item)} title="Edit"><Icon d={icons.edit} size={14}/></button>
                            <button className="icon-btn del" onClick={()=>delItem(item.id)} title="Delete"><Icon d={icons.trash} size={14}/></button>
                          </div>
                        </div>
                        <div><span className="badge badge-category">{item.category}</span></div>
                        <div className={`badge badge-${st}`} style={{marginBottom:12}}>
                          <span style={{width:6,height:6,borderRadius:"50%",background:statusColor[st],display:"inline-block"}}/>
                          {statusLabel[st]}
                        </div>
                        <div className="item-meta">
                          <div className="meta-item"><div className="meta-label">Expires</div><div className="meta-value" style={{color:statusColor[st]}}>{fmtDate(item.expirationDate)}</div></div>
                          <div className="meta-item"><div className="meta-label">Cost/yr</div><div className="meta-value">{item.cost?`$${parseFloat(item.cost).toFixed(2)}`:"—"}</div></div>
                          {item.vendor&&<div className="meta-item"><div className="meta-label">Vendor</div><div className="meta-value">{item.vendor}</div></div>}
                          {item.purchaseDate&&<div className="meta-item"><div className="meta-label">Purchased</div><div className="meta-value">{fmtDate(item.purchaseDate)}</div></div>}
                        </div>
                        {item.notes&&<div style={{fontSize:12,color:"var(--muted)",marginBottom:12,fontStyle:"italic"}}>{item.notes}</div>}
                        <ExpiryBar purchaseDate={item.purchaseDate} expirationDate={item.expirationDate}/>
                      </div>;
                    })}
                  </div>
                  :<div className="table-wrap">
                    <table>
                      <thead><tr>
                        {[["name","Name"],["category","Category"],["expirationDate","Expiration"],["vendor","Vendor"],["cost","Cost"],["","Status"]].map(([f,l])=>(
                          <th key={l} onClick={()=>f&&toggle(f)}>{l}{sortIcon(f)}</th>
                        ))}
                        <th>Actions</th>
                      </tr></thead>
                      <tbody>
                        {filtered.map(item=>{
                          const st=statusOf(item.expirationDate);const d=daysUntil(item.expirationDate);
                          return<tr key={item.id}>
                            <td style={{fontWeight:700}}>{item.name}</td>
                            <td><span className="badge badge-category">{item.category}</span></td>
                            <td style={{color:statusColor[st],fontFamily:"var(--font-mono)",fontSize:12}}>{fmtDate(item.expirationDate)}</td>
                            <td style={{color:"var(--muted)"}}>{item.vendor||"—"}</td>
                            <td style={{fontFamily:"var(--font-mono)"}}>{item.cost?`$${parseFloat(item.cost).toFixed(2)}`:"—"}</td>
                            <td><span className={`badge badge-${st}`}><span style={{width:6,height:6,borderRadius:"50%",background:statusColor[st],display:"inline-block"}}/>{d<0?"Expired":d<=30?`${d}d left`:statusLabel[st]}</span></td>
                            <td><div style={{display:"flex",gap:4}}>
                              <button className="icon-btn" onClick={()=>setModal(item)}><Icon d={icons.edit} size={14}/></button>
                              <button className="icon-btn del" onClick={()=>delItem(item.id)}><Icon d={icons.trash} size={14}/></button>
                            </div></td>
                          </tr>;
                        })}
                      </tbody>
                    </table>
                  </div>
              }
            </>}

            {/* CALENDAR */}
            {view==="calendar"&&<div className="chart-card"><CalendarView items={items}/></div>}

            </>}
          </div>
        </div>

        {/* Notifications */}
        {notifOpen&&<>
          <div style={{position:"fixed",inset:0,zIndex:140}} onClick={()=>setNotifOpen(false)}/>
          <div className="notif-panel">
            <div className="notif-title"><span>🔔 Alerts</span><button className="icon-btn" onClick={()=>setNotifOpen(false)}><Icon d={icons.x} size={16}/></button></div>
            <div style={{fontSize:11,fontFamily:"var(--font-mono)",color:"var(--muted)",marginBottom:16,textTransform:"uppercase",letterSpacing:1}}>Expiring within {warnDays} days</div>
            {alerts.length===0
              ?<div style={{color:"var(--muted)",fontSize:14}}>No alerts — all assets healthy ✓</div>
              :alerts.map(item=>{
                const d=daysUntil(item.expirationDate);const c=d<=7?"var(--danger)":"var(--warn)";
                return<div key={item.id} className="notif-item" style={{borderColor:c}}>
                  <div style={{fontWeight:700,fontSize:13,marginBottom:4}}>{item.name}</div>
                  <div style={{fontSize:12,color:c,fontFamily:"var(--font-mono)"}}>{d===0?"Expires TODAY":`${d} day${d!==1?"s":""} remaining`} · {fmtDate(item.expirationDate)}</div>
                  <div style={{fontSize:11,color:"var(--muted)",marginTop:4}}>{item.category}{item.vendor?" · "+item.vendor:""}</div>
                </div>;
              })
            }
          </div>
        </>}

        {modal&&<ItemModal item={modal==="add"?null:modal} onSave={saveItem} onClose={()=>setModal(null)} saving={saving}/>}
        {toast&&<div className="toast" style={{borderLeft:`3px solid ${toast.color}`}}>{toast.msg}</div>}
      </div>
    </>
  );
}
