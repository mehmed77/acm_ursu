import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Eye, EyeOff, AlertCircle, Code2, Trophy, Zap, Users } from 'lucide-react';
import { register } from '../api/auth';
import { useAuthStore } from '../store/authStore';

/* ─── Animation variants ───────────────────── */
const formVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const rowVariant = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] } },
};

/* ─── Left panel feature items ─────────────── */
const features = [
    { icon: Code2,  text: '1 000+ algoritmik masala' },
    { icon: Zap,    text: 'Real-vaqt baholash tizimi' },
    { icon: Trophy, text: 'Reyting va kontestlar' },
    { icon: Users,  text: '10 000+ faol ishtirokchi' },
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

export default function Register() {
    const navigate = useNavigate();
    const setAuth  = useAuthStore((s) => s.setAuth);

    const [form, setForm] = useState({
        first_name: '', last_name: '',
        username: '', email: '',
        password: '', password2: '',
    });
    const [show1, setShow1] = useState(false);
    const [show2, setShow2] = useState(false);
    const [loading, setLoading]   = useState(false);
    const [errors,  setErrors]    = useState({});
    const [shakeKey, setShakeKey] = useState(0);

    useEffect(() => { document.title = "Ro'yxatdan o'tish — Judge"; }, []);

    const set = (f) => (e) => setForm((prev) => ({ ...prev, [f]: e.target.value }));

    const FieldError = ({ field }) => {
        const err = errors[field];
        if (!err) return null;
        const msg = Array.isArray(err) ? err[0] : err;
        return (
            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                style={{ display: 'flex', alignItems: 'center', gap: 4,
                    marginTop: 5, fontSize: 12, color: '#f87171' }}>
                <AlertCircle style={{ width: 11, height: 11, flexShrink: 0 }} /> {msg}
            </motion.p>
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});
        try {
            const res = await register(form);
            setAuth({ user: res.data.user, access: res.data.access, refresh: res.data.refresh });
            navigate('/problems');
        } catch (err) {
            setErrors(err.response?.data || { detail: "Xato yuz berdi. Qayta urinib ko'ring." });
            setShakeKey((k) => k + 1);
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
    const err = (f) => errors[f] ? 'input-error' : '';

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
                    position: 'absolute', width: 560, height: 560, borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(99,102,241,0.13) 0%, transparent 65%)',
                    top: '-120px', left: '-80px',
                }} />
                <div style={{
                    position: 'absolute', width: 400, height: 400, borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(16,185,129,0.10) 0%, transparent 65%)',
                    bottom: '-60px', right: '-60px',
                }} />
                <div style={{
                    position: 'absolute', width: 300, height: 300, borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 65%)',
                    top: '50%', right: '15%', transform: 'translateY(-50%)',
                }} />
                {/* Subtle grid */}
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
                    width: '100%', maxWidth: 900,
                    borderRadius: 20,
                    overflow: 'hidden',
                    border: '1px solid var(--border-default)',
                    boxShadow: '0 0 0 1px var(--border-subtle), 0 40px 80px rgba(0,0,0,0.35)',
                    position: 'relative', zIndex: 10,
                }}
            >
                {/* ════ LEFT PANEL ════ */}
                <div className="auth-left-panel" style={{
                    width: 340, flexShrink: 0,
                    background: 'linear-gradient(155deg, #4f46e5 0%, #7c3aed 45%, #0f766e 100%)',
                    padding: '48px 36px',
                    flexDirection: 'column', justifyContent: 'space-between',
                    position: 'relative', overflow: 'hidden',
                }}>
                    {/* Panel decorative blobs */}
                    <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                        <div style={{
                            position: 'absolute', width: 220, height: 220, borderRadius: '50%',
                            background: 'rgba(255,255,255,0.07)', top: -60, right: -60,
                        }} />
                        <div style={{
                            position: 'absolute', width: 160, height: 160, borderRadius: '50%',
                            background: 'rgba(255,255,255,0.05)', bottom: 40, left: -50,
                        }} />
                        {/* Horizontal lines */}
                        <div style={{
                            position: 'absolute', inset: 0,
                            backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
                            backgroundSize: '100% 40px',
                        }} />
                    </div>

                    {/* Top: logo + brand */}
                    <div style={{ position: 'relative' }}>
                        <div style={{
                            width: 56, height: 56, borderRadius: 14,
                            background: 'rgba(255,255,255,0.15)',
                            backdropFilter: 'blur(12px)',
                            border: '1px solid rgba(255,255,255,0.25)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginBottom: 24,
                        }}>
                            <Code2 style={{ width: 26, height: 26, color: '#fff' }} />
                        </div>

                        <h2 style={{
                            fontSize: 26, fontWeight: 800, color: '#fff',
                            letterSpacing: '-0.5px', marginBottom: 10, lineHeight: 1.2,
                        }}>
                            Online<br/>Judge
                        </h2>
                        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.72)', lineHeight: 1.6, marginBottom: 36 }}>
                            Algoritmik musobaqalarga tayyor bo'l. Har kuni yangi masalalar.
                        </p>

                        {/* Features */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {features.map(({ icon: Icon, text }) => (
                                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{
                                        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                                        background: 'rgba(255,255,255,0.12)',
                                        border: '1px solid rgba(255,255,255,0.18)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <Icon style={{ width: 15, height: 15, color: '#fff' }} />
                                    </div>
                                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
                                        {text}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Bottom: already have account */}
                    <div style={{
                        position: 'relative',
                        padding: '14px 16px',
                        borderRadius: 12,
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.15)',
                    }}>
                        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 2 }}>
                            Hisobingiz bormi?
                        </p>
                        <Link to="/login" style={{
                            fontSize: 14, fontWeight: 600, color: '#fff',
                            textDecoration: 'none',
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                        }}>
                            Tizimga kirish →
                        </Link>
                    </div>
                </div>

                {/* ════ RIGHT PANEL ════ */}
                <div className="auth-right-panel" style={{
                    flex: 1, minWidth: 0,
                    background: 'var(--bg-elevated)',
                    padding: '48px 40px',
                    overflowY: 'auto',
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
                                background: 'linear-gradient(135deg, #6366f1, #10b981)',
                                boxShadow: '0 0 16px rgba(99,102,241,0.35)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <UserPlus style={{ width: 18, height: 18, color: '#fff' }} />
                            </div>
                            <h1 style={{
                                fontSize: 22, fontWeight: 700,
                                color: 'var(--text-primary)',
                                letterSpacing: '-0.4px', margin: 0,
                            }}>
                                Yangi hisob yaratish
                            </h1>
                        </div>
                        <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
                            Barcha maydonlarni to'liq to'ldiring
                        </p>
                    </motion.div>

                    <motion.form
                        onSubmit={handleSubmit}
                        variants={formVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        {/* Ism + Familiya */}
                        <motion.div variants={rowVariant}
                            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                            <div>
                                <label style={label}>Ism</label>
                                <input type="text" value={form.first_name} onChange={set('first_name')}
                                    placeholder="Sardor" required autoComplete="given-name"
                                    className={err('first_name')} />
                                <FieldError field="first_name" />
                            </div>
                            <div>
                                <label style={label}>Familiya</label>
                                <input type="text" value={form.last_name} onChange={set('last_name')}
                                    placeholder="Aliyev" required autoComplete="family-name"
                                    className={err('last_name')} />
                                <FieldError field="last_name" />
                            </div>
                        </motion.div>

                        {/* Username */}
                        <motion.div variants={rowVariant} style={{ marginBottom: 14 }}>
                            <label style={label}>Foydalanuvchi nomi</label>
                            <input type="text" value={form.username} onChange={set('username')}
                                placeholder="sardor_aliyev" required autoComplete="username"
                                className={err('username')} />
                            <FieldError field="username" />
                        </motion.div>

                        {/* Email */}
                        <motion.div variants={rowVariant} style={{ marginBottom: 14 }}>
                            <label style={label}>Elektron pochta</label>
                            <input type="email" value={form.email} onChange={set('email')}
                                placeholder="sardor@example.com" required autoComplete="email"
                                className={err('email')} />
                            <FieldError field="email" />
                        </motion.div>

                        {/* Password row */}
                        <motion.div variants={rowVariant} className="auth-password-row"
                            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
                            <div>
                                <label style={label}>Parol</label>
                                <div style={{ position: 'relative' }}>
                                    <input type={show1 ? 'text' : 'password'} value={form.password}
                                        onChange={set('password')} placeholder="••••••••"
                                        required autoComplete="new-password" style={{ paddingRight: 42 }}
                                        className={err('password')} />
                                    <button type="button" onClick={() => setShow1(!show1)} style={eyeBtn}>
                                        {show1 ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                                    </button>
                                </div>
                                <FieldError field="password" />
                            </div>
                            <div>
                                <label style={label}>Parolni tasdiqlang</label>
                                <div style={{ position: 'relative' }}>
                                    <input type={show2 ? 'text' : 'password'} value={form.password2}
                                        onChange={set('password2')} placeholder="••••••••"
                                        required autoComplete="new-password" style={{ paddingRight: 42 }}
                                        className={err('password2')} />
                                    <button type="button" onClick={() => setShow2(!show2)} style={eyeBtn}>
                                        {show2 ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                                    </button>
                                </div>
                                <FieldError field="password2" />
                            </div>
                        </motion.div>

                        {/* General error */}
                        <AnimatePresence>
                            {errors.detail && (
                                <motion.div key={shakeKey}
                                    initial={{ opacity: 0, y: -6 }}
                                    animate={{ opacity: 1, y: 0, x: [0, 8, -8, 6, -6, 0] }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.4 }}
                                    style={{
                                        marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 10,
                                        padding: '10px 14px', borderRadius: 10,
                                        background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.14)',
                                        color: '#f87171', fontSize: 13,
                                    }}>
                                    <AlertCircle style={{ width: 15, height: 15, flexShrink: 0, marginTop: 1 }} />
                                    <span>{errors.detail}</span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Submit */}
                        <motion.div variants={rowVariant}>
                            <button type="submit" disabled={loading} className="btn-glow"
                                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                {loading
                                    ? <><Spinner /> Yaratilmoqda...</>
                                    : <><UserPlus style={{ width: 16, height: 16 }} /> Ro'yxatdan o'tish</>}
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

                    {/* Social */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <button disabled className="btn-social">
                            <svg style={{ width: 16, height: 16 }} viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                            </svg>
                            GitHub
                        </button>
                        <button disabled className="btn-social">
                            <svg style={{ width: 16, height: 16 }} viewBox="0 0 24 24" fill="currentColor">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Google
                        </button>
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
