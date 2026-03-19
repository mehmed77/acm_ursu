import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axios';
import Container from '../components/ui/Container';

/* ═══════════════════════════════════════════════════
   DESIGN TOKENS
   ═══════════════════════════════════════════════════ */
const T = {
    bg: 'var(--bg-base)',
    surf: 'var(--bg-surface)',
    surf2: 'var(--bg-elevated)',
    b: 'var(--border-subtle)',
    text: 'var(--text-primary)',
    sub: 'var(--text-muted)',
    cyan: '#00d4ff',
    grn: '#00e676',
    amb: '#ffb300',
    red: '#ff2d55',
    pur: '#a855f7',
    ind: '#6366f1',
    org: '#f97316',
};

const SC = {
    accepted:              { label: 'Accepted',    color: '#00e676', dim: 'rgba(0,230,118,0.10)',  bd: 'rgba(0,230,118,0.18)' },
    wrong_answer:          { label: 'Wrong Answer', color: '#ff2d55', dim: 'rgba(255,45,85,0.10)',  bd: 'rgba(255,45,85,0.18)' },
    time_limit_exceeded:   { label: 'Time Limit',  color: '#ffb300', dim: 'rgba(255,179,0,0.10)',  bd: 'rgba(255,179,0,0.18)' },
    memory_limit_exceeded: { label: 'Mem Limit',   color: '#ffb300', dim: 'rgba(255,179,0,0.10)',  bd: 'rgba(255,179,0,0.18)' },
    runtime_error:         { label: 'Runtime Err',  color: '#ff2d55', dim: 'rgba(255,45,85,0.08)',  bd: 'rgba(255,45,85,0.16)' },
    compilation_error:     { label: 'Compile Err',  color: '#f97316', dim: 'rgba(249,115,22,0.08)', bd: 'rgba(249,115,22,0.16)' },
    security_violation:    { label: 'Blocked',      color: '#a855f7', dim: 'rgba(168,85,247,0.08)', bd: 'rgba(168,85,247,0.16)' },
    pending:               { label: 'Pending',      color: '#6366f1', dim: 'rgba(99,102,241,0.08)', bd: 'rgba(99,102,241,0.16)' },
    running:               { label: 'Running',      color: '#00d4ff', dim: 'rgba(0,212,255,0.08)',  bd: 'rgba(0,212,255,0.18)' },
    system_error:          { label: 'System Err',    color: 'var(--text-muted)', dim: 'rgba(120,120,160,0.08)', bd: 'rgba(120,120,160,0.14)' },
};

const LANG = {
    python: { label: 'Python', color: '#3b82f6', bg: 'rgba(59,130,246,0.10)', icon: 'PY' },
    cpp:    { label: 'C++17',  color: '#818cf8', bg: 'rgba(129,140,248,0.10)', icon: 'C+' },
    java:   { label: 'Java',   color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', icon: 'JV' },
    csharp: { label: 'C#',     color: '#10b981', bg: 'rgba(16,185,129,0.10)', icon: 'C#' },
};

/* ═══════════════════════════════════════════════════
   GLOBAL CSS
   ═══════════════════════════════════════════════════ */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=IBM+Plex+Mono:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap');

  @keyframes shimmer {
    0%   { background-position:-200% 0; }
    100% { background-position:200% 0; }
  }
  @keyframes ring-ping {
    0%   { transform:scale(1); opacity:.7; }
    100% { transform:scale(2.2); opacity:0; }
  }
  @keyframes pulse-slow {
    0%,100% { opacity:1; }
    50%     { opacity:.45; }
  }
  @keyframes flash-row {
    0%   { background:rgba(0,212,255,.12); }
    100% { background:transparent; }
  }
  @keyframes spin { to { transform:rotate(360deg); } }

  .skel {
    border-radius:4px;
    background:linear-gradient(90deg,
      var(--bg-elevated) 25%,
      var(--border-subtle) 50%,
      var(--bg-elevated) 75%);
    background-size:200% 100%;
    animation:shimmer 1.6s ease-in-out infinite;
  }

  .r {
    position:relative;
    transition:background .1s;
  }
  .r:hover { background:rgba(99,102,241,.035) !important; }

  ::-webkit-scrollbar { width:3px; height:3px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:var(--border-subtle); border-radius:4px; }
`;

/* ═══════════════════════════════════════════════════
   MICRO COMPONENTS
   ═══════════════════════════════════════════════════ */
function LiveDot({ color = T.grn, size = 5, active = true }) {
    return (
        <span style={{ position: 'relative', display: 'inline-flex', width: size, height: size, flexShrink: 0 }}>
            {active && (
                <span style={{
                    position: 'absolute', inset: 0, borderRadius: '50%',
                    background: color, animation: 'ring-ping 2s ease-out infinite',
                }} />
            )}
            <span style={{
                position: 'relative', width: '100%', height: '100%',
                borderRadius: '50%', background: color,
                boxShadow: `0 0 ${size * 2}px ${color}cc`,
                animation: active ? 'pulse-slow 2s ease-in-out infinite' : 'none',
            }} />
        </span>
    );
}

function M({ ch, col = T.sub, sz = 11, w = 500 }) {
    return (
        <span style={{ fontFamily: "var(--font-mono)", fontSize: sz, fontWeight: w, color: col, lineHeight: 1 }}>
            {ch}
        </span>
    );
}

/* Status badge — compact */
function SBadge({ status }) {
    const c = SC[status] || SC.system_error;
    const isRun = status === 'running' || status === 'pending';
    return (
        <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            height: 20, padding: '0 7px', borderRadius: 5,
            background: c.dim, border: `1px solid ${c.bd}`,
            width: 'fit-content',
        }}>
            {isRun ? (
                <div style={{
                    width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                    border: `1.5px solid ${c.color}44`, borderTopColor: c.color,
                    animation: 'spin .65s linear infinite',
                }} />
            ) : (
                <span style={{
                    width: 4, height: 4, borderRadius: '50%',
                    background: c.color, display: 'inline-block', flexShrink: 0,
                    boxShadow: `0 0 5px ${c.color}`,
                }} />
            )}
            <span style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9, fontWeight: 600, color: c.color,
                letterSpacing: '.01em', whiteSpace: 'nowrap',
            }}>
                {c.label}
            </span>
        </div>
    );
}

/* Language badge — compact */
function LBadge({ lang }) {
    const c = LANG[lang] || { label: lang, color: T.sub, bg: 'rgba(120,120,160,.08)', icon: '??' };
    return (
        <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            height: 18, padding: '0 6px', borderRadius: 4,
            background: c.bg, border: `1px solid ${c.color}22`,
            width: 'fit-content',
        }}>
            <span style={{
                fontFamily: "var(--font-mono)",
                fontSize: 8, fontWeight: 700, color: c.color, letterSpacing: '.04em',
            }}>{c.icon}</span>
            <span style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9, fontWeight: 600, color: c.color,
            }}>{c.label}</span>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   TIME FORMATTING — FIXED QACHON
   ═══════════════════════════════════════════════════ */
function formatDate(iso) {
    if (!iso) return '—';
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);

    // Less than 60 seconds
    if (diffSec < 60) return `${diffSec} soniya oldin`;
    // Less than 60 minutes
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} daqiqa oldin`;
    // Less than 24 hours
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} soat oldin`;

    // More than 24 hours — show proper date
    const day = String(date.getDate()).padStart(2, '0');
    const months = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
    const month = months[date.getMonth()];
    const hours = String(date.getHours()).padStart(2, '0');
    const mins = String(date.getMinutes()).padStart(2, '0');

    // Same year — show day month time
    if (date.getFullYear() === now.getFullYear()) {
        return `${day} ${month} ${hours}:${mins}`;
    }
    // Different year
    return `${day} ${month} ${date.getFullYear()} ${hours}:${mins}`;
}

/* ═══════════════════════════════════════════════════
   FILTER INPUTS
   ═══════════════════════════════════════════════════ */
function FInput({ placeholder, value, onChange }) {
    return (
        <input
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            style={{
                width: '100%', height: 30,
                background: T.surf2, border: `1px solid ${T.b}`,
                borderRadius: 6, padding: '0 10px',
                color: T.text, fontSize: 11, outline: 'none',
                fontFamily: "var(--font-sans)",
                transition: 'border-color .2s',
            }}
            onFocus={e => { e.target.style.borderColor = T.cyan; }}
            onBlur={e => { e.target.style.borderColor = T.b; }}
        />
    );
}
function FSel({ value, onChange, options }) {
    return (
        <select
            value={value}
            onChange={e => onChange(e.target.value)}
            style={{
                width: '100%', height: 30,
                background: 'var(--bg-surface)', border: `1px solid ${T.b}`,
                borderRadius: 6, padding: '0 8px',
                color: value ? T.text : T.sub,
                fontSize: 11, outline: 'none', cursor: 'pointer',
                fontFamily: "var(--font-sans)",
                transition: 'border-color .2s',
            }}
            onFocus={e => e.target.style.borderColor = T.cyan}
            onBlur={e => e.target.style.borderColor = T.b}
        >
            {options.map(o => (
                <option key={o.v} value={o.v} style={{ background: 'var(--bg-surface)' }}>{o.l}</option>
            ))}
        </select>
    );
}

/* ═══════════════════════════════════════════════════
   COMPACT BUTTON
   ═══════════════════════════════════════════════════ */
function Btn({ children, onClick, active, variant = 'default', style: s = {} }) {
    const palettes = {
        default: {
            bg: active ? 'rgba(99,102,241,.12)' : 'var(--bg-elevated)',
            bd: active ? 'rgba(99,102,241,.30)' : T.b,
            col: active ? '#818cf8' : T.sub,
        },
        live: {
            bg: active ? 'rgba(0,230,118,.08)' : 'var(--bg-elevated)',
            bd: active ? 'rgba(0,230,118,.22)' : T.b,
            col: active ? T.grn : T.sub,
        },
        danger: { bg: 'rgba(255,45,85,.07)', bd: 'rgba(255,45,85,.20)', col: T.red },
        cyan: { bg: 'rgba(0,212,255,.08)', bd: 'rgba(0,212,255,.22)', col: T.cyan },
    };
    const p = palettes[variant] || palettes.default;
    return (
        <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: .94 }}
            onClick={onClick}
            style={{
                display: 'flex', alignItems: 'center', gap: 5,
                height: 28, padding: '0 10px', borderRadius: 6,
                background: p.bg, border: `1px solid ${p.bd}`,
                color: p.col, fontSize: 11, fontWeight: 600,
                cursor: 'pointer', fontFamily: "var(--font-sans)",
                transition: 'all .12s', whiteSpace: 'nowrap',
                ...s,
            }}
        >{children}</motion.button>
    );
}

/* ═══════════════════════════════════════════════════
   PAGINATION BUTTON
   ═══════════════════════════════════════════════════ */
function PBtn({ onClick, disabled, active, label }) {
    return (
        <motion.button
            onClick={onClick} disabled={disabled}
            whileHover={!disabled && !active ? { scale: 1.08 } : {}}
            whileTap={!disabled ? { scale: .88 } : {}}
            style={{
                width: 28, height: 28, borderRadius: 6,
                fontSize: 11, cursor: disabled ? 'not-allowed' : 'pointer',
                fontFamily: "var(--font-mono)", fontWeight: active ? 700 : 500,
                background: active
                    ? `linear-gradient(135deg,${T.ind},${T.cyan})`
                    : 'var(--bg-elevated)',
                border: active ? 'none' : `1px solid ${T.b}`,
                color: active ? 'var(--bg-base)' : disabled ? 'var(--bg-elevated)' : T.sub,
                transition: 'all .12s',
            }}
        >{label}</motion.button>
    );
}

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════ */
export default function Status() {
    const navigate = useNavigate();

    const [subs, setSubs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [autoRef, setAutoRef] = useState(true);
    const [newIds, setNewIds] = useState(new Set());
    const [newCount, setNewCount] = useState(0);
    const [fOpen, setFOpen] = useState(false);
    const [filters, setFilters] = useState({ username: '', problem: '', language: '', status: '' });

    const timerRef = useRef(null);
    const prevFirst = useRef(null);

    const fetchSubs = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const params = { page };
            Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
            const { data } = await api.get('/status/', { params });
            const results = data.results || [];

            if (prevFirst.current && results[0]?.id > prevFirst.current) {
                const fresh = results.filter(s => s.id > prevFirst.current);
                if (fresh.length > 0 && page === 1) {
                    setNewCount(c => c + fresh.length);
                    const ids = new Set(fresh.map(s => s.id));
                    setNewIds(ids);
                    setTimeout(() => setNewIds(new Set()), 3500);
                }
            }
            if (results[0]) prevFirst.current = results[0].id;

            setSubs(results);
            setTotal(data.count || 0);
            setTPages(data.total_pages || 1);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { fetchSubs(); }, [page, filters]);

    useEffect(() => {
        clearInterval(timerRef.current);
        if (autoRef && page === 1) {
            // eslint-disable-next-line react-hooks/exhaustive-deps
            timerRef.current = setInterval(() => fetchSubs(true), 5000);
        }
        return () => clearInterval(timerRef.current);
    }, [autoRef, page, filters]);

    const setF = (k, v) => {
        setFilters(f => ({ ...f, [k]: v }));
        setPage(1); setNewCount(0);
    };
    const clearF = () => {
        setFilters({ username: '', problem: '', language: '', status: '' });
        setPage(1);
    };
    const hasF = Object.values(filters).some(v => v);
    const fCount = Object.values(filters).filter(v => v).length;

    const acCount = subs.filter(s => s.status === 'accepted').length;
    const runCount = subs.filter(s => s.status === 'running' || s.status === 'pending').length;

    /* Grid columns — compact */
    const gridCols = '56px 120px 1fr 80px 120px 64px 60px 110px';

    return (
        <>
            <style>{CSS}</style>

            <Container className="relative z-10 min-h-screen pt-3.5 pb-10 font-sans text-[var(--text-primary)]">

                {/* ══ COMPACT HEADER BAR ══ */}
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: .3 }}
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        gap: 12, flexWrap: 'wrap',
                        padding: '10px 16px',
                        background: T.surf,
                        border: `1px solid ${T.b}`,
                        borderRadius: 12,
                        marginBottom: 10,
                        position: 'relative', overflow: 'hidden',
                    }}
                >
                    {/* Decorative orb */}
                    <div style={{
                        position: 'absolute', top: -40, right: -20,
                        width: 140, height: 140, borderRadius: '50%',
                        background: `radial-gradient(circle,rgba(99,102,241,0.06),transparent 70%)`,
                        pointerEvents: 'none',
                    }} />

                    {/* Left: title + live indicator */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
                        {/* Live indicator */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            padding: '3px 8px', borderRadius: 100,
                            background: autoRef ? 'rgba(0,230,118,0.06)' : 'rgba(120,120,160,0.06)',
                            border: `1px solid ${autoRef ? 'rgba(0,230,118,0.16)' : 'rgba(120,120,160,0.14)'}`,
                        }}>
                            <LiveDot color={autoRef ? T.grn : T.sub} size={4} active={autoRef} />
                            <span style={{
                                fontFamily: "var(--font-mono)",
                                fontSize: 8, fontWeight: 700, color: autoRef ? T.grn : T.sub,
                                letterSpacing: '.1em',
                            }}>
                                {autoRef ? 'LIVE' : 'PAUSED'}
                            </span>
                        </div>

                        <div>
                            <h1 style={{
                                fontFamily: "var(--font-sans)",
                                fontSize: 'clamp(18px, 2.5vw, 24px)',
                                fontWeight: 800, letterSpacing: '-.02em',
                                lineHeight: 1.1, margin: 0,
                            }}>
                                Submission{' '}
                                <span style={{
                                    background: `linear-gradient(90deg,${T.ind},${T.cyan} 55%,${T.grn})`,
                                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                }}>
                                    Monitor
                                </span>
                            </h1>
                            <div style={{ marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <M ch={`Jami: `} sz={10} />
                                <M ch={total.toLocaleString()} col={T.cyan} sz={11} w={700} />
                                <M ch="ta submission" sz={10} />
                                {page > 1 && <M ch={`· Sahifa ${page}/${totalPages}`} sz={9} />}
                            </div>
                        </div>
                    </div>

                    {/* Right: stats pills + controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative', flexWrap: 'wrap' }}>
                        {/* Compact stats */}
                        <div style={{ display: 'flex', gap: 4 }}>
                            {[
                                { val: total, label: 'Jami', color: T.cyan, icon: '📡' },
                                { val: subs.length, label: 'Sahifada', color: T.sub, icon: '✓' },
                                { val: acCount, label: 'Accepted', color: T.grn, icon: '⚡' },
                                { val: runCount, label: 'Jarayonda', color: T.ind, icon: '⟳' },
                            ].map((s, i) => (
                                <div key={i} style={{
                                    display: 'flex', alignItems: 'center', gap: 5,
                                    padding: '4px 8px', borderRadius: 6,
                                    background: `${s.color}08`,
                                    border: `1px solid ${s.color}16`,
                                }}>
                                    <div>
                                        <div style={{
                                            fontFamily: "var(--font-sans)", fontSize: 7,
                                            color: T.sub, textTransform: 'uppercase',
                                            letterSpacing: '.05em', lineHeight: 1,
                                        }}>{s.label}</div>
                                        <div style={{
                                            fontFamily: "var(--font-mono)",
                                            fontSize: 12, fontWeight: 700, color: s.color,
                                            lineHeight: 1.1,
                                        }}>{s.val}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* New submissions badge */}
                        <AnimatePresence>
                            {newCount > 0 && (
                                <motion.button
                                    initial={{ opacity: 0, scale: .75 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: .75 }}
                                    onClick={() => { setNewCount(0); fetchSubs(); }}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 5,
                                        height: 24, padding: '0 8px', borderRadius: 5,
                                        background: `${T.cyan}10`, border: `1px solid ${T.cyan}28`,
                                        color: T.cyan, fontSize: 10, fontWeight: 700,
                                        cursor: 'pointer', fontFamily: "var(--font-mono)",
                                    }}
                                >
                                    <LiveDot color={T.cyan} size={4} />
                                    +{newCount} yangi
                                </motion.button>
                            )}
                        </AnimatePresence>

                        {/* Filter button */}
                        <Btn active={fOpen || hasF} onClick={() => setFOpen(o => !o)}>
                            <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                            </svg>
                            Filter
                            {fCount > 0 && (
                                <span style={{
                                    width: 14, height: 14, borderRadius: '50%',
                                    background: T.ind, color: 'white',
                                    fontSize: 8, fontWeight: 800,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>{fCount}</span>
                            )}
                        </Btn>

                        {/* Live/Pause */}
                        <Btn variant="live" active={autoRef} onClick={() => setAutoRef(a => !a)}>
                            {autoRef
                                ? <><span style={{ fontSize: 9 }}>⏸</span> Pauza</>
                                : <><span style={{ fontSize: 9 }}>▶</span> Live</>
                            }
                        </Btn>

                        {/* Refresh */}
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ rotate: 180, scale: .9 }}
                            onClick={() => fetchSubs()}
                            style={{
                                width: 28, height: 28, borderRadius: 6,
                                background: 'transparent', border: `1px solid ${T.b}`,
                                color: T.sub, fontSize: 13, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'color .12s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.color = T.cyan}
                            onMouseLeave={e => e.currentTarget.style.color = T.sub}
                        >↻</motion.button>
                    </div>
                </motion.div>

                {/* ══ FILTER PANEL ══ */}
                <AnimatePresence>
                    {fOpen && (
                        <motion.div
                            key="filter"
                            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginBottom: 8 }}
                            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                            transition={{ duration: .18 }}
                            style={{ overflow: 'hidden' }}
                        >
                            <div style={{
                                background: T.surf,
                                border: `1px solid ${T.ind}18`,
                                borderRadius: 10, padding: '10px 12px',
                            }}>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr 160px 200px auto',
                                    gap: 8, alignItems: 'center',
                                }}>
                                    <FInput placeholder="👤 Username..." value={filters.username} onChange={v => setF('username', v)} />
                                    <FInput placeholder="📝 Masala..." value={filters.problem} onChange={v => setF('problem', v)} />
                                    <FSel value={filters.language} onChange={v => setF('language', v)} options={[
                                        { v: '', l: '🌐 Barcha tillar' },
                                        { v: 'python', l: 'PY  Python 3' },
                                        { v: 'cpp', l: 'C+  C++ 17' },
                                        { v: 'java', l: 'JV  Java' },
                                        { v: 'csharp', l: 'C#  C# (.NET)' },
                                    ]} />
                                    <FSel value={filters.status} onChange={v => setF('status', v)} options={[
                                        { v: '', l: '📋 Barcha statuslar' },
                                        { v: 'accepted', l: '✓  Accepted' },
                                        { v: 'wrong_answer', l: '✗  Wrong Answer' },
                                        { v: 'time_limit_exceeded', l: '⏱  Time Limit' },
                                        { v: 'runtime_error', l: '💥  Runtime Error' },
                                        { v: 'compilation_error', l: '🔧  Compile Error' },
                                    ]} />
                                    {hasF && (
                                        <Btn variant="danger" onClick={clearF} style={{ padding: '0 10px' }}>
                                            ✕ Tozalash
                                        </Btn>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ══ TABLE ══ */}
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: .1 }}
                    style={{
                        background: T.surf, border: `1px solid ${T.b}`,
                        borderRadius: 10, overflow: 'hidden',
                        boxShadow: 'var(--card-shadow)',
                    }}
                >
                    {/* Table header */}
                    <div style={{
                        display: 'grid', gridTemplateColumns: gridCols,
                        padding: '7px 14px',
                        background: `linear-gradient(90deg,rgba(99,102,241,.04),rgba(0,212,255,.02),transparent)`,
                        borderBottom: `1px solid ${T.b}`,
                    }}>
                        {['#ID', 'FOYDALANUVCHI', 'MASALA', 'TIL', 'HOLATI', 'VAQT', 'XOTIRA', 'QACHON'].map((h, i) => (
                            <span key={i} style={{
                                fontFamily: "var(--font-mono)",
                                fontSize: 8, fontWeight: 700, color: T.sub,
                                letterSpacing: '.08em', textTransform: 'uppercase',
                            }}>{h}</span>
                        ))}
                    </div>

                    {/* Skeleton */}
                    {loading && [...Array(12)].map((_, i) => (
                        <div key={i} style={{
                            display: 'grid', gridTemplateColumns: gridCols,
                            padding: '0 14px', height: 36, alignItems: 'center',
                            borderBottom: `1px solid var(--border-subtle)`, gap: 6,
                        }}>
                            {[36, 80, 160, 56, 80, 36, 36, 70].map((w, j) => (
                                <div key={j} className="skel" style={{ height: 10, width: w, maxWidth: '100%' }} />
                            ))}
                        </div>
                    ))}

                    {/* Rows */}
                    <AnimatePresence initial={false}>
                        {!loading && subs.map((sub, idx) => {
                            const isAC = sub.status === 'accepted';
                            const isNew = newIds.has(sub.id);

                            return (
                                <motion.div
                                    key={sub.id}
                                    className="r"
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * .02, duration: .15 }}
                                    style={{
                                        display: 'grid', gridTemplateColumns: gridCols,
                                        padding: '0 14px', height: 36, alignItems: 'center',
                                        borderBottom: `1px solid var(--border-subtle)`,
                                        background: isNew
                                            ? undefined
                                            : isAC ? 'rgba(0,230,118,.015)' : idx % 2 === 1 ? 'var(--bg-elevated)' : 'transparent',
                                        animation: isNew ? 'flash-row 3s ease-out forwards' : 'none',
                                    }}
                                >
                                    {/* ID */}
                                    <M ch={`#${sub.id}`} sz={10} />

                                    {/* Username */}
                                    <div
                                        onClick={() => navigate(`/profile/${sub.username}`)}
                                        style={{
                                            fontSize: 11, fontWeight: 600, color: '#7c85f5',
                                            cursor: 'pointer', overflow: 'hidden',
                                            textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                            paddingRight: 6, transition: 'color .1s',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.color = '#b8c0ff'}
                                        onMouseLeave={e => e.currentTarget.style.color = '#7c85f5'}
                                    >
                                        {sub.username}
                                    </div>

                                    {/* Problem */}
                                    <div
                                        onClick={() => navigate(`/problems/${sub.problem_slug}`)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 5,
                                            cursor: 'pointer', overflow: 'hidden', paddingRight: 6,
                                        }}
                                    >
                                        <M ch={sub.problem_slug} sz={9} col="var(--text-muted)" />
                                        <span style={{
                                            fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)',
                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                            transition: 'color .1s',
                                        }}
                                            onMouseEnter={e => e.currentTarget.style.color = T.text}
                                            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                                        >{sub.problem_title}</span>
                                    </div>

                                    {/* Language */}
                                    <LBadge lang={sub.language} />

                                    {/* Status */}
                                    <SBadge status={sub.status} />

                                    {/* Time */}
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                                        {sub.time_used ? (
                                            <>
                                                <M ch={sub.time_used} col={sub.time_used > 900 ? T.amb : T.text} sz={11} w={600} />
                                                <M ch="ms" sz={8} />
                                            </>
                                        ) : <M ch="—" sz={10} />}
                                    </div>

                                    {/* Memory */}
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                                        {sub.memory_used ? (
                                            <>
                                                <M ch={sub.memory_used} col={T.text} sz={11} w={600} />
                                                <M ch="MB" sz={8} />
                                            </>
                                        ) : <M ch="—" sz={10} />}
                                    </div>

                                    {/* QACHON — FIXED proper date */}
                                    <M ch={formatDate(sub.created_at)} sz={9} />
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>

                    {/* Empty state */}
                    {!loading && subs.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '50px 16px' }}>
                            <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
                            <div style={{
                                fontFamily: "var(--font-sans)",
                                fontSize: 14, fontWeight: 700, color: T.sub, marginBottom: 6,
                            }}>
                                {hasF ? 'Mos submission topilmadi' : "Hali submission yo'q"}
                            </div>
                            {hasF && (
                                <Btn variant="cyan" onClick={clearF}
                                    style={{ margin: '8px auto 0', width: 'fit-content' }}
                                >
                                    Filtrlarni tozalash
                                </Btn>
                            )}
                        </div>
                    )}
                </motion.div>

                {/* ══ PAGINATION ══ */}
                <AnimatePresence>
                    {totalPages > 1 && !loading && (
                        <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            style={{
                                display: 'flex', justifyContent: 'center',
                                alignItems: 'center', gap: 4, marginTop: 16,
                            }}
                        >
                            <PBtn onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} label="←" />
                            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                                let pg;
                                if (totalPages <= 7) pg = i + 1;
                                else if (page <= 4) pg = i + 1;
                                else if (page >= totalPages - 3) pg = totalPages - 6 + i;
                                else pg = page - 3 + i;
                                return <PBtn key={pg} onClick={() => setPage(pg)} active={page === pg} label={pg} />;
                            })}
                            <PBtn onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} label="→" />
                        </motion.div>
                    )}
                </AnimatePresence>

            </Container>
        </>
    );
}
