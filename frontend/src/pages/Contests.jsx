import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
    org: '#f97316',
    teal: '#14b8a6',
    blue: '#3b82f6',
};

/* ═══════════════════════════════════════════════════
   STATUS CONFIG
   ═══════════════════════════════════════════════════ */
const SC = {
    upcoming: {
        label: 'KUTILMOQDA', color: T.amb,
        bg: 'rgba(255,179,0,0.08)', bd: 'rgba(255,179,0,0.18)',
        glow: 'rgba(255,179,0,0.25)',
        topBar: `linear-gradient(90deg,transparent,rgba(255,179,0,0.5),transparent)`,
    },
    running: {
        label: 'LIVE', color: T.grn,
        bg: 'rgba(0,230,118,0.08)', bd: 'rgba(0,230,118,0.2)',
        glow: 'rgba(0,230,118,0.3)',
        topBar: `linear-gradient(90deg,transparent,rgba(0,230,118,0.6),transparent)`,
        dot: true,
    },
    frozen: {
        label: 'FROZEN', color: T.blue,
        bg: 'rgba(59,130,246,0.08)', bd: 'rgba(59,130,246,0.2)',
        glow: 'rgba(59,130,246,0.25)',
        topBar: `linear-gradient(90deg,transparent,rgba(59,130,246,0.5),transparent)`,
    },
    finished: {
        label: 'TUGADI', color: T.sub,
        bg: 'rgba(120,120,160,0.06)', bd: 'rgba(120,120,160,0.14)',
        glow: 'rgba(120,120,160,0.12)',
        topBar: `linear-gradient(90deg,transparent,rgba(120,120,160,0.3),transparent)`,
    },
    draft: {
        label: 'DRAFT', color: T.sub,
        bg: 'rgba(120,120,160,0.05)', bd: 'rgba(120,120,160,0.1)',
        glow: 'transparent', topBar: 'transparent',
    },
};

const TYPE_CFG = {
    icpc:     { label: 'ICPC',     color: '#818cf8', bg: 'rgba(99,102,241,0.10)', bd: 'rgba(99,102,241,0.20)' },
    rated:    { label: 'RATED',    color: T.pur,     bg: 'rgba(168,85,247,0.10)', bd: 'rgba(168,85,247,0.20)' },
    virtual:  { label: 'VIRTUAL',  color: T.teal,    bg: 'rgba(20,184,166,0.10)', bd: 'rgba(20,184,166,0.20)' },
    unrated:  { label: 'UNRATED',  color: T.sub,     bg: 'rgba(120,120,160,0.08)', bd: 'rgba(120,120,160,0.14)' },
};

const FILTERS = [
    { key: 'all',      label: 'Barchasi' },
    { key: 'running',  label: 'Live' },
    { key: 'upcoming', label: 'Kutilmoqda' },
    { key: 'finished', label: 'Tugagan' },
];

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
    0%   { transform:scale(1);   opacity:.8; }
    100% { transform:scale(2.4); opacity:0; }
  }
  @keyframes pulse-slow {
    0%,100% { opacity:1; }
    50%     { opacity:.35; }
  }
  @keyframes live-border {
    0%,100% { opacity:.5; }
    50%     { opacity:1; }
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

  .contest-card-wrap {
    transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
  }
  .contest-card-wrap:hover {
    transform: translateY(-3px) scale(1.005);
  }
`;

/* ═══════════════════════════════════════════════════
   MICRO COMPONENTS
   ═══════════════════════════════════════════════════ */
function Mono({ ch, col = T.sub, sz = 11, w = 500 }) {
    return (
        <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: sz, fontWeight: w, color: col, lineHeight: 1 }}>
            {ch}
        </span>
    );
}

function LiveDot({ color = T.grn, size = 6 }) {
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

/* Countdown hook */
function useCountdown(target) {
    const [left, setLeft] = useState('');
    useEffect(() => {
        if (!target) return;
        const tick = () => {
            const diff = new Date(target) - Date.now();
            if (diff <= 0) { setLeft(''); return; }
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            setLeft(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [target]);
    return left;
}

function fmtDate(d) {
    return new Date(d).toLocaleString('uz-UZ', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
}

/* ═══════════════════════════════════════════════════
   SKELETON CARD
   ═══════════════════════════════════════════════════ */
function SkeletonCard() {
    return (
        <div style={{
            background: T.surf, border: `1px solid ${T.b}`,
            borderRadius: 14, padding: 16,
            display: 'flex', flexDirection: 'column', gap: 10,
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div className="skel" style={{ width: 60, height: 18 }} />
                <div className="skel" style={{ width: 70, height: 18 }} />
            </div>
            <div className="skel" style={{ width: '75%', height: 16 }} />
            <div className="skel" style={{ width: '50%', height: 13 }} />
            <div style={{ display: 'flex', gap: 16 }}>
                {[...Array(4)].map((_, i) => <div key={i} className="skel" style={{ flex: 1, height: 12 }} />)}
            </div>
            <div className="skel" style={{ height: 34, borderRadius: 8 }} />
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   CONTEST CARD — Compact Premium
   ═══════════════════════════════════════════════════ */
function ContestCard({ contest, onRegister, idx }) {
    const sc = SC[contest.status] || SC.draft;
    const tc = TYPE_CFG[contest.contest_type] || TYPE_CFG.unrated;
    const navigate = useNavigate();
    const isLive = contest.status === 'running' || contest.status === 'frozen';

    const countdownTarget = contest.status === 'upcoming' ? contest.start_time
        : isLive ? contest.end_time : null;
    const countdown = useCountdown(countdownTarget);

    const durH = Math.floor(contest.duration_min / 60);
    const durM = contest.duration_min % 60;

    return (
        <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * .05, duration: .3, ease: [.4, 0, .2, 1] }}
            className="contest-card-wrap"
            style={{
                position: 'relative', overflow: 'hidden',
                background: T.surf,
                border: `1px solid ${isLive ? sc.bd : T.b}`,
                borderRadius: 14,
                display: 'flex', flexDirection: 'column',
                boxShadow: isLive
                    ? `0 4px 24px ${sc.glow}, 0 0 0 1px ${sc.bd}`
                    : 'var(--card-shadow)',
                animation: isLive ? 'live-border 3s ease-in-out infinite' : 'none',
            }}
        >
            {/* Top accent line */}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                background: sc.topBar, borderRadius: '14px 14px 0 0',
            }} />

            {/* ── Card Body ── */}
            <div style={{ padding: '14px 16px 0', flexGrow: 1 }}>

                {/* Badges + Status row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                        {/* Type chip */}
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', height: 20,
                            padding: '0 7px', borderRadius: 5,
                            background: tc.bg, border: `1px solid ${tc.bd}`,
                        }}>
                            <Mono ch={tc.label} col={tc.color} sz={9} w={700} />
                        </div>
                        {/* Rated chip */}
                        {contest.is_rated && (
                            <div style={{
                                display: 'inline-flex', alignItems: 'center', height: 20,
                                padding: '0 7px', borderRadius: 5,
                                background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.18)',
                            }}>
                                <Mono ch="RATED" col={T.pur} sz={9} w={700} />
                            </div>
                        )}
                        {/* Team chip */}
                        {contest.is_team && (
                            <div style={{
                                display: 'inline-flex', alignItems: 'center', gap: 3, height: 20,
                                padding: '0 7px', borderRadius: 5,
                                background: 'rgba(255,179,0,0.07)', border: '1px solid rgba(255,179,0,0.16)',
                            }}>
                                <span style={{ fontSize: 8 }}>👥</span>
                                <Mono ch="TEAM" col={T.amb} sz={9} w={700} />
                            </div>
                        )}
                    </div>

                    {/* Status badge */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        height: 22, padding: '0 8px', borderRadius: 5,
                        background: sc.bg, border: `1px solid ${sc.bd}`,
                        flexShrink: 0,
                    }}>
                        {sc.dot && <LiveDot color={sc.color} size={5} />}
                        <Mono ch={sc.label} col={sc.color} sz={9} w={700} />
                    </div>
                </div>

                {/* Title */}
                <Link to={`/contests/${contest.slug}`} style={{ textDecoration: 'none', display: 'block', marginBottom: 10 }}>
                    <h3 style={{
                        fontFamily: "'Syne',sans-serif",
                        fontSize: 16, fontWeight: 700, color: T.text,
                        lineHeight: 1.3, margin: 0,
                        letterSpacing: '-.02em',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        transition: 'color .15s',
                    }}
                        onMouseEnter={e => { e.currentTarget.style.color = sc.color; }}
                        onMouseLeave={e => { e.currentTarget.style.color = T.text; }}
                    >{contest.title}</h3>
                </Link>

                {/* Countdown — compact inline */}
                <AnimatePresence>
                    {countdown && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '5px 10px', borderRadius: 7, marginBottom: 10,
                                background: isLive ? `rgba(0,230,118,0.06)` : `rgba(255,179,0,0.06)`,
                                border: isLive ? '1px solid rgba(0,230,118,0.12)' : '1px solid rgba(255,179,0,0.12)',
                            }}
                        >
                            <span style={{ fontSize: 11 }}>{isLive ? '🔥' : '⌛'}</span>
                            <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 10, color: T.sub }}>
                                {isLive ? 'Tugashiga:' : 'Boshlanishiga:'}
                            </span>
                            <span style={{
                                fontFamily: "'IBM Plex Mono',monospace",
                                fontSize: 13, fontWeight: 700, color: sc.color,
                                letterSpacing: '.04em',
                                textShadow: `0 0 10px ${sc.color}44`,
                            }}>
                                {countdown}
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ── Meta row — horizontal compact ── */}
            <div style={{
                display: 'flex', gap: 0,
                borderTop: `1px solid ${T.b}`,
                borderBottom: `1px solid ${T.b}`,
            }}>
                {[
                    { icon: '📅', label: 'Boshlanish', val: fmtDate(contest.start_time) },
                    { icon: '⏱', label: 'Davomiylik', val: `${durH}h ${durM}m` },
                    { icon: '👥', label: 'Ishtirokchilar', val: `${contest.reg_count || 0}` },
                    { icon: '📝', label: 'Masalalar', val: `${contest.problem_count || 0} ta` },
                ].map((m, i, arr) => (
                    <div key={i} style={{
                        flex: 1, padding: '8px 10px',
                        borderRight: i < arr.length - 1 ? `1px solid ${T.b}` : 'none',
                        textAlign: 'center',
                    }}>
                        <div style={{
                            fontFamily: "'DM Sans',sans-serif", fontSize: 9,
                            color: T.sub, marginBottom: 2, textTransform: 'uppercase',
                            letterSpacing: '.04em',
                        }}>
                            {m.label}
                        </div>
                        <div style={{
                            fontFamily: "'IBM Plex Mono',monospace",
                            fontSize: 11, fontWeight: 600, color: T.text,
                        }}>
                            {m.val}
                        </div>
                    </div>
                ))}
            </div>

            {/* Registered indicator */}
            {contest.registered && contest.status !== 'running' && contest.status !== 'frozen' && (
                <div style={{
                    margin: '8px 16px 0', display: 'flex', alignItems: 'center', gap: 6,
                    padding: '4px 10px', borderRadius: 6,
                    background: 'rgba(0,230,118,0.05)', border: '1px solid rgba(0,230,118,0.12)',
                }}>
                    <span style={{
                        width: 4, height: 4, borderRadius: '50%', background: T.grn, display: 'inline-block',
                        boxShadow: `0 0 5px ${T.grn}`
                    }} />
                    <Mono ch="Ro'yxatdan o'tildi" col={T.grn} sz={10} w={600} />
                </div>
            )}

            {/* ── Footer / CTA ── */}
            <div style={{
                padding: '10px 16px 12px',
                display: 'flex', gap: 8,
            }}>
                {contest.status === 'finished' ? (
                    <>
                        <CTA
                            label="📊 Natijalar"
                            onClick={() => navigate(`/contests/${contest.slug}/scoreboard`)}
                            variant="ghost"
                        />
                        {contest.is_virtual_allowed && !contest.registered && (
                            <CTA
                                label="▶ Virtual"
                                onClick={() => onRegister(contest.slug, true)}
                                variant="teal"
                            />
                        )}
                    </>
                ) : contest.registered ? (
                    isLive ? (
                        <CTA
                            label="🚀 Kirish"
                            onClick={() => navigate(`/contests/${contest.slug}`)}
                            variant="primary"
                            glow={sc.color}
                            fullWidth
                        />
                    ) : (
                        <div style={{
                            flex: 1, height: 34, borderRadius: 8,
                            background: 'rgba(0,230,118,0.06)', border: '1px solid rgba(0,230,118,0.14)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        }}>
                            <span style={{ fontSize: 11 }}>✅</span>
                            <Mono ch="Ro'yxatdan o'tildi" col={T.grn} sz={11} w={700} />
                        </div>
                    )
                ) : (
                    <CTA
                        label={isLive ? '⚡ Kirish' : "✨ Ro'yxatdan o'tish"}
                        onClick={() => onRegister(contest.slug, false)}
                        variant={isLive ? 'green' : 'primary'}
                        glow={sc.color}
                        fullWidth
                    />
                )}
            </div>
        </motion.div>
    );
}

/* CTA button */
function CTA({ label, onClick, variant = 'primary', fullWidth }) {
    const styles = {
        primary: {
            background: `linear-gradient(135deg,${T.ind},#7c3aed)`,
            border: 'none', color: 'white',
            shadow: `0 0 14px rgba(99,102,241,0.3)`,
            shadowHover: `0 0 24px rgba(99,102,241,0.5)`,
        },
        green: {
            background: `linear-gradient(135deg,${T.grn},${T.teal})`,
            border: 'none', color: 'var(--bg-base)',
            shadow: `0 0 12px rgba(0,230,118,0.25)`,
            shadowHover: `0 0 22px rgba(0,230,118,0.45)`,
        },
        teal: {
            background: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.25)',
            color: T.teal, shadow: 'none', shadowHover: `0 0 14px rgba(20,184,166,0.2)`,
        },
        ghost: {
            background: 'var(--bg-elevated)', border: `1px solid ${T.b}`,
            color: T.sub, shadow: 'none', shadowHover: 'none',
        },
    };
    const s = styles[variant] || styles.primary;

    return (
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: .96 }}
            onClick={onClick}
            style={{
                flex: fullWidth ? 1 : undefined,
                height: 34, padding: '0 14px', borderRadius: 8,
                background: s.background, border: s.border || 'none',
                color: s.color, fontSize: 12, fontWeight: 700,
                cursor: 'pointer', fontFamily: "'DM Sans',sans-serif",
                boxShadow: s.shadow, transition: 'box-shadow .18s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = s.shadowHover; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = s.shadow; }}
        >{label}</motion.button>
    );
}

/* ═══════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════ */
export default function Contests() {
    const [contests, setContests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const isAuth = useAuthStore(s => s.isAuthenticated);

    useEffect(() => { document.title = 'Musobaqalar — OnlineJudge'; }, []);

    const fetchContests = useCallback(async () => {
        setLoading(true);
        try {
            const params = filter !== 'all' ? { status: filter } : {};
            const res = await contestsApi.getList(params);
            setContests(res.data);
        } catch { }
        finally { setLoading(false); }
    }, [filter]);

    useEffect(() => { fetchContests(); }, [fetchContests]);

    const handleRegister = async (slug, isVirtual) => {
        if (!isAuth) { window.location.href = '/login'; return; }
        try {
            await contestsApi.register(slug, { is_virtual: isVirtual });
            fetchContests();
        } catch (err) { alert(err.response?.data?.detail || 'Xatolik yuz berdi'); }
    };

    const filtered = filter === 'all' ? contests : contests.filter(c => c.status === filter);
    const liveContests = contests.filter(c => c.status === 'running');
    const upcomingCount = contests.filter(c => c.status === 'upcoming').length;
    const totalPlayers = contests.reduce((a, c) => a + (c.reg_count || 0), 0);

    return (
        <>
            <style>{CSS}</style>

            <div style={{
                position: 'relative', zIndex: 1,
                maxWidth: 1200, margin: '0 auto',
                padding: '20px 20px 60px',
                fontFamily: "'DM Sans',sans-serif", color: T.text,
                minHeight: '100vh',
            }}>

                {/* ── COMPACT HERO ── */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: .35 }}
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        flexWrap: 'wrap', gap: 16,
                        marginBottom: 20,
                        padding: '16px 20px',
                        background: T.surf,
                        border: `1px solid ${T.b}`,
                        borderRadius: 14,
                        position: 'relative', overflow: 'hidden',
                    }}
                >
                    {/* Decorative gradient orb */}
                    <div style={{
                        position: 'absolute', top: -60, right: -40,
                        width: 200, height: 200, borderRadius: '50%',
                        background: `radial-gradient(circle,rgba(99,102,241,0.08),transparent 70%)`,
                        pointerEvents: 'none',
                    }} />

                    {/* Left: Trophy + Title */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative' }}>
                        <motion.span
                            animate={{ rotate: [-3, 3, -3] }}
                            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                            style={{
                                fontSize: 32,
                                filter: 'drop-shadow(0 0 12px rgba(99,102,241,0.4))',
                            }}
                        >🏆</motion.span>
                        <div>
                            <h1 style={{
                                fontFamily: "'Syne',sans-serif",
                                fontSize: 'clamp(22px, 3vw, 30px)',
                                fontWeight: 800, letterSpacing: '-.03em',
                                lineHeight: 1.1, margin: 0,
                            }}>
                                <span style={{
                                    background: `linear-gradient(90deg,${T.text} 0%,${T.ind} 40%,${T.cyan} 70%,${T.grn})`,
                                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                }}>
                                    Musobaqalar
                                </span>
                            </h1>
                            <p style={{
                                fontSize: 12, color: T.sub, margin: '3px 0 0',
                                letterSpacing: '.01em',
                            }}>
                                Qobiliyatingizni sinang · Reyting oling · Global top ga kiring
                            </p>
                        </div>
                    </div>

                    {/* Right: Quick stats pills */}
                    {!loading && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', position: 'relative' }}>
                            {[
                                { val: liveContests.length, label: 'Live', color: T.grn, icon: '🔴', dot: true },
                                { val: upcomingCount, label: 'Kutilmoqda', color: T.amb, icon: '⌛' },
                                { val: contests.length, label: 'Jami', color: T.cyan, icon: '🏁' },
                                { val: totalPlayers, label: 'Ishtirokchilar', color: T.pur, icon: '👥' },
                            ].map((s, i) => (
                                <div key={i} style={{
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    padding: '5px 10px', borderRadius: 8,
                                    background: `${s.color}0a`,
                                    border: `1px solid ${s.color}1a`,
                                }}>
                                    <span style={{ fontSize: 10 }}>{s.icon}</span>
                                    <div>
                                        <div style={{
                                            fontFamily: "'DM Sans',sans-serif", fontSize: 8,
                                            color: T.sub, textTransform: 'uppercase',
                                            letterSpacing: '.06em', lineHeight: 1,
                                        }}>{s.label}</div>
                                        <div style={{
                                            fontFamily: "'IBM Plex Mono',monospace",
                                            fontSize: 14, fontWeight: 700, color: s.color,
                                            lineHeight: 1.1,
                                        }}>{s.val}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>

                {/* ── FILTER TABS + LIVE BANNER ── */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    flexWrap: 'wrap', gap: 10,
                    marginBottom: 16,
                }}>
                    {/* Tabs */}
                    <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: .1 }}
                        style={{
                            display: 'flex', gap: 3,
                            background: T.surf, border: `1px solid ${T.b}`,
                            borderRadius: 10, padding: 3,
                        }}
                    >
                        {FILTERS.map(f => {
                            const active = filter === f.key;
                            const count = f.key === 'all'
                                ? contests.length
                                : contests.filter(c => c.status === f.key).length;

                            return (
                                <motion.button
                                    key={f.key}
                                    whileTap={{ scale: .94 }}
                                    onClick={() => setFilter(f.key)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 6,
                                        height: 30, padding: '0 12px', borderRadius: 7,
                                        background: active
                                            ? `linear-gradient(135deg,${T.ind}20,${T.cyan}10)`
                                            : 'transparent',
                                        border: active ? `1px solid ${T.ind}30` : '1px solid transparent',
                                        color: active ? T.cyan : T.sub,
                                        fontSize: 11, fontWeight: active ? 700 : 500, cursor: 'pointer',
                                        fontFamily: "'DM Sans',sans-serif", transition: 'all .15s',
                                    }}
                                >
                                    {f.label}
                                    {count > 0 && (
                                        <span style={{
                                            height: 16, minWidth: 16, borderRadius: 100,
                                            padding: '0 4px',
                                            background: active ? T.ind : T.b,
                                            color: active ? '#fff' : T.sub,
                                            fontSize: 9, fontWeight: 700,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontFamily: "'IBM Plex Mono',monospace",
                                        }}>{count}</span>
                                    )}
                                </motion.button>
                            );
                        })}
                    </motion.div>

                    {/* Compact live indicator */}
                    <AnimatePresence>
                        {liveContests.length > 0 && filter !== 'finished' && (
                            <motion.div
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '6px 14px', borderRadius: 8,
                                    background: 'rgba(0,230,118,0.05)',
                                    border: '1px solid rgba(0,230,118,0.14)',
                                }}
                            >
                                <LiveDot size={5} />
                                <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, fontWeight: 600, color: T.grn }}>
                                    {liveContests.length} ta musobaqa LIVE
                                </span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* ── GRID ── */}
                {loading ? (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))',
                        gap: 16,
                    }}>
                        {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                ) : filtered.length === 0 ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        style={{ textAlign: 'center', padding: '60px 20px' }}>
                        <motion.div
                            animate={{ y: [0, -6, 0] }}
                            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                            style={{ fontSize: 40, marginBottom: 12, display: 'inline-block', filter: 'grayscale(.4)' }}
                        >🏜️</motion.div>
                        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 700, color: T.sub }}>
                            Musobaqa topilmadi
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        layout
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))',
                            gap: 16,
                        }}
                    >
                        <AnimatePresence mode="popLayout">
                            {filtered.map((c, i) => (
                                <ContestCard
                                    key={c.id}
                                    contest={c}
                                    onRegister={handleRegister}
                                    idx={i}
                                />
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}
            </div>
        </>
    );
}
