import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { getProblems } from '../api/problems';
import { useAuthStore } from '../store/authStore';

// ─────────────────────────────────────────────
// DESIGN TOKENS  — "Hacker's Cockpit" aesthetic
// Deep void + electric accents, IBM Plex Mono
// ─────────────────────────────────────────────
const T = {
    bg: '#04040e',
    surf: '#080816',
    surf2: '#0d0d20',
    border: 'rgba(255,255,255,0.05)',
    borderB: 'rgba(255,255,255,0.09)',
    glow: 'rgba(0,212,255,0.08)',
    text: '#e2e2f2',
    sub: '#666688',
    dim: '#222240',
    // accents
    cyan: '#00d4ff',
    cyanD: '#0099bb',
    amber: '#ffb800',
    red: '#ff3355',
    grn: '#00e676',
    // difficulty
    easy: { color: '#00e676', bg: 'rgba(0,230,118,0.08)', border: 'rgba(0,230,118,0.2)' },
    medium: { color: '#ffb800', bg: 'rgba(255,184,0,0.08)', border: 'rgba(255,184,0,0.2)' },
    hard: { color: '#ff3355', bg: 'rgba(255,51,85,0.08)', border: 'rgba(255,51,85,0.2)' },
};

const DIFF_LABEL = { easy: 'Oson', medium: "O'rta", hard: 'Qiyin' };

// ─────────────────────────────────────────────
// GLOBAL KEYFRAMES
// ─────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=IBM+Plex+Mono:wght@400;500;600&family=DM+Sans:wght@400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root { color-scheme: dark; }

  @keyframes shimmer {
    0%   { background-position: -200% 0; }
    100% { background-position:  200% 0; }
  }
  @keyframes scan {
    0%   { transform: translateY(-100%); opacity: 0; }
    10%  { opacity: .06; }
    90%  { opacity: .06; }
    100% { transform: translateY(100vh); opacity: 0; }
  }
  @keyframes pulse-dot {
    0%,100% { opacity:1; transform:scale(1); }
    50%      { opacity:.5; transform:scale(1.5); }
  }
  @keyframes blink {
    0%,100% { opacity:1; } 50% { opacity:0; }
  }
  @keyframes fadeUp {
    from { opacity:0; transform:translateY(8px); }
    to   { opacity:1; transform:translateY(0); }
  }

  .skel {
    background: linear-gradient(
      90deg,
      rgba(255,255,255,.03) 25%,
      rgba(255,255,255,.07) 50%,
      rgba(255,255,255,.03) 75%
    );
    background-size: 200% 100%;
    animation: shimmer 1.6s infinite;
  }

  .row-hover {
    position: relative;
    transition: background .15s;
  }
  .row-hover::before {
    content:'';
    position:absolute; left:0; top:0; bottom:0; width:2px;
    background: ${T.cyan};
    opacity:0;
    transition: opacity .2s;
    box-shadow: 0 0 12px ${T.cyan};
  }
  .row-hover:hover { background: rgba(0,212,255,.04) !important; }
  .row-hover:hover::before { opacity:1; }

  ::-webkit-scrollbar { width:4px; height:4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${T.dim}; border-radius:4px; }
`;

// ─────────────────────────────────────────────
// ATOMS
// ─────────────────────────────────────────────

function PulseDot({ color }) {
    return (
        <span style={{
            display: 'inline-block', width: 6, height: 6,
            borderRadius: '50%', background: color, flexShrink: 0,
            animation: 'pulse-dot 2s infinite',
            boxShadow: `0 0 8px ${color}`,
        }} />
    );
}

function MonoNum({ children, color = T.sub }) {
    return (
        <span style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 13, fontWeight: 500, color,
        }}>
            {children}
        </span>
    );
}

function DiffBadge({ diff }) {
    const cfg = T[diff] || T.easy;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            height: 22, padding: '0 9px', borderRadius: 5,
            fontSize: 11, fontWeight: 700,
            color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`,
            fontFamily: "'IBM Plex Mono',monospace", letterSpacing: '.02em',
        }}>
            {DIFF_LABEL[diff] || diff}
        </span>
    );
}

function StatRing({ value, max, color, label, size = 72 }) {
    const r = (size - 10) / 2;
    const circ = 2 * Math.PI * r;
    const fill = (value / (max || 1)) * circ;
    const ref = useRef();
    const inView = useInView(ref, { once: true });
    return (
        <div ref={ref} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={size / 2} cy={size / 2} r={r} fill="none"
                    stroke={`${color}18`} strokeWidth={4} />
                <motion.circle
                    cx={size / 2} cy={size / 2} r={r} fill="none"
                    stroke={color} strokeWidth={4}
                    strokeLinecap="round"
                    strokeDasharray={circ}
                    initial={{ strokeDashoffset: circ }}
                    animate={inView ? { strokeDashoffset: circ - fill } : {}}
                    transition={{ duration: 1.2, ease: [.4, 0, .2, 1], delay: .2 }}
                    style={{ filter: `drop-shadow(0 0 6px ${color}88)` }}
                />
                <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="middle"
                    style={{ transform: 'rotate(90deg)', transformOrigin: `${size / 2}px ${size / 2}px` }}
                    fill={color} fontSize={14} fontWeight={700}
                    fontFamily="'IBM Plex Mono',monospace">
                    {value}
                </text>
            </svg>
            <span style={{ fontSize: 10, color: T.sub, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' }}>
                {label}
            </span>
        </div>
    );
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────
export default function Problems() {
    const navigate = useNavigate();
    const { user } = useAuthStore();

    const [problems, setProblems] = useState([]);
    const [tags, setTags] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [diff, setDiff] = useState('');
    const [activeTag, setActiveTag] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    useEffect(() => {
        const fetch = async () => {
            setLoading(true);
            try {
                const params = { page };
                if (search) params.search = search;
                if (diff) params.difficulty = diff;
                if (activeTag) params.tag = activeTag;

                const { data } = await getProblems(params);
                const results = data.results || data;
                setProblems(results);
                setTotal(data.count || results.length);
                setTotalPages(Math.ceil((data.count || results.length) / 20));

                if (tags.length === 0 && results.length > 0) {
                    const map = new Map();
                    results.forEach(p => (p.tags || []).forEach(t => map.set(t.slug, t.name)));
                    setTags([...map.entries()].map(([slug, name]) => ({ slug, name })));
                }
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        const t = setTimeout(fetch, search ? 380 : 0);
        return () => clearTimeout(t);
    }, [search, diff, activeTag, page]);

    const easy = problems.filter(p => p.difficulty === 'easy').length;
    const medium = problems.filter(p => p.difficulty === 'medium').length;
    const hard = problems.filter(p => p.difficulty === 'hard').length;

    return (
        <>
            <style>{CSS}</style>

            {/* Scanline overlay */}
            <div style={{
                position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden',
            }}>
                <div style={{
                    position: 'absolute', left: 0, right: 0, height: '2px',
                    background: `linear-gradient(90deg,transparent,${T.cyan}33,transparent)`,
                    animation: 'scan 8s linear infinite',
                }} />
            </div>

            {/* Ambient glow orbs */}
            <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
                <div style={{
                    position: 'absolute', top: '-10%', left: '20%',
                    width: 500, height: 500, borderRadius: '50%',
                    background: `radial-gradient(circle,${T.cyan}08,transparent 65%)`,
                }} />
                <div style={{
                    position: 'absolute', bottom: '10%', right: '10%',
                    width: 400, height: 400, borderRadius: '50%',
                    background: `radial-gradient(circle,${T.amber}06,transparent 65%)`,
                }} />
            </div>

            <div style={{
                position: 'relative', zIndex: 1,
                maxWidth: 1380, margin: '0 auto',
                padding: '36px 24px',
                fontFamily: "'DM Sans',sans-serif",
                color: T.text,
            }}>

                {/* ── PAGE HEADER ─────────────────────── */}
                <motion.div
                    initial={{ opacity: 0, y: -16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: .4 }}
                    style={{ marginBottom: 28 }}
                >
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{
                                display: 'inline-flex', alignItems: 'center', gap: 8,
                                marginBottom: 8,
                                padding: '4px 12px', borderRadius: 100,
                                background: `${T.cyan}0f`, border: `1px solid ${T.cyan}28`,
                                fontSize: 11, fontWeight: 700, color: T.cyan,
                                fontFamily: "'IBM Plex Mono',monospace", letterSpacing: '.1em',
                            }}>
                                <PulseDot color={T.cyan} />
                                MASALALAR
                            </div>
                            <h1 style={{
                                fontFamily: "'Syne',sans-serif",
                                fontSize: 32, fontWeight: 800, color: T.text,
                                letterSpacing: '-.025em', lineHeight: 1,
                            }}>
                                Problem{' '}
                                <span style={{
                                    background: `linear-gradient(90deg,${T.cyan},${T.grn})`,
                                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                }}>
                                    Archive
                                </span>
                            </h1>
                        </div>
                        {/* Live counter */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '8px 16px', borderRadius: 10,
                            background: T.surf, border: `1px solid ${T.border}`,
                        }}>
                            <PulseDot color={T.grn} />
                            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, color: T.sub }}>
                                Jami:{' '}
                            </span>
                            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 15, fontWeight: 600, color: T.cyan }}>
                                {total}
                            </span>
                            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: T.sub }}>
                                ta masala
                            </span>
                        </div>
                    </div>
                </motion.div>

                <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>

                    {/* ═══════════════════════════════════
              LEFT — main content
          ═══════════════════════════════════ */}
                    <div style={{ flex: 1, minWidth: 0 }}>

                        {/* ── SEARCH & FILTERS ── */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: .1 }}
                            style={{ marginBottom: 14 }}
                        >
                            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>

                                {/* Search */}
                                <div style={{ flex: 1, position: 'relative' }}>
                                    <svg style={{
                                        position: 'absolute', left: 13, top: '50%',
                                        transform: 'translateY(-50%)', color: T.sub, pointerEvents: 'none',
                                    }} width={15} height={15} viewBox="0 0 24 24" fill="none"
                                        stroke="currentColor" strokeWidth={2.5}>
                                        <circle cx={11} cy={11} r={8} />
                                        <line x1={21} y1={21} x2={16.65} y2={16.65} />
                                    </svg>
                                    <input
                                        value={search}
                                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                                        placeholder="Masala nomi yoki ID bo'yicha qidiring..."
                                        style={{
                                            width: '100%', height: 42,
                                            background: T.surf, border: `1px solid ${T.border}`,
                                            borderRadius: 10, padding: '0 14px 0 38px',
                                            color: T.text, fontSize: 14, outline: 'none',
                                            fontFamily: "'DM Sans',sans-serif",
                                            transition: 'all .2s',
                                        }}
                                        onFocus={e => {
                                            e.target.style.borderColor = T.cyan;
                                            e.target.style.boxShadow = `0 0 0 3px ${T.cyan}18`;
                                            e.target.style.background = T.surf2;
                                        }}
                                        onBlur={e => {
                                            e.target.style.borderColor = T.border;
                                            e.target.style.boxShadow = 'none';
                                            e.target.style.background = T.surf;
                                        }}
                                    />
                                    {search && (
                                        <button onClick={() => { setSearch(''); setPage(1); }} style={{
                                            position: 'absolute', right: 10, top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'none', border: 'none', color: T.sub,
                                            cursor: 'pointer', fontSize: 16, lineHeight: 1,
                                        }}>×</button>
                                    )}
                                </div>

                                {/* Difficulty pills */}
                                <div style={{ display: 'flex', gap: 6 }}>
                                    {[
                                        { v: '', l: 'Barchasi', color: T.cyan },
                                        { v: 'easy', l: 'Oson', color: T.grn },
                                        { v: 'medium', l: "O'rta", color: T.amber },
                                        { v: 'hard', l: 'Qiyin', color: T.red },
                                    ].map(d => {
                                        const on = diff === d.v;
                                        return (
                                            <motion.button
                                                key={d.v}
                                                onClick={() => { setDiff(d.v); setPage(1); }}
                                                whileHover={{ scale: 1.04 }}
                                                whileTap={{ scale: .96 }}
                                                style={{
                                                    height: 42, padding: '0 18px', borderRadius: 10,
                                                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                                                    fontFamily: "'DM Sans',sans-serif",
                                                    border: on ? `1px solid ${d.color}45` : `1px solid ${T.border}`,
                                                    background: on ? `${d.color}12` : T.surf,
                                                    color: on ? d.color : T.sub,
                                                    boxShadow: on ? `0 0 16px ${d.color}18` : 'none',
                                                    transition: 'all .2s',
                                                }}
                                            >
                                                {d.l}
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            </div>
                        </motion.div>

                        {/* ── TAG CHIPS ── */}
                        <AnimatePresence>
                            {tags.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 16 }}
                                >
                                    {tags.map((tag, i) => {
                                        const on = activeTag === tag.slug;
                                        return (
                                            <motion.button
                                                key={tag.slug}
                                                initial={{ opacity: 0, scale: .9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: i * .025 }}
                                                onClick={() => { setActiveTag(on ? '' : tag.slug); setPage(1); }}
                                                whileHover={{ scale: 1.06 }}
                                                whileTap={{ scale: .94 }}
                                                style={{
                                                    height: 24, padding: '0 11px', borderRadius: 100,
                                                    fontSize: 11, fontWeight: on ? 700 : 500, cursor: 'pointer',
                                                    background: on ? `${T.cyan}14` : `${T.surf}`,
                                                    border: on ? `1px solid ${T.cyan}35` : `1px solid ${T.border}`,
                                                    color: on ? T.cyan : T.sub,
                                                    transition: 'all .15s',
                                                    boxShadow: on ? `0 0 10px ${T.cyan}18` : 'none',
                                                }}
                                            >
                                                {on && <span style={{ marginRight: 3, fontSize: 9 }}>✕</span>}
                                                {tag.name}
                                            </motion.button>
                                        );
                                    })}
                                    {(search || diff || activeTag) && (
                                        <motion.button
                                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                            onClick={() => { setSearch(''); setDiff(''); setActiveTag(''); }}
                                            style={{
                                                height: 24, padding: '0 11px', borderRadius: 100,
                                                fontSize: 11, fontWeight: 600, cursor: 'pointer',
                                                background: `${T.red}0f`, border: `1px solid ${T.red}28`,
                                                color: T.red,
                                            }}
                                        >
                                            ✕ Tozalash
                                        </motion.button>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* ── TABLE ── */}
                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: .15 }}
                            style={{
                                background: T.surf,
                                border: `1px solid ${T.border}`,
                                borderRadius: 14, overflow: 'hidden',
                                boxShadow: '0 8px 40px rgba(0,0,0,.4)',
                            }}
                        >
                            {/* Header */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '36px 96px 1fr 96px 180px 100px 96px 72px',
                                padding: '10px 20px',
                                background: `linear-gradient(90deg,rgba(0,212,255,.05),transparent)`,
                                borderBottom: `1px solid ${T.border}`,
                            }}>
                                {['#', 'ID', 'MASALA NOMI', 'QIYINLIK', 'TEGLAR', 'QABUL', 'URINISH', '%'].map((h, i) => (
                                    <span key={i} style={{
                                        fontSize: 10, fontWeight: 700, color: T.sub,
                                        letterSpacing: '.08em', textTransform: 'uppercase',
                                        fontFamily: "'IBM Plex Mono',monospace",
                                        textAlign: i >= 5 ? 'center' : 'left',
                                    }}>{h}</span>
                                ))}
                            </div>

                            {/* Skeleton */}
                            {loading && [...Array(10)].map((_, i) => (
                                <div key={i} style={{
                                    display: 'grid',
                                    gridTemplateColumns: '36px 96px 1fr 96px 180px 100px 96px 72px',
                                    padding: '0 20px', height: 46, alignItems: 'center',
                                    borderBottom: `1px solid ${T.border}`,
                                }}>
                                    {[16, 64, 220, 70, 140, 36, 36, 28].map((w, j) => (
                                        <div key={j} className="skel" style={{
                                            height: 12, width: w, maxWidth: '100%', borderRadius: 4,
                                            justifySelf: j >= 5 ? 'center' : 'start',
                                        }} />
                                    ))}
                                </div>
                            ))}

                            {/* Rows */}
                            {!loading && problems.map((p, idx) => {
                                const dcfg = T[p.difficulty] || T.easy;
                                const rate = p.total_submissions > 0
                                    ? Math.round((p.accepted_count / p.total_submissions) * 100) : 0;
                                const rateColor = rate >= 60 ? T.grn : rate >= 30 ? T.amber : T.red;
                                const isAC = p.user_status === 'accepted';
                                const isTry = p.user_status === 'attempted';

                                return (
                                    <motion.div
                                        key={p.id}
                                        className="row-hover"
                                        initial={{ opacity: 0, x: -8 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * .04 }}
                                        onClick={() => navigate(`/problems/${p.slug}`)}
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: '36px 96px 1fr 96px 180px 100px 96px 72px',
                                            padding: '0 20px', height: 46, alignItems: 'center',
                                            borderBottom: idx < problems.length - 1 ? `1px solid ${T.border}` : 'none',
                                            cursor: 'pointer',
                                            background: isAC ? `rgba(0,230,118,.025)` : 'transparent',
                                        }}
                                    >
                                        {/* Status */}
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            {isAC && <span style={{ color: T.grn, fontWeight: 800, fontSize: 17, lineHeight: 1, filter: `drop-shadow(0 0 6px ${T.grn})` }}>✓</span>}
                                            {isTry && <span style={{ color: T.red, fontWeight: 800, fontSize: 17, lineHeight: 1, filter: `drop-shadow(0 0 6px ${T.red})` }}>−</span>}
                                        </div>

                                        {/* Slug */}
                                        <MonoNum color={T.sub}>{p.slug}</MonoNum>

                                        {/* Title */}
                                        <span style={{
                                            fontSize: 14, fontWeight: 600,
                                            color: isAC ? T.grn : T.text,
                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                            paddingRight: 12,
                                        }}>
                                            {p.title}
                                        </span>

                                        {/* Difficulty */}
                                        <DiffBadge diff={p.difficulty} />

                                        {/* Tags */}
                                        <div style={{ display: 'flex', gap: 5, overflow: 'hidden' }}>
                                            {(p.tags || []).slice(0, 2).map(t => (
                                                <span key={t.slug} style={{
                                                    height: 20, padding: '0 8px', borderRadius: 5,
                                                    fontSize: 10, fontWeight: 600, color: T.sub,
                                                    background: `rgba(255,255,255,0.04)`,
                                                    border: `1px solid rgba(255,255,255,0.07)`,
                                                    display: 'flex', alignItems: 'center', whiteSpace: 'nowrap',
                                                    fontFamily: "'IBM Plex Mono',monospace",
                                                }}>{t.name}</span>
                                            ))}
                                            {(p.tags || []).length > 2 && (
                                                <span style={{ fontSize: 10, color: T.sub, display: 'flex', alignItems: 'center' }}>
                                                    +{p.tags.length - 2}
                                                </span>
                                            )}
                                        </div>

                                        {/* Accepted */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center' }}>
                                            <PulseDot color={T.grn} />
                                            <MonoNum color={T.text}>{p.accepted_count || 0}</MonoNum>
                                        </div>

                                        {/* Total */}
                                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                                            <MonoNum>{p.total_submissions || 0}</MonoNum>
                                        </div>

                                        {/* Rate */}
                                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                                            <span style={{
                                                fontFamily: "'IBM Plex Mono',monospace",
                                                fontSize: 13, fontWeight: 700, color: rateColor,
                                                textShadow: `0 0 12px ${rateColor}66`,
                                            }}>
                                                {rate}%
                                            </span>
                                        </div>
                                    </motion.div>
                                );
                            })}

                            {/* Empty */}
                            {!loading && problems.length === 0 && (
                                <motion.div
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                    style={{ textAlign: 'center', padding: '80px 20px' }}
                                >
                                    <div style={{ fontSize: 52, marginBottom: 16, filter: 'grayscale(.4)' }}>🔍</div>
                                    <div style={{
                                        fontFamily: "'Syne',sans-serif",
                                        fontSize: 18, fontWeight: 700, color: T.sub, marginBottom: 8,
                                    }}>
                                        {search ? `"${search}" — topilmadi` : 'Masalalar yo\'q'}
                                    </div>
                                    {(search || diff || activeTag) && (
                                        <motion.button
                                            whileHover={{ scale: 1.04 }} whileTap={{ scale: .96 }}
                                            onClick={() => { setSearch(''); setDiff(''); setActiveTag(''); }}
                                            style={{
                                                marginTop: 12, padding: '8px 22px', borderRadius: 8,
                                                background: `${T.cyan}10`, border: `1px solid ${T.cyan}28`,
                                                color: T.cyan, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                                            }}
                                        >
                                            Filtrlarni tozalash
                                        </motion.button>
                                    )}
                                </motion.div>
                            )}
                        </motion.div>

                        {/* ── PAGINATION ── */}
                        <AnimatePresence>
                            {totalPages > 1 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    style={{
                                        display: 'flex', justifyContent: 'center',
                                        alignItems: 'center', gap: 6, marginTop: 28,
                                    }}
                                >
                                    <PageBtn onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} label="←" />
                                    {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                                        let pg;
                                        if (totalPages <= 7) pg = i + 1;
                                        else if (page <= 4) pg = i + 1;
                                        else if (page >= totalPages - 3) pg = totalPages - 6 + i;
                                        else pg = page - 3 + i;
                                        return <PageBtn key={pg} onClick={() => setPage(pg)} active={page === pg} label={pg} />;
                                    })}
                                    <PageBtn onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} label="→" />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* ═══════════════════════════════════
              RIGHT — sidebar
          ═══════════════════════════════════ */}
                    <div style={{ width: 268, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>

                        {/* Stats card with rings */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: .2 }}
                            style={{
                                background: T.surf, border: `1px solid ${T.border}`,
                                borderRadius: 14, padding: '20px',
                                boxShadow: '0 8px 32px rgba(0,0,0,.3)',
                            }}
                        >
                            <div style={{
                                fontSize: 10, fontWeight: 700, color: T.sub,
                                letterSpacing: '.1em', textTransform: 'uppercase',
                                fontFamily: "'IBM Plex Mono',monospace", marginBottom: 18,
                                display: 'flex', alignItems: 'center', gap: 6,
                            }}>
                                <PulseDot color={T.cyan} /> Statistika
                            </div>

                            {/* Rings row */}
                            <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 18 }}>
                                <StatRing value={easy} max={total} color={T.grn} label="Oson" size={68} />
                                <StatRing value={medium} max={total} color={T.amber} label="O'rta" size={68} />
                                <StatRing value={hard} max={total} color={T.red} label="Qiyin" size={68} />
                            </div>

                            {/* Totals */}
                            <div style={{
                                padding: '12px 14px', borderRadius: 10,
                                background: `${T.cyan}08`, border: `1px solid ${T.cyan}18`,
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            }}>
                                <span style={{ fontSize: 12, color: T.sub }}>Jami masalalar</span>
                                <span style={{
                                    fontFamily: "'IBM Plex Mono',monospace",
                                    fontSize: 18, fontWeight: 700, color: T.cyan,
                                    textShadow: `0 0 16px ${T.cyan}55`,
                                }}>
                                    {total}
                                </span>
                            </div>

                            {/* Progress bar per difficulty */}
                            {total > 0 && (
                                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {[
                                        { label: 'Oson', val: easy, color: T.grn },
                                        { label: "O'rta", val: medium, color: T.amber },
                                        { label: 'Qiyin', val: hard, color: T.red },
                                    ].map(s => (
                                        <div key={s.label}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                <span style={{ fontSize: 11, color: T.sub }}>{s.label}</span>
                                                <MonoNum color={s.color}>{s.val}</MonoNum>
                                            </div>
                                            <div style={{ height: 3, borderRadius: 2, background: T.dim, overflow: 'hidden' }}>
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${(s.val / total) * 100}%` }}
                                                    transition={{ duration: 1, ease: [.4, 0, .2, 1], delay: .4 }}
                                                    style={{
                                                        height: '100%', borderRadius: 2,
                                                        background: `linear-gradient(90deg,${s.color},${s.color}88)`,
                                                        boxShadow: `0 0 8px ${s.color}55`,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </motion.div>

                        {/* Popular tags card */}
                        {tags.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: .28 }}
                                style={{
                                    background: T.surf, border: `1px solid ${T.border}`,
                                    borderRadius: 14, padding: '20px',
                                    boxShadow: '0 8px 32px rgba(0,0,0,.25)',
                                }}
                            >
                                <div style={{
                                    fontSize: 10, fontWeight: 700, color: T.sub,
                                    letterSpacing: '.1em', textTransform: 'uppercase',
                                    fontFamily: "'IBM Plex Mono',monospace", marginBottom: 14,
                                    display: 'flex', alignItems: 'center', gap: 6,
                                }}>
                                    <PulseDot color={T.amber} /> Teglar
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                    {tags.slice(0, 16).map((tag, i) => {
                                        const on = activeTag === tag.slug;
                                        return (
                                            <motion.button
                                                key={tag.slug}
                                                initial={{ opacity: 0, scale: .85 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: i * .03 }}
                                                whileHover={{ scale: 1.08 }}
                                                onClick={() => setActiveTag(on ? '' : tag.slug)}
                                                style={{
                                                    height: 24, padding: '0 10px', borderRadius: 6,
                                                    fontSize: 11, fontWeight: on ? 700 : 500, cursor: 'pointer',
                                                    background: on ? `${T.cyan}14` : `rgba(255,255,255,0.03)`,
                                                    border: on ? `1px solid ${T.cyan}35` : `1px solid rgba(255,255,255,0.07)`,
                                                    color: on ? T.cyan : '#4a4a6a',
                                                    transition: 'all .15s',
                                                    boxShadow: on ? `0 0 10px ${T.cyan}18` : 'none',
                                                }}
                                            >
                                                {tag.name}
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}

                        {/* Quick tip card */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: .34 }}
                            style={{
                                background: `linear-gradient(135deg,${T.cyan}0a,${T.grn}06)`,
                                border: `1px solid ${T.cyan}20`,
                                borderRadius: 14, padding: '16px 18px',
                            }}
                        >
                            <div style={{ fontSize: 11, fontWeight: 700, color: T.cyan, marginBottom: 8, letterSpacing: '.04em' }}>
                                ⚡ Tezkor tip
                            </div>
                            <div style={{ fontSize: 12, color: T.sub, lineHeight: 1.65 }}>
                                Oson masalalardan boshlang va <strong style={{ color: T.text }}>acceptance
                                    rate</strong> yuqori masalalarni tanlang. Bu reyting
                                oshirishning eng tezkor yo'li.
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </>
    );
}

// ─────────────────────────────────────────────
// PAGINATION BUTTON
// ─────────────────────────────────────────────
function PageBtn({ onClick, disabled, active, label }) {
    return (
        <motion.button
            onClick={onClick}
            disabled={disabled}
            whileHover={!disabled && !active ? { scale: 1.1 } : {}}
            whileTap={!disabled ? { scale: .9 } : {}}
            style={{
                width: 34, height: 34, borderRadius: 8,
                fontSize: 13, fontWeight: active ? 700 : 500,
                cursor: disabled ? 'not-allowed' : 'pointer',
                fontFamily: "'IBM Plex Mono',monospace",
                background: active
                    ? `linear-gradient(135deg,${T.cyan},${T.cyanD})`
                    : 'rgba(255,255,255,0.04)',
                border: active ? 'none' : `1px solid rgba(255,255,255,0.08)`,
                color: active ? '#04040e' : disabled ? T.dim : T.sub,
                boxShadow: active ? `0 0 20px ${T.cyan}40` : 'none',
                transition: 'all .15s',
            }}
        >
            {label}
        </motion.button>
    );
}
