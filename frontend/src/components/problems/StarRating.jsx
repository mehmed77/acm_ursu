import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star } from 'lucide-react';
import { getRating, postRating } from '../../api/problems';
import { useAuthStore } from '../../store/authStore';

const T = {
    b: 'rgba(255,255,255,0.055)',
    sub: 'var(--text-muted)',
    text: 'var(--text-primary)',
    surf2: 'var(--bg-elevated)',
    ind: '#6366f1',
    amb: '#ffb300',
};

/* Bitta yulduz */
function StarIcon({ filled, hovered, size = 14 }) {
    const color = filled || hovered ? T.amb : T.sub;
    return (
        <Star
            size={size}
            fill={filled ? T.amb : 'none'}
            color={color}
            style={{ transition: 'all .12s', flexShrink: 0 }}
        />
    );
}

export default function StarRating({ slug }) {
    const isAuth = useAuthStore(s => s.isAuthenticated);

    const [stats, setStats] = useState({ average: 0, count: 0, user_rating: null });
    const [hover, setHover] = useState(0);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);

    useEffect(() => {
        let cancelled = false;
        getRating(slug)
            .then(({ data }) => { if (!cancelled) { setStats(data); setLoading(false); } })
            .catch(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [slug]);

    const handleRate = async (value) => {
        if (!isAuth || submitting) return;
        setSubmitting(true);
        try {
            const { data } = await postRating(slug, value);
            setStats(prev => ({
                ...prev,
                average: data.average,
                count: data.count,
                user_rating: data.user_rating,
            }));
        } finally {
            setSubmitting(false);
        }
    };

    const displayRating = hover || stats.user_rating || 0;

    const labels = ['', 'Juda qiyin', 'Qiyin', 'O\'rtacha', 'Oson', 'Juda oson'];

    if (loading) {
        return (
            <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                height: 26, padding: '0 10px', borderRadius: 7,
                background: T.surf2, border: `1px solid ${T.b}`,
            }}>
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="skel" style={{ width: 12, height: 12, borderRadius: 3 }} />
                ))}
            </div>
        );
    }

    return (
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {/* Stars row */}
            <div
                style={{
                    display: 'inline-flex', alignItems: 'center', gap: 3,
                    height: 28, padding: '0 10px', borderRadius: 8,
                    background: T.surf2, border: `1px solid ${T.b}`,
                    cursor: isAuth ? (submitting ? 'wait' : 'pointer') : 'default',
                    position: 'relative',
                }}
                onMouseLeave={() => { setHover(0); setShowTooltip(false); }}
            >
                {[1, 2, 3, 4, 5].map(i => (
                    <motion.button
                        key={i}
                        whileTap={isAuth ? { scale: 0.8 } : {}}
                        onMouseEnter={() => { if (isAuth) { setHover(i); setShowTooltip(true); } }}
                        onClick={() => handleRate(i)}
                        disabled={submitting}
                        style={{
                            border: 'none', background: 'transparent',
                            cursor: isAuth ? 'pointer' : 'default',
                            padding: 1, display: 'flex',
                        }}
                        title={isAuth ? labels[i] : ''}
                    >
                        <StarIcon
                            filled={i <= (stats.user_rating || 0)}
                            hovered={i <= displayRating && hover > 0}
                        />
                    </motion.button>
                ))}
            </div>

            {/* Stats */}
            {stats.count > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 12,
                        fontWeight: 700, color: T.amb,
                    }}>
                        {stats.average.toFixed(1)}
                    </span>
                    <span style={{ fontSize: 10, color: T.sub, fontFamily: 'var(--font-sans)' }}>
                        ({stats.count})
                    </span>
                </div>
            )}

            {/* Hover tooltip */}
            <AnimatePresence>
                {showTooltip && hover > 0 && (
                    <motion.div
                        key={hover}
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.12 }}
                        style={{
                            position: 'absolute', bottom: '110%', left: '50%',
                            transform: 'translateX(-50%)',
                            background: '#1a1a3e', border: `1px solid ${T.amb}33`,
                            borderRadius: 8, padding: '5px 10px',
                            fontSize: 11, fontWeight: 600, color: T.amb,
                            fontFamily: 'var(--font-sans)',
                            whiteSpace: 'nowrap', pointerEvents: 'none',
                            zIndex: 10,
                            boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                        }}
                    >
                        {labels[hover]}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
