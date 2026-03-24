import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { KeyRound, Send, CheckCircle2, AlertCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { passwordResetRequest, passwordResetConfirm } from '../api/auth';

function MiniSpinner() {
    return (
        <svg className="animate-spin" style={{ width: 16, height: 16 }} viewBox="0 0 24 24">
            <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
    );
}

const cardVariants = {
    hidden:  { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
    exit:    { opacity: 0, y: -16, transition: { duration: 0.25 } },
};

/* ─── Step 1: Username kiriting ─── */
function StepRequest({ onSuccess }) {
    const [username, setUsername]   = useState('');
    const [loading, setLoading]     = useState(false);
    const [error, setError]         = useState('');
    const [shakeKey, setShakeKey]   = useState(0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await passwordResetRequest({ username: username.trim() });
            onSuccess(username.trim());
        } catch (err) {
            const data = err.response?.data || {};
            setError(data.detail || 'Xato yuz berdi. Qayta urinib ko\'ring.');
            setShakeKey((k) => k + 1);
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div key="step1" variants={cardVariants} initial="hidden" animate="visible" exit="exit">
            {/* Icon */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                <div style={{
                    width: 52, height: 52, borderRadius: 12,
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    boxShadow: '0 0 24px rgba(99,102,241,0.40)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <KeyRound style={{ width: 24, height: 24, color: 'white' }} />
                </div>
            </div>

            {/* Title */}
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
                <h1 style={{
                    background: 'linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 6,
                }}>
                    Parolni tiklash
                </h1>
                <p style={{ color: '#55556a', fontSize: 13, lineHeight: 1.5 }}>
                    Telegram bog'langan hisobingiz username ini kiriting.<br />
                    OTP kod Telegram botdan yuboriladi.
                </p>
            </div>

            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 20 }}>
                    <label style={{
                        display: 'block', fontSize: 11, fontWeight: 600,
                        letterSpacing: '0.08em', textTransform: 'uppercase',
                        color: 'var(--text-muted)', marginBottom: 8,
                    }}>
                        Username
                    </label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Hisobingiz username i"
                        required
                        autoFocus
                        autoComplete="username"
                    />
                </div>

                {error && (
                    <motion.div
                        key={shakeKey}
                        animate={{ x: [0, 8, -8, 6, -6, 0] }}
                        transition={{ duration: 0.4 }}
                        style={{
                            marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 10,
                            padding: '10px 14px', borderRadius: 10,
                            background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)',
                            color: '#f87171', fontSize: 13,
                        }}
                    >
                        <AlertCircle style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1 }} />
                        <span>{error}</span>
                    </motion.div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="btn-glow"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                    {loading ? <><MiniSpinner /> Yuborilmoqda...</> : <><Send style={{ width: 16, height: 16 }} /> OTP yuborish</>}
                </button>
            </form>

            {/* Telegram bog'lanmagan holat uchun izoh */}
            <div style={{
                marginTop: 16, padding: '10px 14px', borderRadius: 10,
                background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.12)',
                fontSize: 12, color: '#60a5fa', lineHeight: 1.5,
            }}>
                💡 Avval hisobingizga kirib, <b>Profil → Telegram bog'lash</b> tugmasini bosing
            </div>
        </motion.div>
    );
}

/* ─── Step 2: OTP + yangi parol ─── */
function StepConfirm({ username, onSuccess }) {
    const [form, setForm]             = useState({ otp: '', new_password: '', confirm: '' });
    const [showPwd, setShowPwd]       = useState(false);
    const [loading, setLoading]       = useState(false);
    const [error, setError]           = useState('');
    const [shakeKey, setShakeKey]     = useState(0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (form.new_password !== form.confirm) {
            setError('Parollar mos kelmaydi');
            setShakeKey((k) => k + 1);
            return;
        }
        if (form.new_password.length < 8) {
            setError('Parol kamida 8 belgidan iborat bo\'lishi kerak');
            setShakeKey((k) => k + 1);
            return;
        }
        setLoading(true);
        setError('');
        try {
            await passwordResetConfirm({
                username,
                otp:          form.otp.trim(),
                new_password: form.new_password,
            });
            onSuccess();
        } catch (err) {
            const data = err.response?.data || {};
            setError(data.detail || 'Xato yuz berdi. OTP ni tekshiring.');
            setShakeKey((k) => k + 1);
        } finally {
            setLoading(false);
        }
    };

    const fieldStyle = { marginBottom: 16 };
    const labelStyle = {
        display: 'block', fontSize: 11, fontWeight: 600,
        letterSpacing: '0.08em', textTransform: 'uppercase',
        color: 'var(--text-muted)', marginBottom: 8,
    };

    return (
        <motion.div key="step2" variants={cardVariants} initial="hidden" animate="visible" exit="exit">
            {/* Icon */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                <div style={{
                    width: 52, height: 52, borderRadius: 12,
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    boxShadow: '0 0 24px rgba(16,185,129,0.35)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <KeyRound style={{ width: 24, height: 24, color: 'white' }} />
                </div>
            </div>

            <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <h1 style={{
                    background: 'linear-gradient(135deg, #ffffff 0%, #6ee7b7 100%)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    fontSize: 24, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 6,
                }}>
                    OTP kodni kiriting
                </h1>
                <p style={{ color: '#55556a', fontSize: 13 }}>
                    <b style={{ color: 'var(--text-secondary)' }}>{username}</b> hisobiga
                    bog'langan Telegram ga yuborildi
                </p>
            </div>

            <form onSubmit={handleSubmit}>
                {/* OTP */}
                <div style={fieldStyle}>
                    <label style={labelStyle}>OTP Kod</label>
                    <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={form.otp}
                        onChange={(e) => setForm({ ...form, otp: e.target.value.replace(/\D/g, '') })}
                        placeholder="123456"
                        required
                        autoFocus
                        style={{ letterSpacing: '0.3em', fontSize: 20, textAlign: 'center', fontWeight: 700 }}
                    />
                </div>

                {/* Yangi parol */}
                <div style={fieldStyle}>
                    <label style={labelStyle}>Yangi parol</label>
                    <div style={{ position: 'relative' }}>
                        <input
                            type={showPwd ? 'text' : 'password'}
                            value={form.new_password}
                            onChange={(e) => setForm({ ...form, new_password: e.target.value })}
                            placeholder="Kamida 8 belgi"
                            required
                            autoComplete="new-password"
                            style={{ paddingRight: 44 }}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPwd(!showPwd)}
                            style={{
                                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                                background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#55556a',
                            }}
                        >
                            {showPwd ? <EyeOff style={{ width: 18, height: 18 }} /> : <Eye style={{ width: 18, height: 18 }} />}
                        </button>
                    </div>
                </div>

                {/* Tasdiqlash */}
                <div style={{ marginBottom: 20 }}>
                    <label style={labelStyle}>Parolni tasdiqlang</label>
                    <input
                        type={showPwd ? 'text' : 'password'}
                        value={form.confirm}
                        onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                        placeholder="Parolni qaytaring"
                        required
                        autoComplete="new-password"
                    />
                </div>

                {error && (
                    <motion.div
                        key={shakeKey}
                        animate={{ x: [0, 8, -8, 6, -6, 0] }}
                        transition={{ duration: 0.4 }}
                        style={{
                            marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 10,
                            padding: '10px 14px', borderRadius: 10,
                            background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)',
                            color: '#f87171', fontSize: 13,
                        }}
                    >
                        <AlertCircle style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1 }} />
                        <span>{error}</span>
                    </motion.div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="btn-glow"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                    {loading ? <><MiniSpinner /> Saqlanmoqda...</> : <>Parolni yangilash</>}
                </button>
            </form>
        </motion.div>
    );
}

/* ─── Step 3: Muvaffaqiyat ─── */
function StepSuccess() {
    const navigate = useNavigate();
    useEffect(() => {
        const t = setTimeout(() => navigate('/login'), 3000);
        return () => clearTimeout(t);
    }, [navigate]);

    return (
        <motion.div
            key="step3"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            style={{ textAlign: 'center' }}
        >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                    style={{
                        width: 64, height: 64, borderRadius: '50%',
                        background: 'rgba(16,185,129,0.12)',
                        border: '1px solid rgba(16,185,129,0.25)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                >
                    <CheckCircle2 style={{ width: 32, height: 32, color: '#10b981' }} />
                </motion.div>
            </div>
            <h2 style={{
                background: 'linear-gradient(135deg, #ffffff, #6ee7b7)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                fontSize: 22, fontWeight: 700, marginBottom: 10,
            }}>
                Parol muvaffaqiyatli yangilandi!
            </h2>
            <p style={{ color: '#55556a', fontSize: 13, marginBottom: 20 }}>
                3 soniyadan keyin login sahifasiga yo'naltirilasiz...
            </p>
            <Link to="/login" className="btn-glow" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '10px 20px', borderRadius: 10, fontSize: 14, textDecoration: 'none',
            }}>
                Hoziroq kirish
            </Link>
        </motion.div>
    );
}

/* ─── Main component ─── */
export default function ForgotPassword() {
    const [step, setStep]         = useState(1);   // 1 | 2 | 3
    const [username, setUsername] = useState('');

    useEffect(() => { document.title = 'Parolni tiklash — OnlineJudge'; }, []);

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', overflow: 'hidden', padding: 20,
        }}>
            {/* Background glow */}
            <div style={{
                position: 'absolute', width: 500, height: 500, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 70%)',
                top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
            }} />

            <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 10 }}>

                {/* Step indicator */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
                    {[1, 2, 3].map((s) => (
                        <div key={s} style={{
                            height: 3, borderRadius: 2,
                            width: s === step ? 28 : 14,
                            background: s <= step
                                ? (s === 3 ? '#10b981' : '#6366f1')
                                : 'var(--border-subtle)',
                            transition: 'all 0.3s ease',
                        }} />
                    ))}
                </div>

                {/* Card */}
                <motion.div
                    layout
                    style={{
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-default)',
                        borderRadius: 16, padding: 36,
                        boxShadow: '0 0 0 1px var(--border-subtle), 0 32px 64px rgba(0,0,0,0.4)',
                    }}
                >
                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <StepRequest onSuccess={(uname) => { setUsername(uname); setStep(2); }} />
                        )}
                        {step === 2 && (
                            <StepConfirm username={username} onSuccess={() => setStep(3)} />
                        )}
                        {step === 3 && <StepSuccess />}
                    </AnimatePresence>
                </motion.div>

                {/* Back to login */}
                {step < 3 && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        style={{ textAlign: 'center', marginTop: 16 }}
                    >
                        <Link to="/login" style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            fontSize: 13, color: '#55556a',
                        }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#818cf8'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#55556a'}
                        >
                            <ArrowLeft style={{ width: 14, height: 14 }} />
                            Kirish sahifasiga qaytish
                        </Link>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
