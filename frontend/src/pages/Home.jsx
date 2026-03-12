import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Trophy, Users, LayoutDashboard, ChevronRight, Eye, MessageSquare, Calendar, ArrowRight } from 'lucide-react';
import { getNews } from '../api/news';

export default function Home() {
    const [latestNews, setLatestNews] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        document.title = 'OnlineJudge — Code. Compete. Conquer.';
        fetchNews();
    }, []);

    const fetchNews = async () => {
        try {
            const res = await getNews();
            // Faqat eng so'nggi 3 ta yangilik
            const newsData = Array.isArray(res.data) ? res.data : (res.data.results || []);
            setLatestNews(newsData.slice(0, 3));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fadeInUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } } };
    const stagger = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };

    return (
        <div style={{ position: 'relative', overflow: 'hidden', paddingBottom: 100 }}>

            {/* Background effects */}
            <div style={{
                position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none',
                background: `
                    radial-gradient(ellipse 100% 100% at 50% -20%, rgba(99,102,241,0.08) 0%, transparent 50%),
                    radial-gradient(ellipse 80% 80% at 80% 50%, rgba(139,92,246,0.05) 0%, transparent 50%)
                `
            }} />

            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', paddingTop: 60 }}>
                
                {/* 1. Bu qanday sayt? */}
                <motion.section initial="hidden" animate="visible" variants={fadeInUp} style={{ marginBottom: 60 }}>
                    <h2 style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 24, letterSpacing: '-0.5px' }}>
                        Intellektual Ekotizimga Xush Kelibsiz
                    </h2>
                    <div style={{ 
                        background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', 
                        borderRadius: 20, padding: 32, display: 'flex', gap: 40, flexWrap: 'wrap', alignItems: 'center',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
                    }}>
                        {/* Logo Illustration */}
                        <div style={{ 
                            flex: '1 1 300px', maxWidth: 400, height: 200, 
                            background: 'linear-gradient(135deg, #111827 0%, #1f2937 100%)', 
                            borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '1px solid rgba(255,255,255,0.1)', position: 'relative', overflow: 'hidden'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16, zIndex: 1 }}>
                                <div style={{ width: 64, height: 64, background: '#3b82f6', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px rgba(59, 130, 246, 0.5)' }}>
                                    <span style={{ fontSize: 32 }}>🤖</span>
                                </div>
                                <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: 1 }}>ONLINE<span style={{ color: '#3b82f6' }}>JUDGE</span></div>
                            </div>
                            {/* Inner glow */}
                            <div style={{ position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%', background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 60%)' }} />
                        </div>
                        
                        {/* Text Content */}
                        <div style={{ flex: '2 1 400px', fontSize: 16, lineHeight: 1.8, color: 'var(--text-secondary)' }}>
                            <p style={{ marginBottom: 16 }}>
                                <strong style={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 700 }}>OnlineJudge.uz</strong> — algoritmik fikrlashni rivojlantirish, dasturlash ko'nikmalarini mukammallashtirish va xalqaro IT-kompaniyalarining texnik intervyulariga tizimli tayyorgarlik ko'rish imkonini beruvchi to'liq avtomatlashtirilgan raqamli platformadir.
                            </p>
                            <p>
                                Jahonning yetakchi algoritmik tizimlari tajribasini o'zida mujassam etgan ushbu maydon, uzluksiz ta'lim jarayonini sog'lom raqobat va o'zaro tajriba almashish orqali yangi yuqori darajaga olib chiqadi.
                            </p>
                        </div>
                    </div>
                </motion.section>

                {/* 2. Asosiy Bo'limlar (4 ta karta) */}
                <motion.section initial="hidden" animate="visible" variants={stagger} style={{ marginBottom: 80 }}>
                    <div style={{ 
                        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 24 
                    }}>
                        {[
                            { 
                                title: "Platforma imkoniyatlari", 
                                desc: "Tizimdan maksimal samaradorlik bilan foydalanish sirlari va dasturlash muhitiga moslashish bo'yicha mukammal qo'llanma.", 
                                icon: LayoutDashboard, color: '#3b82f6', link: '/system'
                            },
                            { 
                                title: "Mantiq maydoni", 
                                desc: "Turli qiyinlik darajasidagi masalalarni hal etish orqali abstrakt fikrlash doirangizni kengaytiring va kod yozish mahoratingizni charxlang.", 
                                icon: BookOpen, color: '#10b981', link: '/problems'
                            },
                            { 
                                title: "Intellektual turnirlar", 
                                desc: "Real vaqt rejimida o'tkaziladigan musobaqalarda qatnashib, o'z salohiyatingizni butun respublika darajasida sinovdan o'tkazing.", 
                                icon: Trophy, color: '#f59e0b', link: '/contests'
                            },
                            { 
                                title: "Global reyting", 
                                desc: "Dasturchilarning individual rivojlanish darajasini aks ettiruvchi shaffof reyting tizimi. Izlanish orqali elit dasturchilar qatoridan joy oling.", 
                                icon: Users, color: '#8b5cf6', link: '/leaderboard'
                            }
                        ].map((card, idx) => (
                            <Link key={idx} to={card.link} style={{ display: 'block', textDecoration: 'none' }}>
                                <motion.div variants={fadeInUp} style={{ 
                                    background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', 
                                    borderRadius: 20, padding: 32, textAlign: 'center', height: '100%',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                                    transition: 'all 0.3s ease', cursor: 'pointer',
                                    position: 'relative', overflow: 'hidden'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.borderColor = card.color; e.currentTarget.style.boxShadow = `0 10px 30px ${card.color}20`; }}
                                onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.boxShadow = 'none'; }}
                                >
                                    {/* Icon */}
                                    <div style={{ 
                                        width: 80, height: 80, rounded: 20, marginBottom: 24, 
                                        background: `${card.color}15`, borderRadius: '24px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <card.icon size={40} color={card.color} strokeWidth={1.5} />
                                    </div>
                                    <h3 style={{ fontSize: 22, fontWeight: 700, color: card.color, marginBottom: 16 }}>{card.title}</h3>
                                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{card.desc}</p>
                                </motion.div>
                            </Link>
                        ))}
                    </div>
                </motion.section>

                {/* 3. Yangiliklar */}
                <motion.section initial="hidden" animate="visible" variants={fadeInUp}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                        <h2 style={{ fontSize: 32, fontWeight: 800, color: '#3b82f6', letterSpacing: '-0.5px' }}>So'nggi innovatsiyalar va xabarlar</h2>
                        <Link to="/news" className="btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, padding: '8px 16px', fontWeight: 600 }}>
                            Barcha xabarlar bilan tanishish <ChevronRight size={16} />
                        </Link>
                    </div>

                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
                            <div style={{ width: 40, height: 40, border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                        </div>
                    ) : (
                        <div style={{ 
                            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 
                        }}>
                            {latestNews.length > 0 ? latestNews.map((news, idx) => (
                                <Link key={news.id} to={`/news/${news.id}`} style={{ textDecoration: 'none' }}>
                                    <motion.div variants={fadeInUp} style={{ 
                                        background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', 
                                        borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column',
                                        transition: 'transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease',
                                        cursor: 'pointer', height: '100%'
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.2)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.boxShadow = 'none'; }}
                                    >
                                        {/* Top Image Section */}
                                        <div style={{ height: 200, position: 'relative', background: 'var(--border-subtle)' }}>
                                            {news.image ? (
                                                <img src={news.image} alt={news.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1))' }}>
                                                    <span style={{ fontSize: 40 }}>📰</span>
                                                </div>
                                            )}
                                            {/* Date Badge */}
                                            <div style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '6px 12px', borderRadius: 20, fontSize: 13, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <Calendar size={14} /> {new Date(news.created_at).toLocaleDateString('uz-UZ')}
                                            </div>
                                        </div>
                                        
                                        {/* Bottom Content Section */}
                                        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', flex: 1 }}>
                                            <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Eye size={16} /> {news.views_count}</span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MessageSquare size={16} /> {news.comments_count}</span>
                                                <span>Muallif: <strong style={{ color: 'var(--text-primary)' }}>{news.author_username}</strong></span>
                                            </div>
                                            
                                            <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 24, lineHeight: 1.4, flex: 1 }}>
                                                {news.title}
                                            </h3>
                                            
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#6366f1', fontSize: 15, fontWeight: 500 }}>
                                                Batafsil o'qish <ArrowRight size={18} />
                                            </div>
                                        </div>
                                    </motion.div>
                                </Link>
                            )) : (
                                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                                    Hozircha yangiliklar yo'q
                                </div>
                            )}
                        </div>
                    )}
                </motion.section>

            </div>
        </div>
    );
}
