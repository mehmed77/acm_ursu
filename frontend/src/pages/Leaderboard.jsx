import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getLeaderboard } from '../api/leaderboard';

// ═══════════════════════════════════════════════════
// DESIGN TOKENS  —  "Neural Terminal" aesthetic
// Status.jsx bilan bir xil tizim
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

// ═══════════════════════════════════════════════════
// RANK TIZIMI — Codeforces uslubi, lekin kuchaytirilgan
// ═══════════════════════════════════════════════════
const RANKS = [
    {
        min: 2400, label: 'Legendary Grandmaster', short: 'LGM',
        color: '#ff2d55', glow: 'rgba(255,45,85,0.35)',
        bg: 'rgba(255,45,85,0.08)', bd: 'rgba(255,45,85,0.22)',
        icon: '🔴', crown: true,
        gradient: 'linear-gradient(135deg,#ff2d55,#ff6b8a)',
        barColor: '#ff2d55',
    },
    {
        min: 2100, label: 'International Grandmaster', short: 'IGM',
        color: '#ff5c7a', glow: 'rgba(255,92,122,0.3)',
        bg: 'rgba(255,92,122,0.07)', bd: 'rgba(255,92,122,0.2)',
        icon: '🔴', crown: false,
        gradient: 'linear-gradient(135deg,#ff5c7a,#ff8fa3)',
        barColor: '#ff5c7a',
    },
    {
        min: 1900, label: 'Master', short: 'MST',
        color: '#f59e0b', glow: 'rgba(245,158,11,0.3)',
        bg: 'rgba(245,158,11,0.08)', bd: 'rgba(245,158,11,0.22)',
        icon: '🟡', crown: false,
        gradient: 'linear-gradient(135deg,#f59e0b,#fbbf24)',
        barColor: '#f59e0b',
    },
    {
        min: 1600, label: 'Candidate Master', short: 'CM',
        color: '#a855f7', glow: 'rgba(168,85,247,0.3)',
        bg: 'rgba(168,85,247,0.08)', bd: 'rgba(168,85,247,0.22)',
        icon: '🟣', crown: false,
        gradient: 'linear-gradient(135deg,#a855f7,#c084fc)',
        barColor: '#a855f7',
    },
    {
        min: 1400, label: 'Expert', short: 'EXP',
        color: '#3b82f6', glow: 'rgba(59,130,246,0.28)',
        bg: 'rgba(59,130,246,0.07)', bd: 'rgba(59,130,246,0.2)',
        icon: '🔵', crown: false,
        gradient: 'linear-gradient(135deg,#3b82f6,#60a5fa)',
        barColor: '#3b82f6',
    },
    {
        min: 1200, label: 'Specialist', short: 'SPC',
        color: '#06b6d4', glow: 'rgba(6,182,212,0.25)',
        bg: 'rgba(6,182,212,0.07)', bd: 'rgba(6,182,212,0.18)',
        icon: '🩵', crown: false,
        gradient: 'linear-gradient(135deg,#06b6d4,#67e8f9)',
        barColor: '#06b6d4',
    },
    {
        min: 900, label: 'Pupil', short: 'PPL',
        color: '#10b981', glow: 'rgba(16,185,129,0.22)',
        bg: 'rgba(16,185,129,0.06)', bd: 'rgba(16,185,129,0.16)',
        icon: '🟢', crown: false,
        gradient: 'linear-gradient(135deg,#10b981,#34d399)',
        barColor: '#10b981',
    },
    {
        min: 0, label: 'Newbie', short: 'NEW',
        color: '#44446a', glow: 'rgba(68,68,106,0.2)',
        bg: 'rgba(68,68,106,0.06)', bd: 'rgba(68,68,106,0.14)',
        icon: '⬜', crown: false,
        gradient: 'linear-gradient(135deg,#44446a,#6b6b9a)',
        barColor: '#44446a',
    },
];

const getRank = (rating) => RANKS.find(r => rating >= r.min) || RANKS.at(-1);

// MAX RATING — progress bar uchun
const MAX_RATING = 3000;

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
    100% { transform:scale(2.4); opacity:0; }
  }
  @keyframes pulse-slow {
    0%,100% { opacity:1; }
    50%     { opacity:.45; }
  }
  @keyframes float {
    0%,100% { transform:translateY(0px) rotate(0deg); }
    33%     { transform:translateY(-10px) rotate(1deg); }
    66%     { transform:translateY(-5px) rotate(-1deg); }
  }
  @keyframes float2 {
    0%,100% { transform:translateY(0px); }
    50%     { transform:translateY(-7px); }
  }
  @keyframes count-up {
    from { transform:translateY(8px); opacity:0; }
    to   { transform:translateY(0);   opacity:1; }
  }
  @keyframes bar-fill {
    from { width:0%; }
  }
  @keyframes crown-bounce {
    0%,100% { transform:translateY(0) rotate(-5deg); }
    50%     { transform:translateY(-6px) rotate(5deg); }
  }
  @keyframes star-spin {
    0%  { transform:rotate(0deg) scale(1); }
    50% { transform:rotate(180deg) scale(1.2); }
    100%{ transform:rotate(360deg) scale(1); }
  }
  @keyframes podium-rise {
    from { transform:scaleY(0); transform-origin:bottom; }
    to   { transform:scaleY(1); transform-origin:bottom; }
  }
  @keyframes glow-pulse {
    0%,100% { box-shadow: 0 0 20px var(--glow-color, rgba(0,212,255,0.3)); }
    50%     { box-shadow: 0 0 40px var(--glow-color, rgba(0,212,255,0.5)), 0 0 80px var(--glow-color, rgba(0,212,255,0.15)); }
  }
  @keyframes number-tick {
    0%  { opacity:0; transform:translateY(4px); }
    100%{ opacity:1; transform:translateY(0); }
  }
  @keyframes particles {
    0%   { transform:translate(0,0) scale(1); opacity:.8; }
    100% { transform:translate(var(--dx),var(--dy)) scale(0); opacity:0; }
  }
  @keyframes border-rotate {
    0%   { background-position: 0% 50%; }
    50%  { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  @keyframes rank-bar-fill {
    from { transform: scaleX(0); transform-origin: left; }
    to   { transform: scaleX(1); transform-origin: left; }
  }
  @keyframes trophy-glow {
    0%,100% { filter: drop-shadow(0 0 8px rgba(245,158,11,0.6)); }
    50%     { filter: drop-shadow(0 0 20px rgba(245,158,11,0.9)) drop-shadow(0 0 40px rgba(245,158,11,0.4)); }
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

  .row-hover {
    position:relative;
    transition:background .12s;
    cursor:pointer;
  }
  .row-hover::before {
    content:'';
    position:absolute; left:0; top:0; bottom:0; width:2px;
    background:linear-gradient(to bottom,transparent,var(--rank-color,#00d4ff),transparent);
    opacity:0; transition:opacity .2s;
    box-shadow:0 0 12px var(--rank-color,#00d4ff);
  }
  .row-hover:hover { background:rgba(0,212,255,.028) !important; }
  .row-hover:hover::before { opacity:1; }

  ::-webkit-scrollbar { width:3px; height:3px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:rgba(255,255,255,.07); border-radius:4px; }
  ::-webkit-scrollbar-thumb:hover { background:rgba(0,212,255,.3); }
`;

// ═══════════════════════════════════════════════════
// MICRO COMPONENTS
// ═══════════════════════════════════════════════════

function M({ ch, col = T.sub, sz = 12, w = 500 }) {
    return (
        <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: sz, fontWeight: w, color: col }}>
            {ch}
        </span>
    );
}

/* Rank badge — horizontal pill */
function RankBadge({ rating, size = 'sm' }) {
    const r = getRank(rating);
    const big = size === 'lg';
    return (
        <div style={{
            display: 'inline-flex', alignItems: 'center', gap: big ? 8 : 5,
            height: big ? 28 : 22, padding: big ? '0 12px' : '0 8px',
            borderRadius: big ? 9 : 7,
            background: r.bg, border: `1px solid ${r.bd}`,
            width: 'fit-content',
        }}>
            <span style={{ fontSize: big ? 12 : 9 }}>{r.icon}</span>
            <span style={{
                fontFamily: "'IBM Plex Mono',monospace",
                fontSize: big ? 12 : 10, fontWeight: 700, color: r.color,
                textShadow: `0 0 10px ${r.color}55`,
                letterSpacing: '.03em',
            }}>{r.short}</span>
        </div>
    );
}

/* Animated counter */
function Counter({ value, color, size = 21 }) {
    const [n, setN] = useState(0);
    const done = useRef(false);
    useEffect(() => {
        if (done.current || !value) return;
        done.current = true;
        const t0 = Date.now(), d = 800;
        const tick = () => {
            const p = Math.min((Date.now() - t0) / d, 1);
            setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
            if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }, [value]);
    return (
        <span style={{
            fontFamily: "'IBM Plex Mono',monospace",
            fontSize: size, fontWeight: 700, color,
            textShadow: `0 0 20px ${color}44`,
            animation: 'count-up .4s ease both',
        }}>{n.toLocaleString()}</span>
    );
}

/* Rating progress bar */
function RatingBar({ rating, delay = 0 }) {
    const r = getRank(rating);
    const pct = Math.min((rating / MAX_RATING) * 100, 100);
    return (
        <div style={{
            width: '100%', height: 3, borderRadius: 99,
            background: 'rgba(255,255,255,0.05)',
            overflow: 'hidden',
        }}>
            <div style={{
                height: '100%', borderRadius: 99,
                background: r.gradient,
                width: `${pct}%`,
                animation: `rank-bar-fill .9s ${delay}s cubic-bezier(.4,0,.2,1) both`,
                boxShadow: `0 0 8px ${r.color}66`,
            }} />
        </div>
    );
}

/* PBtn — pagination */
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
// PODIUM CARD — top 3
// ═══════════════════════════════════════════════════
const PODIUM_CONFIG = {
    0: { // 1-o'rin
        order: 1, height: 200, avatarSize: 64, fontSize: 17,
        ratingSize: 26, pillarH: 90, medal: '🏆',
        glow: 'rgba(245,158,11,0.4)',
        border: 'rgba(245,158,11,0.45)',
        headerBg: 'linear-gradient(135deg,rgba(245,158,11,0.18),rgba(245,158,11,0.06))',
        pillarBg: 'linear-gradient(180deg,rgba(245,158,11,0.18),rgba(245,158,11,0.06))',
        pillarBd: 'rgba(245,158,11,0.3)',
        rankNum: '1',
        rankNumColor: '#f59e0b',
        crownAnim: true,
        zIndex: 10,
    },
    1: { // 2-o'rin
        order: 0, height: 165, avatarSize: 52, fontSize: 15,
        ratingSize: 20, pillarH: 65, medal: '🥈',
        glow: 'rgba(148,163,184,0.3)',
        border: 'rgba(148,163,184,0.35)',
        headerBg: 'linear-gradient(135deg,rgba(148,163,184,0.12),rgba(148,163,184,0.04))',
        pillarBg: 'linear-gradient(180deg,rgba(148,163,184,0.14),rgba(148,163,184,0.04))',
        pillarBd: 'rgba(148,163,184,0.25)',
        rankNum: '2',
        rankNumColor: '#94a3b8',
        crownAnim: false,
        zIndex: 5,
    },
    2: { // 3-o'rin
        order: 2, height: 145, avatarSize: 46, fontSize: 14,
        ratingSize: 18, pillarH: 50, medal: '🥉',
        glow: 'rgba(180,120,60,0.28)',
        border: 'rgba(180,120,60,0.32)',
        headerBg: 'linear-gradient(135deg,rgba(180,120,60,0.12),rgba(180,120,60,0.04))',
        pillarBg: 'linear-gradient(180deg,rgba(180,120,60,0.14),rgba(180,120,60,0.04))',
        pillarBd: 'rgba(180,120,60,0.25)',
        rankNum: '3',
        rankNumColor: '#b4783c',
        crownAnim: false,
        zIndex: 3,
    },
};

function PodiumCard({ user, position, delay }) {
    const cfg = PODIUM_CONFIG[position];
    const rank = getRank(user.rating);
    const sorted = [1, 0, 2]; // visual: 2nd left, 1st center, 3rd right

    return (
        <motion.div
            initial={{ opacity: 0, y: 30, scale: .92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay, duration: .5, ease: [.34, 1.56, .64, 1] }}
            style={{ order: cfg.order, display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: cfg.zIndex }}
        >
            {/* Medal / Crown floating above */}
            <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: delay * .5 }}
                style={{
                    fontSize: position === 0 ? 38 : 28, marginBottom: 10, lineHeight: 1,
                    filter: position === 0 ? 'drop-shadow(0 0 12px rgba(245,158,11,0.7))' : 'none',
                    animation: position === 0 ? 'trophy-glow 2s ease-in-out infinite' : 'none',
                }}
            >{cfg.medal}</motion.div>

            {/* Card */}
            <div style={{
                width: position === 0 ? 168 : 142,
                background: cfg.headerBg,
                border: `1px solid ${cfg.border}`,
                borderRadius: 16, padding: '18px 14px 14px',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                position: 'relative', overflow: 'hidden',
                boxShadow: `0 8px 40px ${cfg.glow}, 0 0 0 0px ${cfg.border}`,
                '--glow-color': cfg.glow,
                animation: position === 0 ? 'glow-pulse 3s ease-in-out infinite' : 'none',
            }}>
                {/* Rank number watermark */}
                <div style={{
                    position: 'absolute', bottom: -10, right: -5,
                    fontFamily: "'Syne',sans-serif",
                    fontSize: 80, fontWeight: 800, color: cfg.rankNumColor,
                    opacity: .055, lineHeight: 1, pointerEvents: 'none',
                    userSelect: 'none',
                }}>{cfg.rankNum}</div>

                {/* Corner glow orb */}
                <div style={{
                    position: 'absolute', top: -30, right: -30,
                    width: 100, height: 100, borderRadius: '50%',
                    background: `radial-gradient(circle,${cfg.glow},transparent 70%)`,
                    pointerEvents: 'none',
                }} />

                {/* Avatar */}
                <div style={{
                    width: cfg.avatarSize, height: cfg.avatarSize,
                    borderRadius: '50%',
                    background: rank.gradient,
                    border: `2px solid ${cfg.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#03030b', fontWeight: 800, fontSize: cfg.avatarSize * .38,
                    fontFamily: "'Syne',sans-serif",
                    boxShadow: `0 0 24px ${cfg.glow}`,
                    flexShrink: 0,
                }}>
                    {user.username[0].toUpperCase()}
                </div>

                {/* Username */}
                <div style={{
                    marginTop: 10,
                    fontFamily: "'Syne',sans-serif",
                    fontSize: cfg.fontSize, fontWeight: 800,
                    color: T.text, textAlign: 'center',
                    lineHeight: 1.2, maxWidth: '100%',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    width: '100%',
                }}>{user.username}</div>

                {/* Rank badge */}
                <div style={{ marginTop: 6 }}>
                    <RankBadge rating={user.rating} />
                </div>

                {/* Rating */}
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{
                        fontFamily: "'IBM Plex Mono',monospace",
                        fontSize: cfg.ratingSize, fontWeight: 700,
                        color: rank.color,
                        textShadow: `0 0 20px ${rank.color}55`,
                        lineHeight: 1,
                    }}>{user.rating}</span>
                    <span style={{ fontSize: 9, color: T.sub, fontFamily: "'IBM Plex Mono',monospace" }}>pts</span>
                </div>

                {/* Solved */}
                <div style={{
                    marginTop: 8, display: 'flex', alignItems: 'center', gap: 5,
                    padding: '4px 10px', borderRadius: 7,
                    background: 'rgba(0,230,118,0.07)',
                    border: '1px solid rgba(0,230,118,0.14)',
                }}>
                    <span style={{ color: T.grn, fontSize: 11 }}>✓</span>
                    <span style={{
                        fontFamily: "'IBM Plex Mono',monospace",
                        fontSize: 11, fontWeight: 700, color: T.grn,
                    }}>{user.solved_count}</span>
                    <span style={{ fontSize: 10, color: T.sub }}>solved</span>
                </div>
            </div>

            {/* Podium pillar */}
            <div style={{
                width: position === 0 ? 168 : 142,
                height: cfg.pillarH,
                background: cfg.pillarBg,
                border: `1px solid ${cfg.pillarBd}`,
                borderTop: 'none',
                borderRadius: '0 0 12px 12px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: 'podium-rise .8s cubic-bezier(.4,0,.2,1) both',
                animationDelay: `${delay + .2}s`,
                position: 'relative', overflow: 'hidden',
            }}>
                <div style={{
                    position: 'absolute', inset: 0,
                    background: `repeating-linear-gradient(
                        -45deg,
                        transparent,
                        transparent 8px,
                        rgba(255,255,255,.015) 8px,
                        rgba(255,255,255,.015) 9px
                    )`,
                }} />
                <span style={{
                    fontFamily: "'Syne',sans-serif",
                    fontSize: position === 0 ? 40 : 30, fontWeight: 800,
                    color: cfg.rankNumColor, opacity: .3,
                    position: 'relative', zIndex: 1,
                }}>#{cfg.rankNum}</span>
            </div>
        </motion.div>
    );
}

// ═══════════════════════════════════════════════════
// RANK DISTRIBUTION MINI CHART
// ═══════════════════════════════════════════════════
function RankLegend() {
    return (
        <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 6,
            justifyContent: 'center',
        }}>
            {RANKS.slice(0, 6).map(r => (
                <div key={r.label} style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '4px 10px', borderRadius: 20,
                    background: r.bg, border: `1px solid ${r.bd}`,
                }}>
                    <span style={{ fontSize: 9 }}>{r.icon}</span>
                    <span style={{
                        fontFamily: "'IBM Plex Mono',monospace",
                        fontSize: 9, fontWeight: 700, color: r.color,
                        letterSpacing: '.04em',
                    }}>{r.label}</span>
                    <span style={{
                        fontFamily: "'IBM Plex Mono',monospace",
                        fontSize: 8, color: T.sub,
                    }}>{r.min}+</span>
                </div>
            ))}
        </div>
    );
}

// ═══════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════
export default function Leaderboard() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [hoveredRank, setHoveredRank] = useState(null);

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

    // rank number offset
    const rankOffset = page === 1 ? 3 : (page - 1) * 20 + 3;

    return (
        <>
            <style>{CSS}</style>

            {/* ── BACKGROUND FX ─────────────────── */}
            <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
                <div style={{
                    position: 'absolute', left: 0, right: 0, height: '1px',
                    background: `linear-gradient(90deg,transparent 5%,${T.cyan}55 40%,${T.grn}44 60%,transparent 95%)`,
                    animation: 'scan-v 12s linear infinite',
                }} />
                <div style={{
                    position: 'absolute', top: 0, bottom: 0, width: '1px',
                    background: `linear-gradient(180deg,transparent,${T.ind}33,transparent)`,
                    animation: 'scan-h 18s linear 6s infinite',
                }} />
                <div style={{
                    position: 'absolute', inset: 0, opacity: .022,
                    backgroundImage: `linear-gradient(${T.b} 1px,transparent 1px),linear-gradient(90deg,${T.b} 1px,transparent 1px)`,
                    backgroundSize: '52px 52px',
                }} />
                {/* Gold orb — leaderboard theme */}
                <div style={{
                    position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)',
                    width: 700, height: 700, borderRadius: '50%',
                    background: `radial-gradient(circle,rgba(245,158,11,0.07),transparent 65%)`,
                }} />
                <div style={{
                    position: 'absolute', bottom: '5%', right: '5%', width: 400, height: 400, borderRadius: '50%',
                    background: `radial-gradient(circle,${T.ind}08,transparent 65%)`
                }} />
                <div style={{
                    position: 'absolute', top: '40%', left: '3%', width: 300, height: 300, borderRadius: '50%',
                    background: `radial-gradient(circle,${T.pur}06,transparent 65%)`
                }} />
            </div>

            <div style={{
                position: 'relative', zIndex: 1,
                maxWidth: 1100, margin: '0 auto',
                padding: '40px 24px 80px',
                fontFamily: "'DM Sans',sans-serif", color: T.text,
                minHeight: '100vh',
            }}>

                {/* ── HERO HEADER ───────────────────── */}
                <motion.div
                    initial={{ opacity: 0, y: -24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: .45, ease: [.4, 0, .2, 1] }}
                    style={{ textAlign: 'center', marginBottom: 48 }}
                >
                    {/* Trophy icon */}
                    <motion.div
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                        style={{
                            fontSize: 52, marginBottom: 16, display: 'inline-block',
                            filter: 'drop-shadow(0 0 20px rgba(245,158,11,0.7))',
                            animation: 'trophy-glow 2.5s ease-in-out infinite',
                        }}
                    >🏆</motion.div>

                    {/* Label */}
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 9,
                        padding: '5px 16px', borderRadius: 100, marginBottom: 12,
                        background: 'rgba(245,158,11,0.08)',
                        border: '1px solid rgba(245,158,11,0.25)',
                        marginLeft: 'auto', marginRight: 'auto',
                    }}>
                        <span style={{
                            width: 5, height: 5, borderRadius: '50%',
                            background: T.amb, display: 'inline-block',
                            boxShadow: `0 0 8px ${T.amb}`,
                        }} />
                        <span style={{
                            fontFamily: "'IBM Plex Mono',monospace",
                            fontSize: 10, fontWeight: 700, color: T.amb,
                            letterSpacing: '.12em',
                        }}>GLOBAL LEADERBOARD</span>
                    </div>

                    <h1 style={{
                        fontFamily: "'Syne',sans-serif",
                        fontSize: 42, fontWeight: 800,
                        letterSpacing: '-.04em', lineHeight: 1, margin: '0 0 12px',
                        display: 'block',
                    }}>
                        <span style={{
                            background: `linear-gradient(90deg,${T.amb},#fbbf24 40%,${T.org})`,
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            filter: `drop-shadow(0 0 28px rgba(245,158,11,0.4))`,
                        }}>Reyting Jadvali</span>
                    </h1>

                    <p style={{ fontSize: 14, color: T.sub, letterSpacing: '.02em' }}>
                        Eng yaxshi dasturchilar · Yuqoriga chiq, tarixga kir
                    </p>

                    {total > 0 && (
                        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
                            <M ch={total.toLocaleString()} col={T.cyan} sz={14} w={700} />
                            <M ch="ta ishtirokchi" sz={12} />
                        </div>
                    )}

                    {/* Rank legend */}
                    <div style={{ marginTop: 20 }}>
                        <RankLegend />
                    </div>
                </motion.div>

                {/* ── PODIUM ─────────────────────────── */}
                {!loading && hasPodium && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: .1 }}
                        style={{ marginBottom: 56 }}
                    >
                        {/* Section label */}
                        <div style={{
                            textAlign: 'center', marginBottom: 24,
                            fontFamily: "'IBM Plex Mono',monospace",
                            fontSize: 10, fontWeight: 700, color: T.sub,
                            letterSpacing: '.14em', textTransform: 'uppercase',
                        }}>
                            ── TOP 3 PODIUM ──
                        </div>

                        <div style={{
                            display: 'flex', alignItems: 'flex-end',
                            justifyContent: 'center', gap: 12,
                            paddingBottom: 0,
                        }}>
                            {top3[1] && <PodiumCard user={top3[1]} position={1} delay={.2} />}
                            {top3[0] && <PodiumCard user={top3[0]} position={0} delay={.05} />}
                            {top3[2] && <PodiumCard user={top3[2]} position={2} delay={.35} />}
                        </div>
                    </motion.div>
                )}

                {/* ── TABLE ─────────────────────────── */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: .25 }}
                    style={{
                        background: T.surf, border: `1px solid ${T.b}`,
                        borderRadius: 16, overflow: 'hidden',
                        boxShadow: '0 16px 60px rgba(0,0,0,.5)',
                    }}
                >
                    {/* Table header */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '72px 2fr 160px 120px 130px 160px',
                        padding: '11px 22px',
                        background: `linear-gradient(90deg,rgba(245,158,11,.06),rgba(99,102,241,.04),transparent)`,
                        borderBottom: `1px solid ${T.b}`,
                    }}>
                        {['O\'RIN', 'FOYDALANUVCHI', 'DARAJA', 'SOLVED', 'RATING', 'PROGRESS'].map((h, i) => (
                            <span key={i} style={{
                                fontFamily: "'IBM Plex Mono',monospace",
                                fontSize: 9, fontWeight: 700, color: T.sub,
                                letterSpacing: '.1em', textTransform: 'uppercase',
                            }}>{h}</span>
                        ))}
                    </div>

                    {/* Skeleton */}
                    {loading && [...Array(12)].map((_, i) => (
                        <div key={i} style={{
                            display: 'grid',
                            gridTemplateColumns: '72px 2fr 160px 120px 130px 160px',
                            padding: '0 22px', height: 52, alignItems: 'center',
                            borderBottom: `1px solid rgba(255,255,255,.03)`, gap: 8,
                        }}>
                            {[32, 150, 80, 40, 55, 100].map((w, j) => (
                                <div key={j} className="skel" style={{ height: 11, width: w, maxWidth: '100%' }} />
                            ))}
                        </div>
                    ))}

                    {/* Rows */}
                    <AnimatePresence initial={false}>
                        {!loading && tableUsers.map((user, idx) => {
                            const rank = getRank(user.rating);
                            const globalRank = user.rank || (rankOffset + idx + 1);
                            const isTop10 = globalRank <= 10;
                            const isHovered = hoveredRank === user.username;

                            return (
                                <motion.div
                                    key={user.username}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * .03, duration: .18 }}
                                >
                                    <Link
                                        to={`/profile/${user.username}`}
                                        style={{ textDecoration: 'none', display: 'block' }}
                                    >
                                        <div
                                            className="row-hover"
                                            style={{
                                                '--rank-color': rank.color,
                                                display: 'grid',
                                                gridTemplateColumns: '72px 2fr 160px 120px 130px 160px',
                                                padding: '0 22px', height: 52, alignItems: 'center',
                                                borderBottom: idx < tableUsers.length - 1
                                                    ? `1px solid rgba(255,255,255,.035)` : 'none',
                                                background: isTop10
                                                    ? `${rank.bg}` : 'transparent',
                                            }}
                                            onMouseEnter={() => setHoveredRank(user.username)}
                                            onMouseLeave={() => setHoveredRank(null)}
                                        >
                                            {/* Rank number */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                {globalRank <= 3 ? (
                                                    <span style={{ fontSize: 16 }}>
                                                        {globalRank === 1 ? '🥇' : globalRank === 2 ? '🥈' : '🥉'}
                                                    </span>
                                                ) : (
                                                    <span style={{
                                                        fontFamily: "'IBM Plex Mono',monospace",
                                                        fontSize: 13, fontWeight: 700,
                                                        color: isTop10 ? rank.color : T.sub,
                                                        textShadow: isTop10 ? `0 0 10px ${rank.color}44` : 'none',
                                                    }}>#{globalRank}</span>
                                                )}
                                            </div>

                                            {/* User */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
                                                {/* Avatar */}
                                                <div style={{
                                                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                                                    background: rank.gradient,
                                                    border: `1.5px solid ${rank.color}40`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    color: '#03030b', fontWeight: 800, fontSize: 13,
                                                    fontFamily: "'Syne',sans-serif",
                                                    boxShadow: isHovered ? `0 0 16px ${rank.color}44` : 'none',
                                                    transition: 'box-shadow .2s',
                                                }}>
                                                    {user.username[0].toUpperCase()}
                                                </div>
                                                {/* Name */}
                                                <span style={{
                                                    fontSize: 14, fontWeight: 600,
                                                    color: isHovered ? T.text : '#b0b4d8',
                                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                    transition: 'color .12s',
                                                }}>{user.username}</span>
                                            </div>

                                            {/* Rank badge */}
                                            <RankBadge rating={user.rating} />

                                            {/* Solved */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                                <span style={{ color: T.grn, fontSize: 11 }}>✓</span>
                                                <span style={{
                                                    fontFamily: "'IBM Plex Mono',monospace",
                                                    fontSize: 13, fontWeight: 700, color: T.grn,
                                                }}>{user.solved_count}</span>
                                            </div>

                                            {/* Rating */}
                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                                                <span style={{
                                                    fontFamily: "'IBM Plex Mono',monospace",
                                                    fontSize: 15, fontWeight: 700, color: rank.color,
                                                    textShadow: `0 0 14px ${rank.color}44`,
                                                }}>{user.rating}</span>
                                                <span style={{ fontSize: 9, color: T.sub, fontFamily: "'IBM Plex Mono',monospace" }}>pts</span>
                                            </div>

                                            {/* Progress bar */}
                                            <div style={{ paddingRight: 8 }}>
                                                <RatingBar rating={user.rating} delay={idx * .04} />
                                                <div style={{ marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{
                                                        fontFamily: "'IBM Plex Mono',monospace",
                                                        fontSize: 9, color: rank.color, fontWeight: 600,
                                                    }}>{rank.short}</span>
                                                    <span style={{
                                                        fontFamily: "'IBM Plex Mono',monospace",
                                                        fontSize: 9, color: T.sub,
                                                    }}>{Math.round((user.rating / MAX_RATING) * 100)}%</span>
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
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            style={{ textAlign: 'center', padding: '80px 20px' }}
                        >
                            <motion.div
                                animate={{ y: [0, -8, 0] }}
                                transition={{ duration: 3, repeat: Infinity }}
                                style={{ fontSize: 48, marginBottom: 16, display: 'inline-block' }}
                            >🏜️</motion.div>
                            <div style={{
                                fontFamily: "'Syne',sans-serif",
                                fontSize: 18, fontWeight: 700, color: T.sub,
                            }}>Reyting jadvali bo'sh</div>
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

                {/* ── MOTIVATIONAL FOOTER ───────────── */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: .6 }}
                    style={{
                        textAlign: 'center', marginTop: 48,
                        padding: '24px', borderRadius: 14,
                        background: 'rgba(245,158,11,0.04)',
                        border: '1px solid rgba(245,158,11,0.1)',
                    }}
                >
                    <div style={{
                        fontFamily: "'Syne',sans-serif",
                        fontSize: 15, fontWeight: 700, color: T.amb,
                        marginBottom: 6,
                    }}>
                        🎯 Siz ham yuqoriga chiqishingiz mumkin
                    </div>
                    <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.6 }}>
                        Har bir masala hal qilgan sayin reytingingiz oshadi.
                        Muntazam mashq qil, <M ch="Grandmaster" col={T.red} sz={12} w={700} /> darajasiga yet.
                    </div>
                </motion.div>

            </div>
        </>
    );
}
