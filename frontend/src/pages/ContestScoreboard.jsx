import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { contestsApi } from '../api/contests';
import { useAuthStore } from '../store/authStore';

/* ═══════════════════════════════════════════════════
   DESIGN TOKENS — Neural Terminal (unified)
   ═══════════════════════════════════════════════════ */
const T = {
    bg: '#03030b',
    surf: '#07071a',
    surf2: '#0b0b22',
    b: 'rgba(255,255,255,0.055)',
    text: '#dde0f5',
    sub: '#44446a',
    dim: '#0e0e22',
    cyan: '#00d4ff',
    grn: '#00e676',
    amb: '#ffb300',
    red: '#ff2d55',
    pur: '#a855f7',
    ind: '#6366f1',
    org: '#f97316',
    teal: '#14b8a6',
    blue: '#3b82f6',
};

/* ═══════════════════════════════════════════════════
   RANK CONFIG — gold / silver / bronze + beyond
   ═══════════════════════════════════════════════════ */
const RANK_CFG = {
    1: { color: '#f59e0b', glow: 'rgba(245,158,11,0.5)', medal: '🥇', bg: 'rgba(245,158,11,0.07)', bd: 'rgba(245,158,11,0.2)' },
    2: { color: '#94a3b8', glow: 'rgba(148,163,184,0.4)', medal: '🥈', bg: 'rgba(148,163,184,0.06)', bd: 'rgba(148,163,184,0.16)' },
    3: { color: '#b45309', glow: 'rgba(180,83,9,0.4)', medal: '🥉', bg: 'rgba(180,83,9,0.06)', bd: 'rgba(180,83,9,0.16)' },
};
const getRankCfg = r => RANK_CFG[r] || null;

/* STATUS config */
const STATUS = {
    running: { color: T.grn, bg: 'rgba(0,230,118,0.09)', bd: 'rgba(0,230,118,0.22)', label: 'LIVE', dot: true },
    frozen: { color: T.blue, bg: 'rgba(59,130,246,0.09)', bd: 'rgba(59,130,246,0.22)', label: 'FROZEN', dot: false },
    finished: { color: T.sub, bg: 'rgba(68,68,106,0.09)', bd: 'rgba(68,68,106,0.18)', label: 'TUGADI', dot: false },
    upcoming: { color: T.amb, bg: 'rgba(255,179,0,0.09)', bd: 'rgba(255,179,0,0.22)', label: 'KUTILMOQDA', dot: false },
};

/* ═══════════════════════════════════════════════════
   GLOBAL CSS
   ═══════════════════════════════════════════════════ */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=IBM+Plex+Mono:wght@400;500;600;700&family=DM+Sans:wght@400;500;600&display=swap');
  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
  :root { color-scheme:dark; }

  @keyframes scan-v {
    0%   { transform:translateY(-100%); opacity:0; }
    5%   { opacity:.04; }
    95%  { opacity:.04; }
    100% { transform:translateY(110vh); opacity:0; }
  }
  @keyframes shimmer {
    0%   { background-position:-200% 0; }
    100% { background-position:200% 0; }
  }
  @keyframes spin { to { transform:rotate(360deg); } }
  @keyframes ring-ping {
    0%   { transform:scale(1); opacity:.8; }
    100% { transform:scale(2.6); opacity:0; }
  }
  @keyframes pulse-slow {
    0%,100% { opacity:1; }
    50%     { opacity:.35; }
  }
  @keyframes cell-flash-green {
    0%   { background:rgba(0,230,118,0.35); box-shadow:0 0 16px rgba(0,230,118,0.4); }
    100% { background:rgba(0,230,118,0.10); box-shadow:none; }
  }
  @keyframes row-highlight {
    0%   { background:rgba(0,212,255,0.12); }
    100% { background:transparent; }
  }
  @keyframes float-medal {
    0%,100% { transform:translateY(0); }
    50%     { transform:translateY(-8px); }
  }
  @keyframes delta-in {
    from { transform:translateY(6px); opacity:0; }
    to   { transform:translateY(0);   opacity:1; }
  }
  @keyframes frozen-pulse {
    0%,100% { opacity:.6; }
    50%     { opacity:1; }
  }
  @keyframes rank-glow {
    0%,100% { box-shadow:0 0 12px var(--rank-glow); }
    50%     { box-shadow:0 0 28px var(--rank-glow), 0 0 48px var(--rank-glow); }
  }
  @keyframes ticker-scroll {
    from { transform:translateX(100%); }
    to   { transform:translateX(-100%); }
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

  .sb-row { transition:background .12s; }
  .sb-row:hover { background:rgba(0,212,255,0.025) !important; }

  ::-webkit-scrollbar       { width:3px; height:3px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:rgba(255,255,255,.07); border-radius:4px; }
  ::-webkit-scrollbar-thumb:hover { background:rgba(0,212,255,.25); }
`;

/* ═══════════════════════════════════════════════════
   MICRO COMPONENTS
   ═══════════════════════════════════════════════════ */
function M({ ch, col = T.sub, sz = 12, w = 500 }) {
    return (
        <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: sz, fontWeight: w, color: col }}>
            {ch}
        </span>
    );
}

function LiveDot({ color = T.grn, size = 7 }) {
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
            display: 'inline-flex', alignItems: 'center', gap: 7,
            height: 26, padding: '0 11px', borderRadius: 7,
            background: s.bg, border: `1px solid ${s.bd}`,
        }}>
            {s.dot && <LiveDot color={s.color} size={6} />}
            <M ch={s.label} col={s.color} sz={10} w={700} />
        </div>
    );
}

/* Auto-refresh countdown */
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
   PROBLEM HEADER CELL
   ═══════════════════════════════════════════════════ */
function ProblemHeader({ pid, title, scoreboard }) {
    let solved = 0;
    scoreboard.forEach(r => { if (r.problems[pid]?.solved) solved++; });
    const total = scoreboard.length || 1;
    const ratio = solved / total;
    const color = ratio > 0.5 ? T.grn : ratio > 0.2 ? T.amb : T.sub;

    return (
        <th style={{
            padding: '10px 6px', textAlign: 'center', minWidth: 58,
            borderRight: `1px solid rgba(255,255,255,0.04)`,
        }}>
            <div style={{
                fontFamily: "'IBM Plex Mono',monospace",
                fontSize: 12, fontWeight: 700, color: T.text,
                marginBottom: 4,
            }} title={title}>{pid}</div>
            <div style={{
                fontFamily: "'IBM Plex Mono',monospace",
                fontSize: 9, fontWeight: 700, color,
            }}>{solved}/{total}</div>
            {/* Tiny bar */}
            <div style={{ height: 2, background: 'rgba(255,255,255,0.05)', borderRadius: 1, marginTop: 4, overflow: 'hidden' }}>
                <div style={{
                    height: '100%', width: `${ratio * 100}%`,
                    background: color, borderRadius: 1,
                    boxShadow: `0 0 6px ${color}88`,
                }} />
            </div>
        </th>
    );
}

/* ═══════════════════════════════════════════════════
   CELL RENDERER
   ═══════════════════════════════════════════════════ */
function Cell({ cell, justSolved }) {
    if (!cell) return (
        <td style={{ padding: '4px 3px', textAlign: 'center', borderRight: `1px solid rgba(255,255,255,0.03)` }}>
            <div style={{ width: '100%', height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: 'rgba(255,255,255,0.08)', fontSize: 12 }}>·</span>
            </div>
        </td>
    );

    if (cell.frozen) return (
        <td style={{ padding: '4px 3px', borderRight: `1px solid rgba(255,255,255,0.03)` }}>
            <div style={{
                height: 36, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.18)',
                animation: 'frozen-pulse 3s ease-in-out infinite',
            }}>
                <span style={{ fontSize: 12, color: T.blue }}>❄</span>
            </div>
        </td>
    );

    if (cell.solved) return (
        <td style={{ padding: '4px 3px', borderRight: `1px solid rgba(255,255,255,0.03)` }}>
            <div style={{
                height: 36, borderRadius: 7,
                background: 'rgba(0,230,118,0.10)', border: '1px solid rgba(0,230,118,0.22)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                lineHeight: 1.2, gap: 1,
                boxShadow: justSolved ? '0 0 16px rgba(0,230,118,0.4)' : 'none',
                animation: justSolved ? 'cell-flash-green 3s ease-out forwards' : 'none',
            }}>
                <M ch={`+${cell.time}`} col={T.grn} sz={11} w={700} />
                {cell.attempts > 1 && <M ch={`-${cell.attempts - 1}`} col={T.red} sz={9} w={600} />}
            </div>
        </td>
    );

    if (cell.attempts > 0) return (
        <td style={{ padding: '4px 3px', borderRight: `1px solid rgba(255,255,255,0.03)` }}>
            <div style={{
                height: 36, borderRadius: 7,
                background: 'rgba(255,45,85,0.07)', border: '1px solid rgba(255,45,85,0.14)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <M ch={`-${cell.attempts}`} col={T.red} sz={11} w={600} />
            </div>
        </td>
    );

    return (
        <td style={{ padding: '4px 3px', textAlign: 'center', borderRight: `1px solid rgba(255,255,255,0.03)` }}>
            <div style={{ width: '100%', height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: 'rgba(255,255,255,0.08)', fontSize: 12 }}>·</span>
            </div>
        </td>
    );
}

/* ═══════════════════════════════════════════════════
   SCOREBOARD ROW
   ═══════════════════════════════════════════════════ */
function ScoreRow({ row, problems, isMe, prevRef, idx }) {
    const rc = getRankCfg(row.rank);

    // Detect just-solved cells
    const justSolvedMap = {};
    problems.forEach(p => {
        const key = `${row.username}_${p}`;
        const cell = row.problems[p];
        if (cell?.solved && !prevRef.current[key]) justSolvedMap[p] = true;
        prevRef.current[key] = cell?.solved;
    });

    return (
        <motion.tr
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * .025, duration: .2 }}
            className="sb-row"
            style={{
                borderBottom: `1px solid rgba(255,255,255,0.04)`,
                background: isMe
                    ? 'rgba(99,102,241,0.08)'
                    : rc ? rc.bg : 'transparent',
                position: isMe ? 'sticky' : 'static',
                bottom: isMe ? 0 : 'auto',
                '--rank-glow': rc?.glow || 'transparent',
                boxShadow: isMe ? `inset 3px 0 0 ${T.ind}` : rc ? `inset 3px 0 0 ${rc.color}` : 'none',
            }}
        >
            {/* Rank */}
            <td style={{ padding: '10px 14px', textAlign: 'center', width: 60 }}>
                {rc ? (
                    <motion.span
                        animate={{ scale: [1, 1.15, 1] }}
                        transition={{ duration: 3, repeat: Infinity, delay: idx * .3 }}
                        style={{ fontSize: 18 }}
                    >{rc.medal}</motion.span>
                ) : (
                    <M ch={`#${row.rank}`}
                        col={row.rank <= 10 ? T.cyan : T.sub}
                        sz={12} w={700}
                    />
                )}
            </td>

            {/* User / Team */}
            <td style={{ padding: '10px 14px', minWidth: 160 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {/* Avatar */}
                    <div style={{
                        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                        background: rc
                            ? `linear-gradient(135deg,${rc.color}44,${rc.color}22)`
                            : `${T.ind}18`,
                        border: `1px solid ${rc ? rc.color + '44' : T.b}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: "'Syne',sans-serif",
                        fontSize: 11, fontWeight: 800,
                        color: rc ? rc.color : T.sub,
                    }}>
                        {(row.team || row.username)[0].toUpperCase()}
                    </div>

                    <div style={{ minWidth: 0 }}>
                        {row.team ? (
                            <>
                                <div style={{
                                    fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 800,
                                    color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                }}>
                                    {row.team}
                                </div>
                                <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 10, color: T.sub }}>
                                    {row.username} (L)
                                </div>
                            </>
                        ) : (
                            <Link to={`/profile/${row.username}`} style={{
                                fontFamily: "'DM Sans',sans-serif",
                                fontSize: 13, fontWeight: 600,
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
                            padding: '2px 7px', borderRadius: 5,
                            background: `${T.ind}22`, border: `1px solid ${T.ind}44`,
                            flexShrink: 0,
                        }}>
                            <M ch="SIZ" col={T.ind} sz={8} w={800} />
                        </div>
                    )}
                </div>
            </td>

            {/* Solved */}
            <td style={{ padding: '10px 12px', textAlign: 'center', width: 52, borderRight: `1px solid rgba(255,255,255,0.04)` }}>
                <M ch={`${row.solved}`} col={T.grn} sz={16} w={800} />
            </td>

            {/* Penalty */}
            <td style={{ padding: '10px 12px', textAlign: 'center', width: 72, borderRight: `1px solid rgba(255,255,255,0.04)` }}>
                <M ch={`${row.penalty}`} col={T.sub} sz={12} />
            </td>

            {/* Problem cells */}
            {problems.map(p => (
                <Cell key={p} cell={row.problems[p]} justSolved={justSolvedMap[p]} />
            ))}
        </motion.tr>
    );
}

/* ═══════════════════════════════════════════════════
   RATING CHANGE ROW
   ═══════════════════════════════════════════════════ */
function RatingRow({ r, idx, isMe }) {
    const sign = r.delta > 0 ? '+' : '';
    const col = r.delta > 0 ? T.grn : r.delta < 0 ? T.red : T.sub;
    const arrow = r.delta > 0 ? '▲' : r.delta < 0 ? '▼' : '—';

    return (
        <motion.tr
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * .03, duration: .2 }}
            className="sb-row"
            style={{
                borderBottom: `1px solid rgba(255,255,255,0.04)`,
                background: isMe ? 'rgba(99,102,241,0.08)' : 'transparent',
                boxShadow: isMe ? `inset 3px 0 0 ${T.ind}` : 'none',
            }}
        >
            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                <M ch={`#${r.rank}`} col={r.rank <= 10 ? T.cyan : T.sub} sz={12} w={700} />
            </td>
            <td style={{ padding: '12px 16px' }}>
                <Link to={`/profile/${r.username}`} style={{
                    fontFamily: "'DM Sans',sans-serif",
                    fontSize: 13, fontWeight: 600, color: '#9898d8', textDecoration: 'none',
                }}
                    onMouseEnter={e => e.currentTarget.style.color = T.cyan}
                    onMouseLeave={e => e.currentTarget.style.color = '#9898d8'}
                >{r.username}</Link>
            </td>
            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                <M ch={`${r.old_rating}`} col={T.sub} sz={13} />
            </td>
            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '4px 12px', borderRadius: 7,
                    background: `${col}10`, border: `1px solid ${col}28`,
                    animation: 'delta-in .35s ease both',
                }}>
                    <span style={{ fontSize: 10, color: col }}>{arrow}</span>
                    <M ch={`${sign}${r.delta}`} col={col} sz={14} w={700} />
                </div>
            </td>
            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                <M ch={`${r.new_rating}`}
                    col={r.new_rating > r.old_rating ? T.grn : r.new_rating < r.old_rating ? T.red : T.text}
                    sz={15} w={800}
                />
            </td>
        </motion.tr>
    );
}

/* ═══════════════════════════════════════════════════
   STATS STRIP
   ═══════════════════════════════════════════════════ */
function StatsStrip({ scoreboard, problems }) {
    const solved = scoreboard.filter(r => r.solved > 0).length;
    const totalSolves = scoreboard.reduce((a, r) => a + r.solved, 0);
    const hardest = problems.reduce((hardP, p) => {
        const cnt = scoreboard.filter(r => r.problems[p]?.solved).length;
        const prev = scoreboard.filter(r => r.problems[hardP]?.solved).length;
        return cnt < prev ? p : hardP;
    }, problems[0]);

    return (
        <div style={{
            display: 'flex', gap: 1,
            background: T.surf, border: `1px solid ${T.b}`,
            borderRadius: 12, overflow: 'hidden',
            marginBottom: 20,
        }}>
            {[
                { val: scoreboard.length, label: 'Ishtirokchi', color: T.cyan, icon: '👥' },
                { val: solved, label: "Yechgan", color: T.grn, icon: '✓' },
                { val: totalSolves, label: 'Jami hal', color: T.ind, icon: '📝' },
                { val: hardest || '—', label: 'Eng qiyin', color: T.red, icon: '💀' },
            ].map((s, i, arr) => (
                <div key={i} style={{
                    flex: 1, padding: '12px 14px',
                    borderRight: i < arr.length - 1 ? `1px solid ${T.b}` : 'none',
                    position: 'relative', overflow: 'hidden',
                }}>
                    <div style={{
                        position: 'absolute', top: -8, right: -8,
                        width: 50, height: 50, borderRadius: '50%',
                        background: `radial-gradient(circle,${s.color}14,transparent 70%)`,
                        pointerEvents: 'none',
                    }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 11 }}>{s.icon}</span>
                        <span style={{
                            fontFamily: "'DM Sans',sans-serif", fontSize: 10, color: T.sub,
                            textTransform: 'uppercase', letterSpacing: '.07em'
                        }}>{s.label}</span>
                    </div>
                    <div style={{
                        fontFamily: "'IBM Plex Mono',monospace",
                        fontSize: 20, fontWeight: 700, color: s.color,
                        textShadow: `0 0 16px ${s.color}44`, lineHeight: 1
                    }}>
                        {typeof s.val === 'number' ? s.val.toLocaleString() : s.val}
                    </div>
                </div>
            ))}
        </div>
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
            <style>{`@keyframes gspin{to{transform:rotate(360deg)}}.gs{width:32px;height:32px;border:2px solid rgba(99,102,241,0.12);border-top-color:#6366f1;border-radius:50%;animation:gspin .8s linear infinite}`}</style>
            <div style={{ height: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, background: T.bg }}>
                <div className="gs" />
                <M ch="Scoreboard yuklanmoqda..." col={T.sub} sz={12} />
            </div>
        </>
    );

    if (!data) return (
        <>
            <style>{CSS}</style>
            <div style={{ textAlign: 'center', padding: '80px 0', color: T.sub, fontFamily: "'DM Sans',sans-serif" }}>
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

    /* Filter "me ±5" */
    const myRank = user ? board.find(r => r.username === user.username)?.rank : null;
    const displayBoard = filterRange === 'me' && myRank
        ? board.filter(r => Math.abs(r.rank - myRank) <= 5)
        : board;

    return (
        <>
            <style>{CSS}</style>
            <style>{`@keyframes gspin{to{transform:rotate(360deg)}}.gs{width:20px;height:20px;border:1.5px solid rgba(99,102,241,0.1);border-top-color:#6366f1;border-radius:50%;animation:gspin .8s linear infinite}`}</style>

            {/* BG FX */}
            <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
                <div style={{
                    position: 'absolute', left: 0, right: 0, height: '1px',
                    background: `linear-gradient(90deg,transparent 5%,${T.ind}44 40%,${T.cyan}33 60%,transparent 95%)`,
                    animation: 'scan-v 14s linear infinite',
                }} />
                <div style={{
                    position: 'absolute', inset: 0, opacity: .016,
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.5) 1px,transparent 1px)`,
                    backgroundSize: '52px 52px',
                }} />
                <div style={{
                    position: 'absolute', top: '-5%', right: '10%',
                    width: 600, height: 600, borderRadius: '50%',
                    background: `radial-gradient(circle,rgba(99,102,241,0.06),transparent 65%)`,
                }} />
            </div>

            <div style={{
                position: 'relative', zIndex: 1,
                maxWidth: 1400, margin: '0 auto',
                padding: '28px 20px 80px',
                fontFamily: "'DM Sans',sans-serif", color: T.text,
                minHeight: '100vh',
            }}>

                {/* ── BREADCRUMB ── */}
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 20, flexWrap: 'wrap' }}
                >
                    {[
                        { to: '/contests', label: 'Musobaqalar' },
                        { to: `/contests/${slug}`, label: c.title },
                        { label: 'Scoreboard' },
                    ].map((b, i, arr) => (
                        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            {i > 0 && <span style={{ color: T.sub, fontSize: 11 }}>/</span>}
                            {b.to ? (
                                <Link to={b.to} style={{
                                    fontFamily: "'DM Sans',sans-serif",
                                    fontSize: 12, color: T.sub, textDecoration: 'none',
                                    transition: 'color .12s',
                                }}
                                    onMouseEnter={e => e.currentTarget.style.color = T.cyan}
                                    onMouseLeave={e => e.currentTarget.style.color = T.sub}
                                >{b.label}</Link>
                            ) : (
                                <M ch={b.label} col='#7880c4' sz={12} w={600} />
                            )}
                        </span>
                    ))}
                </motion.div>

                {/* ── HERO HEADER ── */}
                <motion.div
                    initial={{ opacity: 0, y: -16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: .4, ease: [.4, 0, .2, 1] }}
                    style={{ marginBottom: 24 }}
                >
                    {/* Top row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                        <div>
                            {/* Contest title */}
                            <h1 style={{
                                fontFamily: "'Syne',sans-serif",
                                fontSize: 'clamp(20px,3vw,30px)',
                                fontWeight: 800, letterSpacing: '-.03em',
                                lineHeight: 1.15, margin: '0 0 10px',
                                color: T.text,
                            }}>
                                {c.title}
                                <span style={{
                                    fontFamily: "'IBM Plex Mono',monospace",
                                    fontSize: 14, fontWeight: 600,
                                    color: T.sub, marginLeft: 10, letterSpacing: 'normal',
                                }}>/ Scoreboard</span>
                            </h1>

                            {/* Meta chips */}
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                <StatusBadge status={c.status} />

                                {/* Auto-refresh indicator */}
                                {isLive && (
                                    <div style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 7,
                                        height: 26, padding: '0 10px', borderRadius: 7,
                                        background: 'rgba(0,212,255,0.07)', border: '1px solid rgba(0,212,255,0.16)',
                                    }}>
                                        {/* Tiny progress arc */}
                                        <div style={{ position: 'relative', width: 14, height: 14 }}>
                                            <svg width="14" height="14" viewBox="0 0 14 14" style={{ transform: 'rotate(-90deg)' }}>
                                                <circle cx="7" cy="7" r="5.5" fill="none" stroke="rgba(0,212,255,0.15)" strokeWidth="1.5" />
                                                <circle cx="7" cy="7" r="5.5" fill="none" stroke={T.cyan} strokeWidth="1.5"
                                                    strokeDasharray={`${2 * Math.PI * 5.5}`}
                                                    strokeDashoffset={`${2 * Math.PI * 5.5 * (1 - refreshPct / 100)}`}
                                                    style={{ transition: 'stroke-dashoffset .2s linear' }}
                                                />
                                            </svg>
                                        </div>
                                        <M ch="Auto-refresh 15s" col={T.cyan} sz={10} w={600} />
                                    </div>
                                )}

                                {lastUpdated && (
                                    <M ch={`Yangilangan: ${lastUpdated.toLocaleTimeString('uz-UZ')}`} sz={10} />
                                )}
                            </div>
                        </div>

                        {/* Refresh button */}
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ rotate: 180, scale: .9 }}
                            onClick={fetchScoreboard}
                            style={{
                                width: 38, height: 38, borderRadius: 10,
                                background: T.surf, border: `1px solid ${T.b}`,
                                color: T.sub, fontSize: 17, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'color .15s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.color = T.cyan}
                            onMouseLeave={e => e.currentTarget.style.color = T.sub}
                        >↻</motion.button>
                    </div>
                </motion.div>

                {/* ── TABS ── */}
                <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: .1 }}
                    style={{
                        display: 'flex', gap: 3, marginBottom: 20,
                        background: T.surf, border: `1px solid ${T.b}`,
                        borderRadius: 11, padding: 4, width: 'fit-content',
                    }}
                >
                    {[
                        { key: 'scoreboard', label: 'Scoreboard', icon: '🏆' },
                        { key: 'rating', label: 'Rating o\'zgarishlari', icon: '📊' },
                    ].map(t => {
                        const active = tab === t.key;
                        return (
                            <motion.button key={t.key}
                                whileTap={{ scale: .94 }}
                                onClick={() => setTab(t.key)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 7,
                                    height: 32, padding: '0 16px', borderRadius: 8,
                                    background: active ? `linear-gradient(135deg,${T.ind}22,${T.cyan}12)` : 'transparent',
                                    border: active ? `1px solid ${T.ind}35` : '1px solid transparent',
                                    color: active ? T.cyan : T.sub,
                                    fontSize: 12, fontWeight: active ? 700 : 500, cursor: 'pointer',
                                    fontFamily: "'DM Sans',sans-serif", transition: 'all .15s',
                                }}
                            >
                                <span>{t.icon}</span> {t.label}
                            </motion.button>
                        );
                    })}
                </motion.div>

                {/* ── SCOREBOARD TAB ── */}
                <AnimatePresence mode="wait">
                    {tab === 'scoreboard' && (
                        <motion.div key="sb"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: .25 }}
                        >
                            {/* Frozen banner */}
                            {c.is_frozen && (
                                <motion.div
                                    initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 12,
                                        padding: '12px 18px', borderRadius: 10, marginBottom: 16,
                                        background: 'rgba(59,130,246,0.07)',
                                        border: '1px solid rgba(59,130,246,0.22)',
                                        borderLeft: `3px solid ${T.blue}`,
                                    }}
                                >
                                    <span style={{ fontSize: 18, animation: 'frozen-pulse 2s ease-in-out infinite' }}>❄️</span>
                                    <div>
                                        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 700, color: T.blue }}>
                                            SCOREBOARD MUZLATILGAN
                                        </div>
                                        <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: T.sub, marginTop: 2 }}>
                                            Yangi yechimlar natijasi e'lon qilinmaydi
                                        </div>
                                    </div>
                                    <M ch="FROZEN" col={T.blue} sz={10} w={700} style={{ marginLeft: 'auto' }} />
                                </motion.div>
                            )}

                            {/* Stats strip */}
                            {board.length > 0 && <StatsStrip scoreboard={board} problems={problems} />}

                            {/* Filter + controls row */}
                            <div style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                marginBottom: 12, flexWrap: 'wrap', gap: 10,
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <M ch={`${displayBoard.length} ishtirokchi`} col={T.sub} sz={11} />
                                    {problems.length > 0 && (
                                        <>
                                            <span style={{ color: T.sub, fontSize: 10 }}>·</span>
                                            <M ch={`${problems.length} masala`} col={T.sub} sz={11} />
                                        </>
                                    )}
                                </div>

                                {user && myRank && (
                                    <div style={{
                                        display: 'flex', gap: 3,
                                        background: T.surf, border: `1px solid ${T.b}`,
                                        borderRadius: 9, padding: 3,
                                    }}>
                                        {[
                                            { key: 'all', label: 'Hammasi' },
                                            { key: 'me', label: `Mening o'rnim ±5` },
                                        ].map(f => (
                                            <button key={f.key}
                                                onClick={() => setFilterRange(f.key)}
                                                style={{
                                                    height: 28, padding: '0 12px', borderRadius: 7,
                                                    border: 'none',
                                                    background: filterRange === f.key ? `${T.ind}22` : 'transparent',
                                                    color: filterRange === f.key ? T.ind : T.sub,
                                                    fontSize: 11, fontWeight: filterRange === f.key ? 700 : 500,
                                                    cursor: 'pointer', fontFamily: "'DM Sans',sans-serif",
                                                    transition: 'all .12s',
                                                }}
                                            >{f.label}</button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Table */}
                            <div style={{
                                overflowX: 'auto',
                                borderRadius: 14, border: `1px solid ${T.b}`,
                                background: T.surf,
                                boxShadow: '0 16px 60px rgba(0,0,0,0.5)',
                            }}>
                                <table style={{ width: '100%', minWidth: 700, borderCollapse: 'collapse', fontSize: 13 }}>
                                    <thead>
                                        <tr style={{
                                            background: `linear-gradient(90deg,rgba(99,102,241,0.07),rgba(0,212,255,0.04),transparent)`,
                                            borderBottom: `1px solid ${T.b}`,
                                        }}>
                                            <th style={{
                                                padding: '11px 14px', textAlign: 'center', width: 60,
                                                fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, fontWeight: 700,
                                                color: T.sub, letterSpacing: '.1em'
                                            }}>O'RIN</th>
                                            <th style={{
                                                padding: '11px 14px', textAlign: 'left',
                                                fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, fontWeight: 700,
                                                color: T.sub, letterSpacing: '.1em'
                                            }}>ISHTIROKCHI</th>
                                            <th style={{
                                                padding: '11px 12px', textAlign: 'center', width: 52,
                                                borderRight: `1px solid rgba(255,255,255,0.04)`,
                                                fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, fontWeight: 700,
                                                color: T.grn, letterSpacing: '.1em'
                                            }}>∑</th>
                                            <th style={{
                                                padding: '11px 12px', textAlign: 'center', width: 72,
                                                borderRight: `1px solid rgba(255,255,255,0.04)`,
                                                fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, fontWeight: 700,
                                                color: T.sub, letterSpacing: '.1em'
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
                                                    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                                                        <motion.div
                                                            animate={{ y: [0, -6, 0] }}
                                                            transition={{ duration: 3, repeat: Infinity }}
                                                            style={{ fontSize: 40, marginBottom: 12 }}
                                                        >📭</motion.div>
                                                        <M ch="Hech kim yechim yubormadi" col={T.sub} sz={13} />
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
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: .3 }}
                                    style={{ marginTop: 32 }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                                        <div style={{ width: 2, height: 16, borderRadius: 1, background: T.teal }} />
                                        <M ch="VIRTUAL ISHTIROKCHILAR" col={T.teal} sz={11} w={700} />
                                        <div style={{ height: 1, flex: 1, background: `linear-gradient(90deg,${T.teal}30,transparent)` }} />
                                    </div>

                                    <div style={{
                                        overflowX: 'auto', borderRadius: 12,
                                        border: `1px solid rgba(20,184,166,0.15)`,
                                        background: T.surf, opacity: .85,
                                    }}>
                                        <table style={{ width: '100%', minWidth: 700, borderCollapse: 'collapse', fontSize: 13 }}>
                                            <thead>
                                                <tr style={{
                                                    background: `rgba(20,184,166,0.05)`,
                                                    borderBottom: `1px solid rgba(20,184,166,0.12)`,
                                                }}>
                                                    {['*', 'ISHTIROKCHI', '∑', 'PEN', ...problems].map((h, i) => (
                                                        <th key={i} style={{
                                                            padding: '9px 12px', textAlign: i <= 1 ? 'left' : 'center',
                                                            fontFamily: "'IBM Plex Mono',monospace",
                                                            fontSize: 9, fontWeight: 700, color: T.sub,
                                                            letterSpacing: '.1em',
                                                        }}>{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data.virtual.map((row, i) => (
                                                    <tr key={i} className="sb-row"
                                                        style={{ borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                                                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                                            <M ch="*" col={T.teal} sz={12} />
                                                        </td>
                                                        <td style={{ padding: '10px 12px' }}>
                                                            <Link to={`/profile/${row.username}`} style={{
                                                                fontFamily: "'DM Sans',sans-serif",
                                                                fontSize: 13, fontWeight: 600,
                                                                color: '#7aada8', textDecoration: 'none',
                                                            }}>{row.username}</Link>
                                                        </td>
                                                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                                            <M ch={`${row.solved}`} col={T.teal} sz={14} w={800} />
                                                        </td>
                                                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                                            <M ch={`${row.penalty}`} col={T.sub} sz={12} />
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

                    {/* ── RATING TAB ── */}
                    {tab === 'rating' && (
                        <motion.div key="rating"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: .25 }}
                            style={{ maxWidth: 800 }}
                        >
                            {!ratingData ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 24 }}>
                                    <div className="gs" />
                                    <M ch="Yuklanmoqda..." col={T.sub} sz={12} />
                                </div>
                            ) : !ratingData.available ? (
                                <motion.div
                                    initial={{ opacity: 0, scale: .97 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    style={{
                                        textAlign: 'center', padding: '60px 24px',
                                        background: T.surf, borderRadius: 16,
                                        border: `1px solid ${T.b}`,
                                    }}
                                >
                                    <motion.div
                                        animate={{ y: [0, -8, 0] }}
                                        transition={{ duration: 3, repeat: Infinity }}
                                        style={{
                                            fontSize: 48, marginBottom: 16, display: 'inline-block',
                                            filter: 'grayscale(.3)'
                                        }}
                                    >📊</motion.div>
                                    <div style={{
                                        fontFamily: "'Syne',sans-serif", fontSize: 17, fontWeight: 700,
                                        color: T.sub, marginBottom: 8
                                    }}>
                                        Rating o'zgarishlari hozircha yo'q
                                    </div>
                                    <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: T.sub, lineHeight: 1.6 }}>
                                        {c.is_rated
                                            ? 'Contest tugagach, rating avtomatik hisoblanadi.'
                                            : 'Bu rated contest emas.'}
                                    </div>
                                </motion.div>
                            ) : (
                                <>
                                    {/* Rating summary stats */}
                                    <div style={{
                                        display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20,
                                    }}>
                                        {[
                                            { label: 'Jami', val: ratingData.changes.length, color: T.cyan },
                                            { label: 'Oshdi', val: ratingData.changes.filter(r => r.delta > 0).length, color: T.grn },
                                            { label: 'Tushdi', val: ratingData.changes.filter(r => r.delta < 0).length, color: T.red },
                                        ].map((s, i) => (
                                            <div key={i} style={{
                                                padding: '12px 16px', borderRadius: 10,
                                                background: T.surf, border: `1px solid ${T.b}`,
                                                textAlign: 'center',
                                            }}>
                                                <div style={{
                                                    fontFamily: "'IBM Plex Mono',monospace",
                                                    fontSize: 22, fontWeight: 700, color: s.color,
                                                    textShadow: `0 0 16px ${s.color}44`, lineHeight: 1
                                                }}>
                                                    {s.val}
                                                </div>
                                                <div style={{
                                                    fontFamily: "'DM Sans',sans-serif", fontSize: 10,
                                                    color: T.sub, textTransform: 'uppercase',
                                                    letterSpacing: '.07em', marginTop: 4
                                                }}>
                                                    {s.label}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Rating table */}
                                    <div style={{
                                        borderRadius: 14, border: `1px solid ${T.b}`,
                                        background: T.surf, overflow: 'hidden',
                                        boxShadow: '0 16px 60px rgba(0,0,0,0.5)',
                                    }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                            <thead>
                                                <tr style={{
                                                    background: `linear-gradient(90deg,rgba(99,102,241,0.07),transparent)`,
                                                    borderBottom: `1px solid ${T.b}`,
                                                }}>
                                                    {['O\'RIN', 'ISHTIROKCHI', 'ESKI', 'DELTA', 'YANGI'].map((h, i) => (
                                                        <th key={i} style={{
                                                            padding: '11px 16px',
                                                            textAlign: i <= 1 ? 'left' : 'center',
                                                            fontFamily: "'IBM Plex Mono',monospace",
                                                            fontSize: 9, fontWeight: 700,
                                                            color: i === 3 ? T.amb : T.sub,
                                                            letterSpacing: '.1em',
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
