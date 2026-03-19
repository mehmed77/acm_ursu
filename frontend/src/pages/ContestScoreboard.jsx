import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { contestsApi } from '../api/contests';
import { useAuthStore } from '../store/authStore';

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
    teal: '#14b8a6',
    blue: '#3b82f6',
};

/* ═══════════════════════════════════════════════════
   RANK & STATUS CONFIG
   ═══════════════════════════════════════════════════ */
const RANK_CFG = {
    1: { color: '#f59e0b', medal: '🥇', bg: 'rgba(245,158,11,0.06)' },
    2: { color: '#94a3b8', medal: '🥈', bg: 'rgba(148,163,184,0.05)' },
    3: { color: '#b45309', medal: '🥉', bg: 'rgba(180,83,9,0.05)' },
};
const getRankCfg = r => RANK_CFG[r] || null;

const STATUS = {
    running:  { color: T.grn,  bg: 'rgba(0,230,118,0.08)',  bd: 'rgba(0,230,118,0.18)',  label: 'LIVE',       dot: true },
    frozen:   { color: T.blue, bg: 'rgba(59,130,246,0.08)',  bd: 'rgba(59,130,246,0.18)',  label: 'FROZEN',     dot: false },
    finished: { color: T.sub,  bg: 'rgba(120,120,160,0.06)', bd: 'rgba(120,120,160,0.14)', label: 'TUGADI',     dot: false },
    upcoming: { color: T.amb,  bg: 'rgba(255,179,0,0.08)',   bd: 'rgba(255,179,0,0.18)',   label: 'KUTILMOQDA', dot: false },
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
    0%   { transform:scale(1); opacity:.8; }
    100% { transform:scale(2.4); opacity:0; }
  }
  @keyframes pulse-slow {
    0%,100% { opacity:1; }
    50%     { opacity:.35; }
  }
  @keyframes cell-flash-green {
    0%   { background:rgba(0,230,118,0.3); }
    100% { background:rgba(0,230,118,0.08); }
  }
  @keyframes frozen-pulse {
    0%,100% { opacity:.6; }
    50%     { opacity:1; }
  }
  @keyframes delta-in {
    from { transform:translateY(4px); opacity:0; }
    to   { transform:translateY(0);   opacity:1; }
  }
  @keyframes gspin { to { transform:rotate(360deg); } }

  .skel {
    border-radius:4px;
    background:linear-gradient(90deg,
      var(--bg-elevated) 25%,
      var(--border-subtle) 50%,
      var(--bg-elevated) 75%);
    background-size:200% 100%;
    animation:shimmer 1.6s ease-in-out infinite;
  }

  .sb-row { transition:background .1s; }
  .sb-row:hover { background:rgba(99,102,241,0.04) !important; }

  .gs { width:22px; height:22px; border:2px solid rgba(99,102,241,0.1); border-top-color:#6366f1; border-radius:50%; animation:gspin .8s linear infinite; }
`;

/* ═══════════════════════════════════════════════════
   MICRO COMPONENTS
   ═══════════════════════════════════════════════════ */
function M({ ch, col = T.sub, sz = 11, w = 500 }) {
    return (
        <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: sz, fontWeight: w, color: col, lineHeight: 1 }}>
            {ch}
        </span>
    );
}

function LiveDot({ color = T.grn, size = 5 }) {
    return (
        <span style={{ position: 'relative', display: 'inline-flex', width: size, height: size, flexShrink: 0 }}>
            <span style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                background: color, animation: 'ring-ping 2s ease-out infinite'
            }} />
            <span style={{
                position: 'relative', width: '100%', height: '100%',
                borderRadius: '50%', background: color,
                boxShadow: `0 0 ${size * 2}px ${color}cc`,
                animation: 'pulse-slow 2s ease-in-out infinite'
            }} />
        </span>
    );
}

function StatusBadge({ status }) {
    const s = STATUS[status] || STATUS.finished;
    return (
        <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            height: 22, padding: '0 8px', borderRadius: 5,
            background: s.bg, border: `1px solid ${s.bd}`,
        }}>
            {s.dot && <LiveDot color={s.color} size={5} />}
            <M ch={s.label} col={s.color} sz={9} w={700} />
        </div>
    );
}

/* Auto-refresh progress */
function useAutoRefreshTimer(interval = 15000) {
    const [pct, setPct] = useState(100);
    useEffect(() => {
        const start = Date.now();
        const id = setInterval(() => {
            const elapsed = (Date.now() - start) % interval;
            setPct(100 - (elapsed / interval) * 100);
        }, 200);
        return () => clearInterval(id);
    }, [interval]);
    return pct;
}

/* ═══════════════════════════════════════════════════
   PROBLEM HEADER CELL — compact
   ═══════════════════════════════════════════════════ */
function ProblemHeader({ pid, title, scoreboard }) {
    let solved = 0;
    scoreboard.forEach(r => { if (r.problems[pid]?.solved) solved++; });
    const total = scoreboard.length || 1;
    const ratio = solved / total;
    const color = ratio > 0.5 ? T.grn : ratio > 0.2 ? T.amb : T.sub;

    return (
        <th style={{
            padding: '6px 4px', textAlign: 'center', minWidth: 50,
            borderRight: `1px solid var(--bg-elevated)`,
        }}>
            <div style={{
                fontFamily: "'IBM Plex Mono',monospace",
                fontSize: 11, fontWeight: 700, color: T.text,
                marginBottom: 2,
            }} title={title}>{pid}</div>
            <div style={{
                fontFamily: "'IBM Plex Mono',monospace",
                fontSize: 8, fontWeight: 600, color,
            }}>{solved}/{total}</div>
            <div style={{ height: 2, background: 'var(--bg-elevated)', borderRadius: 1, marginTop: 3, overflow: 'hidden' }}>
                <div style={{
                    height: '100%', width: `${ratio * 100}%`,
                    background: color, borderRadius: 1,
                }} />
            </div>
        </th>
    );
}

/* ═══════════════════════════════════════════════════
   CELL — compact
   ═══════════════════════════════════════════════════ */
function Cell({ cell, justSolved }) {
    const tdStyle = { padding: '3px 2px', textAlign: 'center', borderRight: `1px solid var(--bg-elevated)` };

    if (!cell) return (
        <td style={tdStyle}>
            <div style={{ height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: 'var(--border-subtle)', fontSize: 10 }}>·</span>
            </div>
        </td>
    );

    if (cell.frozen) return (
        <td style={tdStyle}>
            <div style={{
                height: 30, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.14)',
                animation: 'frozen-pulse 3s ease-in-out infinite',
            }}>
                <span style={{ fontSize: 10, color: T.blue }}>❄</span>
            </div>
        </td>
    );

    if (cell.solved) return (
        <td style={tdStyle}>
            <div style={{
                height: 30, borderRadius: 5,
                background: 'rgba(0,230,118,0.08)', border: '1px solid rgba(0,230,118,0.18)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 1, lineHeight: 1,
                animation: justSolved ? 'cell-flash-green 2s ease-out forwards' : 'none',
            }}>
                <M ch={`${cell.time}m`} col={T.grn} sz={10} w={700} />
                {cell.attempts > 1 && <M ch={`-${cell.attempts - 1}`} col={T.red} sz={8} w={600} />}
            </div>
        </td>
    );

    if (cell.attempts > 0) return (
        <td style={tdStyle}>
            <div style={{
                height: 30, borderRadius: 5,
                background: 'rgba(255,45,85,0.06)', border: '1px solid rgba(255,45,85,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <M ch={`-${cell.attempts}`} col={T.red} sz={10} w={600} />
            </div>
        </td>
    );

    return (
        <td style={tdStyle}>
            <div style={{ height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: 'var(--border-subtle)', fontSize: 10 }}>·</span>
            </div>
        </td>
    );
}

/* ═══════════════════════════════════════════════════
   SCOREBOARD ROW — compact
   ═══════════════════════════════════════════════════ */
function ScoreRow({ row, problems, isMe, prevRef, idx }) {
    const rc = getRankCfg(row.rank);

    const justSolvedMap = {};
    problems.forEach(p => {
        const key = `${row.username}_${p}`;
        const cell = row.problems[p];
        if (cell?.solved && !prevRef.current[key]) justSolvedMap[p] = true;
        prevRef.current[key] = cell?.solved;
    });

    return (
        <motion.tr
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * .02, duration: .18 }}
            className="sb-row"
            style={{
                borderBottom: `1px solid var(--bg-elevated)`,
                background: isMe
                    ? 'rgba(99,102,241,0.07)'
                    : rc ? rc.bg : 'transparent',
                boxShadow: isMe ? `inset 3px 0 0 ${T.ind}` : rc ? `inset 2px 0 0 ${rc.color}` : 'none',
            }}
        >
            {/* Rank */}
            <td style={{ padding: '6px 10px', textAlign: 'center', width: 48 }}>
                {rc ? (
                    <span style={{ fontSize: 14 }}>{rc.medal}</span>
                ) : (
                    <M ch={`#${row.rank}`}
                        col={row.rank <= 10 ? T.cyan : T.sub}
                        sz={11} w={700}
                    />
                )}
            </td>

            {/* User / Team */}
            <td style={{ padding: '6px 10px', minWidth: 140 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    {/* Avatar */}
                    <div style={{
                        width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                        background: rc
                            ? `linear-gradient(135deg,${rc.color}33,${rc.color}18)`
                            : `${T.ind}14`,
                        border: `1px solid ${rc ? rc.color + '33' : T.b}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: "'Syne',sans-serif",
                        fontSize: 10, fontWeight: 800,
                        color: rc ? rc.color : T.sub,
                    }}>
                        {(row.team || row.username)[0].toUpperCase()}
                    </div>

                    <div style={{ minWidth: 0 }}>
                        {row.team ? (
                            <>
                                <div style={{
                                    fontFamily: "'Syne',sans-serif", fontSize: 12, fontWeight: 700,
                                    color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                }}>
                                    {row.team}
                                </div>
                                <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 9, color: T.sub }}>
                                    {row.username} (L)
                                </div>
                            </>
                        ) : (
                            <Link to={`/profile/${row.username}`} style={{
                                fontFamily: "'DM Sans',sans-serif",
                                fontSize: 12, fontWeight: 600,
                                color: rc ? rc.color : '#9898d8',
                                textDecoration: 'none', transition: 'color .12s',
                                whiteSpace: 'nowrap',
                            }}
                                onMouseEnter={e => e.currentTarget.style.color = T.cyan}
                                onMouseLeave={e => e.currentTarget.style.color = rc ? rc.color : '#9898d8'}
                            >{row.username}</Link>
                        )}
                    </div>

                    {isMe && (
                        <div style={{
                            padding: '1px 5px', borderRadius: 4,
                            background: `${T.ind}18`, border: `1px solid ${T.ind}33`,
                            flexShrink: 0,
                        }}>
                            <M ch="SIZ" col={T.ind} sz={7} w={800} />
                        </div>
                    )}
                </div>
            </td>

            {/* Solved */}
            <td style={{ padding: '6px 8px', textAlign: 'center', width: 44, borderRight: `1px solid var(--bg-elevated)` }}>
                <M ch={`${row.solved}`} col={T.grn} sz={13} w={800} />
            </td>

            {/* Penalty */}
            <td style={{ padding: '6px 8px', textAlign: 'center', width: 60, borderRight: `1px solid var(--bg-elevated)` }}>
                <M ch={`${row.penalty}`} col={T.sub} sz={11} />
            </td>

            {/* Problem cells */}
            {problems.map(p => (
                <Cell key={p} cell={row.problems[p]} justSolved={justSolvedMap[p]} />
            ))}
        </motion.tr>
    );
}

/* ═══════════════════════════════════════════════════
   RATING ROW — compact
   ═══════════════════════════════════════════════════ */
function RatingRow({ r, idx, isMe }) {
    const sign = r.delta > 0 ? '+' : '';
    const col = r.delta > 0 ? T.grn : r.delta < 0 ? T.red : T.sub;
    const arrow = r.delta > 0 ? '▲' : r.delta < 0 ? '▼' : '—';

    return (
        <motion.tr
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * .025, duration: .18 }}
            className="sb-row"
            style={{
                borderBottom: `1px solid var(--bg-elevated)`,
                background: isMe ? 'rgba(99,102,241,0.07)' : 'transparent',
                boxShadow: isMe ? `inset 3px 0 0 ${T.ind}` : 'none',
            }}
        >
            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                <M ch={`#${r.rank}`} col={r.rank <= 10 ? T.cyan : T.sub} sz={11} w={700} />
            </td>
            <td style={{ padding: '8px 12px' }}>
                <Link to={`/profile/${r.username}`} style={{
                    fontFamily: "'DM Sans',sans-serif",
                    fontSize: 12, fontWeight: 600, color: '#9898d8', textDecoration: 'none',
                }}
                    onMouseEnter={e => e.currentTarget.style.color = T.cyan}
                    onMouseLeave={e => e.currentTarget.style.color = '#9898d8'}
                >{r.username}</Link>
            </td>
            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                <M ch={`${r.old_rating}`} col={T.sub} sz={12} />
            </td>
            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '3px 8px', borderRadius: 5,
                    background: `${col}0c`, border: `1px solid ${col}22`,
                    animation: 'delta-in .3s ease both',
                }}>
                    <span style={{ fontSize: 8, color: col }}>{arrow}</span>
                    <M ch={`${sign}${r.delta}`} col={col} sz={12} w={700} />
                </div>
            </td>
            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                <M ch={`${r.new_rating}`}
                    col={r.new_rating > r.old_rating ? T.grn : r.new_rating < r.old_rating ? T.red : T.text}
                    sz={13} w={800}
                />
            </td>
        </motion.tr>
    );
}

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════ */
export default function ContestScoreboard() {
    const { slug } = useParams();
    const user = useAuthStore(s => s.user);
    const [data, setData] = useState(null);
    const [ratingData, setRatingData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('scoreboard');
    const [filterRange, setFilterRange] = useState('all');
    const [lastUpdated, setLastUpdated] = useState(null);
    const prevRef = useRef({});
    const refreshPct = useAutoRefreshTimer(15000);

    const fetchScoreboard = useCallback(async () => {
        try {
            const res = await contestsApi.getScoreboard(slug);
            setData(res.data);
            setLastUpdated(new Date());
            document.title = `Scoreboard: ${res.data.contest.title} — OnlineJudge`;
        } catch { }
        finally { setLoading(false); }
    }, [slug]);

    const fetchRating = useCallback(async () => {
        try {
            const res = await contestsApi.getRating(slug);
            setRatingData(res.data);
        } catch { }
    }, [slug]);

    useEffect(() => {
        fetchScoreboard();
        const id = setInterval(fetchScoreboard, 15000);
        return () => clearInterval(id);
    }, [fetchScoreboard]);

    useEffect(() => {
        if (tab === 'rating' && !ratingData) fetchRating();
    }, [tab, fetchRating, ratingData]);

    /* Loading */
    if (loading) return (
        <>
            <style>{CSS}</style>
            <div style={{ height: '50vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <div className="gs" />
                <M ch="Scoreboard yuklanmoqda..." col={T.sub} sz={11} />
            </div>
        </>
    );

    if (!data) return (
        <>
            <style>{CSS}</style>
            <div style={{ textAlign: 'center', padding: '60px 0', color: T.sub, fontFamily: "'DM Sans',sans-serif" }}>
                Ma'lumot topilmadi
            </div>
        </>
    );

    const c = data.contest;
    const problems = data.problems || [];
    const titles = data.problem_titles || {};
    const board = data.scoreboard || [];
    const cStatus = STATUS[c.status] || STATUS.finished;
    const isLive = c.status === 'running' || c.status === 'frozen';

    const myRank = user ? board.find(r => r.username === user.username)?.rank : null;
    const displayBoard = filterRange === 'me' && myRank
        ? board.filter(r => Math.abs(r.rank - myRank) <= 5)
        : board;

    /* Stats calculations */
    const solvedCount = board.filter(r => r.solved > 0).length;
    const totalSolves = board.reduce((a, r) => a + r.solved, 0);
    const hardest = problems.length > 0 ? problems.reduce((hardP, p) => {
        const cnt = board.filter(r => r.problems[p]?.solved).length;
        const prev = board.filter(r => r.problems[hardP]?.solved).length;
        return cnt < prev ? p : hardP;
    }, problems[0]) : '—';

    return (
        <>
            <style>{CSS}</style>

            <div style={{
                position: 'relative', zIndex: 1,
                width: '100%',
                padding: '14px 5% 40px',
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
                    {/* Decorative orb */}
                    <div style={{
                        position: 'absolute', top: -40, right: -20,
                        width: 150, height: 150, borderRadius: '50%',
                        background: `radial-gradient(circle,rgba(99,102,241,0.06),transparent 70%)`,
                        pointerEvents: 'none',
                    }} />

                    {/* Left: breadcrumb + title */}
                    <div style={{ position: 'relative', minWidth: 0 }}>
                        {/* Breadcrumb */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                            {[
                                { to: '/contests', label: 'Musobaqalar' },
                                { to: `/contests/${slug}`, label: c.title },
                                { label: 'Scoreboard' },
                            ].map((b, i) => (
                                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                    {i > 0 && <span style={{ color: T.sub, fontSize: 9 }}>/</span>}
                                    {b.to ? (
                                        <Link to={b.to} style={{
                                            fontSize: 10, color: T.sub, textDecoration: 'none',
                                            transition: 'color .12s',
                                        }}
                                            onMouseEnter={e => e.currentTarget.style.color = T.cyan}
                                            onMouseLeave={e => e.currentTarget.style.color = T.sub}
                                        >{b.label}</Link>
                                    ) : (
                                        <M ch={b.label} col={T.ind} sz={10} w={600} />
                                    )}
                                </span>
                            ))}
                        </div>

                        {/* Title row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <h1 style={{
                                fontFamily: "'Syne',sans-serif",
                                fontSize: 'clamp(16px, 2.5vw, 22px)',
                                fontWeight: 800, letterSpacing: '-.02em',
                                lineHeight: 1.1, margin: 0, color: T.text,
                            }}>
                                {c.title}
                                <span style={{
                                    fontFamily: "'IBM Plex Mono',monospace",
                                    fontSize: 11, fontWeight: 500,
                                    color: T.sub, marginLeft: 8, letterSpacing: 'normal',
                                }}>/ Scoreboard</span>
                            </h1>
                            <StatusBadge status={c.status} />
                            {lastUpdated && (
                                <M ch={`Yangilangan: ${lastUpdated.toLocaleTimeString('uz-UZ')}`} sz={9} />
                            )}
                        </div>
                    </div>

                    {/* Right: stats pills + refresh */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative', flexShrink: 0 }}>
                        {/* Compact stats */}
                        {board.length > 0 && (
                            <div style={{ display: 'flex', gap: 4 }}>
                                {[
                                    { val: board.length, label: 'Ishtirokchi', color: T.cyan, icon: '👥' },
                                    { val: solvedCount, label: 'Yechgan', color: T.grn, icon: '✓' },
                                    { val: totalSolves, label: 'Jami hal', color: T.ind, icon: '📝' },
                                    { val: hardest, label: 'Eng qiyin', color: T.red, icon: '💀' },
                                ].map((s, i) => (
                                    <div key={i} style={{
                                        display: 'flex', alignItems: 'center', gap: 5,
                                        padding: '4px 8px', borderRadius: 6,
                                        background: `${s.color}08`,
                                        border: `1px solid ${s.color}16`,
                                    }}>
                                        <div>
                                            <div style={{
                                                fontFamily: "'DM Sans',sans-serif", fontSize: 7,
                                                color: T.sub, textTransform: 'uppercase',
                                                letterSpacing: '.05em', lineHeight: 1,
                                            }}>{s.label}</div>
                                            <div style={{
                                                fontFamily: "'IBM Plex Mono',monospace",
                                                fontSize: 12, fontWeight: 700, color: s.color,
                                                lineHeight: 1.1,
                                            }}>{typeof s.val === 'number' ? s.val : s.val}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Auto-refresh indicator */}
                        {isLive && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 4,
                                padding: '4px 8px', borderRadius: 6,
                                background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.12)',
                            }}>
                                <div style={{ position: 'relative', width: 12, height: 12 }}>
                                    <svg width="12" height="12" viewBox="0 0 12 12" style={{ transform: 'rotate(-90deg)' }}>
                                        <circle cx="6" cy="6" r="4.5" fill="none" stroke="rgba(0,212,255,0.12)" strokeWidth="1.5" />
                                        <circle cx="6" cy="6" r="4.5" fill="none" stroke={T.cyan} strokeWidth="1.5"
                                            strokeDasharray={`${2 * Math.PI * 4.5}`}
                                            strokeDashoffset={`${2 * Math.PI * 4.5 * (1 - refreshPct / 100)}`}
                                            style={{ transition: 'stroke-dashoffset .2s linear' }}
                                        />
                                    </svg>
                                </div>
                                <M ch="15s" col={T.cyan} sz={8} w={600} />
                            </div>
                        )}

                        {/* Refresh button */}
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ rotate: 180, scale: .9 }}
                            onClick={fetchScoreboard}
                            style={{
                                width: 30, height: 30, borderRadius: 7,
                                background: 'transparent', border: `1px solid ${T.b}`,
                                color: T.sub, fontSize: 14, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'color .12s, border-color .12s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.color = T.cyan; e.currentTarget.style.borderColor = T.cyan + '44'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = T.sub; e.currentTarget.style.borderColor = T.b; }}
                        >↻</motion.button>
                    </div>
                </motion.div>

                {/* ══ TABS + FILTER ROW ══ */}
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    flexWrap: 'wrap', gap: 8,
                    marginBottom: 10,
                }}>
                    {/* Tabs */}
                    <div style={{
                        display: 'flex', gap: 2,
                        background: T.surf, border: `1px solid ${T.b}`,
                        borderRadius: 8, padding: 3,
                    }}>
                        {[
                            { key: 'scoreboard', label: 'Scoreboard', icon: '🏆' },
                            { key: 'rating', label: "Rating o'zgarishlari", icon: '📊' },
                        ].map(t => {
                            const active = tab === t.key;
                            return (
                                <motion.button key={t.key}
                                    whileTap={{ scale: .94 }}
                                    onClick={() => setTab(t.key)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 5,
                                        height: 28, padding: '0 12px', borderRadius: 6,
                                        background: active ? `linear-gradient(135deg,${T.ind}20,${T.cyan}10)` : 'transparent',
                                        border: active ? `1px solid ${T.ind}30` : '1px solid transparent',
                                        color: active ? T.cyan : T.sub,
                                        fontSize: 11, fontWeight: active ? 700 : 500, cursor: 'pointer',
                                        fontFamily: "'DM Sans',sans-serif", transition: 'all .12s',
                                    }}
                                >
                                    <span style={{ fontSize: 10 }}>{t.icon}</span> {t.label}
                                </motion.button>
                            );
                        })}
                    </div>

                    {/* Right: filter + info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <M ch={`${displayBoard.length} ishtirokchi`} col={T.sub} sz={10} />
                        {problems.length > 0 && (
                            <>
                                <span style={{ color: T.sub, fontSize: 8 }}>·</span>
                                <M ch={`${problems.length} masala`} col={T.sub} sz={10} />
                            </>
                        )}

                        {user && myRank && (
                            <div style={{
                                display: 'flex', gap: 2,
                                background: T.surf, border: `1px solid ${T.b}`,
                                borderRadius: 7, padding: 2, marginLeft: 4,
                            }}>
                                {[
                                    { key: 'all', label: 'Hammasi' },
                                    { key: 'me', label: `Mening o'rnim ±5` },
                                ].map(f => (
                                    <button key={f.key}
                                        onClick={() => setFilterRange(f.key)}
                                        style={{
                                            height: 24, padding: '0 10px', borderRadius: 5,
                                            border: 'none',
                                            background: filterRange === f.key ? `${T.ind}18` : 'transparent',
                                            color: filterRange === f.key ? T.ind : T.sub,
                                            fontSize: 10, fontWeight: filterRange === f.key ? 700 : 500,
                                            cursor: 'pointer', fontFamily: "'DM Sans',sans-serif",
                                            transition: 'all .1s',
                                        }}
                                    >{f.label}</button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* ══ CONTENT ══ */}
                <AnimatePresence mode="wait">
                    {tab === 'scoreboard' && (
                        <motion.div key="sb"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: .2 }}
                        >
                            {/* Frozen banner */}
                            {c.is_frozen && (
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '8px 14px', borderRadius: 8, marginBottom: 8,
                                    background: 'rgba(59,130,246,0.06)',
                                    border: '1px solid rgba(59,130,246,0.16)',
                                    borderLeft: `3px solid ${T.blue}`,
                                }}>
                                    <span style={{ fontSize: 14, animation: 'frozen-pulse 2s ease-in-out infinite' }}>❄️</span>
                                    <div>
                                        <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 11, fontWeight: 700, color: T.blue }}>
                                            SCOREBOARD MUZLATILGAN
                                        </span>
                                        <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 10, color: T.sub, marginLeft: 8 }}>
                                            Yangi yechimlar natijasi e'lon qilinmaydi
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Table */}
                            <div style={{
                                overflowX: 'auto',
                                borderRadius: 10, border: `1px solid ${T.b}`,
                                background: T.surf,
                                boxShadow: 'var(--card-shadow)',
                            }}>
                                <table style={{ width: '100%', minWidth: 600, borderCollapse: 'collapse', fontSize: 12 }}>
                                    <thead>
                                        <tr style={{
                                            background: `linear-gradient(90deg,rgba(99,102,241,0.05),rgba(0,212,255,0.03),transparent)`,
                                            borderBottom: `1px solid ${T.b}`,
                                        }}>
                                            <th style={{
                                                padding: '8px 10px', textAlign: 'center', width: 48,
                                                fontFamily: "'IBM Plex Mono',monospace", fontSize: 8, fontWeight: 700,
                                                color: T.sub, letterSpacing: '.08em'
                                            }}>O'RIN</th>
                                            <th style={{
                                                padding: '8px 10px', textAlign: 'left',
                                                fontFamily: "'IBM Plex Mono',monospace", fontSize: 8, fontWeight: 700,
                                                color: T.sub, letterSpacing: '.08em'
                                            }}>ISHTIROKCHI</th>
                                            <th style={{
                                                padding: '8px 8px', textAlign: 'center', width: 44,
                                                borderRight: `1px solid var(--bg-elevated)`,
                                                fontFamily: "'IBM Plex Mono',monospace", fontSize: 8, fontWeight: 700,
                                                color: T.grn, letterSpacing: '.08em'
                                            }}>∑</th>
                                            <th style={{
                                                padding: '8px 8px', textAlign: 'center', width: 60,
                                                borderRight: `1px solid var(--bg-elevated)`,
                                                fontFamily: "'IBM Plex Mono',monospace", fontSize: 8, fontWeight: 700,
                                                color: T.sub, letterSpacing: '.08em'
                                            }}>PEN</th>
                                            {problems.map(p => (
                                                <ProblemHeader key={p} pid={p} title={titles[p]} scoreboard={board} />
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {displayBoard.map((row, i) => (
                                            <ScoreRow
                                                key={row.username}
                                                row={row}
                                                problems={problems}
                                                isMe={user && row.username === user.username}
                                                prevRef={prevRef}
                                                idx={i}
                                            />
                                        ))}
                                        {displayBoard.length === 0 && (
                                            <tr>
                                                <td colSpan={4 + problems.length}>
                                                    <div style={{ textAlign: 'center', padding: '40px 16px' }}>
                                                        <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                                                        <M ch="Hech kim yechim yubormadi" col={T.sub} sz={12} />
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Virtual section */}
                            {data.virtual?.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: .2 }}
                                    style={{ marginTop: 20 }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                        <div style={{ width: 2, height: 12, borderRadius: 1, background: T.teal }} />
                                        <M ch="VIRTUAL ISHTIROKCHILAR" col={T.teal} sz={9} w={700} />
                                        <div style={{ height: 1, flex: 1, background: `linear-gradient(90deg,${T.teal}28,transparent)` }} />
                                    </div>

                                    <div style={{
                                        overflowX: 'auto', borderRadius: 10,
                                        border: `1px solid rgba(20,184,166,0.12)`,
                                        background: T.surf, opacity: .85,
                                    }}>
                                        <table style={{ width: '100%', minWidth: 600, borderCollapse: 'collapse', fontSize: 12 }}>
                                            <thead>
                                                <tr style={{
                                                    background: `rgba(20,184,166,0.04)`,
                                                    borderBottom: `1px solid rgba(20,184,166,0.10)`,
                                                }}>
                                                    {['*', 'ISHTIROKCHI', '∑', 'PEN', ...problems].map((h, i) => (
                                                        <th key={i} style={{
                                                            padding: '7px 10px', textAlign: i <= 1 ? 'left' : 'center',
                                                            fontFamily: "'IBM Plex Mono',monospace",
                                                            fontSize: 8, fontWeight: 700, color: T.sub,
                                                            letterSpacing: '.08em',
                                                        }}>{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data.virtual.map((row, i) => (
                                                    <tr key={i} className="sb-row"
                                                        style={{ borderBottom: `1px solid var(--bg-elevated)` }}>
                                                        <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                                                            <M ch="*" col={T.teal} sz={11} />
                                                        </td>
                                                        <td style={{ padding: '6px 10px' }}>
                                                            <Link to={`/profile/${row.username}`} style={{
                                                                fontFamily: "'DM Sans',sans-serif",
                                                                fontSize: 12, fontWeight: 600,
                                                                color: '#7aada8', textDecoration: 'none',
                                                            }}>{row.username}</Link>
                                                        </td>
                                                        <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                                                            <M ch={`${row.solved}`} col={T.teal} sz={12} w={800} />
                                                        </td>
                                                        <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                                                            <M ch={`${row.penalty}`} col={T.sub} sz={11} />
                                                        </td>
                                                        {problems.map(p => (
                                                            <Cell key={p} cell={row.problems[p]} justSolved={false} />
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </motion.div>
                            )}
                        </motion.div>
                    )}

                    {/* ══ RATING TAB ══ */}
                    {tab === 'rating' && (
                        <motion.div key="rating"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: .2 }}
                            style={{ maxWidth: 760 }}
                        >
                            {!ratingData ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 16 }}>
                                    <div className="gs" />
                                    <M ch="Yuklanmoqda..." col={T.sub} sz={11} />
                                </div>
                            ) : !ratingData.available ? (
                                <div style={{
                                    textAlign: 'center', padding: '40px 20px',
                                    background: T.surf, borderRadius: 12,
                                    border: `1px solid ${T.b}`,
                                }}>
                                    <div style={{ fontSize: 36, marginBottom: 10 }}>📊</div>
                                    <div style={{
                                        fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 700,
                                        color: T.sub, marginBottom: 6
                                    }}>
                                        Rating o'zgarishlari hozircha yo'q
                                    </div>
                                    <div style={{ fontSize: 12, color: T.sub, lineHeight: 1.5 }}>
                                        {c.is_rated
                                            ? 'Contest tugagach, rating avtomatik hisoblanadi.'
                                            : 'Bu rated contest emas.'}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Rating summary — inline pills */}
                                    <div style={{
                                        display: 'flex', gap: 6, marginBottom: 10,
                                    }}>
                                        {[
                                            { label: 'Jami', val: ratingData.changes.length, color: T.cyan },
                                            { label: 'Oshdi', val: ratingData.changes.filter(r => r.delta > 0).length, color: T.grn },
                                            { label: 'Tushdi', val: ratingData.changes.filter(r => r.delta < 0).length, color: T.red },
                                        ].map((s, i) => (
                                            <div key={i} style={{
                                                padding: '6px 14px', borderRadius: 8,
                                                background: T.surf, border: `1px solid ${T.b}`,
                                                display: 'flex', alignItems: 'center', gap: 8,
                                            }}>
                                                <div style={{
                                                    fontFamily: "'IBM Plex Mono',monospace",
                                                    fontSize: 16, fontWeight: 700, color: s.color,
                                                    lineHeight: 1,
                                                }}>{s.val}</div>
                                                <div style={{
                                                    fontFamily: "'DM Sans',sans-serif", fontSize: 9,
                                                    color: T.sub, textTransform: 'uppercase',
                                                    letterSpacing: '.06em',
                                                }}>{s.label}</div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Rating table */}
                                    <div style={{
                                        borderRadius: 10, border: `1px solid ${T.b}`,
                                        background: T.surf, overflow: 'hidden',
                                        boxShadow: 'var(--card-shadow)',
                                    }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                            <thead>
                                                <tr style={{
                                                    background: `linear-gradient(90deg,rgba(99,102,241,0.05),transparent)`,
                                                    borderBottom: `1px solid ${T.b}`,
                                                }}>
                                                    {["O'RIN", 'ISHTIROKCHI', 'ESKI', 'DELTA', 'YANGI'].map((h, i) => (
                                                        <th key={i} style={{
                                                            padding: '8px 12px',
                                                            textAlign: i <= 1 ? 'left' : 'center',
                                                            fontFamily: "'IBM Plex Mono',monospace",
                                                            fontSize: 8, fontWeight: 700,
                                                            color: i === 3 ? T.amb : T.sub,
                                                            letterSpacing: '.08em',
                                                        }}>{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {ratingData.changes.map((r, i) => (
                                                    <RatingRow
                                                        key={r.username}
                                                        r={r} idx={i}
                                                        isMe={user && r.username === user.username}
                                                    />
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </>
    );
}
