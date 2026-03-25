import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { logout as apiLogout } from '../../api/auth';
import Container from '../ui/Container';

const RANKS = [
    { min: 2100, color: '#f59e0b' },
    { min: 1900, color: '#8b5cf6' },
    { min: 1600, color: '#3b82f6' },
    { min: 1400, color: '#10b981' },
    { min: 1200, color: 'var(--text-muted)' },
    { min: 0, color: 'var(--text-muted)' },
];
const getRankColor = (r) =>
    (RANKS.find(x => (r || 0) >= x.min) || RANKS.at(-1)).color;

export default function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuthStore();
    const isAuthenticated = useAuthStore(state => state.isAuthenticated);
    const { theme, toggleTheme } = useThemeStore();
    const [dropdown, setDropdown] = useState(false);
    const dropRef = useRef(null);

    // Tashqariga click -> yopish
    useEffect(() => {
        const handler = (e) => {
            if (dropRef.current &&
                !dropRef.current.contains(e.target)) {
                setDropdown(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () =>
            document.removeEventListener('mousedown', handler);
    }, []);

    const rankColor = getRankColor(user?.rating);

    const navLinks = [
        {
            to: '/problems',
            label: 'Problems',
            icon: (active) => (
                <svg width="15" height="15" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                </svg>
            ),
        },
        {
            to: '/contests',
            label: 'Contests',
            icon: (active) => (
                <svg width="15" height="15" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="8" r="6" />
                    <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
                </svg>
            ),
        },
        {
            to: '/status',
            label: 'Status',
            icon: (active) => (
                <svg width="15" height="15" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
            ),
        },
        {
            to: '/leaderboard',
            label: 'Leaderboard',
            icon: (active) => (
                <svg width="15" height="15" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="20" x2="18" y2="10" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
            ),
        },
        {
            to: '/system',
            label: 'Tizim',
            icon: (active) => (
                <svg width="15" height="15" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
            ),
        },
    ];

    const isActive = (path) =>
        location.pathname.startsWith(path);

    return (
        <>
            {/* ══════════════════════════════════
          NAVBAR
      ══════════════════════════════════ */}
            <nav style={{
                position: 'fixed',
                top: 0, left: 0, right: 0,
                zIndex: 1000,
                height: '64px',
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px)',
                borderBottom: '1px solid var(--border-subtle)',
            }}>
              <Container noPadding className="h-full flex items-center justify-between gap-2 px-[15px] max-w-[1400px]">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* ── LOGO ── */}
                <div
                    onClick={() => navigate('/')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        marginRight: '8px',
                        userSelect: 'none',
                    }}
                >
                    {/* Logo icon */}
                    <div style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                        boxShadow: '0 0 16px rgba(99,102,241,0.45)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: '800',
                        color: 'white',
                        letterSpacing: '-0.5px',
                        flexShrink: 0,
                    }}>
                        {'<>'}
                    </div>
                    <span className="font-grotesk font-bold text-xl tracking-tight" style={{
                        color: 'var(--text-primary)',
                    }}>
                        Judge
                    </span>
                </div>
              </div>

                {/* ── DIVIDER ── */}
                <div style={{
                    width: '1px',
                    height: '20px',
                    background: 'var(--border-default)',
                    margin: '0 8px',
                }} />

                {/* ── NAV LINKS ── */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                    flex: 1,
                }}>
                    {navLinks.map(link => {
                        const active = isActive(link.to);
                        return (
                            <Link
                                key={link.to}
                                to={link.to}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                                    background: active
                                        ? 'var(--border-subtle)'
                                        : 'transparent',
                                    textDecoration: 'none',
                                    transition: 'all 0.15s',
                                    position: 'relative',
                                    userSelect: 'none',
                                }}
                                className="font-sans font-medium text-sm"
                                onMouseEnter={e => {
                                    if (!active) {
                                        e.currentTarget.style.color = 'var(--text-primary)';
                                        e.currentTarget.style.background =
                                            'var(--bg-elevated)';
                                    }
                                }}
                                onMouseLeave={e => {
                                    if (!active) {
                                        e.currentTarget.style.color = 'var(--text-muted)';
                                        e.currentTarget.style.background = 'transparent';
                                    }
                                }}
                            >
                                {/* Icon */}
                                <span style={{
                                    color: active ? '#a5b4fc' : 'currentColor',
                                    display: 'flex',
                                    alignItems: 'center',
                                }}>
                                    {link.icon(active)}
                                </span>

                                {link.label}

                                {/* Active dot */}
                                {active && (
                                    <span style={{
                                        position: 'absolute',
                                        bottom: '-1px',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        width: '16px',
                                        height: '2px',
                                        borderRadius: '2px',
                                        background: 'linear-gradient(90deg,#6366f1,#8b5cf6)',
                                    }} />
                                )}
                            </Link>
                        )
                    })}
                </div>

                {/* ── RIGHT SIDE ── */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                }}>

                    
                    {/* ── THEME TOGGLE ── */}
                    <button
                        onClick={toggleTheme}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            background: 'transparent',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.background = 'var(--bg-elevated)';
                            e.currentTarget.style.color = 'var(--text-primary)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--text-secondary)';
                        }}
                        aria-label="Toggle Theme"
                    >
                        {theme === 'dark' ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="5"></circle>
                                <line x1="12" y1="1" x2="12" y2="3"></line>
                                <line x1="12" y1="21" x2="12" y2="23"></line>
                                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                                <line x1="1" y1="12" x2="3" y2="12"></line>
                                <line x1="21" y1="12" x2="23" y2="12"></line>
                                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                            </svg>
                        ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                            </svg>
                        )}
                    </button>

                    {isAuthenticated ? (
                        /* ── USER DROPDOWN ── */
                        <div
                            ref={dropRef}
                            style={{ position: 'relative' }}
                        >
                            {/* Trigger button */}
                            <button
                                onClick={() => setDropdown(d => !d)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '5px 10px 5px 5px',
                                    borderRadius: '10px',
                                    background: dropdown
                                        ? 'var(--border-default)'
                                        : 'var(--bg-elevated)',
                                    border: `1px solid ${dropdown
                                        ? 'var(--border-strong)'
                                        : 'var(--border-subtle)'}`,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s',
                                }}
                                onMouseEnter={e => {
                                    if (!dropdown) {
                                        e.currentTarget.style.background =
                                            'var(--border-subtle)';
                                        e.currentTarget.style.borderColor =
                                            'var(--border-strong)';
                                    }
                                }}
                                onMouseLeave={e => {
                                    if (!dropdown) {
                                        e.currentTarget.style.background =
                                            'var(--bg-elevated)';
                                        e.currentTarget.style.borderColor =
                                            'var(--border-subtle)';
                                    }
                                }}
                            >
                                {/* Avatar */}
                                <div style={{
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                                    border: `2px solid ${rankColor}`,
                                    boxShadow: `0 0 10px ${rankColor}50`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '12px',
                                    fontWeight: '700',
                                    color: 'white',
                                    flexShrink: 0,
                                }}>
                                    {user?.username?.[0]?.toUpperCase() || '?'}
                                </div>

                                {/* Username + rating */}
                                <div style={{ textAlign: 'left' }}>
                                    <div style={{
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        color: 'var(--text-primary)',
                                        lineHeight: 1.2,
                                    }}>
                                        {user?.username}
                                    </div>
                                    <div style={{
                                        fontSize: '10px',
                                        color: rankColor,
                                        fontWeight: '600',
                                        lineHeight: 1.2,
                                    }}>
                                        {user?.rating || 0}
                                    </div>
                                </div>

                                {/* Chevron */}
                                <svg
                                    width="12" height="12"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke='var(--text-muted)'
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    style={{
                                        marginLeft: '2px',
                                        transform: dropdown
                                            ? 'rotate(180deg)' : 'rotate(0deg)',
                                        transition: 'transform 0.2s',
                                    }}
                                >
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </button>

                            {/* ── DROPDOWN MENU ── */}
                            {dropdown && (
                                <div style={{
                                    position: 'absolute',
                                    top: 'calc(100% + 8px)',
                                    right: 0,
                                    width: '220px',
                                    background: 'var(--bg-surface)',
                                    border: '1px solid var(--border-strong)',
                                    borderRadius: '12px',
                                    boxShadow: `
                    0 0 0 1px var(--bg-elevated),
                    0 20px 48px rgba(0,0,0,0.6),
                    0 4px 16px rgba(0,0,0,0.4)
                  `,
                                    overflow: 'hidden',
                                    animation: 'dropIn 0.15s ease',
                                }}>

                                    {/* User info header */}
                                    <div style={{
                                        padding: '14px 16px',
                                        borderBottom: '1px solid var(--border-subtle)',
                                        background: 'var(--bg-base)',
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                        }}>
                                            {/* Big avatar */}
                                            <div style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '50%',
                                                background:
                                                    'linear-gradient(135deg,#6366f1,#8b5cf6)',
                                                border: `2px solid ${rankColor}`,
                                                boxShadow: `0 0 14px ${rankColor}40`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '16px',
                                                fontWeight: '800',
                                                color: 'white',
                                                flexShrink: 0,
                                            }}>
                                                {user?.username?.[0]?.toUpperCase()}
                                            </div>
                                            <div>
                                                <div style={{
                                                    fontSize: '14px',
                                                    fontWeight: '700',
                                                    color: 'var(--text-primary)',
                                                }}>
                                                    {user?.username}
                                                </div>
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    marginTop: '3px',
                                                }}>
                                                    <div style={{
                                                        width: '6px',
                                                        height: '6px',
                                                        borderRadius: '50%',
                                                        background: rankColor,
                                                        boxShadow:
                                                            `0 0 6px ${rankColor}`,
                                                    }} />
                                                    <span style={{
                                                        fontSize: '11px',
                                                        color: rankColor,
                                                        fontWeight: '600',
                                                    }}>
                                                        {/* Rank label */}
                                                        {user?.rating >= 2100 ? 'Master'
                                                            : user?.rating >= 1900 ? 'Candidate Master'
                                                                : user?.rating >= 1600 ? 'Expert'
                                                                    : user?.rating >= 1400 ? 'Specialist'
                                                                        : user?.rating >= 1200 ? 'Pupil'
                                                                            : 'Newbie'}
                                                    </span>
                                                    <span style={{
                                                        fontSize: '11px',
                                                        color: 'var(--text-muted)',
                                                    }}>
                                                        · {user?.rating || 0}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Solved + Rating mini stats */}
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: '1fr 1fr',
                                            gap: '8px',
                                            marginTop: '12px',
                                        }}>
                                            {[
                                                {
                                                    label: 'Yechilgan',
                                                    value: user?.solved_count || 0,
                                                    color: '#10b981',
                                                },
                                                {
                                                    label: 'Rating',
                                                    value: user?.rating || 0,
                                                    color: rankColor,
                                                },
                                            ].map(stat => (
                                                <div key={stat.label} style={{
                                                    background: 'var(--bg-elevated)',
                                                    borderRadius: '8px',
                                                    padding: '8px 10px',
                                                    border:
                                                        '1px solid var(--border-subtle)',
                                                }}>
                                                    <div style={{
                                                        fontSize: '16px',
                                                        fontWeight: '700',
                                                        color: stat.color,
                                                    }}>
                                                        {stat.value}
                                                    </div>
                                                    <div style={{
                                                        fontSize: '10px',
                                                        color: 'var(--text-muted)',
                                                        marginTop: '2px',
                                                    }}>
                                                        {stat.label}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Menu items */}
                                    <div style={{ padding: '6px' }}>

                                        {/* Profilim */}
                                        <DropdownItem
                                            icon="👤"
                                            label="Profilim"
                                            onClick={() => {
                                                navigate(`/profile/${user?.username}`);
                                                setDropdown(false);
                                            }}
                                        />

                                        {/* Mening submissionlarim */}
                                        <DropdownItem
                                            icon="📋"
                                            label="Submissionlarim"
                                            onClick={() => {
                                                navigate('/submissions');
                                                setDropdown(false);
                                            }}
                                        />

                                        {/* Sozlamalar */}
                                        <DropdownItem
                                            icon="⚙️"
                                            label="Sozlamalar"
                                            onClick={() => {
                                                navigate('/settings');
                                                setDropdown(false);
                                            }}
                                            soon={true}
                                        />

                                        {/* Admin (faqat staff) */}
                                        {user?.is_staff && (
                                            <>
                                                <div style={{
                                                    height: '1px',
                                                    background: 'var(--border-subtle)',
                                                    margin: '4px 6px',
                                                }} />
                                                <DropdownItem
                                                    icon="🛡️"
                                                    label="Admin Panel"
                                                    color="#a5b4fc"
                                                    onClick={() => {
                                                        navigate('/admin');
                                                        setDropdown(false);
                                                    }}
                                                />
                                            </>
                                        )}

                                        {/* Divider */}
                                        <div style={{
                                            height: '1px',
                                            background: 'var(--border-subtle)',
                                            margin: '4px 6px',
                                        }} />

                                        {/* Chiqish */}
                                        <DropdownItem
                                            icon="🚪"
                                            label="Chiqish"
                                            color="#ef4444"
                                            onClick={async () => {
                                                try { await apiLogout(); } catch { /* ignore */ }
                                                logout();
                                                navigate('/');
                                                setDropdown(false);
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                    ) : (
                        /* ── AUTH BUTTONS ── */
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                        }}>
                            <button
                                onClick={() => navigate('/login')}
                                style={{
                                    padding: '7px 16px',
                                    borderRadius: '8px',
                                    background: 'transparent',
                                    border: '1px solid var(--border-strong)',
                                    color: 'var(--text-secondary)',
                                    fontSize: '13px',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s',
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.borderColor =
                                        'var(--border-strong)';
                                    e.currentTarget.style.color = 'var(--text-primary)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.borderColor =
                                        'var(--border-strong)';
                                    e.currentTarget.style.color = 'var(--text-secondary)';
                                }}
                            >
                                Kirish
                            </button>

                            <button
                                onClick={() => navigate('/register')}
                                style={{
                                    padding: '7px 16px',
                                    borderRadius: '8px',
                                    background:
                                        'linear-gradient(135deg,#6366f1,#8b5cf6)',
                                    boxShadow:
                                        '0 0 16px rgba(99,102,241,0.30)',
                                    border: 'none',
                                    color: 'white',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s',
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.boxShadow =
                                        '0 0 24px rgba(99,102,241,0.50)';
                                    e.currentTarget.style.transform =
                                        'translateY(-1px)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.boxShadow =
                                        '0 0 16px rgba(99,102,241,0.30)';
                                    e.currentTarget.style.transform =
                                        'translateY(0)';
                                }}
                            >
                                Ro'yxatdan o'tish
                            </button>
                        </div>
                    )}
                </div>
              </Container>
            </nav>

            {/* Navbar balandligi uchun spacer */}
            <div style={{ height: '64px' }} />
        </>
    );
}

/* ══════════════════════════════════
   DROPDOWN ITEM COMPONENT
══════════════════════════════════ */
function DropdownItem({
    icon, label, onClick, color, soon = false
}) {
    const [hovered, setHovered] = useState(false);

    return (
        <div
            onClick={soon ? undefined : onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 10px',
                borderRadius: '8px',
                cursor: soon ? 'default' : 'pointer',
                background: hovered && !soon
                    ? 'var(--border-subtle)'
                    : 'transparent',
                transition: 'background 0.12s',
                userSelect: 'none',
            }}
        >
            <span style={{
                fontSize: '15px', width: '20px',
                textAlign: 'center'
            }}>
                {icon}
            </span>
            <span style={{
                fontSize: '13px',
                fontWeight: '500',
                color: soon
                    ? 'var(--text-muted)'
                    : color || 'var(--text-primary)',
                flex: 1,
            }}>
                {label}
            </span>
            {soon && (
                <span style={{
                    fontSize: '9px',
                    fontWeight: '700',
                    color: 'var(--text-muted)',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '4px',
                    padding: '2px 5px',
                    letterSpacing: '0.05em',
                }}>
                    TEZDA
                </span>
            )}
        </div>
    );
}
