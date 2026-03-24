import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../api/admin';
import { Search, Plus, Edit2, Eye, Trash2, Zap, AlertTriangle, FileText } from 'lucide-react';

export default function AdminProblems() {
    const navigate = useNavigate();
    const [problems, setProblems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [difficulty, setDifficulty] = useState('');
    const [published, setPublished] = useState('');
    const [deleteModal, setDeleteModal] = useState({ show: false, problem: null });

    const fetchProblems = () => {
        setLoading(true);
        adminApi.getProblems({ q: search, difficulty, published })
            .then(res => setProblems(res.data.results || res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchProblems();
        }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [search, difficulty, published]);

    const togglePublish = async (slug, currentVal) => {
        try {
            // Optimistic update
            setProblems(prev => prev.map(p => p.slug === slug ? { ...p, is_published: !currentVal } : p));
            await adminApi.updateProblem(slug, { is_published: !currentVal });
        } catch (err) {
            // Revert if error
            setProblems(prev => prev.map(p => p.slug === slug ? { ...p, is_published: currentVal } : p));
            console.error(err);
        }
    };

    const handleDelete = async () => {
        if (!deleteModal.problem) return;
        try {
            await adminApi.deleteProblem(deleteModal.problem.slug);
            setDeleteModal({ show: false, problem: null });
            fetchProblems();
        } catch (err) {
            console.error(err);
        }
    };

    const difficultyColors = {
        easy: { color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
        medium: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
        hard: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)' }
    };

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>

            {/* HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#f0f0ff' }}>Masalalar</h1>
                <button
                    onClick={() => navigate('/admin/problems/new')}
                    style={{
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        color: 'white', border: 'none', borderRadius: '8px', padding: '10px 16px',
                        fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px',
                        cursor: 'pointer'
                    }} className="hover:opacity-90">
                    <Plus size={18} /> Yangi masala
                </button>
            </div>

            {/* FILTER BAR */}
            <div style={{
                display: 'flex', gap: '16px', marginBottom: '24px',
                background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.06)'
            }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input
                        type="text" placeholder="Qidirish..." value={search} onChange={e => setSearch(e.target.value)}
                        style={{
                            width: '100%', background: '#0d0d18', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px', padding: '10px 16px 10px 40px', color: 'white'
                        }}
                        className="focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                </div>
                <select
                    value={difficulty} onChange={e => setDifficulty(e.target.value)}
                    style={{
                        background: '#0d0d18', border: '1px solid rgba(255,255,255,0.1)', padding: '10px 16px',
                        borderRadius: '8px', color: 'white', outline: 'none'
                    }}
                >
                    <option value="">Barcha Qiyinlik</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                </select>
                <select
                    value={published} onChange={e => setPublished(e.target.value)}
                    style={{
                        background: '#0d0d18', border: '1px solid rgba(255,255,255,0.1)', padding: '10px 16px',
                        borderRadius: '8px', color: 'white', outline: 'none'
                    }}
                >
                    <option value="">Status: Barchasi</option>
                    <option value="true">Nashr qilingan</option>
                    <option value="false">Qoralama (Draft)</option>
                </select>
            </div>

            {/* TABLE */}
            <div style={{ background: '#0A0A10', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#9ca3af', fontSize: '13px' }}>
                            <th style={{ padding: '16px 20px', fontWeight: 500, width: '60px' }}>#</th>
                            <th style={{ padding: '16px 20px', fontWeight: 500 }}>Sarlavha</th>
                            <th style={{ padding: '16px 20px', fontWeight: 500 }}>Qiyinlik</th>
                            <th style={{ padding: '16px 20px', fontWeight: 500 }}>Testlar</th>
                            <th style={{ padding: '16px 20px', fontWeight: 500 }}>Status</th>
                            <th style={{ padding: '16px 20px', fontWeight: 500, textAlign: 'right' }}>Amallar</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            Array.from({ length: 8 }).map((_, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                    <td colSpan={6} style={{ padding: '16px 20px' }}>
                                        <div className="animate-pulse" style={{ height: '24px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px' }} />
                                    </td>
                                </tr>
                            ))
                        ) : problems.length === 0 ? (
                            <tr>
                                <td colSpan={6} style={{ padding: '48px 20px', textAlign: 'center', color: '#9ca3af' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                        <FileText size={48} opacity={0.2} />
                                        <div>📭 Masala topilmadi</div>
                                        <button onClick={() => navigate('/admin/problems/new')}
                                            style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', marginTop: '8px' }}>
                                            + Yangi masala qo'shish
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            problems.map(problem => {
                                const diffBadge = difficultyColors[problem.difficulty?.toLowerCase()] || difficultyColors.easy;
                                return (
                                    <tr key={problem.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }} className="hover:bg-white/5 transition-colors">
                                        <td style={{ padding: '16px 20px', color: '#9ca3af', fontSize: '14px' }}>{problem.id}</td>
                                        <td style={{ padding: '16px 20px' }}>
                                            <div
                                                onClick={() => navigate(`/admin/problems/${problem.slug}`)}
                                                style={{ fontWeight: 500, color: '#f0f0ff', cursor: 'pointer', display: 'inline-block' }}
                                                className="hover:text-indigo-400 transition-colors"
                                            >
                                                {problem.title}
                                            </div>
                                            {problem.tags?.length > 0 && (
                                                <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                                                    {problem.tags.slice(0, 3).map(t => (
                                                        <span key={t.id} style={{ fontSize: '11px', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '12px', color: '#d1d5db' }}>
                                                            {t.name}
                                                        </span>
                                                    ))}
                                                    {problem.tags.length > 3 && (
                                                        <span style={{ fontSize: '11px', color: '#9ca3af' }}>+{problem.tags.length - 3}</span>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ padding: '16px 20px' }}>
                                            <span style={{
                                                background: diffBadge.bg, color: diffBadge.color,
                                                padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, textTransform: 'capitalize'
                                            }}>
                                                {problem.difficulty}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px 20px', color: '#9ca3af', fontSize: '13px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <span>🗄️ {problem.testcase_count || 0} DB</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 20px' }}>
                                            <div
                                                onClick={() => togglePublish(problem.slug, problem.is_published)}
                                                style={{
                                                    width: '40px', height: '22px', borderRadius: '11px',
                                                    background: problem.is_published ? '#10b981' : 'rgba(255,255,255,0.2)',
                                                    position: 'relative', cursor: 'pointer', transition: '0.2s'
                                                }}
                                            >
                                                <div style={{
                                                    width: '18px', height: '18px', borderRadius: '50%', background: 'white',
                                                    position: 'absolute', top: '2px', left: problem.is_published ? '20px' : '2px',
                                                    transition: '0.2s'
                                                }} />
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                                <button onClick={() => window.open(`/problems/${problem.slug}`, '_blank')}
                                                    title="Ko'rish"
                                                    style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af', width: '32px', height: '32px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                    className="hover:bg-white/10 hover:text-white">
                                                    <Eye size={16} />
                                                </button>
                                                <button onClick={() => navigate(`/admin/problems/${problem.slug}`)}
                                                    title="Tahrirlash"
                                                    style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#6366f1', width: '32px', height: '32px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                    className="hover:bg-indigo-500/20">
                                                    <Edit2 size={16} />
                                                </button>
                                                <button onClick={() => setDeleteModal({ show: true, problem })}
                                                    title="O'chirish"
                                                    style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#ef4444', width: '32px', height: '32px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                    className="hover:bg-red-500/20">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* DELETE MODAL */}
            {deleteModal.show && deleteModal.problem && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50
                }}>
                    <div style={{
                        background: '#13131f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px',
                        padding: '24px', width: '100%', maxWidth: '400px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#f0f0ff' }}>Diqqat</h3>
                                <p style={{ color: '#9ca3af', fontSize: '14px' }}>O'chirishni tasdiqlaysizmi?</p>
                            </div>
                        </div>

                        <p style={{ color: '#d1d5db', fontSize: '15px', lineHeight: 1.5, marginBottom: '24px' }}>
                            <strong style={{ color: 'white' }}>"{deleteModal.problem.title}"</strong> masalasini o'chirishni tasdiqlaysizmi? Bu amal qaytarib bo'lmaydi va barcha yechimlar ham o'chadi.
                        </p>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setDeleteModal({ show: false, problem: null })}
                                style={{ padding: '10px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'white', border: 'none', cursor: 'pointer' }}
                                className="hover:bg-white/10"
                            >
                                Bekor qilish
                            </button>
                            <button
                                onClick={handleDelete}
                                style={{ padding: '10px 16px', borderRadius: '8px', background: '#ef4444', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                                className="hover:bg-red-600"
                            >
                                Ha, o'chirib yubor
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
