import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Eye, MessageSquare, User, Reply, AlertCircle } from 'lucide-react';
import { getNewsDetail, postComment } from '../api/news';
import { useAuthStore } from '../store/authStore';

export default function NewsDetail() {
    const { id } = useParams();
    const { user, isAuthenticated } = useAuthStore();
    
    const [news, setNews] = useState(null);
    const [loading, setLoading] = useState(true);
    const [commentText, setCommentText] = useState('');
    const [replyingTo, setReplyingTo] = useState(null); // comment id
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchNewsDetail();
    }, [id]);

    const fetchNewsDetail = async () => {
        try {
            setLoading(true);
            const res = await getNewsDetail(id);
            setNews(res.data);
            document.title = `${res.data.title} | OnlineJudge`;
        } catch (err) {
            console.error('Error fetching news detail:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        if (!commentText.trim()) return;
        
        try {
            setSubmitting(true);
            setError(null);
            
            await postComment(id, {
                text: commentText,
                parent: replyingTo
            });
            
            setCommentText('');
            setReplyingTo(null);
            fetchNewsDetail(); // Refresh comments
        } catch (err) {
            const errDetail = err.response?.data?.detail || err.response?.data?.non_field_errors?.[0];
            if (errDetail) {
                setError(errDetail);
            } else {
                setError("Xatolik yuz berdi. Iltimos qayta urinib ko'ring.");
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <div style={{ width: 40, height: 40, border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            </div>
        );
    }

    if (!news) {
        return <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--text-muted)' }}>Yangilik topilmadi!</div>;
    }

    const renderComment = (comment, isReply = false) => {
        return (
            <div key={comment.id} style={{ 
                marginTop: isReply ? 16 : 24, 
                marginLeft: isReply ? 40 : 0,
                borderLeft: isReply ? '2px solid var(--border-subtle)' : 'none',
                paddingLeft: isReply ? 20 : 0
            }}>
                <div style={{ 
                    background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', 
                    borderRadius: 12, padding: 20 
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12, marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <User size={16} color="#6366f1" />
                            </div>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 15 }}>{comment.author_username}</span>
                        </div>
                        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                            {new Date(comment.created_at).toLocaleString('uz-UZ')}
                        </span>
                    </div>
                    
                    <div style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                        {comment.text}
                    </div>
                    
                    {isAuthenticated && !isReply && (
                        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                            <button 
                                onClick={() => { setReplyingTo(comment.id); setCommentText(''); setError(null); }}
                                style={{ background: 'transparent', border: 'none', color: '#6366f1', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                            >
                                <Reply size={14} /> Javob yozish
                            </button>
                        </div>
                    )}
                </div>
                
                {/* Recursive Replies */}
                {comment.replies && comment.replies.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                        {comment.replies.map(reply => renderComment(reply, true))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div style={{ width: '100%', padding: '40px 5%' }}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                {news.image && (
                    <div style={{ width: '100%', height: 360, borderRadius: 20, overflow: 'hidden', marginBottom: 32 }}>
                        <img src={news.image} alt={news.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                )}
                
                <h1 style={{ fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 20, lineHeight: 1.2 }}>
                    {news.title}
                </h1>
                
                <div style={{ display: 'flex', gap: 24, fontSize: 14, color: 'var(--text-muted)', marginBottom: 40, paddingBottom: 24, borderBottom: '1px solid var(--border-subtle)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><User size={18} /> {news.author_username}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Calendar size={18} /> {new Date(news.created_at).toLocaleDateString('uz-UZ')}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Eye size={18} /> {news.views_count} ko'rishlar</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MessageSquare size={18} /> {news.comments_count} fikrlar</span>
                </div>
                
                <div 
                    style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 64, whiteSpace: 'pre-wrap' }}
                    dangerouslySetInnerHTML={{ __html: news.content }} 
                />
            </motion.div>

            {/* Comments Section */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                <h3 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <MessageSquare size={24} /> Fikrlar ({news.comments_count})
                </h3>
                
                {isAuthenticated ? (
                    <div style={{ background: 'var(--bg-elevated)', borderRadius: 16, padding: 24, marginBottom: 40, border: '1px solid var(--border-subtle)' }}>
                        <h4 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>
                            {replyingTo ? 'Javob yozish' : 'Fikr bildirish'}
                        </h4>
                        
                        {error && (
                            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '12px 16px', borderRadius: 8, fontSize: 14, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <AlertCircle size={16} /> {error}
                            </div>
                        )}
                        
                        <form onSubmit={handleCommentSubmit}>
                            <textarea
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                placeholder="Shu yerga yozing..."
                                style={{
                                    width: '100%', minHeight: 100, background: 'var(--bg-base)', border: '1px solid var(--border-default)', 
                                    borderRadius: 12, padding: 16, color: 'var(--text-primary)', fontSize: 15, resize: 'vertical', marginBottom: 16,
                                    fontFamily: 'inherit'
                                }}
                                required
                            />
                            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                                {replyingTo && (
                                    <button 
                                        type="button" 
                                        onClick={() => setReplyingTo(null)}
                                        style={{ background: 'transparent', border: '1px solid var(--border-default)', color: 'var(--text-secondary)', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
                                    >
                                        Bekor qilish
                                    </button>
                                )}
                                <button 
                                    type="submit" 
                                    disabled={submitting || !commentText.trim()}
                                    className="btn-glow"
                                    style={{ padding: '10px 24px', borderRadius: 8, opacity: submitting ? 0.7 : 1 }}
                                >
                                    {submitting ? 'Yuborilmoqda...' : 'Yuborish'}
                                </button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <div style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: 32, textAlign: 'center', marginBottom: 40 }}>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: 16, fontSize: 15 }}>
                            Fikr bildirish uchun tizimga kirishingiz kerak.
                        </p>
                        <Link to="/login" className="btn-glow" style={{ display: 'inline-flex', padding: '10px 24px' }}>
                            Tizimga kirish
                        </Link>
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {news.comments && news.comments.length > 0 ? (
                        news.comments.map(comment => renderComment(comment))
                    ) : (
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>
                            Hali hech kim fikr bildirmagan. Birinchi bo'ling!
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
