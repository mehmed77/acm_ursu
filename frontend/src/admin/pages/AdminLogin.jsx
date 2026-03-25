import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import api from '../../api/axios';
import { TerminalSquare, Lock, User, LogIn } from 'lucide-react';

export default function AdminLogin() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    const loginStore = useAuthStore(state => state.login);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await api.post('/admin/login/', { username, password });
            loginStore(res.data.user || res.data);
            navigate('/admin', { replace: true });
        } catch (err) {
            setError(err.response?.data?.detail || 'Xatolik yuz berdi');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#111122', color: '#f0f0ff', padding: '24px'
        }}>
            <div style={{ width: '100%', maxWidth: '400px' }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                        <div style={{
                            width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(99,102,241,0.1)',
                            border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <TerminalSquare size={28} color="#6366f1" />
                        </div>
                    </div>
                    <h1 style={{ fontSize: '24px', fontWeight: 600, letterSpacing: '-0.5px' }}>Admin Panel</h1>
                    <p style={{ color: '#9ca3af', fontSize: '14px', marginTop: '8px' }}>
                        Tizimga kirish uchun ruxsat talab qilinadi
                    </p>
                </div>

                <div style={{
                    background: '#1a1a32', border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '16px', padding: '32px'
                }}>
                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {error && (
                            <div style={{
                                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                                color: '#f87171', padding: '12px 16px', borderRadius: '8px', fontSize: '14px'
                            }}>
                                {error}
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 500, color: '#d1d5db' }}>Username</label>
                            <div style={{ position: 'relative' }}>
                                <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>
                                    <User size={18} />
                                </div>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    placeholder="admin"
                                    style={{
                                        width: '100%', background: '#13131f', border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px', padding: '12px 16px 12px 42px', color: 'white', fontSize: '15px'
                                    }}
                                    className="focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 500, color: '#d1d5db' }}>Parol</label>
                            <div style={{ position: 'relative' }}>
                                <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>
                                    <Lock size={18} />
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    style={{
                                        width: '100%', background: '#13131f', border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px', padding: '12px 16px 12px 42px', color: 'white', fontSize: '15px'
                                    }}
                                    className="focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                color: 'white', border: 'none', borderRadius: '8px', padding: '14px',
                                fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center',
                                justifyContent: 'center', gap: '8px', cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? 0.7 : 1, marginTop: '8px'
                            }}
                            className="hover:opacity-90 transition-opacity"
                        >
                            {loading ? 'Tekshirilmoqda...' : (
                                <>
                                    <LogIn size={18} /> Kirish
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
