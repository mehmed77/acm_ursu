import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getLeaderboard } from '../api/leaderboard';
import Container from '../components/ui/Container';

/* ═══════════════════════════════════════════════════
   RANK SYSTEM
   ═══════════════════════════════════════════════════ */
const RANKS = [
    { min: 2400, label: 'Legendary Grandmaster', short: 'LGM', color: '#ff2d55', bg: 'rgba(255,45,85,0.10)',  bd: 'rgba(255,45,85,0.22)',  gradient: 'linear-gradient(135deg,#ff2d55,#ff6b8a)',  dot: '#ff2d55' },
    { min: 2100, label: 'Int. Grandmaster',      short: 'IGM', color: '#ff5c7a', bg: 'rgba(255,92,122,0.09)', bd: 'rgba(255,92,122,0.20)', gradient: 'linear-gradient(135deg,#ff5c7a,#ff8fa3)',  dot: '#ff5c7a' },
    { min: 1900, label: 'Master',                short: 'MST', color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', bd: 'rgba(245,158,11,0.22)', gradient: 'linear-gradient(135deg,#f59e0b,#fbbf24)',  dot: '#f59e0b' },
    { min: 1600, label: 'Candidate Master',      short: 'CM',  color: '#a855f7', bg: 'rgba(168,85,247,0.10)', bd: 'rgba(168,85,247,0.22)', gradient: 'linear-gradient(135deg,#a855f7,#c084fc)',  dot: '#a855f7' },
    { min: 1400, label: 'Expert',                short: 'EXP', color: '#3b82f6', bg: 'rgba(59,130,246,0.09)', bd: 'rgba(59,130,246,0.20)', gradient: 'linear-gradient(135deg,#3b82f6,#60a5fa)',  dot: '#3b82f6' },
    { min: 1200, label: 'Specialist',            short: 'SPC', color: '#06b6d4', bg: 'rgba(6,182,212,0.09)',  bd: 'rgba(6,182,212,0.20)',  gradient: 'linear-gradient(135deg,#06b6d4,#67e8f9)',  dot: '#06b6d4' },
    { min: 900,  label: 'Pupil',                 short: 'PPL', color: '#10b981', bg: 'rgba(16,185,129,0.08)', bd: 'rgba(16,185,129,0.18)', gradient: 'linear-gradient(135deg,#10b981,#34d399)',  dot: '#10b981' },
    { min: 0,    label: 'Newbie',                short: 'NEW', color: '#6b7280', bg: 'rgba(107,114,128,0.07)', bd: 'rgba(107,114,128,0.16)', gradient: 'linear-gradient(135deg,#4b5563,#6b7280)', dot: '#6b7280' },
];

const getRank = (r) => RANKS.find(x => r >= x.min) ?? RANKS.at(-1);
const MAX_RATING = 3000;

const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' };

/* ═══════════════════════════════════════════════════
   SCOPED CSS
   ═══════════════════════════════════════════════════ */
const CSS = `
  .lb-wrap {
    font-family: var(--font-sans);
    color: var(--text-primary);
    min-height: 100vh;
    padding: 24px 0 60px;
  }

  /* ── Skeleton shimmer ── */
  @keyframes lb-shimmer {
    0%   { background-position: -400% 0; }
    100% { background-position:  400% 0; }
  }
  .lb-skel {
    border-radius: 6px;
    background: linear-gradient(90deg,
      var(--bg-elevated) 25%,
      var(--border-default) 50%,
      var(--bg-elevated) 75%);
    background-size: 400% 100%;
    animation: lb-shimmer 1.8s ease-in-out infinite;
  }

  /* ── Bar fill ── */
  @keyframes lb-bar {
    from { transform: scaleX(0); transform-origin: left; }
    to   { transform: scaleX(1); transform-origin: left; }
  }

  /* ── Header card ── */
  .lb-header {
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: 16px;
    padding: 20px 24px;
    margin-bottom: 16px;
    position: relative;
    overflow: hidden;
    box-shadow: var(--card-shadow);
  }
  .lb-header::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse 60% 100% at 100% 50%, rgba(245,158,11,0.05), transparent 70%),
                radial-gradient(ellipse 40% 80% at 0% 50%, rgba(99,102,241,0.04), transparent 70%);
    pointer-events: none;
  }
  .lb-header-inner {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 16px;
  }

  /* ── Title ── */
  .lb-title {
    font-family: var(--font-sans);
    font-size: clamp(22px, 3vw, 30px);
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1;
    margin: 0;
    background: linear-gradient(90deg, #f59e0b 0%, #fbbf24 40%, #f97316 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .lb-subtitle {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 500;
    color: var(--text-muted);
    margin-top: 4px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .lb-count {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 700;
    color: #00d4ff;
    background: rgba(0,212,255,0.08);
    border: 1px solid rgba(0,212,255,0.18);
    padding: 1px 8px;
    border-radius: 20px;
  }

  /* ── Rank legend pills ── */
  .lb-legend {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }
  .lb-legend-pill {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 8px;
    border-radius: 6px;
    font-family: var(--font-mono);
  }
  .lb-legend-pill span.pill-short { font-size: 8px; font-weight: 800; letter-spacing: .04em; }
  .lb-legend-pill span.pill-min   { font-size: 7px; color: var(--text-muted); }

  /* ── Table container ── */
  .lb-table {
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: 14px;
    overflow: hidden;
    box-shadow: var(--card-shadow);
  }

  /* ── Table header ── */
  .lb-thead {
    display: grid;
    padding: 0 20px;
    height: 38px;
    align-items: center;
    background: linear-gradient(90deg,
      rgba(245,158,11,0.05),
      rgba(99,102,241,0.03),
      transparent);
    border-bottom: 1px solid var(--border-subtle);
  }
  .lb-thead span {
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 700;
    letter-spacing: .10em;
    color: var(--text-muted);
    text-transform: uppercase;
  }

  /* ── Table row ── */
  .lb-row {
    display: grid;
    padding: 0 20px;
    height: 60px;
    align-items: center;
    border-bottom: 1px solid var(--border-subtle);
    text-decoration: none;
    color: inherit;
    transition:
      background 0.18s ease,
      box-shadow 0.18s ease,
      padding-left 0.18s ease;
    position: relative;
    cursor: pointer;
  }
  .lb-row:last-child { border-bottom: none; }

  /* Hover: shift left padding + brighter left bar */
  .lb-row-hovered {
    background: rgba(99,102,241,0.06) !important;
    padding-left: 26px !important;
    box-shadow: inset 4px 0 0 var(--accent) !important;
  }
  .lb-row-hovered .lb-row-name { color: var(--accent-hover) !important; }
  .lb-row-hovered .lb-avatar   { box-shadow: 0 0 0 2px var(--accent), 0 0 12px var(--accent-glow); }
  .lb-row-hovered .lb-row-arrow { opacity: 1 !important; transform: translateX(0) !important; }

  /* ── Avatar ── */
  .lb-avatar {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-sans);
    font-weight: 800;
    font-size: 13px;
    color: #fff;
    flex-shrink: 0;
  }

  /* ── Rank badge ── */
  .lb-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 20px;
    padding: 0 7px;
    border-radius: 5px;
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 700;
    letter-spacing: .04em;
  }

  /* ── Rating bar ── */
  .lb-bar-track {
    height: 4px;
    border-radius: 99px;
    background: var(--bg-elevated);
    overflow: hidden;
  }
  .lb-bar-fill {
    height: 100%;
    border-radius: 99px;
    animation: lb-bar 0.9s cubic-bezier(.4,0,.2,1) both;
  }

  /* ── Pagination ── */
  .lb-pager {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 4px;
    margin-top: 20px;
  }
  .lb-pager-btn {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: 1px solid var(--border-default);
    background: var(--bg-surface);
    color: var(--text-muted);
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.12s;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .lb-pager-btn:hover:not(:disabled) {
    border-color: var(--accent);
    color: var(--accent-hover);
    background: var(--bg-elevated);
  }
  .lb-pager-btn.active {
    background: linear-gradient(135deg, var(--accent-from), var(--accent-to));
    border-color: transparent;
    color: #fff;
    font-weight: 800;
    box-shadow: 0 0 14px var(--accent-glow);
  }
  .lb-pager-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  /* ── Footer banner ── */
  .lb-footer {
    margin-top: 20px;
    padding: 16px 24px;
    border-radius: 12px;
    background: linear-gradient(135deg,
      rgba(245,158,11,0.05) 0%,
      rgba(99,102,241,0.04) 100%);
    border: 1px solid rgba(245,158,11,0.12);
    text-align: center;
  }

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border-default); border-radius: 4px; }
`;

const GRID = '56px 1fr 110px 88px 110px 1fr 28px';

/* ═══════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════ */
function RankBadge({ rating }) {
    const r = getRank(rating);
    return (
        <span className="lb-badge" style={{ background: r.bg, border: `1px solid ${r.bd}`, color: r.color }}>
            {r.short}
        </span>
    );
}

function RatingBar({ rating, delay = 0 }) {
    const r = getRank(rating);
    const pct = Math.min((rating / MAX_RATING) * 100, 100);
    return (
        <div className="lb-bar-track">
            <div
                className="lb-bar-fill"
                style={{
                    width: `${pct}%`,
                    background: r.gradient,
                    animationDelay: `${delay}s`,
                }}
            />
        </div>
    );
}

function Avatar({ username, gradient }) {
    return (
        <div className="lb-avatar" style={{ background: gradient }}>
            {username[0].toUpperCase()}
        </div>
    );
}

function PagerBtn({ onClick, disabled, active, children }) {
    return (
        <motion.button
            className={`lb-pager-btn${active ? ' active' : ''}`}
            onClick={onClick}
            disabled={disabled}
            whileHover={!disabled && !active ? { scale: 1.1 } : {}}
            whileTap={!disabled ? { scale: 0.88 } : {}}
        >
            {children}
        </motion.button>
    );
}

/* ═══════════════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════════════ */
export default function Leaderboard() {
    const [users, setUsers]           = useState([]);
    const [loading, setLoading]       = useState(true);
    const [page, setPage]             = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal]           = useState(0);
    const [hoveredRow, setHoveredRow] = useState(null);

    useEffect(() => { document.title = 'Reyting Jadvali — OnlineJudge'; }, []);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        getLeaderboard({ page })
            .then(res => {
                if (cancelled) return;
                const data = res.data.results ?? res.data;
                setUsers(data);
                if (res.data.total_pages) setTotalPages(res.data.total_pages);
                if (res.data.count)       setTotal(res.data.count);
            })
            .catch(console.error)
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [page]);

    const rankOffset = (page - 1) * 20;

    return (
        <>
            <style>{CSS}</style>
            <div className="lb-wrap">
                <Container>

                    {/* ══ HEADER ══ */}
                    <motion.div
                        className="lb-header"
                        initial={{ opacity: 0, y: -12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35 }}
                    >
                        <div className="lb-header-inner">
                            {/* Left */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                <motion.div
                                    animate={{ y: [0, -5, 0] }}
                                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                                    style={{
                                        width: 52, height: 52, borderRadius: 14,
                                        background: 'linear-gradient(135deg,rgba(245,158,11,0.18),rgba(249,115,22,0.10))',
                                        border: '1px solid rgba(245,158,11,0.25)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 24, flexShrink: 0,
                                        boxShadow: '0 4px 20px rgba(245,158,11,0.12)',
                                    }}
                                >
                                    🏆
                                </motion.div>
                                <div>
                                    <h1 className="lb-title">Reyting Jadvali</h1>
                                    <div className="lb-subtitle">
                                        <span>Eng yaxshi dasturchilar</span>
                                        {total > 0 && (
                                            <span className="lb-count">{total} ishtirokchi</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right — rank legend */}
                            <div className="lb-legend">
                                {RANKS.slice(0, 7).map(r => (
                                    <div
                                        key={r.short}
                                        className="lb-legend-pill"
                                        style={{ background: r.bg, border: `1px solid ${r.bd}` }}
                                    >
                                        <span
                                            className="pill-short"
                                            style={{ color: r.color }}
                                        >{r.short}</span>
                                        <span className="pill-min">{r.min}+</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>

                    {/* ══ TABLE ══ */}
                    <motion.div
                        className="lb-table"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.3 }}
                    >
                        {/* Head */}
                        <div className="lb-thead" style={{ gridTemplateColumns: GRID }}>
                            {["O'RIN", "FOYDALANUVCHI", "DARAJA", "SOLVED", "RATING", "PROGRESS", ""].map(h => (
                                <span key={h}>{h}</span>
                            ))}
                        </div>

                        {/* Skeleton */}
                        {loading && Array.from({ length: 12 }).map((_, i) => (
                            <div
                                key={i}
                                style={{
                                    display: 'grid', gridTemplateColumns: GRID,
                                    padding: '0 20px', height: 60, alignItems: 'center',
                                    borderBottom: '1px solid var(--border-subtle)', gap: 8,
                                    opacity: 1 - i * 0.06,
                                }}
                            >
                                {[32, 160, 56, 32, 48, 90, 16].map((w, j) => (
                                    <div key={j} className="lb-skel" style={{ height: 11, width: w, maxWidth: '100%' }} />
                                ))}
                            </div>
                        ))}

                        {/* Rows */}
                        <AnimatePresence initial={false}>
                            {!loading && users.map((user, idx) => {
                                const rank       = getRank(user.rating);
                                const globalRank = user.rank ?? (rankOffset + idx + 1);
                                const isTop3     = globalRank <= 3;
                                const isTop10    = globalRank <= 10;
                                const ratingPct  = Math.round((user.rating / MAX_RATING) * 100);

                                const isHovered    = hoveredRow === user.username;
                                const displayName  = user.display_name?.trim() || '';

                                return (
                                    <motion.div
                                        key={user.username}
                                        initial={{ opacity: 0, x: -8 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.02, duration: 0.18 }}
                                    >
                                        <Link
                                            className={`lb-row${isHovered ? ' lb-row-hovered' : ''}`}
                                            to={`/profile/${user.username}`}
                                            onMouseEnter={() => setHoveredRow(user.username)}
                                            onMouseLeave={() => setHoveredRow(null)}
                                            style={{
                                                gridTemplateColumns: GRID,
                                                background: isHovered
                                                    ? undefined   /* handled by .lb-row-hovered */
                                                    : isTop3
                                                    ? rank.bg
                                                    : isTop10
                                                    ? 'rgba(99,102,241,0.025)'
                                                    : idx % 2 === 1
                                                    ? 'var(--bg-elevated)'
                                                    : 'transparent',
                                                boxShadow: !isHovered
                                                    ? isTop3
                                                        ? `inset 3px 0 0 ${rank.dot}`
                                                        : isTop10
                                                        ? 'inset 3px 0 0 rgba(99,102,241,0.25)'
                                                        : 'none'
                                                    : undefined,
                                            }}
                                        >
                                            {/* ── Rank ── */}
                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                {isTop3 ? (
                                                    <span style={{ fontSize: 18, lineHeight: 1 }}>
                                                        {MEDAL[globalRank]}
                                                    </span>
                                                ) : (
                                                    <span style={{
                                                        fontFamily: 'var(--font-mono)',
                                                        fontSize: 13, fontWeight: 700,
                                                        color: isTop10 ? rank.color : 'var(--text-muted)',
                                                    }}>#{globalRank}</span>
                                                )}
                                            </div>

                                            {/* ── User ── */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
                                                <Avatar username={displayName || user.username} gradient={rank.gradient} />
                                                <div style={{ minWidth: 0 }}>
                                                    {displayName ? (
                                                        <>
                                                            {/* Full name — primary */}
                                                            <div
                                                                className="lb-row-name"
                                                                style={{
                                                                    fontFamily: 'var(--font-sans)',
                                                                    fontSize: 14, fontWeight: 700,
                                                                    color: isTop3 ? rank.color : 'var(--text-primary)',
                                                                    overflow: 'hidden', textOverflow: 'ellipsis',
                                                                    whiteSpace: 'nowrap', transition: 'color 0.15s',
                                                                }}
                                                            >{displayName}</div>
                                                            {/* Username + rank short — secondary */}
                                                            <div style={{
                                                                display: 'flex', alignItems: 'center', gap: 5, marginTop: 2,
                                                            }}>
                                                                <span style={{
                                                                    fontFamily: 'var(--font-mono)',
                                                                    fontSize: 11, fontWeight: 500,
                                                                    color: isHovered ? 'var(--accent-hover)' : 'var(--text-muted)',
                                                                    transition: 'color 0.15s',
                                                                }}>@{user.username}</span>
                                                                <span style={{
                                                                    fontFamily: 'var(--font-mono)',
                                                                    fontSize: 9, color: rank.color,
                                                                    background: rank.bg,
                                                                    border: `1px solid ${rank.bd}`,
                                                                    padding: '1px 5px', borderRadius: 4,
                                                                    flexShrink: 0,
                                                                }}>{rank.short}</span>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <>
                                                            {/* No real name: show username as primary */}
                                                            <div
                                                                className="lb-row-name"
                                                                style={{
                                                                    fontFamily: 'var(--font-sans)',
                                                                    fontSize: 14, fontWeight: 700,
                                                                    color: isTop3 ? rank.color : 'var(--text-primary)',
                                                                    overflow: 'hidden', textOverflow: 'ellipsis',
                                                                    whiteSpace: 'nowrap', transition: 'color 0.15s',
                                                                }}
                                                            >{user.username}</div>
                                                            <div style={{
                                                                fontFamily: 'var(--font-mono)',
                                                                fontSize: 10, color: 'var(--text-muted)', marginTop: 2,
                                                            }}>{rank.label}</div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* ── Badge ── */}
                                            <div>
                                                <RankBadge rating={user.rating} />
                                            </div>

                                            {/* ── Solved ── */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                                <span style={{
                                                    width: 16, height: 16, borderRadius: 4,
                                                    background: 'rgba(16,185,129,0.12)',
                                                    border: '1px solid rgba(16,185,129,0.22)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: 8, color: '#10b981', fontWeight: 700, flexShrink: 0,
                                                }}>✓</span>
                                                <span style={{
                                                    fontFamily: 'var(--font-mono)',
                                                    fontSize: 14, fontWeight: 800, color: '#10b981',
                                                }}>{user.solved_count}</span>
                                            </div>

                                            {/* ── Rating ── */}
                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                                                <span style={{
                                                    fontFamily: 'var(--font-mono)',
                                                    fontSize: 15, fontWeight: 800, color: rank.color,
                                                    textShadow: `0 0 16px ${rank.dot}33`,
                                                }}>{user.rating}</span>
                                                <span style={{
                                                    fontFamily: 'var(--font-mono)',
                                                    fontSize: 9, fontWeight: 500, color: 'var(--text-muted)',
                                                }}>pts</span>
                                            </div>

                                            {/* ── Progress ── */}
                                            <div style={{ paddingRight: 8 }}>
                                                <RatingBar rating={user.rating} delay={idx * 0.025} />
                                                <div style={{
                                                    display: 'flex', justifyContent: 'space-between',
                                                    marginTop: 3,
                                                }}>
                                                    <span style={{
                                                        fontFamily: 'var(--font-mono)',
                                                        fontSize: 8, fontWeight: 700, color: rank.color,
                                                    }}>{rank.short}</span>
                                                    <span style={{
                                                        fontFamily: 'var(--font-mono)',
                                                        fontSize: 8, color: 'var(--text-muted)',
                                                    }}>{ratingPct}%</span>
                                                </div>
                                            </div>

                                            {/* ── Arrow indicator ── */}
                                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                                <span
                                                    className="lb-row-arrow"
                                                    style={{
                                                        fontFamily: 'var(--font-mono)',
                                                        fontSize: 14, color: 'var(--accent)',
                                                        opacity: 0,
                                                        transform: 'translateX(-4px)',
                                                        transition: 'opacity 0.18s ease, transform 0.18s ease',
                                                    }}
                                                >→</span>
                                            </div>
                                        </Link>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>

                        {/* Empty */}
                        {!loading && users.length === 0 && (
                            <div style={{
                                padding: '60px 20px', textAlign: 'center',
                            }}>
                                <div style={{ fontSize: 40, marginBottom: 12 }}>🏜️</div>
                                <p style={{
                                    fontFamily: 'var(--font-sans)', fontSize: 15,
                                    fontWeight: 700, color: 'var(--text-muted)',
                                }}>Reyting jadvali bo'sh</p>
                            </div>
                        )}
                    </motion.div>

                    {/* ══ PAGINATION ══ */}
                    <AnimatePresence>
                        {totalPages > 1 && !loading && (
                            <motion.div
                                className="lb-pager"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                            >
                                <PagerBtn
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                >←</PagerBtn>

                                {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                                    let pg;
                                    if (totalPages <= 7)        pg = i + 1;
                                    else if (page <= 4)        pg = i + 1;
                                    else if (page >= totalPages - 3) pg = totalPages - 6 + i;
                                    else                       pg = page - 3 + i;
                                    return (
                                        <PagerBtn
                                            key={pg}
                                            active={page === pg}
                                            onClick={() => setPage(pg)}
                                        >{pg}</PagerBtn>
                                    );
                                })}

                                <PagerBtn
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                >→</PagerBtn>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ══ FOOTER BANNER ══ */}
                    <motion.div
                        className="lb-footer"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                    >
                        <p style={{
                            fontFamily: 'var(--font-sans)',
                            fontSize: 13, fontWeight: 700,
                            color: '#f59e0b', margin: 0,
                        }}>
                            🎯 Siz ham yuqoriga chiqishingiz mumkin
                        </p>
                        <p style={{
                            fontFamily: 'var(--font-sans)',
                            fontSize: 12, color: 'var(--text-muted)',
                            margin: '4px 0 0',
                        }}>
                            Har bir masala hal qilgan sayin reytingingiz oshadi.
                            Muntazam mashq qil,{' '}
                            <span style={{
                                fontFamily: 'var(--font-mono)',
                                fontWeight: 700, color: '#ff2d55',
                            }}>Grandmaster</span>{' '}
                            darajasiga yet.
                        </p>
                    </motion.div>

                </Container>
            </div>
        </>
    );
}
