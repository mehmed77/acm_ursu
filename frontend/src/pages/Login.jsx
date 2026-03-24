import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, Eye, EyeOff, AlertCircle, Lock, Timer, ShieldCheck, GraduationCap, KeyRound, Zap } from 'lucide-react';
import { login as apiLogin } from '../api/auth';
import { useAuthStore } from '../store/authStore';

/* ─── Animation variants ───────────────────── */
const formVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const rowVariant = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] } },
};

/* ─── Left panel items ──────────────────────── */
const features = [
    { icon: ShieldCheck,    text: 'Xavfsiz JWT autentifikatsiya' },
    { icon: GraduationCap,  text: 'HEMIS tizimi orqali kirish' },
    { icon: KeyRound,       text: 'Parolni tiklash imkoni' },
    { icon: Zap,            text: 'Bir zumda tizimga kirish' },
];

/* ─── Spinner ───────────────────────────────── */
function Spinner() {
    return (
        <svg className="animate-spin" style={{ width: 16, height: 16 }} viewBox="0 0 24 24">
            <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10"
                stroke="currentColor" strokeWidth="4" fill="none" />
            <path style={{ opacity: 0.75 }} fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
    );
}

export default function Login() {
    const navigate    = useNavigate();
    const loginStore  = useAuthStore((s) => s.login);

    const [form, setForm]           = useState({ username: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading]     = useState(false);
    const [error, setError]         = useState('');
    const [shakeKey, setShakeKey]   = useState(0);
    const [locked, setLocked]       = useState(false);
    const [attemptsLeft, setAttemptsLeft] = useState(null);
    const [countdown, setCountdown] = useState(0);

    useEffect(() => { document.title = 'Kirish — Judge'; }, []);

    /* Lockout countdown */
    useEffect(() => {
        if (!locked) return;
        setCountdown(600);
        const id = setInterval(() => {
            setCountdown((c) => {
                if (c <= 1) { clearInterval(id); setLocked(false); return 0; }
                return c - 1;
            });
        }, 1000);
        return () => clearInterval(id);
    }, [locked]);

    const fmtCountdown = useCallback((s) => {
        const m = Math.floor(s / 60);
        const sec = String(s % 60).padStart(2, '0');
        return `${m}:${sec}`;
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (locked) return;
        setLoading(true);
        setError('');
        setAttemptsLeft(null);
        try {
            const res = await apiLogin(form);
            loginStore(res.data.user || res.data, {
                access:  res.data.access,
                refresh: res.data.refresh,
            });
            navigate('/problems');
        } catch (err) {
            const data = err.response?.data || {};
            if (data.locked || err.response?.status === 429) {
                setLocked(true);
                setError('');
            } else {
                setError(data.detail || "Login yoki parol noto'g'ri");
                if (data.attempts_remaining != null) setAttemptsLeft(data.attempts_remaining);
                setShakeKey((k) => k + 1);
            }
        } finally {
            setLoading(false);
        }
    };

    /* ─── Shared styles ─── */
    const label = {
        display: 'block', fontSize: 11, fontWeight: 600,
        letterSpacing: '0.07em', textTransform: 'uppercase',
        color: 'var(--text-muted)', marginBottom: 7,
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px 16px',
            position: 'relative',
            background: 'var(--bg-base)',
            overflow: 'hidden',
        }}>
            {/* ── Background orbs ── */}
            <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
                <div style={{
                    position: 'absolute', width: 520, height: 520, borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(79,70,229,0.13) 0%, transparent 65%)',
                    top: '-100px', right: '-60px',
                }} />
                <div style={{
                    position: 'absolute', width: 380, height: 380, borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 65%)',
                    bottom: '-40px', left: '-40px',
                }} />
                <div style={{
                    position: 'absolute', width: 260, height: 260, borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(14,165,233,0.07) 0%, transparent 65%)',
                    top: '60%', left: '30%',
                }} />
                {/* Grid */}
                <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: 'linear-gradient(var(--border-subtle) 1px, transparent 1px), linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px)',
                    backgroundSize: '48px 48px',
                    opacity: 0.5,
                }} />
            </div>

            {/* ── Main card ── */}
            <motion.div
                initial={{ opacity: 0, y: 28, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                style={{
                    display: 'flex',
                    width: '100%', maxWidth: 820,
                    borderRadius: 20,
                    overflow: 'hidden',
                    border: '1px solid var(--border-default)',
                    boxShadow: '0 0 0 1px var(--border-subtle), 0 40px 80px rgba(0,0,0,0.35)',
                    position: 'relative', zIndex: 10,
                }}
            >
                {/* ════ LEFT PANEL ════ */}
                <div className="auth-left-panel" style={{
                    width: 320, flexShrink: 0,
                    background: 'linear-gradient(155deg, #1e3a8a 0%, #4f46e5 55%, #7c3aed 100%)',
                    padding: '48px 32px',
                    flexDirection: 'column', justifyContent: 'space-between',
                    position: 'relative', overflow: 'hidden',
                }}>
                    {/* Decorative blobs */}
                    <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                        <div style={{
                            position: 'absolute', width: 200, height: 200, borderRadius: '50%',
                            background: 'rgba(255,255,255,0.07)', top: -50, right: -50,
                        }} />
                        <div style={{
                            position: 'absolute', width: 150, height: 150, borderRadius: '50%',
                            background: 'rgba(255,255,255,0.05)', bottom: 60, left: -40,
                        }} />
                        <div style={{
                            position: 'absolute', inset: 0,
                            backgroundImage: 'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)',
                            backgroundSize: '100% 36px',
                        }} />
                    </div>

                    {/* Top content */}
                    <div style={{ position: 'relative' }}>
                        {/* Icon */}
                        <div style={{
                            width: 52, height: 52, borderRadius: 14,
                            background: 'rgba(255,255,255,0.15)',
                            backdropFilter: 'blur(12px)',
                            border: '1px solid rgba(255,255,255,0.25)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginBottom: 24,
                        }}>
                            <LogIn style={{ width: 24, height: 24, color: '#fff' }} />
                        </div>

                        <h2 style={{
                            fontSize: 26, fontWeight: 800, color: '#fff',
                            letterSpacing: '-0.5px', marginBottom: 10, lineHeight: 1.2,
                        }}>
                            Xush<br/>kelibsiz
                        </h2>
                        <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.70)', lineHeight: 1.6, marginBottom: 32 }}>
                            Judge platformasiga kiring va musobaqalarda ishtirok eting.
                        </p>

                        {/* Features */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {features.map(({ icon: Icon, text }) => (
                                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{
                                        width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                                        background: 'rgba(255,255,255,0.12)',
                                        border: '1px solid rgba(255,255,255,0.18)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <Icon style={{ width: 14, height: 14, color: '#fff' }} />
                                    </div>
                                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.82)', fontWeight: 500 }}>
                                        {text}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Bottom: register link */}
                    <div style={{
                        position: 'relative', marginTop: 36,
                        padding: '14px 16px', borderRadius: 12,
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.15)',
                    }}>
                        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.70)', marginBottom: 3 }}>
                            Hisobingiz yo'qmi?
                        </p>
                        <Link to="/register" style={{
                            fontSize: 14, fontWeight: 600, color: '#fff',
                            textDecoration: 'none',
                        }}>
                            Ro'yxatdan o'tish →
                        </Link>
                    </div>
                </div>

                {/* ════ RIGHT PANEL ════ */}
                <div className="auth-right-panel" style={{
                    flex: 1, minWidth: 0,
                    background: 'var(--bg-elevated)',
                    padding: '48px 44px',
                }}>
                    {/* Heading */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                        style={{ marginBottom: 32 }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                            <div style={{
                                width: 36, height: 36, borderRadius: 9,
                                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                boxShadow: '0 0 16px rgba(79,70,229,0.35)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <LogIn style={{ width: 18, height: 18, color: '#fff' }} />
                            </div>
                            <h1 style={{
                                fontSize: 22, fontWeight: 700,
                                color: 'var(--text-primary)',
                                letterSpacing: '-0.4px', margin: 0,
                            }}>
                                Tizimga kirish
                            </h1>
                        </div>
                        <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
                            Hisobingiz yoki HEMIS login orqali kiring
                        </p>
                    </motion.div>

                    {/* ── Lockout banner ── */}
                    <AnimatePresence>
                        {locked && (
                            <motion.div
                                initial={{ opacity: 0, y: -8, height: 0 }}
                                animate={{ opacity: 1, y: 0, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                style={{
                                    marginBottom: 20,
                                    padding: '14px 16px', borderRadius: 12,
                                    background: 'rgba(239,68,68,0.07)',
                                    border: '1px solid rgba(239,68,68,0.20)',
                                    display: 'flex', flexDirection: 'column', gap: 8,
                                    overflow: 'hidden',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Lock style={{ width: 15, height: 15, color: '#f87171', flexShrink: 0 }} />
                                    <span style={{ color: '#f87171', fontSize: 13, fontWeight: 600 }}>
                                        Hisob vaqtincha bloklandi
                                    </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#fca5a5', fontSize: 12 }}>
                                    <Timer style={{ width: 13, height: 13 }} />
                                    <span>{fmtCountdown(countdown)} dan keyin qayta urinib ko'ring</span>
                                </div>
                                <Link to="/forgot-password" style={{
                                    fontSize: 12, color: '#818cf8', fontWeight: 500,
                                    textDecoration: 'underline',
                                    textDecorationColor: 'rgba(129,140,248,0.4)',
                                }}>
                                    Parolni hoziroq tiklash →
                                </Link>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <motion.form
                        onSubmit={handleSubmit}
                        variants={formVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        {/* Username */}
                        <motion.div variants={rowVariant} style={{ marginBottom: 16 }}>
                            <label style={label}>Login</label>
                            <input
                                type="text"
                                value={form.username}
                                onChange={(e) => setForm({ ...form, username: e.target.value })}
                                placeholder="Username yoki HEMIS login"
                                required
                                autoComplete="username"
                                autoFocus
                            />
                        </motion.div>

                        {/* Password */}
                        <motion.div variants={rowVariant} style={{ marginBottom: 8 }}>
                            <label style={label}>Parol</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    placeholder="••••••••"
                                    required
                                    autoComplete="current-password"
                                    style={{ paddingRight: 42 }}
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)}
                                    style={eyeBtn}>
                                    {showPassword
                                        ? <EyeOff style={{ width: 16, height: 16 }} />
                                        : <Eye style={{ width: 16, height: 16 }} />}
                                </button>
                            </div>
                        </motion.div>

                        {/* Forgot password */}
                        <motion.div variants={rowVariant} style={{ textAlign: 'right', marginBottom: 20 }}>
                            <Link to="/forgot-password" style={{
                                fontSize: 12, color: 'var(--text-muted)',
                                transition: 'color 0.2s',
                            }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#818cf8'}
                                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                            >
                                Parolni unutdim?
                            </Link>
                        </motion.div>

                        {/* Error */}
                        <AnimatePresence>
                            {error && (
                                <motion.div key={shakeKey}
                                    initial={{ opacity: 0, y: -6 }}
                                    animate={{ opacity: 1, y: 0, x: [0, 8, -8, 6, -6, 0] }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.4 }}
                                    style={{
                                        marginBottom: 16,
                                        display: 'flex', flexDirection: 'column', gap: 6,
                                        padding: '10px 14px', borderRadius: 10,
                                        background: 'rgba(239,68,68,0.07)',
                                        border: '1px solid rgba(239,68,68,0.14)',
                                        color: '#f87171', fontSize: 13,
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                        <AlertCircle style={{ width: 15, height: 15, flexShrink: 0, marginTop: 1 }} />
                                        <span>{error}</span>
                                    </div>
                                    {attemptsLeft != null && (
                                        <span style={{ fontSize: 12, color: '#fca5a5', paddingLeft: 25 }}>
                                            Yana {attemptsLeft} ta xato urinishdan so'ng hisob bloklanadi
                                        </span>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Submit */}
                        <motion.div variants={rowVariant}>
                            <button type="submit" disabled={loading || locked}
                                className="btn-glow"
                                style={{
                                    width: '100%', display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', gap: 8,
                                    opacity: locked ? 0.5 : 1,
                                    cursor: locked ? 'not-allowed' : 'pointer',
                                }}>
                                {loading
                                    ? <><Spinner /> Kirilmoqda...</>
                                    : <><LogIn style={{ width: 16, height: 16 }} /> Kirish</>}
                            </button>
                        </motion.div>
                    </motion.form>

                    {/* Divider */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        margin: '20px 0',
                    }}>
                        <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
                        <span style={{
                            fontSize: 11, fontWeight: 500, letterSpacing: '0.08em',
                            textTransform: 'uppercase', color: 'var(--text-muted)',
                        }}>yoki</span>
                        <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
                    </div>

                    {/* HEMIS hint */}
                    <div style={{
                        padding: '11px 14px', borderRadius: 10,
                        background: 'rgba(59,130,246,0.06)',
                        border: '1px solid rgba(59,130,246,0.14)',
                        display: 'flex', alignItems: 'flex-start', gap: 10,
                        fontSize: 12.5, color: '#60a5fa', lineHeight: 1.5,
                    }}>
                        <GraduationCap style={{ width: 15, height: 15, flexShrink: 0, marginTop: 1 }} />
                        <span>
                            HEMIS talabasi bo'lsangiz, <strong>talaba raqami</strong> va <strong>parolingiz</strong> bilan kiring
                        </span>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

/* ─── Eye button shared style ─── */
const eyeBtn = {
    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer', padding: 4,
    color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
};
