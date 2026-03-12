import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { login as apiLogin } from '../api/auth';
import { useAuthStore } from '../store/authStore';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
    hidden: { opacity: 0, y: 14 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

function MiniSpinner() {
    return (
        <svg className="animate-spin" style={{ width: 16, height: 16 }} viewBox="0 0 24 24">
            <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
    );
}

export default function Login() {
    const navigate = useNavigate();
    const loginStore = useAuthStore((s) => s.login);
    const [form, setForm] = useState({ username: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [shakeKey, setShakeKey] = useState(0);

    useEffect(() => { document.title = 'Kirish — OnlineJudge'; }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await apiLogin(form);
            loginStore(res.data.user || res.data, {
                access: res.data.access,
                refresh: res.data.refresh,
            });
            navigate('/problems');
        } catch (err) {
            setError(err.response?.data?.detail || "Login yoki parol noto'g'ri");
            setShakeKey((k) => k + 1);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
            padding: '20px',
        }}>
            {/* Background glow */}
            <div style={{
                position: 'absolute',
                width: 600,
                height: 600,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
            }} />

            {/* Card */}
            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 16,
                    padding: 40,
                    maxWidth: 420,
                    width: '100%',
                    position: 'relative',
                    zIndex: 10,
                    boxShadow: '0 0 0 1px var(--border-subtle), 0 32px 64px rgba(0,0,0,0.4), inset 0 1px 0 var(--border-subtle)',
                }}
            >
                <motion.div variants={containerVariants} initial="hidden" animate="visible">

                    {/* Icon */}
                    <motion.div variants={itemVariants} style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                        <div style={{
                            width: 52,
                            height: 52,
                            borderRadius: 12,
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            boxShadow: '0 0 24px rgba(99,102,241,0.40)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <LogIn style={{ width: 24, height: 24, color: 'white' }} />
                        </div>
                    </motion.div>

                    {/* Title */}
                    <motion.div variants={itemVariants} style={{ textAlign: 'center', marginBottom: 32 }}>
                        <h1 style={{
                            background: 'linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            fontSize: 28,
                            fontWeight: 700,
                            letterSpacing: '-0.5px',
                            marginBottom: 6,
                        }}>
                            Xush kelibsiz
                        </h1>
                        <p style={{ color: '#55556a', fontSize: 14 }}>
                            Hisobingizga yoki HEMIS tizimiga kiring
                        </p>
                    </motion.div>

                    <form onSubmit={handleSubmit}>
                        {/* Username / HEMIS login */}
                        <motion.div variants={itemVariants} style={{ marginBottom: 16 }}>
                            <label style={{
                                display: 'block', fontSize: 11, fontWeight: 600,
                                letterSpacing: '0.08em', textTransform: 'uppercase',
                                color: 'var(--text-muted)', marginBottom: 8,
                            }}>
                                Login
                            </label>
                            <input
                                type="text"
                                value={form.username}
                                onChange={(e) => setForm({ ...form, username: e.target.value })}
                                placeholder="Username yoki HEMIS login"
                                required
                                autoComplete="username"
                            />
                        </motion.div>

                        {/* Password */}
                        <motion.div variants={itemVariants} style={{ marginBottom: 24 }}>
                            <label style={{
                                display: 'block', fontSize: 11, fontWeight: 600,
                                letterSpacing: '0.08em', textTransform: 'uppercase',
                                color: 'var(--text-muted)', marginBottom: 8,
                            }}>
                                Parol
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    placeholder="••••••••"
                                    required
                                    autoComplete="current-password"
                                    style={{ paddingRight: 44 }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                                        background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                                        color: '#55556a', transition: 'color 0.2s',
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                                    onMouseLeave={(e) => e.currentTarget.style.color = '#55556a'}
                                >
                                    {showPassword ? <EyeOff style={{ width: 18, height: 18 }} /> : <Eye style={{ width: 18, height: 18 }} />}
                                </button>
                            </div>
                        </motion.div>

                        {/* Error */}
                        {error && (
                            <motion.div
                                key={shakeKey}
                                animate={{ x: [0, 8, -8, 6, -6, 0] }}
                                transition={{ duration: 0.4 }}
                                style={{
                                    marginBottom: 16,
                                    display: 'flex', alignItems: 'flex-start', gap: 10,
                                    padding: '10px 14px', borderRadius: 10,
                                    background: 'rgba(239,68,68,0.06)',
                                    border: '1px solid rgba(239,68,68,0.12)',
                                    color: '#f87171', fontSize: 13,
                                }}
                            >
                                <AlertCircle style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1 }} />
                                <span>{error}</span>
                            </motion.div>
                        )}

                        {/* Submit */}
                        <motion.div variants={itemVariants}>
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-glow"
                                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                            >
                                {loading ? (
                                    <><MiniSpinner /> Kirilmoqda...</>
                                ) : (
                                    <><LogIn style={{ width: 16, height: 16 }} /> Kirish</>
                                )}
                            </button>
                        </motion.div>
                    </form>

                    {/* Info */}
                    <motion.div variants={itemVariants} style={{
                        marginTop: 20,
                        padding: '10px 14px',
                        borderRadius: 10,
                        background: 'rgba(59,130,246,0.06)',
                        border: '1px solid rgba(59,130,246,0.12)',
                        fontSize: 12,
                        color: '#60a5fa',
                        lineHeight: 1.5,
                    }}>
                        💡 HEMIS talabasi bo'lsangiz, talaba raqami va parolingiz bilan kiring
                    </motion.div>

                    {/* Footer */}
                    <motion.p variants={itemVariants} style={{ textAlign: 'center', fontSize: 13, color: '#55556a', marginTop: 20 }}>
                        Hisobingiz yo'qmi?{' '}
                        <Link to="/register" style={{ color: '#818cf8', fontWeight: 500 }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#a5b4fc'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#818cf8'}>
                            Ro'yxatdan o'tish
                        </Link>
                    </motion.p>
                </motion.div>
            </motion.div>
        </div>
    );
}
