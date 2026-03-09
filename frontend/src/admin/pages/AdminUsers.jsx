import { useState, useEffect } from 'react'
import { adminApi } from '../../api/admin'

export default function AdminUsers() {
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [confirm, setConfirm] = useState(null)

    useEffect(() => {
        fetchUsers()
    }, [])

    const fetchUsers = async (q = '') => {
        setLoading(true)
        try {
            const { data } = await adminApi.getUsers(
                q ? { q } : {}
            )
            setUsers(data.results || data)
        } finally {
            setLoading(false)
        }
    }

    // Debounced search
    useEffect(() => {
        const t = setTimeout(() => fetchUsers(search), 400)
        return () => clearTimeout(t)
    }, [search])

    const toggleAdmin = async (user) => {
        const newVal = !user.is_staff
        const msg = newVal
            ? `${user.username} ga admin huquqi berilsinmi?`
            : `${user.username} dan admin huquqi olinsinmi?`
        setConfirm({ user, newVal, msg })
    }

    const toggleActive = async (user) => {
        const newVal = !user.is_active
        try {
            await adminApi.updateUser(user.id, {
                is_active: newVal
            })
            setUsers(prev => prev.map(u =>
                u.id === user.id
                    ? { ...u, is_active: newVal }
                    : u
            ))
        } catch { }
    }

    const handleConfirm = async () => {
        if (!confirm) return
        try {
            await adminApi.updateUser(confirm.user.id, {
                is_staff: confirm.newVal
            })
            setUsers(prev => prev.map(u =>
                u.id === confirm.user.id
                    ? { ...u, is_staff: confirm.newVal }
                    : u
            ))
        } finally {
            setConfirm(null)
        }
    }

    // RANK BADGE
    const getRank = (rating) => {
        if (rating >= 2100) return { label: 'Master', color: '#f59e0b' }
        if (rating >= 1900) return { label: 'Candidate', color: '#8b5cf6' }
        if (rating >= 1600) return { label: 'Expert', color: '#3b82f6' }
        if (rating >= 1400) return { label: 'Specialist', color: '#10b981' }
        if (rating >= 1200) return { label: 'Pupil', color: '#6b7280' }
        return { label: 'Newbie', color: '#4a4a6a' }
    }

    return (
        <div style={{ padding: '32px 28px' }}>

            {/* HEADER */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 28,
            }}>
                <div>
                    <h1 style={{
                        fontSize: 24, fontWeight: 700,
                        color: '#f0f0ff', margin: 0,
                    }}>
                        Foydalanuvchilar
                    </h1>
                    <p style={{
                        color: '#6b7280', fontSize: 13,
                        marginTop: 4,
                    }}>
                        Jami: {users.length} ta foydalanuvchi
                    </p>
                </div>

                {/* SEARCH */}
                <div style={{ position: 'relative' }}>
                    <span style={{
                        position: 'absolute', left: 12,
                        top: '50%', transform: 'translateY(-50%)',
                        fontSize: 16, color: '#4a4a6a',
                    }}>
                        🔍
                    </span>
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Username yoki email..."
                        style={{
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.10)',
                            borderRadius: 8,
                            padding: '9px 14px 9px 36px',
                            color: '#f0f0ff', fontSize: 13,
                            outline: 'none', width: 260,
                        }}
                    />
                </div>
            </div>

            {/* TABLE */}
            <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 12, overflow: 'hidden',
            }}>

                {/* Table Header */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns:
                        '2fr 2fr 100px 80px 80px 120px 100px',
                    padding: '12px 20px',
                    background: 'rgba(255,255,255,0.03)',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    fontSize: 11, fontWeight: 700,
                    color: '#3a3a5a', letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                }}>
                    <span>Foydalanuvchi</span>
                    <span>Email</span>
                    <span>Daraja</span>
                    <span>Solved</span>
                    <span>Rating</span>
                    <span>Qo'shilgan</span>
                    <span>Amallar</span>
                </div>

                {/* Loading */}
                {loading && [...Array(6)].map((_, i) => (
                    <div key={i} style={{
                        display: 'grid',
                        gridTemplateColumns:
                            '2fr 2fr 100px 80px 80px 120px 100px',
                        padding: '14px 20px',
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        gap: 16,
                    }}>
                        {[200, 160, 80, 40, 50, 90, 80].map(
                            (w, j) => (
                                <div key={j} style={{
                                    height: 14, width: w,
                                    borderRadius: 4,
                                    background:
                                        'rgba(255,255,255,0.05)',
                                    animation:
                                        'shimmer 1.5s infinite',
                                }} />
                            )
                        )}
                    </div>
                ))}

                {/* Rows */}
                {!loading && users.map((user, i) => {
                    const rank = getRank(user.rating)
                    return (
                        <div key={user.id} style={{
                            display: 'grid',
                            gridTemplateColumns:
                                '2fr 2fr 100px 80px 80px 120px 100px',
                            padding: '14px 20px',
                            borderBottom:
                                i < users.length - 1
                                    ? '1px solid rgba(255,255,255,0.04)'
                                    : 'none',
                            alignItems: 'center',
                            transition: 'background 0.15s',
                        }}
                            onMouseEnter={e =>
                                e.currentTarget.style.background =
                                'rgba(255,255,255,0.02)'
                            }
                            onMouseLeave={e =>
                                e.currentTarget.style.background =
                                'transparent'
                            }>

                            {/* Avatar + Username */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center', gap: 10,
                            }}>
                                <div style={{
                                    width: 34, height: 34,
                                    borderRadius: '50%',
                                    background:
                                        'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 14, fontWeight: 700,
                                    color: 'white', flexShrink: 0,
                                }}>
                                    {user.username[0].toUpperCase()}
                                </div>
                                <div>
                                    <div style={{
                                        fontSize: 13, fontWeight: 600,
                                        color: user.is_active
                                            ? '#e8e8f0' : '#4a4a6a',
                                    }}>
                                        {user.username}
                                        {user.is_superuser && (
                                            <span style={{
                                                marginLeft: 6, fontSize: 10,
                                                background:
                                                    'rgba(245,158,11,0.15)',
                                                color: '#f59e0b',
                                                border:
                                                    '1px solid rgba(245,158,11,0.25)',
                                                borderRadius: 4,
                                                padding: '1px 5px',
                                            }}>
                                                SUPER
                                            </span>
                                        )}
                                    </div>
                                    {!user.is_active && (
                                        <div style={{
                                            fontSize: 10, color: '#ef4444',
                                            marginTop: 1,
                                        }}>
                                            Bloklangan
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Email */}
                            <span style={{
                                fontSize: 12, color: '#6b7280',
                            }}>
                                {user.email || '—'}
                            </span>

                            {/* Daraja */}
                            <span style={{
                                fontSize: 11, fontWeight: 700,
                                color: rank.color,
                            }}>
                                {rank.label}
                            </span>

                            {/* Solved */}
                            <span style={{
                                fontSize: 13, fontWeight: 600,
                                color: '#10b981',
                            }}>
                                {user.solved_count}
                            </span>

                            {/* Rating */}
                            <span style={{
                                fontSize: 13, fontWeight: 600,
                                color: rank.color,
                            }}>
                                {user.rating || 0}
                            </span>

                            {/* Qo'shilgan */}
                            <span style={{
                                fontSize: 11, color: '#4a4a6a',
                            }}>
                                {new Date(user.date_joined)
                                    .toLocaleDateString('uz-UZ')}
                            </span>

                            {/* Amallar */}
                            <div style={{
                                display: 'flex', gap: 6,
                            }}>
                                {/* Admin toggle */}
                                <button
                                    onClick={() => toggleAdmin(user)}
                                    title={user.is_staff
                                        ? 'Admin huquqini olish'
                                        : 'Admin qilish'}
                                    style={{
                                        padding: '5px 8px',
                                        borderRadius: 6, fontSize: 13,
                                        cursor: 'pointer',
                                        border: user.is_staff
                                            ? '1px solid rgba(99,102,241,0.30)'
                                            : '1px solid rgba(255,255,255,0.08)',
                                        background: user.is_staff
                                            ? 'rgba(99,102,241,0.12)'
                                            : 'rgba(255,255,255,0.04)',
                                        color: user.is_staff
                                            ? '#a5b4fc' : '#6b7280',
                                    }}>
                                    🛡️
                                </button>

                                {/* Block/Unblock */}
                                <button
                                    onClick={() => toggleActive(user)}
                                    title={user.is_active
                                        ? 'Bloklash' : 'Blokdan chiqarish'}
                                    style={{
                                        padding: '5px 8px',
                                        borderRadius: 6, fontSize: 13,
                                        cursor: 'pointer',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        background: 'rgba(255,255,255,0.04)',
                                        color: user.is_active
                                            ? '#6b7280' : '#ef4444',
                                    }}>
                                    {user.is_active ? '🔓' : '🔒'}
                                </button>

                                {/* Profilga o'tish */}
                                <button
                                    onClick={() => window.open(
                                        `/profile/${user.username}`, '_blank'
                                    )}
                                    title="Profilni ko'rish"
                                    style={{
                                        padding: '5px 8px',
                                        borderRadius: 6, fontSize: 13,
                                        cursor: 'pointer',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        background: 'rgba(255,255,255,0.04)',
                                        color: '#6b7280',
                                    }}>
                                    👤
                                </button>
                            </div>
                        </div>
                    )
                })}

                {/* Empty */}
                {!loading && users.length === 0 && (
                    <div style={{
                        textAlign: 'center', padding: '60px 20px',
                    }}>
                        <div style={{ fontSize: 40, marginBottom: 12 }}>
                            👥
                        </div>
                        <div style={{ color: '#6b7280', fontSize: 14 }}>
                            {search
                                ? `"${search}" bo'yicha natija yo'q`
                                : 'Foydalanuvchi topilmadi'}
                        </div>
                    </div>
                )}
            </div>

            {/* CONFIRM MODAL */}
            {confirm && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 1000,
                    background: 'rgba(0,0,0,0.7)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'center',
                }}
                    onClick={() => setConfirm(null)}>
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: '#0e0e1a',
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: 14, padding: 28,
                            maxWidth: 360, width: '90%',
                            boxShadow: '0 32px 64px rgba(0,0,0,0.5)',
                        }}>
                        <div style={{
                            fontSize: 32, marginBottom: 14,
                            textAlign: 'center',
                        }}>
                            {confirm.newVal ? '🛡️' : '⚠️'}
                        </div>
                        <p style={{
                            color: '#e8e8f0', fontSize: 15,
                            textAlign: 'center',
                            fontWeight: 600, marginBottom: 8,
                        }}>
                            {confirm.msg}
                        </p>
                        <p style={{
                            color: '#6b7280', fontSize: 13,
                            textAlign: 'center', marginBottom: 24,
                        }}>
                            Bu amalni keyinchalik o'zgartirish mumkin
                        </p>
                        <div style={{
                            display: 'flex', gap: 10,
                        }}>
                            <button
                                onClick={() => setConfirm(null)}
                                style={{
                                    flex: 1, padding: '10px',
                                    borderRadius: 8, cursor: 'pointer',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.10)',
                                    color: '#9898bb', fontSize: 14,
                                    fontWeight: 600,
                                }}>
                                Bekor
                            </button>
                            <button
                                onClick={handleConfirm}
                                style={{
                                    flex: 1, padding: '10px',
                                    borderRadius: 8, cursor: 'pointer',
                                    background: confirm.newVal
                                        ? 'linear-gradient(135deg,#6366f1,#8b5cf6)'
                                        : 'rgba(239,68,68,0.15)',
                                    border: confirm.newVal
                                        ? 'none'
                                        : '1px solid rgba(239,68,68,0.30)',
                                    color: 'white', fontSize: 14,
                                    fontWeight: 600,
                                    boxShadow: confirm.newVal
                                        ? '0 0 20px rgba(99,102,241,0.30)'
                                        : 'none',
                                }}>
                                Tasdiqlash
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
