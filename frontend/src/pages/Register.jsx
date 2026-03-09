import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserPlus, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { register } from '../api/auth';
import { useAuthStore } from '../store/authStore';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
    hidden: { opacity: 0, y: 14 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

export default function Register() {
    const navigate = useNavigate();
    const setAuth = useAuthStore((s) => s.setAuth);
    const [form, setForm] = useState({ username: '', email: '', password: '', password2: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [shakeKey, setShakeKey] = useState(0);

    useEffect(() => { document.title = 'Sign up — OnlineJudge'; }, []);

    const fieldError = (field) => {
        const err = errors[field];
        if (!err) return null;
        const msg = Array.isArray(err) ? err[0] : err;
        return (
            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 12, color: '#f87171' }}>
                <AlertCircle style={{ width: 12, height: 12 }} /> {msg}
            </motion.p>
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});
        try {
            const res = await register(form);
            setAuth({ user: { username: res.data.username }, access: res.data.access, refresh: res.data.refresh });
            navigate('/problems');
        } catch (err) {
            setErrors(err.response?.data || { detail: 'Xato yuz berdi' });
            setShakeKey((k) => k + 1);
        } finally { setLoading(false); }
    };

    const labelStyle = {
        display: 'block', fontSize: 11, fontWeight: 600,
        letterSpacing: '0.08em', textTransform: 'uppercase',
        color: '#6b7280', marginBottom: 8,
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', overflow: 'hidden', padding: '20px',
        }}>
            {/* Background glow */}
            <div style={{
                position: 'absolute', width: 600, height: 600, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 70%)',
                top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none',
            }} />

            {/* Card */}
            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    borderRadius: 16, padding: 40,
                    maxWidth: 420, width: '100%',
                    position: 'relative', zIndex: 10,
                    boxShadow: '0 0 0 1px rgba(255,255,255,0.05), 0 32px 64px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
                }}
            >
                <motion.div variants={containerVariants} initial="hidden" animate="visible">
                    {/* Icon */}
                    <motion.div variants={itemVariants} style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                        <div style={{
                            width: 52, height: 52, borderRadius: 12,
                            background: 'linear-gradient(135deg, #10b981, #6366f1)',
                            boxShadow: '0 0 24px rgba(16,185,129,0.30)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <UserPlus style={{ width: 24, height: 24, color: 'white' }} />
                        </div>
                    </motion.div>

                    {/* Title */}
                    <motion.div variants={itemVariants} style={{ textAlign: 'center', marginBottom: 32 }}>
                        <h1 style={{
                            background: 'linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 6,
                        }}>
                            Create account
                        </h1>
                        <p style={{ color: '#55556a', fontSize: 14 }}>Yangi hisob yarating va masalalarni yeching</p>
                    </motion.div>

                    <form onSubmit={handleSubmit}>
                        {/* Username */}
                        <motion.div variants={itemVariants} style={{ marginBottom: 16 }}>
                            <label style={labelStyle}>Username</label>
                            <input type="text" value={form.username}
                                onChange={(e) => setForm({ ...form, username: e.target.value })}
                                placeholder="coolcoder123" required autoComplete="username"
                                className={errors.username ? 'input-error' : ''} />
                            {fieldError('username')}
                        </motion.div>

                        {/* Email */}
                        <motion.div variants={itemVariants} style={{ marginBottom: 16 }}>
                            <label style={labelStyle}>Email</label>
                            <input type="email" value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                placeholder="you@example.com" required autoComplete="email"
                                className={errors.email ? 'input-error' : ''} />
                            {fieldError('email')}
                        </motion.div>

                        {/* Password */}
                        <motion.div variants={itemVariants} style={{ marginBottom: 16 }}>
                            <label style={labelStyle}>Password</label>
                            <div style={{ position: 'relative' }}>
                                <input type={showPassword ? 'text' : 'password'} value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    placeholder="••••••••" required autoComplete="new-password"
                                    style={{ paddingRight: 44 }}
                                    className={errors.password ? 'input-error' : ''} />
                                <button type="button" onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                                        background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                                        color: '#55556a', transition: 'color 0.2s',
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.color = '#9898bb'}
                                    onMouseLeave={(e) => e.currentTarget.style.color = '#55556a'}>
                                    {showPassword ? <EyeOff style={{ width: 18, height: 18 }} /> : <Eye style={{ width: 18, height: 18 }} />}
                                </button>
                            </div>
                            {fieldError('password')}
                        </motion.div>

                        {/* Confirm */}
                        <motion.div variants={itemVariants} style={{ marginBottom: 24 }}>
                            <label style={labelStyle}>Confirm Password</label>
                            <input type="password" value={form.password2}
                                onChange={(e) => setForm({ ...form, password2: e.target.value })}
                                placeholder="••••••••" required autoComplete="new-password"
                                className={errors.password2 ? 'input-error' : ''} />
                            {fieldError('password2')}
                        </motion.div>

                        {/* General error */}
                        {errors.detail && (
                            <motion.div key={shakeKey}
                                animate={{ x: [0, 8, -8, 6, -6, 0] }} transition={{ duration: 0.4 }}
                                style={{
                                    marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 10,
                                    padding: '10px 14px', borderRadius: 10,
                                    background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)',
                                    color: '#f87171', fontSize: 13,
                                }}>
                                <AlertCircle style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1 }} />
                                <span>{errors.detail}</span>
                            </motion.div>
                        )}

                        {/* Submit */}
                        <motion.div variants={itemVariants}>
                            <button type="submit" disabled={loading} className="btn-glow"
                                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                {loading ? (
                                    <>
                                        <svg className="animate-spin" style={{ width: 16, height: 16 }} viewBox="0 0 24 24">
                                            <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        Creating account...
                                    </>
                                ) : (
                                    <><UserPlus style={{ width: 16, height: 16 }} /> Create account</>
                                )}
                            </button>
                        </motion.div>
                    </form>

                    {/* Divider */}
                    <motion.div variants={itemVariants} style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        margin: '24px 0', color: 'rgba(255,255,255,0.20)',
                    }}>
                        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                        <span style={{ letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 500, fontSize: 11 }}>or</span>
                        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                    </motion.div>

                    {/* Social */}
                    <motion.div variants={itemVariants} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                        <button disabled className="btn-social">
                            <svg style={{ width: 16, height: 16 }} viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
                            GitHub
                        </button>
                        <button disabled className="btn-social">
                            <svg style={{ width: 16, height: 16 }} viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                            Google
                        </button>
                    </motion.div>

                    {/* Footer */}
                    <motion.p variants={itemVariants} style={{ textAlign: 'center', fontSize: 13, color: '#55556a' }}>
                        Hisobingiz bormi?{' '}
                        <Link to="/login" style={{ color: '#818cf8', fontWeight: 500 }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#a5b4fc'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#818cf8'}>
                            Log in
                        </Link>
                    </motion.p>
                </motion.div>
            </motion.div>
        </div>
    );
}
