import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axios';

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
    blu: '#3b82f6',
};

const RANKS = [
    { min: 2400, label: 'Legendary Grandmaster', short: 'LGM', color: '#ff2d55', bg: 'rgba(255,45,85,0.08)', bd: 'rgba(255,45,85,0.18)', icon: '🔴', gradient: 'linear-gradient(135deg,#ff2d55,#ff6b8a)' },
    { min: 2100, label: 'International Grandmaster', short: 'IGM', color: '#ff5c7a', bg: 'rgba(255,92,122,0.07)', bd: 'rgba(255,92,122,0.16)', icon: '🔴', gradient: 'linear-gradient(135deg,#ff5c7a,#ff8fa3)' },
    { min: 1900, label: 'Master', short: 'MST', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', bd: 'rgba(245,158,11,0.18)', icon: '🟡', gradient: 'linear-gradient(135deg,#f59e0b,#fbbf24)' },
    { min: 1600, label: 'Candidate Master', short: 'CM', color: '#a855f7', bg: 'rgba(168,85,247,0.08)', bd: 'rgba(168,85,247,0.18)', icon: '🟣', gradient: 'linear-gradient(135deg,#a855f7,#c084fc)' },
    { min: 1400, label: 'Expert', short: 'EXP', color: '#3b82f6', bg: 'rgba(59,130,246,0.07)', bd: 'rgba(59,130,246,0.16)', icon: '🔵', gradient: 'linear-gradient(135deg,#3b82f6,#60a5fa)' },
    { min: 1200, label: 'Specialist', short: 'SPC', color: '#06b6d4', bg: 'rgba(6,182,212,0.07)', bd: 'rgba(6,182,212,0.15)', icon: '🩵', gradient: 'linear-gradient(135deg,#06b6d4,#67e8f9)' },
    { min: 900, label: 'Pupil', short: 'PPL', color: '#10b981', bg: 'rgba(16,185,129,0.06)', bd: 'rgba(16,185,129,0.14)', icon: '🟢', gradient: 'linear-gradient(135deg,#10b981,#34d399)' },
    { min: 0, label: 'Newbie', short: 'NEW', color: 'var(--text-muted)', bg: 'rgba(120,120,160,0.06)', bd: 'rgba(120,120,160,0.12)', icon: '⬜', gradient: 'linear-gradient(135deg,#44446a,#6b6b9a)' },
];

const getRank = (rating) => RANKS.find(r => rating >= r.min) || RANKS.at(-1);
const MAX_RATING = 3000;

const SC = {
    accepted: { label: 'AC', color: '#00e676', dim: 'rgba(0,230,118,0.10)', bd: 'rgba(0,230,118,0.18)' },
    wrong_answer: { label: 'WA', color: '#ff2d55', dim: 'rgba(255,45,85,0.10)', bd: 'rgba(255,45,85,0.18)' },
    time_limit_exceeded: { label: 'TLE', color: '#ffb300', dim: 'rgba(255,179,0,0.10)', bd: 'rgba(255,179,0,0.18)' },
    memory_limit_exceeded: { label: 'MLE', color: '#ffb300', dim: 'rgba(255,179,0,0.10)', bd: 'rgba(255,179,0,0.18)' },
    runtime_error: { label: 'RE', color: '#ff2d55', dim: 'rgba(255,45,85,0.08)', bd: 'rgba(255,45,85,0.16)' },
    compilation_error: { label: 'CE', color: '#f97316', dim: 'rgba(249,115,22,0.08)', bd: 'rgba(249,115,22,0.16)' },
    pending: { label: 'PND', color: '#6366f1', dim: 'rgba(99,102,241,0.08)', bd: 'rgba(99,102,241,0.16)' },
    running: { label: 'RUN', color: '#00d4ff', dim: 'rgba(0,212,255,0.08)', bd: 'rgba(0,212,255,0.18)' },
};

const LANG = {
    python: { label: 'Python', color: '#3b82f6', icon: 'PY' },
    cpp: { label: 'C++', color: '#818cf8', icon: 'C+' },
    java: { label: 'Java', color: '#f59e0b', icon: 'JV' },
    csharp: { label: 'C#', color: '#10b981', icon: 'C#' },
};

/* ═══════════════════════════════════════════════════
   CSS
   ═══════════════════════════════════════════════════ */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=IBM+Plex+Mono:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap');

  @keyframes shimmer {
    0%   { background-position:-200% 0; }
    100% { background-position:200% 0; }
  }
  @keyframes bar-fill {
    from { transform: scaleX(0); transform-origin: left; }
    to   { transform: scaleX(1); transform-origin: left; }
  }
  @keyframes pulse-ring {
    0%   { transform:scale(1); opacity:.6; }
    100% { transform:scale(2.2); opacity:0; }
  }
  @keyframes spin { to { transform:rotate(360deg); } }
  @keyframes streak-glow {
    0%,100% { box-shadow: 0 0 12px rgba(99,102,241,.15); }
    50%     { box-shadow: 0 0 24px rgba(99,102,241,.30); }
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

  .sub-row {
    position:relative;
    transition:background .1s;
    cursor:pointer;
  }
  .sub-row:hover { background:rgba(99,102,241,.035) !important; }

  .hm-cell {
    transition: transform .1s, box-shadow .1s;
    cursor: pointer;
  }
  .hm-cell:hover {
    transform: scale(1.5);
    z-index: 10;
    box-shadow: 0 0 8px rgba(99,102,241,0.5);
  }

  .pm-chip {
    transition: transform .1s, box-shadow .1s;
    cursor: pointer;
  }
  .pm-chip:hover {
    transform: scale(1.08);
    box-shadow: var(--card-shadow);
  }

  ::-webkit-scrollbar { width:3px; height:3px; }
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
            height: big ? 22 : 18, padding: big ? '0 8px' : '0 6px',
            borderRadius: big ? 6 : 4,
            background: r.bg, border: `1px solid ${r.bd}`,
        }}>
            <span style={{ fontSize: big ? 9 : 7 }}>{r.icon}</span>
            <span style={{
                fontFamily: "'IBM Plex Mono',monospace",
                fontSize: big ? 10 : 8, fontWeight: 700, color: r.color,
            }}>{r.short}</span>
        </div>
    );
}

function SBadge({ status }) {
    const s = status?.toLowerCase();
    const c = SC[s] || { label: status, color: T.sub, dim: 'rgba(120,120,160,.06)', bd: 'rgba(120,120,160,.12)' };
    return (
        <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            height: 18, padding: '0 6px', borderRadius: 4,
            background: c.dim, border: `1px solid ${c.bd}`,
        }}>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: c.color, display: 'inline-block' }} />
            <span style={{
                fontFamily: "'IBM Plex Mono',monospace",
                fontSize: 8, fontWeight: 700, color: c.color,
            }}>{c.label}</span>
        </div>
    );
}

function LBadge({ lang }) {
    const l = LANG[lang?.toLowerCase()] || { label: lang, color: T.sub, icon: '??' };
    return (
        <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            height: 16, padding: '0 5px', borderRadius: 3,
            background: `${l.color}12`, border: `1px solid ${l.color}22`,
        }}>
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 7, fontWeight: 700, color: l.color }}>{l.icon}</span>
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 8, fontWeight: 600, color: l.color }}>{l.label}</span>
        </div>
    );
}

/* Date formatting (fixed) */
function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    const months = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
    const day = String(d.getDate()).padStart(2, '0');
    const month = months[d.getMonth()];
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${h}:${m}`;
}

/* ═══════════════════════════════════════════════════
   SECTION CARD WRAPPER — adds premium styling
   ═══════════════════════════════════════════════════ */
function Section({ icon, title, right, children, accent = T.ind, delay = 0, style: s = {} }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: .25 }}
            style={{
                background: T.surf, border: `1px solid ${T.b}`,
                borderRadius: 12, overflow: 'hidden',
                position: 'relative',
                ...s,
            }}
        >
            {/* Top accent line */}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                background: `linear-gradient(90deg,transparent,${accent}50,transparent)`,
            }} />
            {/* Header */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 16px',
                borderBottom: `1px solid ${T.b}`,
                background: `linear-gradient(90deg,${accent}06,transparent)`,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16, lineHeight: 1, filter: `drop-shadow(0 0 4px ${accent}40)` }}>{icon}</span>
                    <span style={{
                        fontFamily: "'Syne',sans-serif",
                        fontSize: 13, fontWeight: 800, color: T.text,
                        letterSpacing: '-.01em',
                    }}>{title}</span>
                </div>
                {right && <div>{right}</div>}
            </div>
            {/* Body */}
            <div style={{ padding: '12px 16px' }}>
                {children}
            </div>
        </motion.div>
    );
}

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════ */
export default function Profile() {
    const { username } = useParams();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, text: '' });
    const [showSubs, setShowSubs] = useState(false);

    useEffect(() => {
        const fetch = async () => {
            setLoading(true);
            try {
                const res = await api.get(`/users/${username}/`);
                setProfile(res.data);
                document.title = `${username} — Profil`;
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        };
        fetch();
    }, [username]);

    if (loading) return (
        <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            padding: '120px 0', flexDirection: 'column', gap: 12,
        }}>
            <div style={{
                width: 32, height: 32, borderRadius: '50%',
                border: `2px solid ${T.ind}40`, borderTopColor: T.ind,
                animation: 'spin .6s linear infinite',
            }} />
            <M ch="Yuklanmoqda..." sz={10} />
            <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
        </div>
    );

    if (!profile) return (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: T.sub }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>👤</div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 700 }}>Foydalanuvchi topilmadi</div>
        </div>
    );

    const rank = getRank(profile.rating);
    const problemMap = profile.problem_map || [];
    const heatmap = profile.heatmap || [];
    const months = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];

    const getStatusColor = (status) => {
        if (status === 'solved') return { bg: '#10b981', color: '#fff', border: '1px solid #059669' };
        if (status === 'wrong') return { bg: '#ef4444', color: '#fff', border: '1px solid #dc2626' };
        if (status === 'attempted') return { bg: '#f59e0b', color: '#fff', border: '1px solid #d97706' };
        return { bg: 'var(--bg-elevated)', color: T.sub, border: `1px solid ${T.b}` };
    };

    const handleMouseMove = (e, text) => setTooltip({ show: true, x: e.clientX, y: e.clientY, text });
    const handleMouseLeave = () => setTooltip(prev => ({ ...prev, show: false }));

    const ratingPct = Math.min(100, (profile.rating / MAX_RATING) * 100);
    const solvedPct = profile.total_problems ? Math.min(100, (profile.solved_count / profile.total_problems) * 100) : 0;
    const joinYear = new Date(profile.date_joined).getFullYear();

    // Heatmap stats
    const totalSubmissions = heatmap.reduce((acc, d) => acc + (d?.count || 0), 0);
    const activeDays = heatmap.filter(d => d?.count > 0).length;
    const maxStreak = (() => {
        let max = 0, cur = 0;
        heatmap.forEach(d => {
            if (d?.count > 0) { cur++; max = Math.max(max, cur); }
            else cur = 0;
        });
        return max;
    })();

    // Problem stats
    const solvedCount = problemMap.filter(p => p.status === 'solved').length;
    const attemptedCount = problemMap.filter(p => p.status === 'attempted').length;
    const wrongCount = problemMap.filter(p => p.status === 'wrong').length;

    const subCount = profile.recent_submissions?.length || 0;

    return (
        <>
            <style>{CSS}</style>

            {/* Tooltip */}
            {tooltip.show && (
                <div style={{
                    position: 'fixed', left: tooltip.x + 12, top: tooltip.y + 12,
                    zIndex: 9999, pointerEvents: 'none',
                    background: 'var(--bg-elevated)', border: `1px solid ${T.b}`,
                    borderRadius: 6, padding: '4px 8px',
                    fontSize: 10, color: T.text, boxShadow: 'var(--card-shadow)',
                    fontFamily: "'IBM Plex Mono',monospace",
                }}>{tooltip.text}</div>
            )}

            <div style={{
                position: 'relative', zIndex: 1,
                width: '100%',
                padding: '14px 5% 40px',
                fontFamily: "'DM Sans',sans-serif", color: T.text,
                minHeight: '100vh',
            }}>

                {/* ══════════════════════════════════════
                    HERO CARD
                   ══════════════════════════════════════ */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: .3 }}
                    style={{
                        background: T.surf,
                        border: `1px solid ${T.b}`,
                        borderRadius: 14,
                        padding: '16px 20px',
                        marginBottom: 10,
                        position: 'relative', overflow: 'hidden',
                    }}
                >
                    {/* Top accent */}
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                        background: `linear-gradient(90deg,transparent,${rank.color}80,transparent)`,
                    }} />
                    <div style={{
                        position: 'absolute', top: -50, right: -30,
                        width: 180, height: 180, borderRadius: '50%',
                        background: `radial-gradient(circle,${rank.color}08,transparent 70%)`,
                        pointerEvents: 'none',
                    }} />

                    <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* Avatar */}
                        <div style={{ position: 'relative' }}>
                            <div style={{
                                position: 'absolute', inset: -4,
                                borderRadius: '50%', border: `2px solid ${rank.color}30`,
                                animation: 'pulse-ring 3s ease-out infinite',
                            }} />
                            <div style={{
                                width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
                                background: rank.gradient,
                                border: `2.5px solid ${rank.color}60`,
                                boxShadow: `0 0 20px ${rank.color}30`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'var(--bg-base)', fontWeight: 800, fontSize: 22,
                                fontFamily: "'Syne',sans-serif",
                                position: 'relative',
                            }}>
                                {profile.username[0].toUpperCase()}
                            </div>
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 200 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <h1 style={{
                                    fontFamily: "'Syne',sans-serif",
                                    fontSize: 22, fontWeight: 800,
                                    letterSpacing: '-.01em', margin: 0, lineHeight: 1.1,
                                }}>{profile.username}</h1>
                                <RankBadge rating={profile.rating} size="lg" />
                                {profile.rank && profile.rank <= 3 && (
                                    <span style={{ fontSize: 16 }}>
                                        {profile.rank === 1 ? '🥇' : profile.rank === 2 ? '🥈' : '🥉'}
                                    </span>
                                )}
                            </div>
                            <div style={{ marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                <M ch={rank.label} col={rank.color} sz={10} w={600} />
                                <M ch={`📅 ${joinYear} yildan`} sz={9} />
                                {profile.last_login && <M ch={`🕐 ${formatDate(profile.last_login)}`} sz={9} />}
                            </div>
                        </div>

                        {/* Quick stats */}
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {[
                                { icon: '🏅', val: `#${profile.rank || '—'}`, label: "O'rin", col: T.amb },
                                { icon: '⚡', val: profile.rating, label: 'Rating', col: rank.color },
                                { icon: '✓', val: profile.solved_count, label: 'Yechilgan', col: T.grn },
                                { icon: '📊', val: `${profile.stats?.acceptance_rate || 0}%`, label: 'Qabul', col: T.blu },
                            ].map((s, i) => (
                                <div key={i} style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                                    padding: '6px 12px', borderRadius: 8,
                                    background: `${s.col}06`, border: `1px solid ${s.col}14`,
                                    minWidth: 56,
                                }}>
                                    <span style={{ fontSize: 12, lineHeight: 1 }}>{s.icon}</span>
                                    <div style={{
                                        fontFamily: "'IBM Plex Mono',monospace",
                                        fontSize: 14, fontWeight: 800, color: s.col,
                                        lineHeight: 1.2, marginTop: 2,
                                    }}>{s.val}</div>
                                    <div style={{
                                        fontSize: 7, color: T.sub, fontWeight: 600,
                                        textTransform: 'uppercase', letterSpacing: '.04em',
                                    }}>{s.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>

                {/* ══════════════════════════════════════
                    STATS ROW
                   ══════════════════════════════════════ */}
                <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: .08 }}
                    style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 10 }}
                >
                    {[
                        { icon: '🏆', val: profile.rating, label: 'Rating', color: rank.color, sub: `Max: ${profile.max_rating}`, bar: true, pct: ratingPct },
                        { icon: '✅', val: profile.solved_count, label: 'Yechilgan', color: T.grn, sub: `/ ${profile.total_problems} masala`, bar: true, pct: solvedPct },
                        { icon: '📊', val: `${profile.stats?.acceptance_rate || 0}%`, label: 'Qabul darajasi', color: T.blu, sub: `${profile.stats?.accepted || 0} / ${profile.stats?.total || 0}` },
                        { icon: '🏅', val: `#${profile.rank || '—'}`, label: 'Global Rank', color: T.amb, sub: `/ ${profile.total_users || 0} ishtirokchi` },
                    ].map((s, i) => (
                        <div key={i} style={{
                            background: T.surf, border: `1px solid ${T.b}`,
                            borderRadius: 10, padding: '10px 12px',
                            position: 'relative', overflow: 'hidden',
                        }}>
                            <div style={{
                                position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                                background: `linear-gradient(90deg,transparent,${s.color}50,transparent)`,
                            }} />
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 14 }}>{s.icon}</span>
                                <div>
                                    <div style={{
                                        fontFamily: "'IBM Plex Mono',monospace",
                                        fontSize: 18, fontWeight: 800, color: s.color, lineHeight: 1,
                                    }}>{s.val}</div>
                                    <div style={{ fontSize: 9, fontWeight: 600, color: T.sub, marginTop: 2 }}>{s.label}</div>
                                </div>
                            </div>
                            <M ch={s.sub} sz={8} />
                            {s.bar && (
                                <div style={{ width: '100%', height: 3, borderRadius: 99, background: 'var(--bg-elevated)', marginTop: 6, overflow: 'hidden' }}>
                                    <div style={{
                                        height: '100%', borderRadius: 99, background: s.color,
                                        width: `${s.pct}%`, animation: 'bar-fill .8s .3s cubic-bezier(.4,0,.2,1) both',
                                    }} />
                                </div>
                            )}
                        </div>
                    ))}
                </motion.div>

                {/* ══════════════════════════════════════
                    HEMIS (if available)
                   ══════════════════════════════════════ */}
                {profile.university && (
                    <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: .12 }}
                        style={{
                            background: T.surf, border: `1px solid rgba(59,130,246,0.12)`,
                            borderRadius: 10, padding: '10px 14px', marginBottom: 10,
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                            <span style={{ fontSize: 14 }}>🎓</span>
                            <M ch="HEMIS MA'LUMOTLARI" col={T.sub} sz={8} w={700} />
                        </div>
                        <div style={{
                            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                            gap: 6,
                        }}>
                            {[
                                { label: 'Universitet', value: profile.university },
                                { label: 'Fakultet', value: profile.faculty },
                                { label: 'Mutaxassislik', value: profile.specialty_name },
                                { label: 'Guruh', value: profile.group_name },
                                { label: 'Kurs', value: profile.student_level },
                                { label: 'Semestr', value: profile.semester_name },
                                { label: "Ta'lim shakli", value: profile.education_form },
                                { label: "To'lov", value: profile.payment_form },
                                { label: 'GPA', value: profile.avg_gpa ? `${profile.avg_gpa} / 5.0` : null },
                                { label: 'Holat', value: profile.student_status },
                                { label: "Ta'lim tili", value: profile.education_lang },
                            ].filter(r => r.value).map(row => (
                                <div key={row.label} style={{
                                    padding: '5px 8px', background: 'var(--bg-elevated)', borderRadius: 6,
                                }}>
                                    <div style={{ fontSize: 8, color: T.sub, marginBottom: 1, fontWeight: 600 }}>{row.label}</div>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: '#d4d4e8' }}>{row.value}</div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* ══════════════════════════════════════
                    ⭐ FAOLLIK XARITASI — PROMINENT
                   ══════════════════════════════════════ */}
                <Section
                    icon="🔥" title="Faollik xaritasi" accent={T.ind}
                    delay={.15}
                    right={
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            {/* Stats badges */}
                            {[
                                { label: 'Submissionlar', val: totalSubmissions, col: T.cyan },
                                { label: 'Faol kunlar', val: activeDays, col: T.grn },
                                { label: 'Eng uzun streak', val: `${maxStreak} kun`, col: T.amb },
                            ].map((s, i) => (
                                <div key={i} style={{
                                    display: 'flex', alignItems: 'center', gap: 4,
                                    padding: '3px 8px', borderRadius: 5,
                                    background: `${s.col}08`, border: `1px solid ${s.col}16`,
                                }}>
                                    <M ch={s.val} col={s.col} sz={10} w={700} />
                                    <M ch={s.label} sz={7} />
                                </div>
                            ))}
                            <M ch={`${new Date().getFullYear()} yil`} sz={8} />
                        </div>
                    }
                    style={{ marginBottom: 10 }}
                >
                    <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
                        <div style={{ display: 'flex', gap: 2, minWidth: 'max-content' }}>
                            {/* Day labels */}
                            <div style={{
                                display: 'flex', flexDirection: 'column', gap: 3,
                                justifyContent: 'center', paddingTop: 16, paddingRight: 6,
                            }}>
                                {['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'].map((d, i) => (
                                    i % 2 === 0 ? <M key={d} ch={d} sz={7} /> : <div key={d} style={{ height: 10 }} />
                                ))}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {/* Month labels */}
                                <div style={{
                                    display: 'flex', justifyContent: 'space-between',
                                    paddingLeft: 2, marginBottom: 2,
                                }}>
                                    {months.map(m => (
                                        <span key={m} style={{
                                            fontFamily: "'IBM Plex Mono',monospace",
                                            fontSize: 8, fontWeight: 600, color: T.sub,
                                        }}>{m}</span>
                                    ))}
                                </div>

                                {/* Grid */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(53, 1fr)', gap: 2 }}>
                                    {Array.from({ length: 53 }).map((_, colIndex) => (
                                        <div key={colIndex} style={{ display: 'grid', gridTemplateRows: 'repeat(7, 1fr)', gap: 2 }}>
                                            {Array.from({ length: 7 }).map((_, rowIndex) => {
                                                const dayIndex = colIndex * 7 + rowIndex;
                                                const dayData = heatmap[dayIndex] || null;

                                                if (!dayData) return <div key={rowIndex} style={{ width: 11, height: 11, background: 'transparent' }} />;

                                                let bg = 'var(--bg-elevated)';
                                                if (dayData.count === 1) bg = 'rgba(99,102,241,0.25)';
                                                else if (dayData.count === 2) bg = 'rgba(99,102,241,0.45)';
                                                else if (dayData.count === 3) bg = 'rgba(99,102,241,0.65)';
                                                else if (dayData.count >= 4) bg = 'rgba(99,102,241,0.90)';

                                                return (
                                                    <div
                                                        key={rowIndex}
                                                        className="hm-cell"
                                                        style={{
                                                            width: 11, height: 11, borderRadius: 3, background: bg,
                                                            boxShadow: dayData.count >= 4 ? `0 0 4px rgba(99,102,241,0.4)` : 'none',
                                                        }}
                                                        onMouseEnter={(e) => handleMouseMove(e, `${dayData.date}: ${dayData.count} ta submission`)}
                                                        onMouseLeave={handleMouseLeave}
                                                    />
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Legend */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 8 }}>
                        <M ch="Kam" sz={8} />
                        {['var(--bg-elevated)', 'rgba(99,102,241,0.25)', 'rgba(99,102,241,0.45)', 'rgba(99,102,241,0.65)', 'rgba(99,102,241,0.90)'].map((bg, i) => (
                            <div key={i} style={{ width: 11, height: 11, borderRadius: 3, background: bg }} />
                        ))}
                        <M ch="Ko'p" sz={8} />
                    </div>
                </Section>

                {/* ══════════════════════════════════════
                    ⭐ MASALALAR XARITASI — PROMINENT
                   ══════════════════════════════════════ */}
                <Section
                    icon="🗺️" title="Masalalar xaritasi" accent={T.grn}
                    delay={.2}
                    right={
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            {[
                                { label: 'Yechilgan', val: solvedCount, col: T.grn },
                                { label: 'Urinilgan', val: attemptedCount || wrongCount, col: T.amb },
                            ].map((s, i) => (
                                <div key={i} style={{
                                    display: 'flex', alignItems: 'center', gap: 3,
                                    padding: '3px 8px', borderRadius: 5,
                                    background: `${s.col}08`, border: `1px solid ${s.col}16`,
                                }}>
                                    <M ch={s.val} col={s.col} sz={10} w={700} />
                                    <M ch={s.label} sz={7} />
                                </div>
                            ))}
                            <div style={{
                                padding: '3px 8px', borderRadius: 5,
                                background: `${T.ind}10`, border: `1px solid ${T.ind}22`,
                            }}>
                                <M ch={`${profile.solved_count} / ${profile.total_problems}`} col={T.ind} sz={9} w={700} />
                            </div>
                        </div>
                    }
                    style={{ marginBottom: 10, marginTop: 10 }}
                >
                    {/* Problem grid */}
                    <div style={{
                        display: 'flex', flexWrap: 'wrap', gap: 5,
                        padding: '4px 0',
                    }}>
                        {problemMap.map((p) => {
                            const st = getStatusColor(p.status);
                            return (
                                <div
                                    key={p.slug}
                                    className="pm-chip"
                                    onClick={() => navigate(`/problems/${p.slug}`)}
                                    style={{
                                        height: 28, padding: '0 10px', borderRadius: 6,
                                        fontSize: 10, fontWeight: 700, cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: st.bg, color: st.color, border: st.border,
                                    }}
                                    onMouseEnter={(e) => handleMouseMove(e, `${p.slug}: ${p.title}`)}
                                    onMouseLeave={handleMouseLeave}
                                >{p.slug}</div>
                            );
                        })}
                        {problemMap.length === 0 && <M ch="Masalalar topilmadi" sz={10} />}
                    </div>

                    {/* Legend */}
                    <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                        {[
                            { color: '#10b981', label: 'Yechilgan' },
                            { color: '#ef4444', label: 'Wrong' },
                            { color: '#f59e0b', label: 'Urinilgan' },
                            { color: T.sub, label: 'Yangi' },
                        ].map((l, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.color }} />
                                <M ch={l.label} sz={8} />
                            </div>
                        ))}
                    </div>
                </Section>

                {/* ══════════════════════════════════════
                    📝 SO'NGGI SUBMISSIONLAR — COLLAPSIBLE
                   ══════════════════════════════════════ */}
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: .3 }}
                    style={{
                        background: T.surf, border: `1px solid ${T.b}`,
                        borderRadius: 12, overflow: 'hidden',
                        marginTop: 10,
                        position: 'relative',
                    }}
                >
                    {/* Top accent */}
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                        background: `linear-gradient(90deg,transparent,${T.pur}50,transparent)`,
                    }} />

                    {/* Toggle header */}
                    <motion.button
                        onClick={() => setShowSubs(v => !v)}
                        style={{
                            width: '100%', display: 'flex', alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 16px',
                            background: showSubs
                                ? `linear-gradient(90deg,${T.pur}06,transparent)`
                                : 'transparent',
                            border: 'none', cursor: 'pointer',
                            borderBottom: showSubs ? `1px solid ${T.b}` : 'none',
                            transition: 'background .2s',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 16, lineHeight: 1, filter: `drop-shadow(0 0 4px ${T.pur}40)` }}>📝</span>
                            <span style={{
                                fontFamily: "'Syne',sans-serif",
                                fontSize: 13, fontWeight: 800, color: T.text,
                            }}>So'nggi submissionlar</span>
                            {/* Count badge */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 3,
                                padding: '2px 7px', borderRadius: 10,
                                background: `${T.pur}10`, border: `1px solid ${T.pur}22`,
                            }}>
                                <M ch={subCount} col={T.pur} sz={9} w={700} />
                                <M ch="ta" sz={7} />
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Link
                                to={`/status?username=${username}`}
                                onClick={e => e.stopPropagation()}
                                style={{
                                    fontFamily: "'IBM Plex Mono',monospace",
                                    fontSize: 8, fontWeight: 600, color: T.ind,
                                    textDecoration: 'none',
                                }}
                            >
                                Barchasini ko'rish →
                            </Link>
                            {/* Toggle arrow */}
                            <motion.span
                                animate={{ rotate: showSubs ? 180 : 0 }}
                                transition={{ duration: .2 }}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                    width: 22, height: 22, borderRadius: 6,
                                    background: showSubs ? `${T.pur}12` : 'var(--bg-elevated)',
                                    border: `1px solid ${showSubs ? T.pur + '30' : T.b}`,
                                    color: showSubs ? T.pur : T.sub,
                                    fontSize: 10, fontWeight: 700,
                                }}
                            >▼</motion.span>
                        </div>
                    </motion.button>

                    {/* Collapsible content */}
                    <AnimatePresence>
                        {showSubs && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: .25, ease: 'easeInOut' }}
                                style={{ overflow: 'hidden' }}
                            >
                                {/* Table header */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '90px 1fr 80px 70px 60px',
                                    padding: '6px 14px',
                                    background: `linear-gradient(90deg,rgba(99,102,241,.04),transparent)`,
                                    borderBottom: `1px solid ${T.b}`,
                                }}>
                                    {['VAQT', 'MASALA', 'STATUS', 'TIL', 'VAQT'].map((h, i) => (
                                        <span key={i} style={{
                                            fontFamily: "'IBM Plex Mono',monospace",
                                            fontSize: 7, fontWeight: 700, color: T.sub,
                                            letterSpacing: '.08em',
                                        }}>{h}</span>
                                    ))}
                                </div>

                                {(!profile.recent_submissions || profile.recent_submissions.length === 0) ? (
                                    <div style={{ padding: '24px 14px', textAlign: 'center' }}>
                                        <M ch="Hali submissionlar yo'q" sz={10} />
                                    </div>
                                ) : (
                                    profile.recent_submissions.map((sub, i) => (
                                        <div
                                            key={sub.id}
                                            className="sub-row"
                                            onClick={() => navigate(`/problems/${sub.problem_slug}`)}
                                            style={{
                                                display: 'grid',
                                                gridTemplateColumns: '90px 1fr 80px 70px 60px',
                                                padding: '0 14px', height: 34, alignItems: 'center',
                                                borderBottom: i < profile.recent_submissions.length - 1
                                                    ? `1px solid var(--bg-elevated)` : 'none',
                                                background: sub.status?.toLowerCase() === 'accepted'
                                                    ? 'rgba(0,230,118,.015)' : 'transparent',
                                            }}
                                        >
                                            <M ch={formatDate(sub.created_at)} sz={9} />
                                            <div style={{
                                                fontSize: 11, fontWeight: 600, color: T.text,
                                                overflow: 'hidden', textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap', paddingRight: 8,
                                            }}>
                                                <M ch={sub.problem_slug} col={T.sub} sz={9} />
                                                {' '}
                                                <span style={{ color: '#b0b4d8' }}>{sub.problem_title}</span>
                                            </div>
                                            <SBadge status={sub.status} />
                                            <LBadge lang={sub.language} />
                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                                                {sub.time_used ? (
                                                    <>
                                                        <M ch={sub.time_used} col={sub.time_used > 900 ? T.amb : T.text} sz={10} w={600} />
                                                        <M ch="ms" sz={7} />
                                                    </>
                                                ) : <M ch="—" sz={10} />}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

            </div>
        </>
    );
}
