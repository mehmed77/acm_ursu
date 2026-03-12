import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api/admin';
import { Plus, Edit2, Trash2, Calendar, Eye, MessageSquare } from 'lucide-react';
import { toast } from '../components/Toast';

export default function AdminNews() {
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        document.title = 'Yangiliklar | Admin Panel';
        fetchNews();
    }, []);

    const fetchNews = async () => {
        try {
            setLoading(true);
            const res = await adminApi.getNewsList();
            setNews(Array.isArray(res.data) ? res.data : (res.data.results || []));
        } catch (error) {
            toast.error("Yangiliklarni yuklashda xatolik yuz berdi");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Rostdan ham bu yangilikni o'chirmoqchimisiz?")) return;
        
        try {
            await adminApi.deleteNews(id);
            toast.success("Yangilik o'chirildi");
            fetchNews();
        } catch (error) {
            toast.error("O'chirishda xatolik yuz berdi");
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: 'white' }}>Yangiliklar boshqaruvi</h1>
                <Link to="/admin/news/new" className="btn-glow" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px' }}>
                    <Plus size={18} /> Yangi qo'shish
                </Link>
            </div>

            <div style={{ background: '#1a1a32', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: 'rgba(0,0,0,0.2)', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <th style={{ padding: '16px 20px', color: '#a5b4fc', fontWeight: 600, fontSize: 13 }}>ID</th>
                            <th style={{ padding: '16px 20px', color: '#a5b4fc', fontWeight: 600, fontSize: 13 }}>Sarlavha</th>
                            <th style={{ padding: '16px 20px', color: '#a5b4fc', fontWeight: 600, fontSize: 13 }}>Sana</th>
                            <th style={{ padding: '16px 20px', color: '#a5b4fc', fontWeight: 600, fontSize: 13 }}>Statistika</th>
                            <th style={{ padding: '16px 20px', color: '#a5b4fc', fontWeight: 600, fontSize: 13, textAlign: 'right' }}>Amallar</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Yuklanmoqda...</td></tr>
                        ) : news.length === 0 ? (
                            <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Hozircha yangiliklar yo'q</td></tr>
                        ) : (
                            news.map((item) => (
                                <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    <td style={{ padding: '16px 20px', color: '#9ca3af', fontSize: 14 }}>#{item.id}</td>
                                    <td style={{ padding: '16px 20px', color: 'white', fontSize: 15, fontWeight: 500 }}>
                                        {item.title}
                                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Muallif: {item.author_username}</div>
                                    </td>
                                    <td style={{ padding: '16px 20px', color: '#9ca3af', fontSize: 14 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Calendar size={14} /> {new Date(item.created_at).toLocaleDateString('uz-UZ')}
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px 20px', color: '#9ca3af', fontSize: 14 }}>
                                        <div style={{ display: 'flex', gap: 12 }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Eye size={14} /> {item.views_count}</span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MessageSquare size={14} /> {item.comments_count}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                                            <Link to={`/admin/news/${item.id}`} style={{ padding: 8, background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', borderRadius: 6, transition: '0.2s', display: 'flex', alignItems: 'center' }}>
                                                <Edit2 size={16} />
                                            </Link>
                                            <button 
                                                onClick={() => handleDelete(item.id)}
                                                style={{ padding: 8, background: 'rgba(239,68,68,0.1)', color: '#fca5a5', border: 'none', borderRadius: 6, cursor: 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center' }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
