import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axios';

// ═══════════════════════════════════════════════════
// DESIGN TOKENS  —  "Neural Terminal" aesthetic
// Deep cosmic void · electric neon accents
// IBM Plex Mono + Syne display
// ═══════════════════════════════════════════════════
const T = {
    bg: '#03030b',
    surf: '#07071a',
    surf2: '#0b0b22',
    b: 'rgba(255,255,255,0.055)',
    bA: 'rgba(0,212,255,0.25)',
    text: '#dde0f5',
    sub: '#44446a',
    dim: '#0e0e22',
    cyan: '#00d4ff',
    cyanD: '#008aaa',
    grn: '#00e676',
    amb: '#ffb300',
    red: '#ff2d55',
    pur: '#a855f7',
    ind: '#6366f1',
    org: '#f97316',
};

const SC = {
    accepted: { label: 'Accepted', color: '#00e676', dim: 'rgba(0,230,118,0.12)', bd: 'rgba(0,230,118,0.22)' },
    wrong_answer: { label: 'Wrong Answer', color: '#ff2d55', dim: 'rgba(255,45,85,0.12)', bd: 'rgba(255,45,85,0.22)' },
    time_limit_exceeded: { label: 'Time Limit', color: '#ffb300', dim: 'rgba(255,179,0,0.12)', bd: 'rgba(255,179,0,0.22)' },
    memory_limit_exceeded: { label: 'Mem Limit', color: '#ffb300', dim: 'rgba(255,179,0,0.12)', bd: 'rgba(255,179,0,0.22)' },
    runtime_error: { label: 'Runtime Err', color: '#ff2d55', dim: 'rgba(255,45,85,0.10)', bd: 'rgba(255,45,85,0.20)' },
    compilation_error: { label: 'Compile Err', color: '#f97316', dim: 'rgba(249,115,22,0.10)', bd: 'rgba(249,115,22,0.20)' },
    security_violation: { label: 'Blocked', color: '#a855f7', dim: 'rgba(168,85,247,0.10)', bd: 'rgba(168,85,247,0.20)' },
    pending: { label: 'Pending', color: '#6366f1', dim: 'rgba(99,102,241,0.10)', bd: 'rgba(99,102,241,0.20)' },
    running: { label: 'Running', color: '#00d4ff', dim: 'rgba(0,212,255,0.10)', bd: 'rgba(0,212,255,0.22)' },
    system_error: { label: 'System Err', color: '#44446a', dim: 'rgba(68,68,106,0.10)', bd: 'rgba(68,68,106,0.20)' },
};

const LANG = {
    python: { label: 'Python', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', icon: 'PY' },
    cpp: { label: 'C++17', color: '#818cf8', bg: 'rgba(129,140,248,0.12)', icon: 'C+' },
    java: { label: 'Java', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: 'JV' },
    csharp: { label: 'C#', color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: 'C#' },
};

// ═══════════════════════════════════════════════════
// GLOBAL STYLES
// ═══════════════════════════════════════════════════
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;0,700;1,400&family=DM+Sans:wght@400;500;600&display=swap');
  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
  :root { color-scheme:dark; }

  @keyframes scan-v {
    0%   { transform:translateY(-100%); opacity:0; }
    6%   { opacity:.055; }
    94%  { opacity:.055; }
    100% { transform:translateY(110vh); opacity:0; }
  }
  @keyframes scan-h {
    0%   { transform:translateX(-100%); opacity:0; }
    6%   { opacity:.03; }
    94%  { opacity:.03; }
    100% { transform:translateX(110vw); opacity:0; }
  }
  @keyframes shimmer {
    0%   { background-position:-200% 0; }
    100% { background-position:200% 0; }
  }
  @keyframes spin {
    to { transform:rotate(360deg); }
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
    0%   { background:rgba(0,212,255,.15); }
    100% { background:transparent; }
  }
  @keyframes count-up {
    from { transform:translateY(6px); opacity:0; }
    to   { transform:translateY(0);   opacity:1; }
  }
  @keyframes border-glow {
    0%,100% { border-color:rgba(0,212,255,.18); }
    50%     { border-color:rgba(0,212,255,.45); }
  }
  @keyframes float {
    0%,100% { transform:translateY(0); }
    50%     { transform:translateY(-6px); }
  }

  .skel {
    border-radius:4px;
    background:linear-gradient(90deg,
      rgba(255,255,255,.03) 25%,
      rgba(255,255,255,.07) 50%,
      rgba(255,255,255,.03) 75%);
    background-size:200% 100%;
    animation:shimmer 1.6s ease-in-out infinite;
  }

  .r {
    position:relative;
    transition:background .12s;
  }
  .r::after {
    content:'';
    position:absolute; left:0; top:0; bottom:0; width:2px;
    background:linear-gradient(to bottom,transparent,${T.cyan},transparent);
    opacity:0; transition:opacity .2s;
    box-shadow:0 0 12px ${T.cyan};
  }
  .r:hover { background:rgba(0,212,255,.035) !important; }
  .r:hover::after { opacity:1; }

  .live-pill {
    animation:border-glow 2.5s ease-in-out infinite;
  }

  ::-webkit-scrollbar { width:3px; height:3px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:rgba(255,255,255,.07); border-radius:4px; }
  ::-webkit-scrollbar-thumb:hover { background:rgba(0,212,255,.3); }
`;

// ═══════════════════════════════════════════════════
// MICRO-COMPONENTS
// ═══════════════════════════════════════════════════

/* Dual-ring live dot */
function LiveDot({ color = T.grn, size = 7, active = true }) {
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

/* Monospace text */
function M({ ch, col = T.sub, sz = 12, w = 500 }) {
    return (
        <span style={{
            fontFamily: "'IBM Plex Mono',monospace",
            fontSize: sz, fontWeight: w, color: col,
        }}>{ch}</span>
    );
}

/* Status badge */
function SBadge({ status }) {
    const c = SC[status] || SC.system_error;
    const isRun = status === 'running' || status === 'pending';
    return (
        <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            height: 24, padding: '0 10px', borderRadius: 7,
            background: c.dim, border: `1px solid ${c.bd}`,
            width: 'fit-content',
        }}>
            {isRun ? (
                <div style={{
                    width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                    border: `1.5px solid ${c.color}44`, borderTopColor: c.color,
                    animation: 'spin .65s linear infinite',
                }} />
            ) : (
                <span style={{
                    width: 5, height: 5, borderRadius: '50%',
                    background: c.color, display: 'inline-block', flexShrink: 0,
                    boxShadow: `0 0 7px ${c.color}`,
                }} />
            )}
            <span style={{
                fontFamily: "'IBM Plex Mono',monospace",
                fontSize: 11, fontWeight: 600, color: c.color,
                textShadow: `0 0 10px ${c.color}66`,
                letterSpacing: '.01em', whiteSpace: 'nowrap',
            }}>
                {c.label}
            </span>
        </div>
    );
}

/* Language badge */
function LBadge({ lang }) {
    const c = LANG[lang] || { label: lang, color: T.sub, bg: 'rgba(100,100,130,.12)', icon: '??' };
    return (
        <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            height: 22, padding: '0 8px', borderRadius: 6,
            background: c.bg, border: `1px solid ${c.color}28`,
            width: 'fit-content',
        }}>
            <span style={{
                fontFamily: "'IBM Plex Mono',monospace",
                fontSize: 9, fontWeight: 700, color: c.color, letterSpacing: '.04em',
            }}>{c.icon}</span>
            <span style={{
                fontFamily: "'IBM Plex Mono',monospace",
                fontSize: 10, fontWeight: 600, color: c.color,
            }}>{c.label}</span>
        </div>
    );
}

/* Control button */
function Btn({ children, onClick, active, variant = 'default', style: s = {} }) {
    const palettes = {
        default: {
            bg: active ? 'rgba(99,102,241,.14)' : 'rgba(255,255,255,.04)',
            bd: active ? 'rgba(99,102,241,.35)' : T.b,
            col: active ? '#818cf8' : T.sub
        },
        live: {
            bg: active ? 'rgba(0,230,118,.1)' : 'rgba(255,255,255,.04)',
            bd: active ? 'rgba(0,230,118,.28)' : T.b,
            col: active ? T.grn : T.sub
        },
        danger: { bg: 'rgba(255,45,85,.09)', bd: 'rgba(255,45,85,.25)', col: T.red },
        cyan: { bg: 'rgba(0,212,255,.1)', bd: 'rgba(0,212,255,.3)', col: T.cyan },
    };
    const p = palettes[variant] || palettes.default;
    return (
        <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: .94 }}
            onClick={onClick}
            style={{
                display: 'flex', alignItems: 'center', gap: 7,
                height: 36, padding: '0 16px', borderRadius: 10,
                background: p.bg, border: `1px solid ${p.bd}`,
                color: p.col, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', fontFamily: "'DM Sans',sans-serif",
                boxShadow: active ? `0 0 18px ${p.col}18` : 'none',
                transition: 'all .15s', whiteSpace: 'nowrap',
                ...s,
            }}
        >{children}</motion.button>
    );
}

// ═══════════════════════════════════════════════════
// TIME AGO
// ═══════════════════════════════════════════════════
function ago(iso) {
    const s = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    return new Date(iso).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short' });
}

// ═══════════════════════════════════════════════════
// STAT CARD
// ═══════════════════════════════════════════════════
function StatCard({ icon, label, value, color, delay = 0 }) {
    const [n, setN] = useState(0);
    const done = useRef(false);
    useEffect(() => {
        if (done.current || !value) return;
        done.current = true;
        const t0 = Date.now(), d = 700 + delay * 100;
        const tick = () => {
            const p = Math.min((Date.now() - t0) / d, 1);
            setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
            if (p < 1) requestAnimationFrame(tick);
        };
        setTimeout(() => requestAnimationFrame(tick), delay * 80);
    }, [value]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: delay * .07 }}
            style={{
                background: T.surf, border: `1px solid ${T.b}`,
                borderRadius: 14, padding: '16px 18px',
                display: 'flex', alignItems: 'center', gap: 14,
                boxShadow: '0 4px 24px rgba(0,0,0,.3)',
                position: 'relative', overflow: 'hidden',
            }}
        >
            {/* Corner glow */}
            <div style={{
                position: 'absolute', top: -20, right: -20,
                width: 80, height: 80, borderRadius: '50%',
                background: `radial-gradient(circle,${color}18,transparent 70%)`,
                pointerEvents: 'none',
            }} />

            <div style={{
                width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                background: `${color}12`, border: `1px solid ${color}22`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16,
            }}>{icon}</div>

            <div>
                <div style={{
                    fontFamily: "'IBM Plex Mono',monospace",
                    fontSize: 21, fontWeight: 700, color,
                    lineHeight: 1, textShadow: `0 0 20px ${color}44`,
                    animation: 'count-up .4s ease both',
                }}>
                    {n.toLocaleString()}
                </div>
                <div style={{ fontSize: 10, color: T.sub, marginTop: 3, letterSpacing: '.06em', textTransform: 'uppercase' }}>
                    {label}
                </div>
            </div>
        </motion.div>
    );
}

// ═══════════════════════════════════════════════════
// FILTER INPUT
// ═══════════════════════════════════════════════════
function FInput({ placeholder, value, onChange }) {
    return (
        <input
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            style={{
                width: '100%', height: 36,
                background: T.surf2, border: `1px solid ${T.b}`,
                borderRadius: 9, padding: '0 12px',
                color: T.text, fontSize: 12, outline: 'none',
                fontFamily: "'DM Sans',sans-serif",
                transition: 'border-color .2s, box-shadow .2s',
            }}
            onFocus={e => {
                e.target.style.borderColor = T.cyan;
                e.target.style.boxShadow = `0 0 0 3px rgba(0,212,255,.1)`;
            }}
            onBlur={e => {
                e.target.style.borderColor = T.b;
                e.target.style.boxShadow = 'none';
            }}
        />
    );
}
function FSel({ value, onChange, options }) {
    return (
        <select
            value={value}
            onChange={e => onChange(e.target.value)}
            style={{
                width: '100%', height: 36,
                background: '#07071a', border: `1px solid ${T.b}`,
                borderRadius: 9, padding: '0 10px',
                color: value ? T.text : T.sub,
                fontSize: 12, outline: 'none', cursor: 'pointer',
                fontFamily: "'DM Sans',sans-serif",
                transition: 'border-color .2s',
            }}
            onFocus={e => e.target.style.borderColor = T.cyan}
            onBlur={e => e.target.style.borderColor = T.b}
        >
            {options.map(o => (
                <option key={o.v} value={o.v} style={{ background: '#07071a' }}>{o.l}</option>
            ))}
        </select>
    );
}

// ═══════════════════════════════════════════════════
// PAGINATION BUTTON
// ═══════════════════════════════════════════════════
function PBtn({ onClick, disabled, active, label }) {
    return (
        <motion.button
            onClick={onClick} disabled={disabled}
            whileHover={!disabled && !active ? { scale: 1.1 } : {}}
            whileTap={!disabled ? { scale: .88 } : {}}
            style={{
                width: 34, height: 34, borderRadius: 9,
                fontSize: 13, cursor: disabled ? 'not-allowed' : 'pointer',
                fontFamily: "'IBM Plex Mono',monospace", fontWeight: active ? 700 : 500,
                background: active
                    ? `linear-gradient(135deg,${T.ind},${T.cyan})`
                    : 'rgba(255,255,255,.04)',
                border: active ? 'none' : `1px solid ${T.b}`,
                color: active ? '#03030b' : disabled ? T.dim : T.sub,
                boxShadow: active ? `0 0 24px ${T.cyan}40,0 0 48px ${T.ind}20` : 'none',
                transition: 'all .15s',
            }}
        >{label}</motion.button>
    );
}

// ═══════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════
export default function Status() {
    const navigate = useNavigate();

    const [subs, setSubs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [autoRef, setAutoRef] = useState(true);
    const [lastUp, setLastUp] = useState(null);
    const [newIds, setNewIds] = useState(new Set());
    const [newCount, setNewCount] = useState(0);
    const [fOpen, setFOpen] = useState(false);
    const [filters, setFilters] = useState({ username: '', problem: '', language: '', status: '' });

    const timerRef = useRef(null);
    const prevFirst = useRef(null);

    // ── fetch ────────────────────────────────
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
            setLastUp(new Date());
        } finally {
            if (!silent) setLoading(false);
        }
    };

    useEffect(() => { fetchSubs(); }, [page, filters]);

    useEffect(() => {
        clearInterval(timerRef.current);
        if (autoRef && page === 1) {
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

    return (
        <>
            <style>{CSS}</style>

            {/* ── BACKGROUND FX ─────────────────── */}
            <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
                {/* Vertical scanline */}
                <div style={{
                    position: 'absolute', left: 0, right: 0, height: '1px',
                    background: `linear-gradient(90deg,transparent 5%,${T.cyan}55 40%,${T.grn}44 60%,transparent 95%)`,
                    animation: 'scan-v 12s linear infinite',
                }} />
                {/* Horizontal scanline */}
                <div style={{
                    position: 'absolute', top: 0, bottom: 0, width: '1px',
                    background: `linear-gradient(180deg,transparent,${T.ind}33,transparent)`,
                    animation: 'scan-h 18s linear 6s infinite',
                }} />
                {/* Grid */}
                <div style={{
                    position: 'absolute', inset: 0, opacity: .022,
                    backgroundImage: `linear-gradient(${T.b} 1px,transparent 1px),linear-gradient(90deg,${T.b} 1px,transparent 1px)`,
                    backgroundSize: '52px 52px',
                }} />
                {/* Orbs */}
                <div style={{
                    position: 'absolute', top: '-8%', right: '12%', width: 640, height: 640, borderRadius: '50%',
                    background: `radial-gradient(circle,${T.ind}0b,transparent 68%)`
                }} />
                <div style={{
                    position: 'absolute', bottom: '5%', left: '3%', width: 480, height: 480, borderRadius: '50%',
                    background: `radial-gradient(circle,${T.grn}07,transparent 65%)`
                }} />
                <div style={{
                    position: 'absolute', top: '30%', left: '25%', width: 300, height: 300, borderRadius: '50%',
                    background: `radial-gradient(circle,${T.cyan}06,transparent 65%)`
                }} />
            </div>

            <div style={{
                position: 'relative', zIndex: 1,
                maxWidth: 1280, margin: '0 auto',
                padding: '40px 24px',
                fontFamily: "'DM Sans',sans-serif", color: T.text,
                minHeight: '100vh',
            }}>

                {/* ── HERO HEADER ───────────────────── */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: .4, ease: [.4, 0, .2, 1] }}
                    style={{ marginBottom: 28 }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16 }}>

                        {/* Left: title */}
                        <div>
                            <div style={{
                                display: 'inline-flex', alignItems: 'center', gap: 9,
                                padding: '5px 14px', borderRadius: 100, marginBottom: 10,
                                background: `${T.ind}0f`,
                                border: `1px solid ${T.ind}30`,
                                className: 'live-pill',
                            }}>
                                <LiveDot color={autoRef ? T.grn : T.sub} size={6} active={autoRef} />
                                <span style={{
                                    fontFamily: "'IBM Plex Mono',monospace",
                                    fontSize: 10, fontWeight: 700, color: autoRef ? T.grn : T.sub,
                                    letterSpacing: '.12em',
                                }}>
                                    {autoRef ? 'LIVE MONITOR' : 'PAUSED'}
                                </span>
                                {autoRef && lastUp && (
                                    <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: T.sub }}>
                                        · {lastUp.toLocaleTimeString('uz-UZ')}
                                    </span>
                                )}
                            </div>

                            <h1 style={{
                                fontFamily: "'Syne',sans-serif",
                                fontSize: 36, fontWeight: 800,
                                letterSpacing: '-.03em', lineHeight: 1, margin: 0,
                            }}>
                                Submission{' '}
                                <span style={{
                                    background: `linear-gradient(90deg,${T.ind},${T.cyan} 55%,${T.grn})`,
                                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                    filter: `drop-shadow(0 0 20px ${T.cyan}33)`,
                                }}>
                                    Monitor
                                </span>
                            </h1>

                            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 14 }}>
                                <M ch={`Jami: `} sz={12} />
                                <M ch={total.toLocaleString()} col={T.cyan} sz={13} w={700} />
                                <M ch="ta submission" sz={12} />
                                {page > 1 && <M ch={`· Sahifa ${page}/${totalPages}`} sz={11} />}
                            </div>
                        </div>

                        {/* Right: controls */}
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>

                            {/* New badge */}
                            <AnimatePresence>
                                {newCount > 0 && (
                                    <motion.button
                                        initial={{ opacity: 0, scale: .75, x: 12 }}
                                        animate={{ opacity: 1, scale: 1, x: 0 }}
                                        exit={{ opacity: 0, scale: .75 }}
                                        transition={{ type: 'spring', stiffness: 350 }}
                                        onClick={() => { setNewCount(0); fetchSubs(); }}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 8,
                                            height: 36, padding: '0 14px', borderRadius: 10,
                                            background: `${T.cyan}12`, border: `1px solid ${T.cyan}35`,
                                            color: T.cyan, fontSize: 12, fontWeight: 700,
                                            cursor: 'pointer', fontFamily: "'IBM Plex Mono',monospace",
                                            boxShadow: `0 0 24px ${T.cyan}25`,
                                        }}
                                    >
                                        <LiveDot color={T.cyan} size={5} />
                                        +{newCount} yangi — yangilash
                                    </motion.button>
                                )}
                            </AnimatePresence>

                            <Btn
                                active={fOpen || hasF}
                                onClick={() => setFOpen(o => !o)}
                            >
                                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                                </svg>
                                Filter
                                {fCount > 0 && (
                                    <span style={{
                                        width: 17, height: 17, borderRadius: '50%',
                                        background: T.ind, color: 'white',
                                        fontSize: 9, fontWeight: 800,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>{fCount}</span>
                                )}
                            </Btn>

                            <Btn variant="live" active={autoRef} onClick={() => setAutoRef(a => !a)}>
                                {autoRef
                                    ? <><span style={{ fontSize: 11 }}>⏸</span> Pauza</>
                                    : <><span style={{ fontSize: 11 }}>▶</span> Live</>
                                }
                            </Btn>

                            <motion.button
                                whileHover={{ scale: 1.08 }}
                                whileTap={{ rotate: 180, scale: .9 }}
                                onClick={() => fetchSubs()}
                                style={{
                                    width: 36, height: 36, borderRadius: 10,
                                    background: T.surf, border: `1px solid ${T.b}`,
                                    color: T.sub, fontSize: 17, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    transition: 'color .15s',
                                }}
                                onMouseEnter={e => e.currentTarget.style.color = T.cyan}
                                onMouseLeave={e => e.currentTarget.style.color = T.sub}
                            >↻</motion.button>
                        </div>
                    </div>
                </motion.div>

                {/* ── STAT CARDS ─────────────────────── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
                    <StatCard icon="📡" label="Jami submissions" value={total} color={T.cyan} delay={0} />
                    <StatCard icon="✓" label="Bu sahifada" value={subs.length} color={T.sub} delay={1} />
                    <StatCard icon="⚡" label="Accepted" value={acCount} color={T.grn} delay={2} />
                    <StatCard icon="⟳" label="Jarayonda" value={runCount} color={T.ind} delay={3} />
                </div>

                {/* ── FILTER PANEL ───────────────────── */}
                <AnimatePresence>
                    {fOpen && (
                        <motion.div
                            key="filter"
                            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginBottom: 14 }}
                            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                            transition={{ duration: .22, ease: [.4, 0, .2, 1] }}
                            style={{ overflow: 'hidden' }}
                        >
                            <div style={{
                                background: T.surf,
                                border: `1px solid ${T.ind}22`,
                                borderRadius: 13, padding: '14px 16px',
                                boxShadow: `0 0 40px ${T.ind}08`,
                            }}>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr 190px 230px auto',
                                    gap: 10, alignItems: 'center',
                                }}>
                                    <FInput placeholder="👤 Username..." value={filters.username} onChange={v => setF('username', v)} />
                                    <FInput placeholder="📝 Masala (A0001)..." value={filters.problem} onChange={v => setF('problem', v)} />
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
                                        <Btn variant="danger" onClick={clearF} style={{ padding: '0 14px' }}>
                                            ✕ Tozalash
                                        </Btn>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── TABLE ─────────────────────────── */}
                <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: .2 }}
                    style={{
                        background: T.surf, border: `1px solid ${T.b}`,
                        borderRadius: 16, overflow: 'hidden',
                        boxShadow: '0 16px 60px rgba(0,0,0,.5)',
                    }}
                >
                    {/* Table header */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '70px 148px 1fr 104px 148px 82px 78px 96px',
                        padding: '10px 20px',
                        background: `linear-gradient(90deg,rgba(99,102,241,.07),rgba(0,212,255,.04),transparent)`,
                        borderBottom: `1px solid ${T.b}`,
                    }}>
                        {['#ID', 'FOYDALANUVCHI', 'MASALA', 'TIL', 'HOLATI', 'VAQT', 'XOTIRA', 'QACHON'].map((h, i) => (
                            <span key={i} style={{
                                fontFamily: "'IBM Plex Mono',monospace",
                                fontSize: 9, fontWeight: 700, color: T.sub,
                                letterSpacing: '.1em', textTransform: 'uppercase',
                            }}>{h}</span>
                        ))}
                    </div>

                    {/* Skeleton */}
                    {loading && [...Array(14)].map((_, i) => (
                        <div key={i} style={{
                            display: 'grid',
                            gridTemplateColumns: '70px 148px 1fr 104px 148px 82px 78px 96px',
                            padding: '0 20px', height: 46, alignItems: 'center',
                            borderBottom: `1px solid rgba(255,255,255,.03)`, gap: 8,
                        }}>
                            {[42, 100, 190, 68, 100, 46, 46, 72].map((w, j) => (
                                <div key={j} className="skel" style={{ height: 11, width: w, maxWidth: '100%' }} />
                            ))}
                        </div>
                    ))}

                    {/* Rows */}
                    <AnimatePresence initial={false}>
                        {!loading && subs.map((sub, idx) => {
                            const isAC = sub.status === 'accepted';
                            const isNew = newIds.has(sub.id);
                            const isRun = sub.status === 'running' || sub.status === 'pending';

                            return (
                                <motion.div
                                    key={sub.id}
                                    className="r"
                                    initial={{ opacity: 0, x: -12 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * .025, duration: .2 }}
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '70px 148px 1fr 104px 148px 82px 78px 96px',
                                        padding: '0 20px', height: 46, alignItems: 'center',
                                        borderBottom: idx < subs.length - 1
                                            ? `1px solid rgba(255,255,255,.04)` : 'none',
                                        background: isNew
                                            ? undefined
                                            : isAC ? 'rgba(0,230,118,.02)' : 'transparent',
                                        animation: isNew ? 'flash-row 3s ease-out forwards' : 'none',
                                    }}
                                >
                                    {/* ID */}
                                    <M ch={`#${sub.id}`} sz={11} />

                                    {/* Username */}
                                    <div
                                        onClick={() => navigate(`/profile/${sub.username}`)}
                                        style={{
                                            fontSize: 13, fontWeight: 600, color: '#7c85f5',
                                            cursor: 'pointer', overflow: 'hidden',
                                            textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                            paddingRight: 8, transition: 'color .12s',
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.color = '#b8c0ff'; e.currentTarget.style.textShadow = `0 0 12px #7c85f566`; }}
                                        onMouseLeave={e => { e.currentTarget.style.color = '#7c85f5'; e.currentTarget.style.textShadow = 'none'; }}
                                    >
                                        {sub.username}
                                    </div>

                                    {/* Problem */}
                                    <div
                                        onClick={() => navigate(`/problems/${sub.problem_slug}`)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 7,
                                            cursor: 'pointer', overflow: 'hidden', paddingRight: 8,
                                        }}
                                    >
                                        <M ch={sub.problem_slug} sz={10} col="#3a3a62" />
                                        <span style={{
                                            fontSize: 13, fontWeight: 500, color: '#9898bb',
                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                            transition: 'color .12s',
                                        }}
                                            onMouseEnter={e => e.currentTarget.style.color = '#c4c4e8'}
                                            onMouseLeave={e => e.currentTarget.style.color = '#9898bb'}
                                        >{sub.problem_title}</span>
                                    </div>

                                    {/* Language */}
                                    <LBadge lang={sub.language} />

                                    {/* Status */}
                                    <SBadge status={sub.status} />

                                    {/* Time */}
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                                        {sub.time_used ? (
                                            <>
                                                <M ch={sub.time_used} col={sub.time_used > 900 ? T.amb : T.text} sz={13} w={600} />
                                                <M ch="ms" sz={9} />
                                            </>
                                        ) : <M ch="—" />}
                                    </div>

                                    {/* Memory */}
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                                        {sub.memory_used ? (
                                            <>
                                                <M ch={sub.memory_used} col={T.text} sz={13} w={600} />
                                                <M ch="MB" sz={9} />
                                            </>
                                        ) : <M ch="—" />}
                                    </div>

                                    {/* Time ago */}
                                    <M ch={`${ago(sub.created_at)} oldin`} sz={11} />
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>

                    {/* Empty state */}
                    {!loading && subs.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            style={{ textAlign: 'center', padding: '90px 20px' }}
                        >
                            <motion.div
                                animate={{ y: [0, -8, 0] }}
                                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                                style={{ fontSize: 52, marginBottom: 18, display: 'inline-block', filter: 'grayscale(.3)' }}
                            >📭</motion.div>
                            <div style={{
                                fontFamily: "'Syne',sans-serif",
                                fontSize: 18, fontWeight: 700, color: T.sub, marginBottom: 8,
                            }}>
                                {hasF ? 'Mos submission topilmadi' : "Hali submission yo'q"}
                            </div>
                            {hasF && (
                                <Btn variant="cyan" onClick={clearF}
                                    style={{ margin: '12px auto 0', width: 'fit-content' }}
                                >
                                    Filtrlarni tozalash
                                </Btn>
                            )}
                        </motion.div>
                    )}
                </motion.div>

                {/* ── PAGINATION ─────────────────────── */}
                <AnimatePresence>
                    {totalPages > 1 && !loading && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            style={{
                                display: 'flex', justifyContent: 'center',
                                alignItems: 'center', gap: 6, marginTop: 28,
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

            </div>
        </>
    );
}
