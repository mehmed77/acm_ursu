import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../api/axios';
import Spinner from '../components/ui/Spinner';

const RANKS = [
    { min: 2100, label: 'Master', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    { min: 1900, label: 'Candidate Master', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
    { min: 1600, label: 'Expert', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
    { min: 1400, label: 'Specialist', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    { min: 1200, label: 'Pupil', color: '#9ca3af', bg: 'rgba(156,163,175,0.12)' },
    { min: 0, label: 'Newbie', color: '#4a4a6a', bg: 'rgba(74,74,106,0.12)' },
];

const getRank = (rating) => RANKS.find(r => rating >= r.min) || RANKS.at(-1);

export default function Profile() {
    const { username } = useParams();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, text: '' });

    useEffect(() => {
        const fetch = async () => {
            setLoading(true);
            try {
                const res = await api.get(`/users/${username}/`);
                setProfile(res.data);
                document.title = `${username} — Profil`;
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [username]);

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
            <Spinner />
        </div>
    );

    if (!profile) return (
        <div style={{ textAlign: 'center', padding: '100px 20px', color: '#9ca3af' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>👤</div>
            Foydalanuvchi topilmadi
        </div>
    );

    const rank = getRank(profile.rating);
    const maxRank = getRank(profile.max_rating);

    // Heatmap uchun oylarni topamiz (oxirgi 1 yil)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Yechilgan masalalar ro'yxati (map)
    const problemMap = profile.problem_map || [];
    const heatmap = profile.heatmap || [];

    const handleMouseMove = (e, text) => {
        setTooltip({ show: true, x: e.clientX, y: e.clientY, text });
    };

    const handleMouseLeave = () => {
        setTooltip(prev => ({ ...prev, show: false }));
    };

    const getStatusColor = (status) => {
        if (status === 'solved') return { bg: '#10b981', color: '#fff', border: '1px solid #059669' };
        if (status === 'wrong') return { bg: '#ef4444', color: '#fff', border: '1px solid #dc2626' };
        if (status === 'attempted') return { bg: '#f59e0b', color: '#fff', border: '1px solid #d97706' };
        return { bg: 'rgba(255,255,255,0.05)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.08)' };
    };

    return (
        <div style={{ paddingBottom: 64, position: 'relative' }}>
            {/* TOOLTIP */}
            {tooltip.show && (
                <div style={{
                    position: 'fixed', left: tooltip.x + 15, top: tooltip.y + 15, zIndex: 9999, pointerEvents: 'none',
                    background: '#13131f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '6px 10px',
                    fontSize: 12, color: '#e8e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                }}>
                    {tooltip.text}
                </div>
            )}

            {/* SECTION 1 — PROFILE HERO */}
            <div style={{
                background: `radial-gradient(ellipse at top, ${rank.color}15 0%, transparent 60%)`,
                padding: '48px 40px 32px',
                borderBottom: '1px solid rgba(255,255,255,0.06)'
            }}>
                <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', gap: 32, alignItems: 'center' }}>
                    <div style={{
                        width: 80, height: 80, flexShrink: 0, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        border: `3px solid ${rank.color}`,
                        boxShadow: `0 0 28px ${rank.color}40`,
                        fontSize: 32, fontWeight: 800, color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        {profile.username[0].toUpperCase()}
                    </div>

                    <div>
                        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#f0f0ff', margin: 0 }}>
                            {profile.username}
                        </h1>
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            background: rank.bg, border: `1px solid ${rank.color}30`,
                            borderRadius: 8, padding: '4px 12px',
                            color: rank.color, fontSize: 13, fontWeight: 700,
                            marginTop: 8
                        }}>
                            {rank.icon} {rank.label}
                        </div>
                        <div style={{ display: 'flex', gap: 20, marginTop: 12, color: '#9ca3af', fontSize: 13 }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>📅 Ro'yxatdan o'tgan: <strong style={{ color: '#f0f0ff', fontWeight: 500 }}>{new Date(profile.date_joined).getFullYear()} yil</strong></span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>🕐 Oxirgi faollik: <strong style={{ color: '#f0f0ff', fontWeight: 500 }}>{profile.last_login ? new Date(profile.last_login).toLocaleDateString() : 'Noma\'lum'}</strong></span>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 20px', display: 'flex', flexDirection: 'column', gap: 40 }}>

                {/* HEMIS MA'LUMOTLARI — faqat data bo'lsa va ruxsat bo'lsa */}
                {profile.university && (
                    <div style={{
                        background: 'rgba(59,130,246,0.04)',
                        border: '1px solid rgba(59,130,246,0.12)',
                        borderRadius: 14,
                        padding: 20,
                    }}>
                        <div style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: '#3a3a5a',
                            letterSpacing: '0.1em',
                            marginBottom: 14,
                            textTransform: 'uppercase',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                        }}>
                            <span style={{ fontSize: 16 }}>🎓</span> HEMIS ma'lumotlari
                        </div>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: 10,
                        }}>
                            {[
                                { label: 'Universitet', value: profile.university },
                                { label: 'Fakultet', value: profile.faculty },
                                { label: 'Mutaxassislik', value: profile.specialty_name },
                                { label: 'Guruh', value: profile.group_name },
                                { label: 'Kurs', value: profile.student_level },
                                { label: 'Semestr', value: profile.semester_name },
                                { label: "Ta'lim shakli", value: profile.education_form },
                                { label: "To'lov", value: profile.payment_form },
                                { label: 'GPA', value: profile.avg_gpa ? `${profile.avg_gpa} / 5.0` : null },
                                { label: 'Holat', value: profile.student_status },
                                { label: "Ta'lim tili", value: profile.education_lang },
                            ].filter(r => r.value).map(row => (
                                <div key={row.label} style={{
                                    padding: '8px 12px',
                                    background: 'rgba(255,255,255,0.02)',
                                    borderRadius: 8,
                                }}>
                                    <div style={{
                                        fontSize: 10,
                                        color: '#3a3a5a',
                                        marginBottom: 3,
                                    }}>
                                        {row.label}
                                    </div>
                                    <div style={{
                                        fontSize: 12,
                                        fontWeight: 600,
                                        color: '#d4d4e8',
                                    }}>
                                        {row.value}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {/* SECTION 2 — STATS CARDS */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>

                    {/* Card 1 — ROBO RANK */}
                    <div className="stat-card" style={{
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 14, padding: '20px 24px', position: 'relative', overflow: 'hidden'
                    }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, #f59e0b80, transparent)' }} />
                        <div style={{ fontSize: 20 }}>🥇</div>
                        <div style={{ fontSize: 28, fontWeight: 800, color: '#f0f0ff', margin: '8px 0 4px' }}>#{profile.rank}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#f59e0b' }}>Global Rank</div>
                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>/ {profile.total_users} ta o'yinchi</div>
                    </div>

                    {/* Card 2 — RATING */}
                    <div className="stat-card" style={{
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 14, padding: '20px 24px', position: 'relative', overflow: 'hidden'
                    }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, #8b5cf680, transparent)' }} />
                        <div style={{ fontSize: 20 }}>🏆</div>
                        <div style={{ fontSize: 28, fontWeight: 800, color: rank.color, margin: '8px 0 4px' }}>{profile.rating}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#f0f0ff' }}>Rating</div>
                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
                            <span>Max: {profile.max_rating}</span>
                        </div>
                        <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, marginTop: 12, position: 'relative' }}>
                            <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${Math.min(100, profile.rating / 2400 * 100)}%`, background: rank.color, borderRadius: 2 }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#4b5563', marginTop: 4, fontWeight: 600 }}>
                            <span>0</span> <span>1200</span> <span>1600</span> <span>2100+</span>
                        </div>
                    </div>

                    {/* Card 3 — SOLVED */}
                    <div className="stat-card" style={{
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 14, padding: '20px 24px', position: 'relative', overflow: 'hidden'
                    }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, #10b98180, transparent)' }} />
                        <div style={{ fontSize: 20 }}>✅</div>
                        <div style={{ fontSize: 28, fontWeight: 800, color: '#f0f0ff', margin: '8px 0 4px' }}>{profile.solved_count}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#10b981' }}>Yechilgan masalalar</div>
                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>/ {profile.total_problems} ta masala</div>
                        <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, marginTop: 12, position: 'relative' }}>
                            <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${profile.total_problems ? Math.min(100, profile.solved_count / profile.total_problems * 100) : 0}%`, background: '#10b981', borderRadius: 2 }} />
                        </div>
                    </div>

                    {/* Card 4 — ACCEPTANCE */}
                    <div className="stat-card" style={{
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 14, padding: '20px 24px', position: 'relative', overflow: 'hidden'
                    }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, #3b82f680, transparent)' }} />
                        <div style={{ fontSize: 20 }}>📊</div>
                        <div style={{ fontSize: 28, fontWeight: 800, color: '#f0f0ff', margin: '8px 0 4px' }}>{profile.stats.acceptance_rate}%</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#3b82f6' }}>Qabul darajasi</div>
                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>{profile.stats.accepted} / {profile.stats.total} submit</div>
                    </div>
                </div>

                {/* SECTION 3 — ACTIVITY HEATMAP */}
                <div>
                    <h2 style={{ fontSize: 20, fontWeight: 800, color: '#f0f0ff', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                        Faollik xaritasi
                    </h2>
                    <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 20 }}>{new Date().getFullYear()} yil</p>

                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 14, padding: 24, overflowX: 'auto' }}>
                        <div style={{ display: 'flex', gap: 8, minWidth: 'max-content' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 19, justifyContent: 'center', paddingTop: 20, paddingRight: 8, fontSize: 11, color: '#6b7280', fontWeight: 600 }}>
                                <span>D</span>
                                <span>C</span>
                                <span>J</span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6b7280', fontWeight: 600, paddingLeft: 8 }}>
                                    {months.map(m => <span key={m}>{m}</span>)}
                                </div>

                                {/* 52 ustun, 7 qator */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(53, 1fr)', gap: 3 }}>
                                    {/* We'll fill the columns row-by-row but CSS grid uses row-major. So we transform the linear array to column-major. Note: For simplicity we just map out squares assuming they flow by column */}
                                    {/* The user wants purely grid layout. This is a simplified flex-column approach inside grid layout to simulate GitHub */}
                                    {Array.from({ length: 53 }).map((_, colIndex) => (
                                        <div key={colIndex} style={{ display: 'grid', gridTemplateRows: 'repeat(7, 1fr)', gap: 3 }}>
                                            {Array.from({ length: 7 }).map((_, rowIndex) => {
                                                const dayIndex = colIndex * 7 + rowIndex;
                                                const dayData = heatmap[dayIndex] || null;

                                                if (!dayData) return <div key={rowIndex} style={{ width: 12, height: 12, background: 'transparent' }} />;

                                                let bg = 'rgba(255,255,255,0.05)';
                                                if (dayData.count === 1) bg = 'rgba(99,102,241,0.25)';
                                                else if (dayData.count === 2) bg = 'rgba(99,102,241,0.45)';
                                                else if (dayData.count === 3) bg = 'rgba(99,102,241,0.65)';
                                                else if (dayData.count >= 4) bg = 'rgba(99,102,241,0.90)';

                                                return (
                                                    <div
                                                        key={rowIndex}
                                                        style={{ width: 12, height: 12, borderRadius: 3, background: bg, cursor: 'pointer', transition: 'transform 0.1s' }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.transform = 'scale(1.3)';
                                                            e.currentTarget.style.zIndex = '10';
                                                            handleMouseMove(e, `${dayData.date}: ${dayData.count} ta submission`);
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.transform = 'scale(1)';
                                                            e.currentTarget.style.zIndex = '1';
                                                            handleMouseLeave();
                                                        }}
                                                    />
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginTop: 20, fontSize: 11, color: '#6b7280', fontWeight: 600 }}>
                            Kam
                            <div style={{ width: 12, height: 12, borderRadius: 3, background: 'rgba(255,255,255,0.05)' }} />
                            <div style={{ width: 12, height: 12, borderRadius: 3, background: 'rgba(99,102,241,0.25)' }} />
                            <div style={{ width: 12, height: 12, borderRadius: 3, background: 'rgba(99,102,241,0.45)' }} />
                            <div style={{ width: 12, height: 12, borderRadius: 3, background: 'rgba(99,102,241,0.65)' }} />
                            <div style={{ width: 12, height: 12, borderRadius: 3, background: 'rgba(99,102,241,0.90)' }} />
                            Ko'p
                        </div>
                    </div>
                </div>

                {/* SECTION 4 — SOLVED PROBLEMS MAP */}
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyItems: 'center', marginBottom: 20 }}>
                        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#f0f0ff', margin: 0 }}>
                            Yechilgan masalalar xaritasi
                        </h2>
                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#a5b4fc', border: '1px solid rgba(255,255,255,0.1)' }}>
                            {profile.solved_count} / {profile.total_problems}
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 24, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 14 }}>
                        {problemMap.map((p) => {
                            const st = getStatusColor(p.status);
                            return (
                                <div
                                    key={p.slug}
                                    onClick={() => navigate(`/problems/${p.slug}`)}
                                    style={{
                                        width: 68, height: 32, borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: st.bg, color: st.color, border: st.border,
                                        transition: 'transform 0.15s, box-shadow 0.15s'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (p.status !== 'none') {
                                            e.currentTarget.style.transform = 'scale(1.05)';
                                            e.currentTarget.style.boxShadow = `0 4px 12px ${st.bg}40`;
                                        }
                                        handleMouseMove(e, `${p.slug}: ${p.title}`);
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'scale(1)';
                                        e.currentTarget.style.boxShadow = 'none';
                                        handleMouseLeave();
                                    }}
                                >
                                    {p.slug}
                                </div>
                            );
                        })}
                        {problemMap.length === 0 && <div style={{ color: '#6b7280', fontSize: 13 }}>Masalalar topilmadi</div>}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginTop: 16, fontSize: 12, color: '#9ca3af', fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} /> Yechilgan</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} /> Wrong Answer</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} /> Urinilgan</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} /> Yangi</div>
                    </div>
                </div>

                {/* SECTION 5 — SO'NGI SUBMISSIONLAR */}
                <div>
                    <h2 style={{ fontSize: 20, fontWeight: 800, color: '#f0f0ff', marginBottom: 20 }}>
                        So'nggi submissionlar
                    </h2>

                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 14, overflow: 'hidden' }}>
                        {(!profile.recent_submissions || profile.recent_submissions.length === 0) ? (
                            <div style={{ padding: '60px 24px', textAlign: 'center', color: '#6b7280' }}>
                                Hali submissionlar yo'q
                            </div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255,255,255,0.03)', color: '#9ca3af', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        <th style={{ padding: '16px 24px', fontWeight: 700 }}>Vaqt</th>
                                        <th style={{ padding: '16px 24px', fontWeight: 700 }}>Masala</th>
                                        <th style={{ padding: '16px 24px', fontWeight: 700 }}>Status</th>
                                        <th style={{ padding: '16px 24px', fontWeight: 700 }}>Til</th>
                                        <th style={{ padding: '16px 24px', fontWeight: 700 }}>Runtime</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {profile.recent_submissions.map((sub, i) => {
                                        let statusBadge = null;
                                        if (sub.status.toLowerCase() === 'accepted') {
                                            statusBadge = <span style={{ color: '#10b981', fontWeight: 800 }}>AC</span>;
                                        } else if (sub.status.toLowerCase() === 'wrong_answer') {
                                            statusBadge = <span style={{ color: '#ef4444', fontWeight: 800 }}>WA</span>;
                                        } else if (sub.status.toLowerCase() === 'time_limit_exceeded') {
                                            statusBadge = <span style={{ color: '#f59e0b', fontWeight: 800 }}>TLE</span>;
                                        } else if (sub.status.toLowerCase() === 'runtime_error') {
                                            statusBadge = <span style={{ color: '#ef4444', fontWeight: 800 }}>RE</span>;
                                        } else if (sub.status.toLowerCase() === 'compilation_error') {
                                            statusBadge = <span style={{ color: '#f97316', fontWeight: 800 }}>CE</span>;
                                        } else {
                                            statusBadge = <span style={{ color: '#9ca3af', fontWeight: 800 }}>{sub.status}</span>;
                                        }

                                        return (
                                            <tr key={sub.id} style={{ borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none', cursor: 'pointer', transition: 'background 0.15s' }} className="hover:bg-white/5" onClick={() => navigate(`/problems/${sub.problem_slug}`)}>
                                                <td style={{ padding: '16px 24px', color: '#6b7280', fontSize: 13, whiteSpace: 'nowrap' }}>
                                                    {new Date(sub.created_at).toLocaleString('uz-UZ', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                                <td style={{ padding: '16px 24px' }}>
                                                    <div style={{ color: '#e8e8f0', fontWeight: 600, fontSize: 14 }}>{sub.problem_slug} - {sub.problem_title}</div>
                                                </td>
                                                <td style={{ padding: '16px 24px' }}>{statusBadge}</td>
                                                <td style={{ padding: '16px 24px', color: '#a5b4fc', fontSize: 13, fontWeight: 500 }}>
                                                    {sub.language}
                                                </td>
                                                <td style={{ padding: '16px 24px', color: '#9ca3af', fontSize: 13, fontFeatureSettings: '"tnum"' }}>
                                                    {sub.time_used ? `${sub.time_used}ms` : '—'}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
