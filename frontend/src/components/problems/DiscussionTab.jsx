import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MessageSquare, ThumbsUp, Reply, Trash2,
    Send, ChevronDown, ChevronUp, AlertCircle, Lock,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
    getComments, postComment, deleteComment, likeComment,
} from '../../api/problems';
import { useAuthStore } from '../../store/authStore';

/* ── Design tokens (same palette as ProblemDetail) ── */
const T = {
    bg: 'var(--bg-base)',
    surf: 'var(--bg-surface)',
    surf2: 'var(--bg-elevated)',
    b: 'rgba(255,255,255,0.055)',
    text: 'var(--text-primary)',
    sub: 'var(--text-muted)',
    cyan: '#00d4ff',
    grn: '#00e676',
    red: '#ff2d55',
    ind: '#6366f1',
    amb: '#ffb300',
    pur: '#a855f7',
};

const TYPES = [
    { value: 'general',  label: 'Umumiy',         color: T.ind, bg: `${T.ind}14` },
    { value: 'question', label: 'Savol',           color: T.amb, bg: `${T.amb}14` },
    { value: 'feedback', label: 'Fikr-mulohaza',   color: T.pur, bg: `${T.pur}14` },
];

function typeStyle(type) {
    return TYPES.find(t => t.value === type) || TYPES[0];
}

/* ── Relative time helper ── */
function relTime(dateStr) {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60)    return `${diff}s oldin`;
    if (diff < 3600)  return `${Math.floor(diff / 60)}d oldin`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}s oldin`;
    return `${Math.floor(diff / 86400)} kun oldin`;
}

/* ── Avatar ── */
function Avatar({ username, size = 32 }) {
    const colors = ['#6366f1', '#00d4ff', '#00e676', '#ffb300', '#f97316', '#a855f7'];
    const color = colors[(username?.charCodeAt(0) || 0) % colors.length];
    return (
        <div style={{
            width: size, height: size, borderRadius: '50%',
            background: `${color}22`, border: `1.5px solid ${color}44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
        }}>
            <span style={{
                fontFamily: 'var(--font-mono)', fontSize: size * 0.38,
                fontWeight: 700, color,
            }}>
                {(username || '?')[0].toUpperCase()}
            </span>
        </div>
    );
}

/* ── Comment form ── */
function CommentForm({ slug, parentId = null, onSuccess, onCancel, placeholder }) {
    const [content, setContent] = useState('');
    const [type, setType] = useState('general');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const submit = async () => {
        if (content.trim().length < 5) {
            setError('Kamida 5 ta belgi kiriting.');
            return;
        }
        setError('');
        setLoading(true);
        try {
            const body = { content: content.trim(), comment_type: type };
            if (parentId) body.parent = parentId;
            const { data } = await postComment(slug, body);
            setContent('');
            onSuccess(data);
        } catch (e) {
            setError(e?.response?.data?.detail || 'Xatolik yuz berdi.');
        } finally {
            setLoading(false);
        }
    };

    const handleKey = e => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit();
    };

    return (
        <div style={{
            background: T.surf2,
            border: `1px solid ${T.b}`,
            borderRadius: 12,
            padding: 16,
        }}>
            {/* Type selector — only for top-level */}
            {!parentId && (
                <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                    {TYPES.map(t => (
                        <button
                            key={t.value}
                            onClick={() => setType(t.value)}
                            style={{
                                height: 26, padding: '0 10px', borderRadius: 20,
                                border: `1px solid ${type === t.value ? t.color : T.b}`,
                                background: type === t.value ? t.bg : 'transparent',
                                color: type === t.value ? t.color : T.sub,
                                fontSize: 11, fontWeight: 600,
                                cursor: 'pointer', fontFamily: 'var(--font-sans)',
                                transition: 'all .15s',
                            }}
                        >{t.label}</button>
                    ))}
                </div>
            )}

            <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                onKeyDown={handleKey}
                placeholder={placeholder || 'Fikringizni yozing... (Ctrl+Enter → yuborish)'}
                maxLength={2000}
                rows={4}
                style={{
                    width: '100%', resize: 'vertical', minHeight: 90,
                    background: 'transparent',
                    border: `1px solid ${T.b}`,
                    borderRadius: 8, padding: '10px 12px',
                    color: T.text, fontSize: 13, lineHeight: 1.7,
                    fontFamily: 'var(--font-sans)',
                    outline: 'none', boxSizing: 'border-box',
                    transition: 'border-color .15s',
                }}
                onFocus={e => { e.target.style.borderColor = `${T.ind}55`; }}
                onBlur={e => { e.target.style.borderColor = T.b; }}
            />

            <div style={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', marginTop: 10,
            }}>
                <span style={{ fontSize: 10, color: T.sub, fontFamily: 'var(--font-mono)' }}>
                    {content.length}/2000
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                    {onCancel && (
                        <button
                            onClick={onCancel}
                            style={{
                                height: 32, padding: '0 14px', borderRadius: 8,
                                border: `1px solid ${T.b}`, background: 'transparent',
                                color: T.sub, fontSize: 12, fontWeight: 600,
                                cursor: 'pointer', fontFamily: 'var(--font-sans)',
                            }}
                        >Bekor</button>
                    )}
                    <button
                        onClick={submit}
                        disabled={loading || content.trim().length < 5}
                        style={{
                            height: 32, padding: '0 16px', borderRadius: 8,
                            background: loading ? `${T.ind}44` : `${T.ind}20`,
                            border: `1px solid ${T.ind}44`,
                            color: '#818cf8', fontSize: 12, fontWeight: 700,
                            cursor: loading ? 'wait' : 'pointer',
                            fontFamily: 'var(--font-sans)',
                            display: 'flex', alignItems: 'center', gap: 6,
                            opacity: content.trim().length < 5 ? 0.5 : 1,
                            transition: 'all .15s',
                        }}
                    >
                        <Send size={12} />
                        {loading ? 'Yuborilmoqda...' : 'Yuborish'}
                    </button>
                </div>
            </div>

            {error && (
                <div style={{
                    marginTop: 8, display: 'flex', alignItems: 'center', gap: 6,
                    color: T.red, fontSize: 12,
                }}>
                    <AlertCircle size={12} /> {error}
                </div>
            )}
        </div>
    );
}

/* ── Single comment card ── */
function CommentCard({ comment, slug, currentUserId, onDelete, onLike, onReplyAdded, depth = 0 }) {
    const [showReplyForm, setShowReplyForm] = useState(false);
    const [showReplies, setShowReplies] = useState(true);
    const [optimisticLike, setOptimisticLike] = useState(comment.is_liked);
    const [optimisticCount, setOptimisticCount] = useState(comment.like_count);
    const [likeLoading, setLikeLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const ts = typeStyle(comment.comment_type);

    const handleLike = async () => {
        if (likeLoading) return;
        setLikeLoading(true);
        const wasLiked = optimisticLike;
        setOptimisticLike(!wasLiked);
        setOptimisticCount(c => wasLiked ? c - 1 : c + 1);
        try {
            const { data } = await likeComment(comment.id);
            setOptimisticLike(data.liked);
            setOptimisticCount(data.like_count);
        } catch {
            setOptimisticLike(wasLiked);
            setOptimisticCount(comment.like_count);
        } finally {
            setLikeLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm("Kommentariyani o'chirmoqchimisiz?")) return;
        setDeleting(true);
        try {
            await deleteComment(comment.id);
            onDelete(comment.id);
        } catch {
            setDeleting(false);
        }
    };

    const handleReplySuccess = (newReply) => {
        setShowReplyForm(false);
        setShowReplies(true);
        onReplyAdded(comment.id, newReply);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            style={{
                marginLeft: depth > 0 ? 20 : 0,
                borderLeft: depth > 0 ? `2px solid ${T.ind}25` : 'none',
                paddingLeft: depth > 0 ? 16 : 0,
            }}
        >
            <div style={{
                background: depth === 0 ? T.surf2 : 'transparent',
                border: depth === 0 ? `1px solid ${T.b}` : 'none',
                borderRadius: depth === 0 ? 12 : 0,
                padding: depth === 0 ? 16 : '10px 0',
            }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                    <Avatar username={comment.author?.username} size={30} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{
                                fontFamily: 'var(--font-sans)', fontSize: 13,
                                fontWeight: 700, color: T.text,
                            }}>
                                {comment.author?.username || 'Anonymous'}
                            </span>
                            {depth === 0 && (
                                <span style={{
                                    height: 18, padding: '0 8px', borderRadius: 20,
                                    background: ts.bg, color: ts.color,
                                    fontSize: 10, fontWeight: 700,
                                    display: 'inline-flex', alignItems: 'center',
                                    fontFamily: 'var(--font-sans)',
                                    border: `1px solid ${ts.color}30`,
                                }}>
                                    {ts.label}
                                </span>
                            )}
                            <span style={{
                                fontSize: 11, color: T.sub,
                                fontFamily: 'var(--font-mono)',
                            }}>
                                {relTime(comment.created_at)}
                            </span>
                        </div>
                    </div>
                    {/* Delete */}
                    {comment.is_owner && (
                        <button
                            onClick={handleDelete}
                            disabled={deleting}
                            style={{
                                border: 'none', background: 'transparent',
                                color: T.sub, cursor: 'pointer', padding: 4,
                                borderRadius: 6, opacity: deleting ? 0.4 : 0.6,
                                transition: 'all .15s', flexShrink: 0,
                            }}
                            title="O'chirish"
                            onMouseEnter={e => { e.currentTarget.style.color = T.red; e.currentTarget.style.opacity = '1'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = T.sub; e.currentTarget.style.opacity = '0.6'; }}
                        >
                            <Trash2 size={13} />
                        </button>
                    )}
                </div>

                {/* Content */}
                <p style={{
                    fontSize: 13, lineHeight: 1.75, color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-sans)', margin: '0 0 12px',
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>
                    {comment.content}
                </p>

                {/* Footer actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {/* Like */}
                    <button
                        onClick={handleLike}
                        disabled={likeLoading}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            border: `1px solid ${optimisticLike ? `${T.ind}44` : T.b}`,
                            background: optimisticLike ? `${T.ind}12` : 'transparent',
                            borderRadius: 20, height: 26, padding: '0 10px',
                            color: optimisticLike ? '#818cf8' : T.sub,
                            fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            fontFamily: 'var(--font-sans)', transition: 'all .15s',
                        }}
                    >
                        <ThumbsUp size={11} fill={optimisticLike ? '#818cf8' : 'none'} />
                        {optimisticCount > 0 && <span>{optimisticCount}</span>}
                    </button>

                    {/* Reply — only top-level */}
                    {depth === 0 && currentUserId && (
                        <button
                            onClick={() => setShowReplyForm(v => !v)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 5,
                                border: 'none', background: 'transparent',
                                color: showReplyForm ? T.cyan : T.sub,
                                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                fontFamily: 'var(--font-sans)', padding: '4px 8px',
                                borderRadius: 8, transition: 'color .15s',
                            }}
                        >
                            <Reply size={12} />
                            Javob
                        </button>
                    )}

                    {/* Replies toggle */}
                    {depth === 0 && comment.replies?.length > 0 && (
                        <button
                            onClick={() => setShowReplies(v => !v)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 5,
                                border: 'none', background: 'transparent',
                                color: T.sub, fontSize: 11, fontWeight: 600,
                                cursor: 'pointer', fontFamily: 'var(--font-sans)',
                                padding: '4px 8px', borderRadius: 8, marginLeft: 'auto',
                            }}
                        >
                            {showReplies ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            {comment.replies.length} javob
                        </button>
                    )}
                </div>

                {/* Reply form */}
                <AnimatePresence>
                    {showReplyForm && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            style={{ marginTop: 14, overflow: 'hidden' }}
                        >
                            <CommentForm
                                slug={slug}
                                parentId={comment.id}
                                onSuccess={handleReplySuccess}
                                onCancel={() => setShowReplyForm(false)}
                                placeholder="Javobingizni yozing..."
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Nested replies */}
            <AnimatePresence>
                {depth === 0 && showReplies && comment.replies?.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}
                    >
                        {comment.replies.map(reply => (
                            <CommentCard
                                key={reply.id}
                                comment={reply}
                                slug={slug}
                                currentUserId={currentUserId}
                                onDelete={onDelete}
                                onLike={onLike}
                                onReplyAdded={onReplyAdded}
                                depth={1}
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

/* ── Main DiscussionTab ── */
export default function DiscussionTab({ slug }) {
    const navigate = useNavigate();
    const user = useAuthStore(s => s.user);
    const isAuth = useAuthStore(s => s.isAuthenticated);

    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [filter, setFilter] = useState('all');

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const { data } = await getComments(slug);
            setComments(data);
        } catch {
            setError('Muhokamalarni yuklashda xatolik.');
        } finally {
            setLoading(false);
        }
    }, [slug]);

    useEffect(() => { load(); }, [load]);

    const handleNewComment = (data) => {
        setComments(prev => [data, ...prev]);
        setShowForm(false);
    };

    const handleDelete = (id) => {
        setComments(prev => {
            // Top-level
            const filtered = prev.filter(c => c.id !== id);
            // Remove from replies
            return filtered.map(c => ({
                ...c,
                replies: (c.replies || []).filter(r => r.id !== id),
            }));
        });
    };

    const handleLike = (id, liked, count) => {
        setComments(prev => prev.map(c => {
            if (c.id === id) return { ...c, is_liked: liked, like_count: count };
            return {
                ...c,
                replies: (c.replies || []).map(r =>
                    r.id === id ? { ...r, is_liked: liked, like_count: count } : r
                ),
            };
        }));
    };

    const handleReplyAdded = (parentId, reply) => {
        setComments(prev => prev.map(c => {
            if (c.id !== parentId) return c;
            return { ...c, replies: [...(c.replies || []), reply] };
        }));
    };

    const filtered = filter === 'all'
        ? comments
        : comments.filter(c => c.comment_type === filter);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <MessageSquare size={15} color={T.cyan} />
                    <span style={{
                        fontFamily: 'var(--font-sans)', fontSize: 14,
                        fontWeight: 700, color: T.text,
                    }}>
                        Muhokama
                        {comments.length > 0 && (
                            <span style={{
                                marginLeft: 8, fontSize: 11, fontWeight: 600,
                                color: T.sub, fontFamily: 'var(--font-mono)',
                            }}>
                                ({comments.length})
                            </span>
                        )}
                    </span>
                </div>

                {/* Filter chips */}
                <div style={{ display: 'flex', gap: 6 }}>
                    {[{ value: 'all', label: 'Barchasi' }, ...TYPES].map(t => (
                        <button
                            key={t.value}
                            onClick={() => setFilter(t.value)}
                            style={{
                                height: 24, padding: '0 10px', borderRadius: 20,
                                border: `1px solid ${filter === t.value ? T.cyan : T.b}`,
                                background: filter === t.value ? `${T.cyan}10` : 'transparent',
                                color: filter === t.value ? T.cyan : T.sub,
                                fontSize: 11, fontWeight: 600,
                                cursor: 'pointer', fontFamily: 'var(--font-sans)',
                                transition: 'all .15s',
                            }}
                        >{t.label}</button>
                    ))}
                </div>
            </div>

            {/* New comment button / form */}
            {isAuth ? (
                <AnimatePresence mode="wait">
                    {!showForm ? (
                        <motion.button
                            key="open-btn"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowForm(true)}
                            style={{
                                width: '100%', height: 44, borderRadius: 10,
                                border: `1px dashed ${T.ind}44`,
                                background: `${T.ind}06`,
                                color: T.sub, fontSize: 13, fontWeight: 500,
                                cursor: 'pointer', fontFamily: 'var(--font-sans)',
                                display: 'flex', alignItems: 'center',
                                justifyContent: 'center', gap: 8,
                                transition: 'all .15s',
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.borderColor = `${T.ind}88`;
                                e.currentTarget.style.color = '#818cf8';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.borderColor = `${T.ind}44`;
                                e.currentTarget.style.color = T.sub;
                            }}
                        >
                            <MessageSquare size={14} />
                            Muhokamaga qo'shilish
                        </motion.button>
                    ) : (
                        <motion.div
                            key="form"
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                        >
                            <CommentForm
                                slug={slug}
                                onSuccess={handleNewComment}
                                onCancel={() => setShowForm(false)}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            ) : (
                <div style={{
                    padding: '20px 16px', borderRadius: 12,
                    border: `1px dashed ${T.b}`,
                    background: `${T.ind}06`,
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', gap: 12,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Lock size={16} color={T.sub} />
                        <span style={{ fontSize: 13, color: T.sub, fontFamily: 'var(--font-sans)' }}>
                            Muhokamaga qatnashish uchun kiring
                        </span>
                    </div>
                    <button
                        onClick={() => navigate('/login')}
                        style={{
                            height: 32, padding: '0 16px', borderRadius: 8,
                            background: `${T.ind}14`, border: `1px solid ${T.ind}35`,
                            color: '#818cf8', fontSize: 12, fontWeight: 600,
                            cursor: 'pointer', fontFamily: 'var(--font-sans)',
                            flexShrink: 0,
                        }}
                    >
                        Kirish →
                    </button>
                </div>
            )}

            {/* Divider */}
            <div style={{ height: 1, background: `linear-gradient(90deg,transparent,${T.b},transparent)` }} />

            {/* Comments list */}
            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[1, 2, 3].map(i => (
                        <div key={i} className="skel" style={{ height: 90, borderRadius: 12 }} />
                    ))}
                </div>
            ) : error ? (
                <div style={{
                    padding: '24px', textAlign: 'center', borderRadius: 12,
                    border: `1px solid rgba(255,45,85,0.15)`,
                    background: 'rgba(255,45,85,0.04)',
                }}>
                    <AlertCircle size={24} color={T.red} style={{ margin: '0 auto 8px' }} />
                    <p style={{ fontSize: 13, color: T.sub }}>{error}</p>
                    <button
                        onClick={load}
                        style={{
                            marginTop: 12, height: 32, padding: '0 16px',
                            borderRadius: 8, background: 'rgba(255,45,85,0.08)',
                            border: '1px solid rgba(255,45,85,0.22)',
                            color: T.red, fontSize: 12, fontWeight: 600,
                            cursor: 'pointer', fontFamily: 'var(--font-sans)',
                        }}
                    >
                        Qayta yuklash
                    </button>
                </div>
            ) : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 20px' }}>
                    <motion.div
                        animate={{ y: [0, -6, 0] }}
                        transition={{ duration: 3, repeat: Infinity }}
                        style={{ fontSize: 40, marginBottom: 12 }}
                    >
                        💬
                    </motion.div>
                    <p style={{
                        fontFamily: 'var(--font-sans)', fontSize: 15,
                        fontWeight: 700, color: T.sub, marginBottom: 6,
                    }}>
                        {filter === 'all' ? 'Hali muhokama yo\'q' : 'Bu turda hali muhokama yo\'q'}
                    </p>
                    <p style={{ fontSize: 12, color: T.sub }}>
                        Birinchi bo'lib fikr bildiring!
                    </p>
                </div>
            ) : (
                <AnimatePresence>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {filtered.map(comment => (
                            <CommentCard
                                key={comment.id}
                                comment={comment}
                                slug={slug}
                                currentUserId={user?.id}
                                onDelete={handleDelete}
                                onLike={handleLike}
                                onReplyAdded={handleReplyAdded}
                                depth={0}
                            />
                        ))}
                    </div>
                </AnimatePresence>
            )}
        </div>
    );
}
