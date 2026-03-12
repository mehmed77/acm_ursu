import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Eye, MessageSquare, ArrowRight } from 'lucide-react';
import { getNews } from '../api/news';

export default function NewsList() {
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        document.title = 'Yangiliklar | OnlineJudge';
        fetchNews();
    }, []);

    const fetchNews = async () => {
        try {
            const res = await getNews();
            setNews(Array.isArray(res.data) ? res.data : (res.data.results || []));
        } catch (error) {
            console.error('Error fetching news:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <div style={{ width: 40, height: 40, border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px' }}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 40, textAlign: 'center' }}>
                <h1 style={{ fontSize: 40, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16 }}>So'nggi Yangiliklar</h1>
                <p style={{ fontSize: 16, color: 'var(--text-secondary)' }}>Platformadagi barcha yangiliklar, e'lonlar va musobaqa natijalari</p>
            </motion.div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 24 }}>
                {news.map((item, idx) => (
                    <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}
                        style={{
                            background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 16,
                            overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'all 0.3s ease', cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
                    >
                        <div style={{ height: 200, background: 'var(--border-subtle)', position: 'relative' }}>
                            {item.image ? (
                                <img src={item.image} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1))' }}>
                                    <span style={{ fontSize: 48 }}>📰</span>
                                </div>
                            )}
                            <div style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '4px 10px', borderRadius: 20, fontSize: 12, color: '#fff', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Calendar size={14} /> {new Date(item.created_at).toLocaleDateString('uz-UZ')}
                            </div>
                        </div>
                        
                        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', flex: 1 }}>
                            <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Eye size={16} /> {item.views_count}</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MessageSquare size={16} /> {item.comments_count}</span>
                                <span>Muallif: <strong style={{ color: 'var(--text-primary)' }}>{item.author_username}</strong></span>
                            </div>
                            
                            <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16, lineHeight: 1.4, flex: 1 }}>
                                {item.title}
                            </h3>
                            
                            <Link to={`/news/${item.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#6366f1', fontSize: 14, fontWeight: 600 }}>
                                Batafsil o'qish <ArrowRight size={16} />
                            </Link>
                        </div>
                    </motion.div>
                ))}
            </div>
            {news.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                    Hozircha yangiliklar yo'q
                </div>
            )}
        </div>
    );
}
