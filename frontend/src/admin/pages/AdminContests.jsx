import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { adminApi } from '../../api/admin';

export default function AdminContests() {
    const navigate = useNavigate();
    const [contests, setContests] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchContests = async () => {
        try {
            const res = await adminApi.getContests();
            setContests(res.data);
        } catch (err) {
            console.error(err);
            alert("Xatolik");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchContests();
    }, []);

    const handleDelete = async (slug, title) => {
        if (!window.confirm(`${title} musobaqasini o'chirasizmi?`)) return;
        try {
            await adminApi.deleteContest(slug);
            fetchContests();
        } catch (err) {
            alert("Xatolik");
        }
    };

    if (loading) return <div style={{ color: '#9898bb', padding: 40, textAlign: 'center' }}>Yuklanmoqda...</div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f0f0ff' }}>Musobaqalar</h1>
                <Link to="/admin/contests/new" style={{
                    padding: '8px 16px', borderRadius: 8, background: '#6366f1', color: 'white',
                    textDecoration: 'none', fontSize: 13, fontWeight: 600,
                }}>+ Yangi Musobaqa</Link>
            </div>

            <div style={{
                background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12, overflow: 'hidden',
            }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            <th style={{ padding: '12px 16px', textAlign: 'left', color: '#9898bb' }}>Nomi</th>
                            <th style={{ padding: '12px 16px', textAlign: 'center', color: '#9898bb' }}>Status</th>
                            <th style={{ padding: '12px 16px', textAlign: 'center', color: '#9898bb' }}>Turi</th>
                            <th style={{ padding: '12px 16px', textAlign: 'center', color: '#9898bb' }}>Davomiyligi</th>
                            <th style={{ padding: '12px 16px', textAlign: 'center', color: '#9898bb' }}>Boshlanish</th>
                            <th style={{ padding: '12px 16px', textAlign: 'right', color: '#9898bb' }}>Amallar</th>
                        </tr>
                    </thead>
                    <tbody>
                        {contests.map(c => (
                            <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                <td style={{ padding: '12px 16px', color: '#e8e8f0', fontWeight: 600 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        {c.title}
                                        {!c.is_public && <span style={{ padding: '2px 6px', background: '#3f3f46', borderRadius: 4, fontSize: 10 }}>Maxfiy</span>}
                                    </div>
                                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
                                        {c.problem_count} ta masala
                                    </div>
                                </td>
                                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                    <span style={{
                                        padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                                        background: c.status === 'running' ? 'rgba(16,185,129,0.1)'
                                            : c.status === 'finished' ? 'rgba(107,114,128,0.1)'
                                                : c.status === 'frozen' ? 'rgba(59,130,246,0.1)'
                                                    : 'rgba(245,158,11,0.1)',
                                        color: c.status === 'running' ? '#10b981'
                                            : c.status === 'finished' ? '#9ca3af'
                                                : c.status === 'frozen' ? '#3b82f6'
                                                    : '#f59e0b',
                                    }}>{c.status.toUpperCase()}</span>
                                </td>
                                <td style={{ padding: '12px 16px', textAlign: 'center', color: '#c4b5fd' }}>
                                    {c.contest_type.toUpperCase()}
                                </td>
                                <td style={{ padding: '12px 16px', textAlign: 'center', color: '#9898bb' }}>
                                    {Math.floor(c.duration_min / 60)}h {c.duration_min % 60}m
                                </td>
                                <td style={{ padding: '12px 16px', textAlign: 'center', color: '#9898bb' }}>
                                    {new Date(c.start_time).toLocaleString('uz-UZ')}
                                </td>
                                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                        <button
                                            onClick={() => navigate(`/admin/contests/${c.slug}`)}
                                            style={{
                                                padding: '4px 8px', borderRadius: 6, border: 'none',
                                                background: 'rgba(99,102,241,0.1)', color: '#a5b4fc',
                                                cursor: 'pointer', fontSize: 12,
                                            }}
                                        >Tahrirlash</button>
                                        <button
                                            onClick={() => handleDelete(c.slug, c.title)}
                                            style={{
                                                padding: '4px 8px', borderRadius: 6, border: 'none',
                                                background: 'rgba(239,68,68,0.1)', color: '#fca5a5',
                                                cursor: 'pointer', fontSize: 12,
                                            }}
                                        >O'chirish</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {contests.length === 0 && (
                            <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30, color: '#6b7280' }}>Musobaqalar yo'q</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
