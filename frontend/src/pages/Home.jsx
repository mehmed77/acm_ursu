import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Code2, Users, Zap, Trophy, ArrowRight, BarChart3 } from 'lucide-react';

const stagger = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } } };

const stats = [
    { icon: Code2, value: '500+', label: 'Masalalar', accent: '#6366f1', bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.20)', glow: 'rgba(99,102,241,0.5)' },
    { icon: Users, value: '10,000+', label: 'Foydalanuvchilar', accent: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.20)', glow: 'rgba(139,92,246,0.5)' },
    { icon: Zap, value: '1M+', label: 'Submissions', accent: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.20)', glow: 'rgba(167,139,250,0.5)' },
];

const features = [
    { icon: Code2, title: 'Monaco Code Editor', desc: 'VS Code engine. Python, C++, Java, JavaScript. Syntax highlighting va IntelliSense bilan.', accent: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
    { icon: Zap, title: 'Real-time Judging', desc: "Judge0 API — submissionlar sekundlar ichida baholanadi. Barchasi real-vaqtda.", accent: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
    { icon: Trophy, title: 'ACM/ICPC Kontestlar', desc: 'Rated kontestlar. ACM uslubi penalty tizimi. Global leaderboard.', accent: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    { icon: BarChart3, title: 'Global Reyting', desc: "ELO tizimi. Newbie → Master. Rating dinamikasi va statistikalar.", accent: '#10b981', bg: 'rgba(16,185,129,0.12)' },
];

const mockSubmissions = [
    { user: 'coder_uz', problem: 'Two Sum', status: 'ACCEPTED', lang: 'Python', time: '2s oldin' },
    { user: 'algo_master', problem: 'Binary Search', status: 'ACCEPTED', lang: 'C++', time: '15s oldin' },
    { user: 'newbie01', problem: 'Fibonacci', status: 'WRONG_ANSWER', lang: 'Java', time: '32s oldin' },
    { user: 'pro_dev', problem: 'Merge Sort', status: 'ACCEPTED', lang: 'C++', time: '1 min oldin' },
    { user: 'student_x', problem: 'Graph BFS', status: 'TLE', lang: 'Python', time: '2 min oldin' },
    { user: 'champion', problem: 'DP Knapsack', status: 'ACCEPTED', lang: 'C++', time: '3 min oldin' },
    { user: 'fast_coder', problem: 'String Match', status: 'PENDING', lang: 'JavaScript', time: '4 min oldin' },
    { user: 'learner_42', problem: 'Tree DFS', status: 'WRONG_ANSWER', lang: 'Java', time: '5 min oldin' },
];

const statusStyle = {
    ACCEPTED: { bg: 'rgba(16,185,129,0.12)', color: '#10b981', border: 'rgba(16,185,129,0.20)', label: 'Accepted' },
    WRONG_ANSWER: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', border: 'rgba(239,68,68,0.20)', label: 'Wrong Answer' },
    TLE: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: 'rgba(245,158,11,0.20)', label: 'TLE' },
    PENDING: { bg: 'rgba(99,102,241,0.12)', color: '#6366f1', border: 'rgba(99,102,241,0.20)', label: 'Pending' },
};

export default function Home() {
    useEffect(() => { document.title = 'OnlineJudge — Code. Compete. Conquer.'; }, []);

    return (
        <div style={{ position: 'relative', overflow: 'hidden' }}>

            {/* ═══ HERO ═══ */}
            <section style={{ position: 'relative', paddingTop: 120, paddingBottom: 0 }}>
                {/* BG effects */}
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 0,
                    background: `
            radial-gradient(ellipse 100% 60% at 50% 0%, rgba(99,102,241,0.10) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 80% 20%, rgba(139,92,246,0.06) 0%, transparent 50%)
          `,
                }} />

                <motion.div variants={stagger} initial="hidden" animate="visible"
                    style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>

                    {/* Badge */}
                    <motion.div variants={fadeUp}>
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 8,
                            background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.25)',
                            borderRadius: 100, padding: '6px 16px', fontSize: 13, color: '#a5b4fc', marginBottom: 24,
                        }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', boxShadow: '0 0 8px #6366f1' }} />
                            ACM/ICPC Online Judge Platform
                        </div>
                    </motion.div>

                    {/* Title */}
                    <motion.h1 variants={fadeUp} style={{
                        fontSize: 'clamp(48px, 8vw, 80px)', fontWeight: 800, letterSpacing: -2, lineHeight: 1.05, marginBottom: 24,
                    }}>
                        <span style={{
                            background: 'linear-gradient(135deg, #ffffff 0%, #e0e0ff 50%, #a5b4fc 100%)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        }}>
                            Code. Compete.
                        </span>
                        <br />
                        <span style={{
                            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        }}>
                            Conquer.
                        </span>
                    </motion.h1>

                    {/* Subtitle */}
                    <motion.p variants={fadeUp} style={{
                        fontSize: 18, color: '#9898bb', maxWidth: 520, margin: '0 auto', lineHeight: 1.7, marginBottom: 40,
                    }}>
                        ACM/ICPC uslubidagi Online Judge platformasi. Algoritmik masalalarni yeching, kontestlarda qatnashing, va reytingingizni oshiring.
                    </motion.p>

                    {/* Buttons */}
                    <motion.div variants={fadeUp} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <Link to="/problems" className="btn-glow" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            Masalalarni ko'rish <ArrowRight style={{ width: 16, height: 16 }} />
                        </Link>
                        <Link to="/contests" className="btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            Kontestlar 🏆
                        </Link>
                    </motion.div>
                </motion.div>
            </section>

            {/* ═══ STATS ═══ */}
            <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', marginTop: 80 }}>
                <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}
                    style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                    {stats.map((s, i) => (
                        <motion.div key={i} variants={fadeUp}
                            style={{
                                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: 12, padding: '28px 32px', position: 'relative', overflow: 'hidden',
                                transition: 'border-color 0.2s',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'}
                            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                        >
                            {/* Top glow line */}
                            <div style={{
                                position: 'absolute', top: 0, left: 0, right: 0, height: 1,
                                background: `linear-gradient(90deg, transparent, ${s.glow}, transparent)`,
                            }} />
                            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                                <div style={{
                                    width: 44, height: 44, borderRadius: 10, background: s.bg,
                                    border: `1px solid ${s.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <s.icon style={{ width: 20, height: 20, color: s.accent }} />
                                </div>
                                <div>
                                    <div style={{ fontSize: 36, fontWeight: 800, color: '#f0f0ff', letterSpacing: -1, lineHeight: 1 }}>{s.value}</div>
                                    <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{s.label}</div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </section>

            {/* ═══ FEATURES ═══ */}
            <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', marginTop: 80 }}>
                <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                    <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: 48 }}>
                        <p style={{ color: '#6366f1', fontSize: 13, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
                            Nima taklif qilamiz
                        </p>
                        <h2 style={{
                            fontSize: 36, fontWeight: 700,
                            background: 'linear-gradient(135deg, #fff, #a5b4fc)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        }}>
                            Hamma narsa bir joyda
                        </h2>
                    </motion.div>

                    <motion.div variants={fadeUp} style={{
                        display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2,
                        background: 'rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden',
                    }}>
                        {features.map((f, i) => (
                            <div key={i} style={{
                                background: '#111122', padding: 40, transition: 'background 0.2s', cursor: 'default',
                            }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(99,102,241,0.04)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = '#111122'}
                            >
                                <div style={{
                                    width: 48, height: 48, borderRadius: 12, background: f.bg,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
                                }}>
                                    <f.icon style={{ width: 22, height: 22, color: f.accent }} />
                                </div>
                                <h3 style={{ fontSize: 18, fontWeight: 600, color: '#f0f0ff', marginBottom: 8 }}>{f.title}</h3>
                                <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>{f.desc}</p>
                            </div>
                        ))}
                    </motion.div>
                </motion.div>
            </section>

            {/* ═══ RECENT SUBMISSIONS ═══ */}
            <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', marginTop: 80 }}>
                <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                    <motion.div variants={fadeUp} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                        <h3 style={{ fontSize: 20, fontWeight: 600, color: '#f0f0ff' }}>So'nggi submissionlar</h3>
                        <Link to="/problems" style={{ fontSize: 13, color: '#6366f1', cursor: 'pointer' }}>Hammasini ko'rish →</Link>
                    </motion.div>

                    <motion.div variants={fadeUp} style={{
                        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 12, overflow: 'hidden',
                    }}>
                        {/* Header */}
                        <div style={{
                            display: 'grid', gridTemplateColumns: '1fr 1fr 140px 90px 90px',
                            padding: '12px 24px', background: 'rgba(255,255,255,0.03)',
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                            fontSize: 11, fontWeight: 600, color: '#55556a', letterSpacing: '0.08em', textTransform: 'uppercase',
                        }}>
                            <span>Foydalanuvchi</span><span>Masala</span><span>Natija</span><span>Til</span><span>Vaqt</span>
                        </div>
                        {/* Rows */}
                        {mockSubmissions.map((sub, i) => {
                            const st = statusStyle[sub.status] || statusStyle.PENDING;
                            return (
                                <div key={i} style={{
                                    display: 'grid', gridTemplateColumns: '1fr 1fr 140px 90px 90px',
                                    padding: '14px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)',
                                    alignItems: 'center', transition: 'background 0.15s', cursor: 'pointer',
                                }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    <span style={{ fontSize: 14, color: '#a5b4fc', fontWeight: 500 }}>{sub.user}</span>
                                    <span style={{ fontSize: 14, color: '#e8e8f0' }}>{sub.problem}</span>
                                    <span>
                                        <span style={{
                                            display: 'inline-block', background: st.bg, color: st.color,
                                            border: `1px solid ${st.border}`, borderRadius: 6, padding: '3px 10px',
                                            fontSize: 12, fontWeight: 600,
                                        }}>
                                            {st.label}
                                        </span>
                                    </span>
                                    <span style={{ fontSize: 13, color: '#6b7280' }}>{sub.lang}</span>
                                    <span style={{ fontSize: 12, color: '#55556a' }}>{sub.time}</span>
                                </div>
                            );
                        })}
                    </motion.div>
                </motion.div>
            </section>

            {/* ═══ CTA ═══ */}
            <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', marginTop: 80, marginBottom: 80 }}>
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    style={{
                        background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.08))',
                        border: '1px solid rgba(99,102,241,0.15)', borderRadius: 20,
                        padding: '64px 48px', textAlign: 'center', position: 'relative', overflow: 'hidden',
                    }}
                >
                    {/* BG glow */}
                    <div style={{
                        position: 'absolute', top: '50%', left: '50%', width: 400, height: 400, borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(99,102,241,0.08), transparent 70%)',
                        transform: 'translate(-50%, -50%)', pointerEvents: 'none',
                    }} />
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <h2 style={{
                            fontSize: 40, fontWeight: 700, marginBottom: 16,
                            background: 'linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        }}>
                            Bugun boshlang
                        </h2>
                        <p style={{ fontSize: 16, color: '#6b7280', marginBottom: 32, maxWidth: 400, margin: '0 auto 32px' }}>
                            Ro'yxatdan o'ting va birinchi masalangizni yeching
                        </p>
                        <Link to="/register" className="btn-glow" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 32px', fontSize: 16 }}>
                            Bepul ro'yxatdan o'tish <ArrowRight style={{ width: 18, height: 18 }} />
                        </Link>
                    </div>
                </motion.div>
            </section>
        </div>
    );
}
