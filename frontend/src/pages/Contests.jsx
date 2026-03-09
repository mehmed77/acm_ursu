import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
   STATUS CONFIG
   ═══════════════════════════════════════════════════ */
const SC = {
    upcoming: {
        label: 'KUTILMOQDA', color: T.amb,
        bg: 'rgba(255,179,0,0.09)', bd: 'rgba(255,179,0,0.22)',
        glow: 'rgba(255,179,0,0.3)',
        topBar: `linear-gradient(90deg,transparent,rgba(255,179,0,0.6),transparent)`,
        orb: 'rgba(255,179,0,0.08)',
    },
    running: {
        label: 'LIVE', color: T.grn,
        bg: 'rgba(0,230,118,0.09)', bd: 'rgba(0,230,118,0.22)',
        glow: 'rgba(0,230,118,0.35)',
        topBar: `linear-gradient(90deg,transparent,rgba(0,230,118,0.7),transparent)`,
        orb: 'rgba(0,230,118,0.09)',
        dot: true,
    },
    frozen: {
        label: 'FROZEN', color: T.blue,
        bg: 'rgba(59,130,246,0.09)', bd: 'rgba(59,130,246,0.22)',
        glow: 'rgba(59,130,246,0.3)',
        topBar: `linear-gradient(90deg,transparent,rgba(59,130,246,0.6),transparent)`,
        orb: 'rgba(59,130,246,0.07)',
    },
    finished: {
        label: 'TUGADI', color: T.sub,
        bg: 'rgba(68,68,106,0.09)', bd: 'rgba(68,68,106,0.2)',
        glow: 'rgba(68,68,106,0.2)',
        topBar: `linear-gradient(90deg,transparent,rgba(68,68,106,0.4),transparent)`,
        orb: 'rgba(68,68,106,0.05)',
    },
    draft: {
        label: 'DRAFT', color: T.sub,
        bg: 'rgba(68,68,106,0.07)', bd: 'rgba(68,68,106,0.15)',
        glow: 'transparent',
        topBar: 'transparent',
        orb: 'transparent',
    },
};

const TYPE_CFG = {
    icpc: { label: 'ICPC', color: '#818cf8', bg: 'rgba(99,102,241,0.10)', bd: 'rgba(99,102,241,0.22)' },
    rated: { label: 'RATED', color: T.pur, bg: 'rgba(168,85,247,0.10)', bd: 'rgba(168,85,247,0.22)' },
    virtual: { label: 'VIRTUAL', color: T.teal, bg: 'rgba(20,184,166,0.10)', bd: 'rgba(20,184,166,0.22)' },
    unrated: { label: 'UNRATED', color: T.sub, bg: 'rgba(68,68,106,0.10)', bd: 'rgba(68,68,106,0.18)' },
};

const FILTERS = [
    { key: 'all', label: 'Barchasi' },
    { key: 'running', label: 'Live' },
    { key: 'upcoming', label: 'Kutilmoqda' },
    { key: 'finished', label: 'Tugagan' },
];

/* ═══════════════════════════════════════════════════
   GLOBAL CSS
   ═══════════════════════════════════════════════════ */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=IBM+Plex+Mono:wght@400;500;600;700&family=DM+Sans:wght@400;500;600&display=swap');
  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
  :root { color-scheme:dark; }

  @keyframes scan-v {
    0%   { transform:translateY(-100%); opacity:0; }
    5%   { opacity:.045; }
    95%  { opacity:.045; }
    100% { transform:translateY(110vh); opacity:0; }
  }
  @keyframes scan-h {
    0%   { transform:translateX(-100%); opacity:0; }
    6%   { opacity:.025; }
    94%  { opacity:.025; }
    100% { transform:translateX(110vw); opacity:0; }
  }
  @keyframes shimmer {
    0%   { background-position:-200% 0; }
    100% { background-position:200% 0; }
  }
  @keyframes ring-ping {
    0%   { transform:scale(1);   opacity:.8; }
    100% { transform:scale(2.6); opacity:0; }
  }
  @keyframes pulse-slow {
    0%,100% { opacity:1; }
    50%     { opacity:.35; }
  }
  @keyframes spin { to { transform:rotate(360deg); } }
  @keyframes live-border {
    0%,100% { opacity:.5; }
    50%     { opacity:1; }
  }
  @keyframes countdown-tick {
    0%  { transform:translateY(3px); opacity:0; }
    20% { transform:translateY(0);   opacity:1; }
    80% { transform:translateY(0);   opacity:1; }
    100%{ transform:translateY(-3px);opacity:0; }
  }
  @keyframes card-glow-in {
    from { box-shadow:0 8px 32px rgba(0,0,0,0.4); }
  }
  @keyframes float-trophy {
    0%,100% { transform:translateY(0) rotate(-3deg); }
    50%     { transform:translateY(-10px) rotate(3deg); }
  }
  @keyframes progress-pulse {
    0%,100% { opacity:.7; }
    50%     { opacity:1; }
  }
  @keyframes hero-orb {
    0%,100% { transform:translate(-50%,-50%) scale(1); }
    33%     { transform:translate(-45%,-55%) scale(1.08); }
    66%     { transform:translate(-55%,-45%) scale(.94); }
  }

  .skel {
    border-radius:5px;
    background:linear-gradient(90deg,
      rgba(255,255,255,.03) 25%,
      rgba(255,255,255,.07) 50%,
      rgba(255,255,255,.03) 75%);
    background-size:200% 100%;
    animation:shimmer 1.6s ease-in-out infinite;
  }

  ::-webkit-scrollbar       { width:3px; height:3px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:rgba(255,255,255,.06); border-radius:4px; }
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

/* Format date */
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
            borderRadius: 18, padding: '24px',
            display: 'flex', flexDirection: 'column', gap: 14,
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div className="skel" style={{ width: 70, height: 22 }} />
                <div className="skel" style={{ width: 80, height: 22 }} />
            </div>
            <div className="skel" style={{ width: '80%', height: 20 }} />
            <div className="skel" style={{ width: '55%', height: 16 }} />
            <div style={{ height: 1, background: T.b }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[...Array(4)].map((_, i) => <div key={i} className="skel" style={{ height: 14 }} />)}
            </div>
            <div style={{ height: 1, background: T.b }} />
            <div className="skel" style={{ height: 38, borderRadius: 10 }} />
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   CONTEST CARD
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * .07, duration: .35, ease: [.4, 0, .2, 1] }}
            style={{
                position: 'relative', overflow: 'hidden',
                background: T.surf,
                border: `1px solid ${isLive ? sc.bd : T.b}`,
                borderRadius: 18,
                display: 'flex', flexDirection: 'column',
                boxShadow: isLive
                    ? `0 8px 40px ${sc.glow}, 0 0 0 1px ${sc.bd}`
                    : '0 8px 32px rgba(0,0,0,0.35)',
                transition: 'border-color .2s, box-shadow .25s, transform .22s',
                animation: isLive ? 'live-border 3s ease-in-out infinite' : 'none',
            }}
            whileHover={{
                y: -6, scale: 1.012,
                boxShadow: `0 20px 60px ${sc.glow}, 0 0 0 1px ${sc.bd}`,
                borderColor: sc.bd,
            }}
        >
            {/* Top accent line */}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                background: sc.topBar, borderRadius: '18px 18px 0 0',
            }} />

            {/* Background corner orb */}
            <div style={{
                position: 'absolute', top: -40, right: -40,
                width: 180, height: 180, borderRadius: '50%',
                background: `radial-gradient(circle,${sc.orb},transparent 70%)`,
                pointerEvents: 'none',
            }} />

            {/* ── Card Header ── */}
            <div style={{ padding: '24px 22px 0', flexGrow: 1 }}>

                {/* Badges row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                    {/* Left chips */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {/* Type */}
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', height: 22,
                            padding: '0 9px', borderRadius: 6,
                            background: tc.bg, border: `1px solid ${tc.bd}`,
                        }}>
                            <M ch={tc.label} col={tc.color} sz={9} w={700} />
                        </div>
                        {/* Rated chip */}
                        {contest.is_rated && (
                            <div style={{
                                display: 'inline-flex', alignItems: 'center', height: 22,
                                padding: '0 9px', borderRadius: 6,
                                background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)',
                            }}>
                                <M ch="RATED" col={T.pur} sz={9} w={700} />
                            </div>
                        )}
                        {/* Team chip */}
                        {contest.is_team && (
                            <div style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4, height: 22,
                                padding: '0 9px', borderRadius: 6,
                                background: 'rgba(255,179,0,0.08)', border: '1px solid rgba(255,179,0,0.2)',
                            }}>
                                <span style={{ fontSize: 9 }}>👥</span>
                                <M ch="TEAM" col={T.amb} sz={9} w={700} />
                            </div>
                        )}
                    </div>

                    {/* Status badge */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 7,
                        height: 26, padding: '0 10px', borderRadius: 7,
                        background: sc.bg, border: `1px solid ${sc.bd}`,
                        flexShrink: 0,
                    }}>
                        {sc.dot && <LiveDot color={sc.color} size={6} />}
                        <M ch={sc.label} col={sc.color} sz={10} w={700} />
                    </div>
                </div>

                {/* Title */}
                <Link to={`/contests/${contest.slug}`} style={{ textDecoration: 'none', display: 'block', marginBottom: 14 }}>
                    <h3 style={{
                        fontFamily: "'Syne',sans-serif",
                        fontSize: 18, fontWeight: 800, color: T.text,
                        lineHeight: 1.3, margin: 0,
                        letterSpacing: '-.02em',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        transition: 'color .15s',
                    }}
                        onMouseEnter={e => { e.currentTarget.style.color = sc.color; e.currentTarget.style.textShadow = `0 0 20px ${sc.color}44`; }}
                        onMouseLeave={e => { e.currentTarget.style.color = T.text; e.currentTarget.style.textShadow = 'none'; }}
                    >{contest.title}</h3>
                </Link>

                {/* Countdown block */}
                <AnimatePresence>
                    {countdown && (
                        <motion.div
                            initial={{ opacity: 0, scale: .95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: .95 }}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: 10,
                                padding: '8px 14px', borderRadius: 10, marginBottom: 16,
                                background: isLive
                                    ? `rgba(0,230,118,0.07)`
                                    : `rgba(255,179,0,0.07)`,
                                border: isLive
                                    ? '1px solid rgba(0,230,118,0.15)'
                                    : '1px solid rgba(255,179,0,0.15)',
                            }}
                        >
                            <span style={{ fontSize: 13 }}>{isLive ? '🔥' : '⌛'}</span>
                            <div>
                                <div style={{
                                    fontFamily: "'DM Sans',sans-serif", fontSize: 10,
                                    color: T.sub, marginBottom: 1
                                }}>
                                    {isLive ? 'Tugashiga:' : 'Boshlanishiga:'}
                                </div>
                                <div style={{
                                    fontFamily: "'IBM Plex Mono',monospace",
                                    fontSize: 17, fontWeight: 700, color: sc.color,
                                    letterSpacing: '.06em', lineHeight: 1,
                                    textShadow: `0 0 16px ${sc.color}55`,
                                }}>
                                    {countdown}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ── Divider ── */}
            <div style={{ height: 1, background: `linear-gradient(90deg,transparent,${T.b},transparent)`, margin: '0 22px' }} />

            {/* ── Meta grid ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 14px', padding: '14px 22px' }}>
                {[
                    { emoji: '📅', label: 'Boshlanish', val: fmtDate(contest.start_time) },
                    { emoji: '⏱', label: 'Davomiylik', val: `${durH}h ${durM}m` },
                    { emoji: '👥', label: 'Ishtirokchilar', val: `${contest.reg_count || 0}` },
                    { emoji: '📝', label: 'Masalalar', val: `${contest.problem_count || 0} ta` },
                ].map((m, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                        <span style={{ fontSize: 12, flexShrink: 0, marginTop: 1 }}>{m.emoji}</span>
                        <div>
                            <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 10, color: T.sub, marginBottom: 1 }}>
                                {m.label}
                            </div>
                            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, fontWeight: 600, color: T.text }}>
                                {m.val}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Registered indicator */}
            {contest.registered && (
                <div style={{
                    margin: '0 22px 12px', display: 'flex', alignItems: 'center', gap: 7,
                    padding: '6px 12px', borderRadius: 7,
                    background: 'rgba(0,230,118,0.06)', border: '1px solid rgba(0,230,118,0.14)'
                }}>
                    <span style={{
                        width: 5, height: 5, borderRadius: '50%', background: T.grn, display: 'inline-block',
                        boxShadow: `0 0 6px ${T.grn}`
                    }} />
                    <M ch="Ro'yxatdan o'tildi" col={T.grn} sz={11} w={600} />
                </div>
            )}

            {/* ── Footer / CTA ── */}
            <div style={{
                padding: '14px 22px 20px',
                borderTop: `1px solid rgba(255,255,255,0.035)`,
                display: 'flex', gap: 10,
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
                            label="🚀 Musobaqaga kirish"
                            onClick={() => navigate(`/contests/${contest.slug}`)}
                            variant="primary"
                            glow={sc.color}
                        />
                    ) : (
                        <div style={{
                            flex: 1, height: 40, borderRadius: 10,
                            background: 'rgba(0,230,118,0.07)', border: '1px solid rgba(0,230,118,0.18)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                        }}>
                            <span style={{ fontSize: 13 }}>✅</span>
                            <M ch="Ro'yxatdan o'tildi" col={T.grn} sz={12} w={700} />
                        </div>
                    )
                ) : (
                    <CTA
                        label={isLive ? '⚡ Kirish' : '✨ Ro\'yxatdan o\'tish'}
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
function CTA({ label, onClick, variant = 'primary', glow, fullWidth }) {
    const styles = {
        primary: {
            background: `linear-gradient(135deg,${T.ind},#7c3aed)`,
            border: 'none', color: 'white',
            shadow: `0 0 20px rgba(99,102,241,0.35)`,
            shadowHover: `0 0 32px rgba(99,102,241,0.6)`,
        },
        green: {
            background: `linear-gradient(135deg,${T.grn},${T.teal})`,
            border: 'none', color: '#03030b',
            shadow: `0 0 18px rgba(0,230,118,0.3)`,
            shadowHover: `0 0 28px rgba(0,230,118,0.5)`,
        },
        teal: {
            background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.3)',
            color: T.teal, shadow: 'none', shadowHover: `0 0 18px rgba(20,184,166,0.25)`,
        },
        ghost: {
            background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.b}`,
            color: T.sub, shadow: 'none', shadowHover: 'rgba(255,255,255,0.08)',
        },
    };
    const s = styles[variant] || styles.primary;

    return (
        <motion.button
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: .96 }}
            onClick={onClick}
            style={{
                flex: fullWidth ? 1 : undefined,
                height: 40, padding: '0 18px', borderRadius: 10,
                background: s.background, border: s.border || 'none',
                color: s.color, fontSize: 13, fontWeight: 700,
                cursor: 'pointer', fontFamily: "'DM Sans',sans-serif",
                boxShadow: s.shadow, transition: 'box-shadow .18s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = s.shadowHover; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = s.shadow; }}
        >{label}</motion.button>
    );
}

/* ═══════════════════════════════════════════════════
   STATS BAR
   ═══════════════════════════════════════════════════ */
function StatsBar({ contests }) {
    const live = contests.filter(c => c.status === 'running').length;
    const upcoming = contests.filter(c => c.status === 'upcoming').length;
    const total = contests.length;
    const players = contests.reduce((a, c) => a + (c.reg_count || 0), 0);

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: .2 }}
            style={{
                display: 'flex', gap: 1, marginBottom: 32, overflow: 'hidden',
                borderRadius: 14, border: `1px solid ${T.b}`,
                background: T.surf,
            }}
        >
            {[
                { val: live, label: 'Live', color: T.grn, icon: '🔴' },
                { val: upcoming, label: 'Kutilmoqda', color: T.amb, icon: '⌛' },
                { val: total, label: 'Jami', color: T.cyan, icon: '🏁' },
                { val: players, label: 'Ishtirokchilar', color: T.pur, icon: '👥' },
            ].map((s, i, arr) => (
                <div key={i} style={{
                    flex: 1, padding: '14px 16px',
                    borderRight: i < arr.length - 1 ? `1px solid ${T.b}` : 'none',
                    position: 'relative', overflow: 'hidden',
                }}>
                    <div style={{
                        position: 'absolute', top: -10, right: -10,
                        width: 60, height: 60, borderRadius: '50%',
                        background: `radial-gradient(circle,${s.color}12,transparent 70%)`,
                        pointerEvents: 'none',
                    }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                        <span style={{ fontSize: 12 }}>{s.icon}</span>
                        <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 10, color: T.sub, textTransform: 'uppercase', letterSpacing: '.08em' }}>
                            {s.label}
                        </span>
                    </div>
                    <div style={{
                        fontFamily: "'IBM Plex Mono',monospace",
                        fontSize: 22, fontWeight: 700, color: s.color,
                        textShadow: `0 0 16px ${s.color}44`, lineHeight: 1,
                    }}>{s.val.toLocaleString()}</div>
                </div>
            ))}
        </motion.div>
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

    return (
        <>
            <style>{CSS}</style>

            {/* ── BACKGROUND FX ── */}
            <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
                <div style={{
                    position: 'absolute', left: 0, right: 0, height: '1px',
                    background: `linear-gradient(90deg,transparent 5%,${T.ind}44 40%,${T.cyan}33 60%,transparent 95%)`,
                    animation: 'scan-v 14s linear infinite',
                }} />
                <div style={{
                    position: 'absolute', top: 0, bottom: 0, width: '1px',
                    background: `linear-gradient(180deg,transparent,${T.pur}28,transparent)`,
                    animation: 'scan-h 20s linear 7s infinite',
                }} />
                <div style={{
                    position: 'absolute', inset: 0, opacity: .018,
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.5) 1px,transparent 1px)`,
                    backgroundSize: '52px 52px',
                }} />
                {/* Orbs */}
                <div style={{
                    position: 'absolute', top: '-8%', left: '50%',
                    width: 800, height: 800, borderRadius: '50%',
                    background: `radial-gradient(circle,rgba(99,102,241,0.07),transparent 65%)`,
                    animation: 'hero-orb 18s ease-in-out infinite',
                }} />
                <div style={{
                    position: 'absolute', bottom: '10%', right: '5%',
                    width: 400, height: 400, borderRadius: '50%',
                    background: `radial-gradient(circle,${T.grn}06,transparent 65%)`,
                }} />
            </div>

            <div style={{
                position: 'relative', zIndex: 1,
                maxWidth: 1240, margin: '0 auto',
                padding: '44px 24px 80px',
                fontFamily: "'DM Sans',sans-serif", color: T.text,
                minHeight: '100vh',
            }}>

                {/* ── HERO HEADER ── */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: .45, ease: [.4, 0, .2, 1] }}
                    style={{ textAlign: 'center', marginBottom: 44 }}
                >
                    {/* Floating trophy */}
                    <motion.div
                        animate={{ y: [0, -10, 0], rotate: [-3, 3, -3] }}
                        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                        style={{
                            fontSize: 52, marginBottom: 18, display: 'inline-block',
                            filter: 'drop-shadow(0 0 24px rgba(99,102,241,0.5))',
                        }}
                    >🏆</motion.div>

                    {/* Label pill */}
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 9,
                        padding: '5px 16px', borderRadius: 100, marginBottom: 14,
                        background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.22)',
                    }}>
                        {liveContests.length > 0 && <LiveDot size={6} />}
                        <M ch={liveContests.length > 0 ? `${liveContests.length} ta musobaqa LIVE` : 'MUSOBAQALAR'} col={liveContests.length > 0 ? T.grn : T.ind} sz={10} w={700} />
                    </div>

                    <h1 style={{
                        fontFamily: "'Syne',sans-serif",
                        fontSize: 'clamp(34px,5vw,50px)',
                        fontWeight: 800, letterSpacing: '-.04em',
                        lineHeight: 1, margin: '0 0 14px',
                    }}>
                        <span style={{
                            background: `linear-gradient(90deg,#fff 0%,${T.ind} 45%,${T.cyan} 75%,${T.grn})`,
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            filter: `drop-shadow(0 0 28px rgba(99,102,241,0.3))`,
                        }}>
                            Musobaqalar
                        </span>
                    </h1>

                    <p style={{
                        fontSize: 14, color: T.sub, maxWidth: 520, margin: '0 auto',
                        lineHeight: 1.7, letterSpacing: '.01em',
                    }}>
                        Qobiliyatingizni sinang · Reyting oling · Global top ga kiring
                    </p>
                </motion.div>

                {/* ── STATS BAR ── */}
                {!loading && <StatsBar contests={contests} />}

                {/* ── FILTER TABS ── */}
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: .15 }}
                    style={{
                        display: 'flex', gap: 4, marginBottom: 28,
                        background: T.surf, border: `1px solid ${T.b}`,
                        borderRadius: 12, padding: 5, width: 'fit-content',
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
                                    display: 'flex', alignItems: 'center', gap: 7,
                                    height: 34, padding: '0 16px', borderRadius: 9,
                                    background: active
                                        ? `linear-gradient(135deg,${T.ind}22,${T.cyan}12)`
                                        : 'transparent',
                                    border: active ? `1px solid ${T.ind}35` : '1px solid transparent',
                                    color: active ? T.cyan : T.sub,
                                    fontSize: 12, fontWeight: active ? 700 : 500, cursor: 'pointer',
                                    fontFamily: "'DM Sans',sans-serif", transition: 'all .15s',
                                    boxShadow: active ? `0 0 16px ${T.ind}18` : 'none',
                                }}
                            >
                                {f.label}
                                {count > 0 && (
                                    <span style={{
                                        height: 17, minWidth: 17, borderRadius: 100,
                                        padding: '0 5px',
                                        background: active ? T.ind : 'rgba(255,255,255,0.07)',
                                        color: active ? '#fff' : T.sub,
                                        fontSize: 9, fontWeight: 800,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontFamily: "'IBM Plex Mono',monospace",
                                    }}>{count}</span>
                                )}
                            </motion.button>
                        );
                    })}
                </motion.div>

                {/* ── LIVE BANNER (if any) ── */}
                <AnimatePresence>
                    {liveContests.length > 0 && filter !== 'finished' && (
                        <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 12,
                                padding: '12px 18px', borderRadius: 12, marginBottom: 20,
                                background: 'rgba(0,230,118,0.06)',
                                border: '1px solid rgba(0,230,118,0.18)',
                                borderLeft: `3px solid ${T.grn}`,
                            }}
                        >
                            <LiveDot size={8} />
                            <div>
                                <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 700, color: T.grn }}>
                                    {liveContests.length} ta musobaqa hozir davom etmoqda
                                </span>
                                <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: T.sub, marginLeft: 10 }}>
                                    Hoziroq qo'shiling!
                                </span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── GRID ── */}
                {loading ? (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill,minmax(360px,1fr))',
                        gap: 22,
                    }}>
                        {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                ) : filtered.length === 0 ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        style={{ textAlign: 'center', padding: '90px 20px' }}>
                        <motion.div
                            animate={{ y: [0, -8, 0] }}
                            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                            style={{ fontSize: 52, marginBottom: 18, display: 'inline-block', filter: 'grayscale(.4)' }}
                        >🏜️</motion.div>
                        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 700, color: T.sub }}>
                            Musobaqa topilmadi
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        layout
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill,minmax(360px,1fr))',
                            gap: 22,
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
