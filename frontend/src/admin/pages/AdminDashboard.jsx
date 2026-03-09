import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { adminApi } from "../../api/admin";
import { FileText, Zap, Users, CheckCircle, Plus, List, UsersRound } from "lucide-react";

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        adminApi.getDashboardStats()
            .then(res => {
                setData(res.data);
            })
            .catch(err => {
                console.error("Dashboard error:", err);
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px', color: '#8b5cf6' }}>
                <Zap className="animate-pulse" size={40} />
            </div>
        );
    }

    if (!data) return null;

    const { problems, submissions, users } = data;

    const ProblemBar = ({ easy, medium, hard, total }) => (
        <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>
                <span>Qiyinlik:</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ color: '#10b981' }}>{easy} Easy</span>
                    <span style={{ color: '#f59e0b' }}>{medium} Medium</span>
                    <span style={{ color: '#ef4444' }}>{hard} Hard</span>
                </div>
            </div>
            <div style={{ display: 'flex', height: '6px', borderRadius: '3px', overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
                {total > 0 && <>
                    <div style={{ width: `${(easy / total) * 100}%`, background: '#10b981' }} />
                    <div style={{ width: `${(medium / total) * 100}%`, background: '#f59e0b' }} />
                    <div style={{ width: `${(hard / total) * 100}%`, background: '#ef4444' }} />
                </>}
            </div>
        </div>
    );

    const StatCard = ({ title, icon: Icon, color, number, subtext, children }) => (
        <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '14px',
            padding: '24px',
            position: 'relative',
            overflow: 'hidden'
        }}>
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
                background: `linear-gradient(90deg, transparent, ${color}60, transparent)`
            }} />
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                    <h3 style={{ color: '#9ca3af', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>{title}</h3>
                    <div style={{ fontSize: '42px', fontWeight: 800, color: '#f0f0ff', letterSpacing: '-2px', lineHeight: 1 }}>
                        {number}
                    </div>
                    {subtext && <div style={{ color: '#9ca3af', fontSize: '13px', marginTop: '12px' }}>{subtext}</div>}
                </div>
                <div style={{
                    width: '48px', height: '48px', borderRadius: '12px',
                    background: `${color}15`, border: `1px solid ${color}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: color
                }}>
                    <Icon size={24} />
                </div>
            </div>
            {children}
        </div>
    );

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#f0f0ff', marginBottom: '24px' }}>Dashboard</h1>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>

                <StatCard
                    title="Masalalar" number={problems.total} icon={FileText} color="#6366f1"
                    subtext={<>✅ {problems.published} published &nbsp; 📋 {problems.draft} draft</>}
                >
                    <ProblemBar
                        total={problems.total}
                        easy={problems.by_difficulty.easy || 0}
                        medium={problems.by_difficulty.medium || 0}
                        hard={problems.by_difficulty.hard || 0}
                    />
                </StatCard>

                <StatCard
                    title="Urinishlar (Submissions)" number={submissions.total} icon={Zap} color="#8b5cf6"
                    subtext={`Bugun: ${submissions.today} · Bu hafta: ${submissions.week}`}
                >
                    <div style={{ marginTop: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
                            <span style={{ color: '#9ca3af' }}>Acceptance Rate</span>
                            <span style={{ color: '#10b981', fontWeight: 600 }}>{submissions.acceptance_rate}%</span>
                        </div>
                        <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                            <div style={{ width: `${submissions.acceptance_rate}%`, height: '100%', background: '#10b981' }} />
                        </div>
                    </div>
                </StatCard>

                <StatCard
                    title="Foydalanuvchilar" number={users.total} icon={Users} color="#06b6d4"
                    subtext={`Faol (7 kun): ${users.active}`}
                />

                <div style={{
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '14px', padding: '24px', position: 'relative', overflow: 'hidden'
                }}>
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
                        background: `linear-gradient(90deg, transparent, #f59e0b60, transparent)`
                    }} />
                    <h3 style={{ color: '#9ca3af', fontSize: '14px', fontWeight: 500, marginBottom: '20px' }}>Tezkor havolalar</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <button onClick={() => navigate('/admin/problems/new')}
                            style={{
                                width: '100%', padding: '12px', borderRadius: '8px', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                color: 'white', border: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px',
                                cursor: 'pointer'
                            }} className="hover:opacity-90">
                            <Plus size={18} /> Yangi masala
                        </button>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <button onClick={() => navigate('/admin/problems')}
                                style={{
                                    padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                    color: '#e5e7eb', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                    cursor: 'pointer'
                                }} className="hover:bg-white/10">
                                <List size={16} /> Masalalar
                            </button>
                            <button onClick={() => navigate('/admin/users')}
                                style={{
                                    padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                    color: '#e5e7eb', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                    cursor: 'pointer'
                                }} className="hover:bg-white/10">
                                <UsersRound size={16} /> Userlar
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
