import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getLeaderboard } from '../api/leaderboard';

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

/* ═══════════════════════════════════════════════════
   RANK SYSTEM — Codeforces-inspired
   ═══════════════════════════════════════════════════ */
const RANKS = [
    { min: 2400, label: 'Legendary Grandmaster', short: 'LGM', color: '#ff2d55', bg: 'rgba(255,45,85,0.08)',  bd: 'rgba(255,45,85,0.18)',  icon: '🔴', gradient: 'linear-gradient(135deg,#ff2d55,#ff6b8a)' },
    { min: 2100, label: 'International Grandmaster', short: 'IGM', color: '#ff5c7a', bg: 'rgba(255,92,122,0.07)', bd: 'rgba(255,92,122,0.16)', icon: '🔴', gradient: 'linear-gradient(135deg,#ff5c7a,#ff8fa3)' },
    { min: 1900, label: 'Master',     short: 'MST', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', bd: 'rgba(245,158,11,0.18)', icon: '🟡', gradient: 'linear-gradient(135deg,#f59e0b,#fbbf24)' },
    { min: 1600, label: 'Candidate Master', short: 'CM', color: '#a855f7', bg: 'rgba(168,85,247,0.08)', bd: 'rgba(168,85,247,0.18)', icon: '🟣', gradient: 'linear-gradient(135deg,#a855f7,#c084fc)' },
    { min: 1400, label: 'Expert',     short: 'EXP', color: '#3b82f6', bg: 'rgba(59,130,246,0.07)', bd: 'rgba(59,130,246,0.16)', icon: '🔵', gradient: 'linear-gradient(135deg,#3b82f6,#60a5fa)' },
    { min: 1200, label: 'Specialist', short: 'SPC', color: '#06b6d4', bg: 'rgba(6,182,212,0.07)',  bd: 'rgba(6,182,212,0.15)',  icon: '🩵', gradient: 'linear-gradient(135deg,#06b6d4,#67e8f9)' },
    { min: 900,  label: 'Pupil',      short: 'PPL', color: '#10b981', bg: 'rgba(16,185,129,0.06)', bd: 'rgba(16,185,129,0.14)', icon: '🟢', gradient: 'linear-gradient(135deg,#10b981,#34d399)' },
    { min: 0,    label: 'Newbie',     short: 'NEW', color: 'var(--text-muted)', bg: 'rgba(120,120,160,0.06)', bd: 'rgba(120,120,160,0.12)', icon: '⬜', gradient: 'linear-gradient(135deg,#44446a,#6b6b9a)' },
];

const getRank = (rating) => RANKS.find(r => rating >= r.min) || RANKS.at(-1);
const MAX_RATING = 3000;

/* ═══════════════════════════════════════════════════
   CSS
   ═══════════════════════════════════════════════════ */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=IBM+Plex+Mono:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap');

  @keyframes shimmer {
    0%   { background-position:-200% 0; }
    100% { background-position:200% 0; }
  }
  @keyframes ring-ping {
    0%   { transform:scale(1); opacity:.7; }
    100% { transform:scale(2.4); opacity:0; }
  }
  @keyframes pulse-slow {
    0%,100% { opacity:1; }
    50%     { opacity:.35; }
  }
  @keyframes trophy-glow {
    0%,100% { filter: drop-shadow(0 0 6px rgba(245,158,11,0.5)); }
    50%     { filter: drop-shadow(0 0 16px rgba(245,158,11,0.8)) drop-shadow(0 0 30px rgba(245,158,11,0.3)); }
  }
  @keyframes podium-glow {
    0%,100% { box-shadow: 0 0 20px var(--glow, rgba(245,158,11,0.2)); }
    50%     { box-shadow: 0 0 36px var(--glow, rgba(245,158,11,0.35)); }
  }
  @keyframes bar-fill {
    from { transform: scaleX(0); transform-origin: left; }
    to   { transform: scaleX(1); transform-origin: left; }
  }
  @keyframes crown-float {
    0%,100% { transform:translateY(0) rotate(-3deg); }
    50%     { transform:translateY(-5px) rotate(3deg); }
  }
  @keyframes sparkle {
    0%,100% { opacity:.3; transform:scale(.8); }
    50%     { opacity:1; transform:scale(1.2); }
  }

  .skel {
    border-radius:4px;
    background:linear-gradient(90deg,
      var(--bg-elevated) 25%,
      var(--border-subtle) 50%,
      var(--bg-elevated) 75%);
    background-size:200% 100%;
    animation:shimmer 1.6s ease-in-out infinite;
  }

  .lb-row { position:relative; transition:background .1s; cursor:pointer; }
  .lb-row:hover { background:rgba(99,102,241,.035) !important; }

  ::-webkit-scrollbar { width:3px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:var(--border-subtle); border-radius:4px; }
`;

/* ═══════════════════════════════════════════════════
   MICRO COMPONENTS
   ═══════════════════════════════════════════════════ */
function M({ ch, col = T.sub, sz = 11, w = 500 }) {
    return <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: sz, fontWeight: w, color: col, lineHeight: 1 }}>{ch}</span>;
}

function RankBadge({ rating, size = 'sm' }) {
    const r = getRank(rating);
    const big = size === 'lg';
    return (
        <div style={{
            display: 'inline-flex', alignItems: 'center', gap: big ? 6 : 4,
            height: big ? 24 : 18, padding: big ? '0 8px' : '0 6px',
            borderRadius: big ? 6 : 4,
            background: r.bg, border: `1px solid ${r.bd}`,
        }}>
            <span style={{ fontSize: big ? 10 : 8 }}>{r.icon}</span>
            <span style={{
                fontFamily: "'IBM Plex Mono',monospace",
                fontSize: big ? 10 : 8, fontWeight: 700, color: r.color,
                letterSpacing: '.02em',
            }}>{r.short}</span>
        </div>
    );
}

function RatingBar({ rating, delay = 0 }) {
    const r = getRank(rating);
    const pct = Math.min((rating / MAX_RATING) * 100, 100);
    return (
        <div style={{ width: '100%', height: 3, borderRadius: 99, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
            <div style={{
                height: '100%', borderRadius: 99,
                background: r.gradient, width: `${pct}%`,
                animation: `bar-fill .8s ${delay}s cubic-bezier(.4,0,.2,1) both`,
            }} />
        </div>
    );
}

function PBtn({ onClick, disabled, active, label }) {
    return (
        <motion.button onClick={onClick} disabled={disabled}
            whileHover={!disabled && !active ? { scale: 1.08 } : {}}
            whileTap={!disabled ? { scale: .88 } : {}}
            style={{
                width: 28, height: 28, borderRadius: 6,
                fontSize: 11, cursor: disabled ? 'not-allowed' : 'pointer',
                fontFamily: "'IBM Plex Mono',monospace", fontWeight: active ? 700 : 500,
                background: active ? `linear-gradient(135deg,${T.ind},${T.cyan})` : 'var(--bg-elevated)',
                border: active ? 'none' : `1px solid ${T.b}`,
                color: active ? 'var(--bg-base)' : disabled ? 'var(--bg-elevated)' : T.sub,
                transition: 'all .12s',
            }}
        >{label}</motion.button>
    );
}

/* ═══════════════════════════════════════════════════
   TOP-3 CHAMPION CARD — pride-inducing design
   ═══════════════════════════════════════════════════ */
const CHAMPION_CFG = {
    0: { // 1st — GOLD CHAMPION
        cardW: 200, avatarSz: 56, nameSz: 16, ratingSz: 24,
        medal: '🏆', crownEmoji: '👑',
        border: 'rgba(245,158,11,0.5)',
        glow: 'rgba(245,158,11,0.35)',
        headerBg: 'linear-gradient(145deg,rgba(245,158,11,0.14),rgba(255,215,0,0.06))',
        accentCol: '#f59e0b',
        pillarH: 72,
        pillarBg: 'linear-gradient(180deg,rgba(245,158,11,0.12),rgba(245,158,11,0.03))',
        order: 1, z: 10,
        sparkles: true,
    },
    1: { // 2nd — SILVER
        cardW: 170, avatarSz: 46, nameSz: 14, ratingSz: 20,
        medal: '🥈', crownEmoji: null,
        border: 'rgba(148,163,184,0.4)',
        glow: 'rgba(148,163,184,0.25)',
        headerBg: 'linear-gradient(145deg,rgba(148,163,184,0.10),rgba(148,163,184,0.03))',
        accentCol: '#94a3b8',
        pillarH: 52,
        pillarBg: 'linear-gradient(180deg,rgba(148,163,184,0.10),rgba(148,163,184,0.02))',
        order: 0, z: 5,
        sparkles: false,
    },
    2: { // 3rd — BRONZE
        cardW: 160, avatarSz: 42, nameSz: 13, ratingSz: 18,
        medal: '🥉', crownEmoji: null,
        border: 'rgba(180,120,60,0.38)',
        glow: 'rgba(180,120,60,0.22)',
        headerBg: 'linear-gradient(145deg,rgba(180,120,60,0.10),rgba(180,120,60,0.03))',
        accentCol: '#b4783c',
        pillarH: 40,
        pillarBg: 'linear-gradient(180deg,rgba(180,120,60,0.10),rgba(180,120,60,0.02))',
        order: 2, z: 3,
        sparkles: false,
    },
};

function ChampionCard({ user, position, delay }) {
    const cfg = CHAMPION_CFG[position];
    const rank = getRank(user.rating);
    const isGold = position === 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 24, scale: .9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay, duration: .5, ease: [.34, 1.4, .64, 1] }}
            style={{ order: cfg.order, display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: cfg.z }}
        >
            {/* Medal / Crown floating */}
            <div style={{ position: 'relative', marginBottom: 6 }}>
                {/* Crown for 1st place */}
                {cfg.crownEmoji && (
                    <motion.span
                        animate={{ y: [0, -4, 0], rotate: [-3, 3, -3] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                        style={{
                            position: 'absolute', top: -18, left: '50%', transform: 'translateX(-50%)',
                            fontSize: 18, lineHeight: 1,
                            filter: 'drop-shadow(0 0 8px rgba(245,158,11,0.7))',
                        }}
                    >{cfg.crownEmoji}</motion.span>
                )}
                <motion.span
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: delay * .5 }}
                    style={{
                        fontSize: isGold ? 30 : 22, lineHeight: 1,
                        filter: isGold ? 'drop-shadow(0 0 10px rgba(245,158,11,0.6))' : 'none',
                        animation: isGold ? 'trophy-glow 2.5s ease-in-out infinite' : 'none',
                    }}
                >{cfg.medal}</motion.span>
            </div>

            {/* Card body */}
            <div style={{
                width: cfg.cardW,
                background: cfg.headerBg,
                border: `1.5px solid ${cfg.border}`,
                borderRadius: 14,
                padding: isGold ? '16px 12px 14px' : '12px 10px 10px',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                position: 'relative', overflow: 'hidden',
                '--glow': cfg.glow,
                animation: isGold ? 'podium-glow 3s ease-in-out infinite' : 'none',
            }}>
                {/* Sparkle particles for gold */}
                {cfg.sparkles && (
                    <>
                        {[
                            { top: 8, left: 12, delay: 0 },
                            { top: 20, right: 10, delay: .5 },
                            { bottom: 30, left: 20, delay: 1 },
                            { bottom: 12, right: 16, delay: 1.5 },
                        ].map((p, i) => (
                            <span key={i} style={{
                                position: 'absolute', ...p, animation: `sparkle 2s ${p.delay}s ease-in-out infinite`,
                                fontSize: 8, pointerEvents: 'none',
                            }}>✦</span>
                        ))}
                    </>
                )}

                {/* Rank watermark */}
                <div style={{
                    position: 'absolute', bottom: -8, right: -4,
                    fontFamily: "'Syne',sans-serif", fontSize: 60, fontWeight: 800,
                    color: cfg.accentCol, opacity: .04, lineHeight: 1,
                    pointerEvents: 'none', userSelect: 'none',
                }}>{position + 1}</div>

                {/* Avatar */}
                <div style={{
                    width: cfg.avatarSz, height: cfg.avatarSz,
                    borderRadius: '50%',
                    background: rank.gradient,
                    border: `2px solid ${cfg.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--bg-base)', fontWeight: 800,
                    fontSize: cfg.avatarSz * .38,
                    fontFamily: "'Syne',sans-serif",
                    boxShadow: `0 0 20px ${cfg.glow}`,
                    flexShrink: 0,
                }}>
                    {user.username[0].toUpperCase()}
                </div>

                {/* Username */}
                <Link to={`/profile/${user.username}`} style={{
                    marginTop: 8,
                    fontFamily: "'Syne',sans-serif",
                    fontSize: cfg.nameSz, fontWeight: 800,
                    color: T.text, textDecoration: 'none',
                    textAlign: 'center', lineHeight: 1.2,
                    maxWidth: '100%', overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    transition: 'color .12s',
                }}
                    onMouseEnter={e => e.currentTarget.style.color = cfg.accentCol}
                    onMouseLeave={e => e.currentTarget.style.color = T.text}
                >{user.username}</Link>

                {/* Rank badge */}
                <div style={{ marginTop: 5 }}>
                    <RankBadge rating={user.rating} size={isGold ? 'lg' : 'sm'} />
                </div>

                {/* Rating number — BIG and proud */}
                <div style={{ marginTop: 6, display: 'flex', alignItems: 'baseline', gap: 3 }}>
                    <span style={{
                        fontFamily: "'IBM Plex Mono',monospace",
                        fontSize: cfg.ratingSz, fontWeight: 700,
                        color: rank.color,
                        textShadow: `0 0 18px ${rank.color}44`,
                        lineHeight: 1,
                    }}>{user.rating}</span>
                    <span style={{ fontSize: 8, color: T.sub, fontFamily: "'IBM Plex Mono',monospace" }}>pts</span>
                </div>

                {/* Stats row — solved + maybe more */}
                <div style={{
                    marginTop: 6, display: 'flex', gap: 6, alignItems: 'center',
                }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 3,
                        padding: '2px 7px', borderRadius: 4,
                        background: 'rgba(0,230,118,0.06)',
                        border: '1px solid rgba(0,230,118,0.12)',
                    }}>
                        <span style={{ color: T.grn, fontSize: 9 }}>✓</span>
                        <M ch={`${user.solved_count}`} col={T.grn} sz={10} w={700} />
                        <M ch="solved" col={T.sub} sz={8} />
                    </div>
                </div>

                {/* Rating bar */}
                <div style={{ width: '85%', marginTop: 8 }}>
                    <RatingBar rating={user.rating} delay={delay + .2} />
                </div>
            </div>

            {/* Podium pillar */}
            <div style={{
                width: cfg.cardW,
                height: cfg.pillarH,
                background: cfg.pillarBg,
                border: `1px solid ${cfg.border}`,
                borderTop: 'none',
                borderRadius: '0 0 10px 10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative', overflow: 'hidden',
            }}>
                <div style={{
                    position: 'absolute', inset: 0,
                    background: `repeating-linear-gradient(-45deg,transparent,transparent 6px,rgba(255,255,255,.01) 6px,rgba(255,255,255,.01) 7px)`,
                }} />
                <span style={{
                    fontFamily: "'Syne',sans-serif",
                    fontSize: isGold ? 32 : 24, fontWeight: 800,
                    color: cfg.accentCol, opacity: .25,
                    position: 'relative', zIndex: 1,
                }}>#{position + 1}</span>
            </div>
        </motion.div>
    );
}

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════ */
export default function Leaderboard() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    useEffect(() => { document.title = 'Reyting Jadvali — OnlineJudge'; }, []);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await getLeaderboard({ page });
                const data = res.data.results || res.data;
                setUsers(data);
                if (res.data.total_pages) setTotalPages(res.data.total_pages);
                if (res.data.count) setTotal(res.data.count);
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        };
        fetchData();
    }, [page]);

    const top3 = page === 1 ? users.slice(0, 3) : [];
    const tableUsers = page === 1 ? users.slice(3) : users;
    const hasPodium = top3.length >= 1;

    const rankOffset = page === 1 ? 3 : (page - 1) * 20 + 3;

    /* Compact grid columns */
    const gridCols = '52px 2fr 100px 80px 100px 140px';

    return (
        <>
            <style>{CSS}</style>

            <div style={{
                position: 'relative', zIndex: 1,
                maxWidth: 1100, margin: '0 auto',
                padding: '14px 16px 40px',
                fontFamily: "'DM Sans',sans-serif", color: T.text,
                minHeight: '100vh',
            }}>

                {/* ══ COMPACT HEADER BAR ══ */}
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: .3 }}
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        gap: 12, flexWrap: 'wrap',
                        padding: '12px 16px',
                        background: T.surf,
                        border: `1px solid ${T.b}`,
                        borderRadius: 12,
                        marginBottom: 12,
                        position: 'relative', overflow: 'hidden',
                    }}
                >
                    {/* Gold decorative orb */}
                    <div style={{
                        position: 'absolute', top: -40, right: -20,
                        width: 150, height: 150, borderRadius: '50%',
                        background: `radial-gradient(circle,rgba(245,158,11,0.06),transparent 70%)`,
                        pointerEvents: 'none',
                    }} />

                    {/* Left: trophy + title */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
                        <motion.span
                            animate={{ y: [0, -4, 0] }}
                            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                            style={{
                                fontSize: 28, lineHeight: 1,
                                animation: 'trophy-glow 2.5s ease-in-out infinite',
                            }}
                        >🏆</motion.span>

                        <div>
                            <h1 style={{
                                fontFamily: "'Syne',sans-serif",
                                fontSize: 'clamp(18px, 2.5vw, 24px)',
                                fontWeight: 800, letterSpacing: '-.02em',
                                lineHeight: 1.1, margin: 0,
                            }}>
                                <span style={{
                                    background: `linear-gradient(90deg,${T.amb},#fbbf24 40%,${T.org})`,
                                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                }}>Reyting Jadvali</span>
                            </h1>
                            <div style={{ marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <M ch="Eng yaxshi dasturchilar" sz={9} />
                                {total > 0 && (
                                    <>
                                        <span style={{ color: T.sub, fontSize: 8 }}>·</span>
                                        <M ch={`${total} ishtirokchi`} col={T.cyan} sz={9} w={600} />
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: rank legend — compact inline pills */}
                    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', position: 'relative', justifyContent: 'flex-end' }}>
                        {RANKS.slice(0, 6).map(r => (
                            <div key={r.label} style={{
                                display: 'flex', alignItems: 'center', gap: 3,
                                padding: '2px 6px', borderRadius: 4,
                                background: r.bg, border: `1px solid ${r.bd}`,
                            }}>
                                <span style={{ fontSize: 7 }}>{r.icon}</span>
                                <span style={{
                                    fontFamily: "'IBM Plex Mono',monospace",
                                    fontSize: 7, fontWeight: 700, color: r.color,
                                }}>{r.short}</span>
                                <span style={{
                                    fontFamily: "'IBM Plex Mono',monospace",
                                    fontSize: 6, color: T.sub,
                                }}>{r.min}+</span>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* ══ TOP 3 PODIUM — Pride-inducing ══ */}
                {!loading && hasPodium && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: .1 }}
                        style={{ marginBottom: 16 }}
                    >
                        <div style={{
                            display: 'flex', alignItems: 'flex-end',
                            justifyContent: 'center', gap: 10,
                        }}>
                            {top3[1] && <ChampionCard user={top3[1]} position={1} delay={.2} />}
                            {top3[0] && <ChampionCard user={top3[0]} position={0} delay={.05} />}
                            {top3[2] && <ChampionCard user={top3[2]} position={2} delay={.35} />}
                        </div>
                    </motion.div>
                )}

                {/* ══ TABLE — Rich info rows ══ */}
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: .2 }}
                    style={{
                        background: T.surf, border: `1px solid ${T.b}`,
                        borderRadius: 10, overflow: 'hidden',
                        boxShadow: 'var(--card-shadow)',
                    }}
                >
                    {/* Header */}
                    <div style={{
                        display: 'grid', gridTemplateColumns: gridCols,
                        padding: '7px 14px',
                        background: `linear-gradient(90deg,rgba(245,158,11,.04),rgba(99,102,241,.02),transparent)`,
                        borderBottom: `1px solid ${T.b}`,
                    }}>
                        {["O'RIN", 'FOYDALANUVCHI', 'DARAJA', 'SOLVED', 'RATING', 'PROGRESS'].map((h, i) => (
                            <span key={i} style={{
                                fontFamily: "'IBM Plex Mono',monospace",
                                fontSize: 8, fontWeight: 700, color: T.sub,
                                letterSpacing: '.08em',
                            }}>{h}</span>
                        ))}
                    </div>

                    {/* Skeleton */}
                    {loading && [...Array(10)].map((_, i) => (
                        <div key={i} style={{
                            display: 'grid', gridTemplateColumns: gridCols,
                            padding: '0 14px', height: 44, alignItems: 'center',
                            borderBottom: `1px solid var(--bg-elevated)`, gap: 6,
                        }}>
                            {[28, 120, 60, 30, 44, 80].map((w, j) => (
                                <div key={j} className="skel" style={{ height: 10, width: w, maxWidth: '100%' }} />
                            ))}
                        </div>
                    ))}

                    {/* Rows — rich info */}
                    <AnimatePresence initial={false}>
                        {!loading && tableUsers.map((user, idx) => {
                            const rank = getRank(user.rating);
                            const globalRank = user.rank || (rankOffset + idx + 1);
                            const isTop10 = globalRank <= 10;
                            const ratingPct = Math.round((user.rating / MAX_RATING) * 100);

                            return (
                                <motion.div
                                    key={user.username}
                                    initial={{ opacity: 0, x: -6 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * .025, duration: .15 }}
                                >
                                    <Link
                                        to={`/profile/${user.username}`}
                                        style={{ textDecoration: 'none', display: 'block' }}
                                    >
                                        <div
                                            className="lb-row"
                                            style={{
                                                display: 'grid', gridTemplateColumns: gridCols,
                                                padding: '0 14px', height: 44, alignItems: 'center',
                                                borderBottom: idx < tableUsers.length - 1
                                                    ? `1px solid var(--bg-elevated)` : 'none',
                                                background: isTop10 ? rank.bg : 'transparent',
                                                boxShadow: isTop10 ? `inset 2px 0 0 ${rank.color}` : 'none',
                                            }}
                                        >
                                            {/* Rank number */}
                                            <div>
                                                {globalRank <= 3 ? (
                                                    <span style={{ fontSize: 14 }}>
                                                        {globalRank === 1 ? '🥇' : globalRank === 2 ? '🥈' : '🥉'}
                                                    </span>
                                                ) : (
                                                    <M ch={`#${globalRank}`}
                                                        col={isTop10 ? rank.color : T.sub}
                                                        sz={11} w={700}
                                                    />
                                                )}
                                            </div>

                                            {/* User with avatar + info */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                                                {/* Avatar */}
                                                <div style={{
                                                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                                                    background: rank.gradient,
                                                    border: `1.5px solid ${rank.color}40`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    color: 'var(--bg-base)', fontWeight: 800, fontSize: 11,
                                                    fontFamily: "'Syne',sans-serif",
                                                }}>
                                                    {user.username[0].toUpperCase()}
                                                </div>
                                                {/* Name + solved inline */}
                                                <div style={{ minWidth: 0 }}>
                                                    <div style={{
                                                        fontSize: 12, fontWeight: 600,
                                                        color: '#b0b4d8',
                                                        overflow: 'hidden', textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                    }}>{user.username}</div>
                                                    <div style={{
                                                        fontSize: 8, color: T.sub,
                                                        fontFamily: "'IBM Plex Mono',monospace",
                                                        marginTop: 1,
                                                    }}>
                                                        {rank.label}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Rank badge */}
                                            <RankBadge rating={user.rating} />

                                            {/* Solved — with icon */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <span style={{ color: T.grn, fontSize: 9 }}>✓</span>
                                                <M ch={`${user.solved_count}`} col={T.grn} sz={12} w={700} />
                                            </div>

                                            {/* Rating — prominent */}
                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                                                <M ch={`${user.rating}`} col={rank.color} sz={13} w={700} />
                                                <M ch="pts" sz={8} />
                                            </div>

                                            {/* Progress bar + percentage */}
                                            <div style={{ paddingRight: 6 }}>
                                                <RatingBar rating={user.rating} delay={idx * .03} />
                                                <div style={{ marginTop: 2, display: 'flex', justifyContent: 'space-between' }}>
                                                    <M ch={rank.short} col={rank.color} sz={7} w={600} />
                                                    <M ch={`${ratingPct}%`} sz={7} />
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>

                    {/* Empty */}
                    {!loading && tableUsers.length === 0 && top3.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '40px 16px' }}>
                            <div style={{ fontSize: 36, marginBottom: 8 }}>🏜️</div>
                            <div style={{
                                fontFamily: "'Syne',sans-serif",
                                fontSize: 14, fontWeight: 700, color: T.sub,
                            }}>Reyting jadvali bo'sh</div>
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
                                alignItems: 'center', gap: 4, marginTop: 14,
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

                {/* ══ MOTIVATIONAL FOOTER — compact ══ */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: .5 }}
                    style={{
                        textAlign: 'center', marginTop: 20,
                        padding: '14px 16px', borderRadius: 10,
                        background: 'rgba(245,158,11,0.03)',
                        border: '1px solid rgba(245,158,11,0.08)',
                    }}
                >
                    <span style={{
                        fontFamily: "'Syne',sans-serif",
                        fontSize: 12, fontWeight: 700, color: T.amb,
                    }}>🎯 Siz ham yuqoriga chiqishingiz mumkin</span>
                    <span style={{ fontSize: 11, color: T.sub, marginLeft: 8 }}>
                        Har bir masala hal qilgan sayin reytingingiz oshadi.
                        Muntazam mashq qil, <M ch="Grandmaster" col={T.red} sz={11} w={700} /> darajasiga yet.
                    </span>
                </motion.div>

            </div>
        </>
    );
}
