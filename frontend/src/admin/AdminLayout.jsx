import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, Users, ArrowLeft, TerminalSquare, Trophy, BookOpen } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { ToastContainer } from './components/Toast';

export default function AdminLayout() {
    const user = useAuthStore(state => state.user);
    const location = useLocation();

    const navItems = [
        { path: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
        { path: '/admin/problems', label: 'Masalalar', icon: FileText },
        { path: '/admin/contests', label: 'Musobaqalar', icon: Trophy },
        { path: '/admin/users', label: 'Foydalanuvchilar', icon: Users },
        { path: '/admin/latex-guide', label: 'LaTeX Formulalari', icon: BookOpen },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#111122', color: 'white' }}>
            <ToastContainer />
            {/* TOP BAR */}
            <div style={{
                height: '56px', padding: '0 24px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: '#111122'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '16px' }}>
                        <TerminalSquare size={20} color="#6366f1" />
                        Judge
                    </div>
                    <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)' }}></div>
                    <div style={{
                        background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)',
                        borderRadius: '6px', padding: '3px 10px', fontSize: '12px', color: '#a5b4fc'
                    }}>
                        Admin Panel
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <Link to="/" style={{
                        color: '#a5b4fc', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px',
                        fontSize: '13px', padding: '6px 12px', borderRadius: '6px', transition: '0.15s'
                    }} className="hover:bg-white/5">
                        <ArrowLeft size={16} /> Saytga qaytish
                    </Link>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                            width: '32px', height: '32px', borderRadius: '50%', background: '#6366f1',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold'
                        }}>
                            {user?.username?.[0]?.toUpperCase()}
                        </div>
                        <span style={{ fontSize: '13px', color: '#d1d5db' }}>{user?.username}</span>
                    </div>
                </div>
            </div>

            {/* CONTENT AREA */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* SIDEBAR */}
                <div style={{
                    width: '220px', background: '#1a1a32', borderRight: '1px solid rgba(255,255,255,0.06)',
                    padding: '20px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {navItems.map((item) => {
                            const isActive = item.end ? location.pathname === item.path : location.pathname.startsWith(item.path);
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '10px',
                                        padding: '9px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
                                        textDecoration: 'none', transition: 'all 0.15s',
                                        background: isActive ? 'rgba(99,102,241,0.12)' : 'transparent',
                                        color: isActive ? '#a5b4fc' : '#6b7280',
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isActive) {
                                            e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                                            e.currentTarget.style.color = '#9898bb';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isActive) {
                                            e.currentTarget.style.background = 'transparent';
                                            e.currentTarget.style.color = '#6b7280';
                                        }
                                    }}
                                >
                                    <Icon size={20} color={isActive ? '#6366f1' : 'currentColor'} />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>

                    <div style={{ color: '#2a2a4a', fontSize: '11px', textAlign: 'center', padding: '10px 0' }}>
                        v1.0.0
                    </div>
                </div>

                {/* MAIN CONTENT */}
                <div style={{ flex: 1, background: '#111122', overflowY: 'auto', padding: '32px' }}>
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
