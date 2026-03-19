import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import Editor from '@monaco-editor/react';
import { contestsApi } from '../api/contests';
import { submissionApi } from '../api/submissions'; // Custom check submission
import { useAuthStore } from '../store/authStore';

/* ═══ COUNTDOWN HOOK ═══════════════════ */
function useCountdown(target) {
    const [left, setLeft] = useState({ h: 0, m: 0, s: 0 });
    useEffect(() => {
        if (!target) return;
        const tick = () => {
            const diff = Math.max(0, new Date(target) - Date.now());
            setLeft({
                h: Math.floor(diff / 3600000),
                m: Math.floor((diff % 3600000) / 60000),
                s: Math.floor((diff % 60000) / 1000),
            });
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [target]);
    return left;
}

const STARTERS = {
    python: '# Python 3\nimport sys\ninput = sys.stdin.readline\n\n',
    cpp: '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}\n',
    java: 'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        \n    }\n}\n',
    csharp: 'using System;\n\nclass Solution {\n    static void Main() {\n        \n    }\n}',
};

const LANGS = [
    { value: 'python', label: 'Python 3' },
    { value: 'cpp', label: 'C++ 17' },
    { value: 'java', label: 'Java' },
    { value: 'csharp', label: 'C#' },
];

export default function ContestDetail() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const isAuth = useAuthStore(s => s.isAuthenticated);
    const currentUser = useAuthStore(s => s.user);

    const handleEditorBeforeMount = (monaco) => {
        monaco.editor.defineTheme('judge-dark', {
            base: 'vs-dark', inherit: true,
            rules: [
                { token: 'comment', foreground: '4a4a6a', fontStyle: 'italic' },
                { token: 'keyword', foreground: '8b5cf6' },
                { token: 'string', foreground: '10b981' },
                { token: 'number', foreground: 'f59e0b' },
                { token: 'function', foreground: '6366f1' },
                { token: 'type', foreground: '818cf8' },
            ],
            colors: {
                'editor.background': '#111122',
                'editor.foreground': '#e0e0ff',
                'editor.lineHighlightBackground': 'var(--bg-surface)',
                'editor.selectionBackground': '#6366f130',
                'editorLineNumber.foreground': '#2a2a4a',
                'editorLineNumber.activeForeground': '#6366f1',
                'editorCursor.foreground': '#6366f1',
                'editor.findMatchBackground': '#6366f140',
                'editorBracketMatch.background': '#6366f120',
                'editorBracketMatch.border': '#6366f160',
                'editorWidget.background': 'var(--bg-surface)',
                'editorSuggestWidget.background': 'var(--bg-surface)',
                'scrollbarSlider.background': '#ffffff10',
                'scrollbarSlider.hoverBackground': '#ffffff20',
            },
        });
    };
    const [contest, setContest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedProblem, setSelectedProblem] = useState(0);
    const [lang, setLang] = useState('cpp');
    const [code, setCode] = useState(STARTERS.cpp);

    // Submissions and UI state
    const [submitting, setSubmitting] = useState(false);
    const [submitState, setSubmitState] = useState('idle'); // 'idle' | 'running' | 'done' | 'error'
    const [submitResult, setSubmitResult] = useState(null);
    const [mySubmissions, setMySubmissions] = useState([]);
    const [ratingChange, setRatingChange] = useState(null); // Keep for backwards compat
    const [ratingData, setRatingData] = useState(null);
    const [ratingLoading, setRatingLoading] = useState(false);
    const pollingRef = useRef(null);

    const [registering, setRegistering] = useState(false);
    const [teamName, setTeamName] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const textareaRef = useRef(null);

    const fetchContest = useCallback(async () => {
        try {
            const res = await contestsApi.getDetail(slug);
            setContest(res.data);
            document.title = `${res.data.title} — OnlineJudge`;
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [slug]);

    const fetchMySubmissions = useCallback(async () => {
        if (!isAuth) return;
        try {
            const res = await contestsApi.getMySubmissions(slug);
            setMySubmissions(res.data);
        } catch (err) { console.error(err); }
    }, [slug, isAuth]);

    const loadRatingData = useCallback(async () => {
        try {
            const { data } = await contestsApi.getRating(slug);
            setRatingData(data);

            if (data?.available) {
                // Find current user's rating change
                const u = useAuthStore.getState().user;
                if (u) {
                    const myR = data.changes?.find(c => c.username === u.username);
                    if (myR) setRatingChange(myR);
                }
                clearInterval(pollingRef.current);
                pollingRef.current = null;
            }
        } catch (err) { console.error(err); }
    }, [slug]);

    useEffect(() => {
        fetchContest();
        fetchMySubmissions();
        // Initial rating load
        loadRatingData();
    }, [fetchContest, fetchMySubmissions, loadRatingData]);

    useEffect(() => {
        if (contest?.status === 'finished' && contest?.is_rated) {
            loadRatingData();
            // Har 10 soniyada tekshirish (rating hisoblangunicha)
            pollingRef.current = setInterval(() => {
                loadRatingData();
            }, 10000);
        }

        return () => {
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
            }
        };
    }, [contest?.status, contest?.is_rated, loadRatingData]);

    // Right Sidebar Auto-refresh submissions
    useEffect(() => {
        if (!contest || !(contest.status === 'running' || contest.status === 'frozen')) return;
        const id = setInterval(fetchMySubmissions, 5000);
        return () => clearInterval(id);
    }, [contest, fetchMySubmissions]);

    // Countdown target
    const countdownTarget = contest?.status === 'upcoming' ? contest.start_time
        : contest?.status === 'running' || contest?.status === 'frozen' ? contest.end_time : null;
    const countdown = useCountdown(countdownTarget);

    // Derived contest data
    const userEntry = contest?.user_entry;
    const probResults = userEntry?.problem_results || {};
    const userStats = useMemo(() => {
        if (!userEntry) return null;
        const solved = Object.values(probResults).filter(p => p.solved).length;
        const total = contest?.problem_count || 0;
        const penalty = userEntry?.penalty || 0;
        const rank = userEntry?.rank || '—';
        return { solved, total, penalty, rank, pr: probResults };
    }, [userEntry, contest, probResults]);
    const handleLangChange = (newLang) => {
        setLang(newLang);
        if (code === '' || Object.values(STARTERS).includes(code)) {
            setCode(STARTERS[newLang] || '');
        }
    };

    const handleRegister = async (isVirtual = false) => {
        if (!isAuth) { navigate('/login'); return; }
        setRegistering(true);
        try {
            await contestsApi.register(slug, { is_virtual: isVirtual });
            await fetchContest();
        } catch (err) {
            alert(err.response?.data?.detail || 'Xatolik');
        } finally { setRegistering(false); }
    };

    const handleCreateTeam = async () => {
        if (!teamName.trim()) return;
        try {
            const res = await contestsApi.createTeam(slug, { name: teamName });
            alert(`Team yaratildi! Invite code: ${res.data.invite_code}`);
            await fetchContest();
        } catch (err) {
            alert(err.response?.data?.detail || 'Xatolik');
        }
    };

    const handleJoinTeam = async () => {
        if (!inviteCode.trim()) return;
        try {
            await contestsApi.joinTeam(slug, { invite_code: inviteCode });
            await fetchContest();
        } catch (err) {
            alert(err.response?.data?.detail || 'Xatolik');
        }
    };

    const pollSubmission = async (subId) => {
        setSubmitState('running');
        let attempts = 0;

        const poll = async () => {
            try {
                const { data } = await submissionApi.getDetail(subId);
                if (['PENDING', 'RUNNING'].includes(data.status.toUpperCase())) {
                    attempts++;
                    if (attempts < 60) {
                        setTimeout(poll, 1500);
                    } else {
                        setSubmitState('error');
                        setSubmitResult({ error: 'Timeout' });
                    }
                    return;
                }
                // Final status
                setSubmitResult(data);
                setSubmitState('done');

                // Tab rangi yangilash uchun
                fetchContest();
                fetchMySubmissions();

            } catch (err) {
                setSubmitState('error');
                setSubmitResult({ error: err.response?.data?.detail || 'Xato' });
            }
        };
        poll();
    };

    const handleSubmit = async () => {
        if (!contest?.problems?.length) return;
        const prob = contest.problems[selectedProblem];
        setSubmitting(true);
        setSubmitState('idle');
        setSubmitResult(null);
        try {
            const res = await contestsApi.submit(slug, prob.label, { code, language: lang });
            pollSubmission(res.data.submission_id);
        } catch (err) {
            setSubmitState('error');
            setSubmitResult({ error: err.response?.data?.detail || 'Xatolik yuz berdi' });
        } finally {
            setSubmitting(false);
        }
    };

    // Rating Animation
    const [displayRating, setDisplayRating] = useState(ratingChange?.old_rating || 0);
    useEffect(() => {
        if (!ratingChange) return;
        const start = ratingChange.old_rating;
        const end = ratingChange.new_rating;
        const dur = 1200;
        const startTime = performance.now();

        const animate = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / dur, 1);
            const ease = 1 - Math.pow(1 - progress, 3);
            setDisplayRating(Math.round(start + (end - start) * ease));
            if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }, [ratingChange]);

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
            <div style={{
                width: 32, height: 32, borderRadius: '50%',
                border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1',
                animation: 'spin 0.8s linear infinite',
            }} />
        </div>
    );
    if (!contest) return (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#55556a' }}>Kontest topilmadi</div>
    );

    const sc = {
        upcoming: { color: '#f59e0b', label: 'KUTILMOQDA' },
        running: { color: '#10b981', label: 'LIVE' },
        frozen: { color: '#3b82f6', label: 'FROZEN' },
        finished: { color: 'var(--text-muted)', label: 'TUGADI' },
        draft: { color: 'var(--text-muted)', label: 'DRAFT' },
    }[contest.status] || { color: 'var(--text-muted)', label: contest.status };

    const problems = contest.problems || [];
    const currentProblem = problems[selectedProblem];

    const countdownColor = countdown.h === 0 && countdown.m < 10 ? '#ef4444'
        : countdown.h === 0 ? '#f59e0b' : '#10b981';

    // Status Tab Design
    const getProblemStatus = (label) => {
        if (!userEntry?.problem_results) return 'none';
        const pr = userEntry.problem_results[label];
        if (!pr) return 'none';
        if (pr.solved) return 'accepted';
        if (pr.attempts > 0) return 'wrong';
        if (pr.frozen_attempts > 0) return 'pending';
        return 'none';
    };

    const TAB_STATUS = {
        accepted: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.30)', icon: '✓' },
        wrong: { color: '#ef4444', bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.25)', icon: '✗' },
        pending: { color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.25)', icon: '•' },
        none: { color: 'var(--text-muted)', bg: 'transparent', border: 'var(--border-subtle)', icon: null },
    };

    return (
        <div style={{ width: '100%', padding: '28px 5%', fontFamily: 'var(--font-sans)' }}>
            {/* ── BIRINCHI QATOR: Breadcrumb + Meta ── */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '10px',
            }}>
                {/* Breadcrumb */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: 'var(--text-muted)',
                }}>
                    <span
                        onClick={() => navigate('/contests')}
                        style={{ cursor: 'pointer', color: 'var(--text-muted)', transition: 'color 0.15s' }}
                        onMouseEnter={e => e.target.style.color = 'var(--accent-hover)'}
                        onMouseLeave={e => e.target.style.color = 'var(--text-muted)'}
                    >
                        Musobaqalar
                    </span>
                    <span style={{ opacity: 0.4 }}>/</span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                        {contest.title}
                    </span>
                </div>

                {/* O'ng: Ishtirokchilar + Scoreboard link */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500' }}>
                        👥 {contest.reg_count || 0} ta ishtirokchi
                    </span>
                    <button
                        onClick={() => navigate(`/contests/${slug}/scoreboard`)}
                        style={{
                            height: '32px',
                            padding: '0 14px',
                            borderRadius: '8px',
                            background: 'rgba(99,102,241,0.10)',
                            border: '1px solid rgba(99,102,241,0.22)',
                            color: 'var(--accent-hover)',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            fontFamily: 'var(--font-sans)',
                            transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.18)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.10)'; }}
                    >
                        🏆 Natijalar jadvali
                    </button>
                </div>
            </div>

            {/* ── IKKINCHI QATOR: Title + Badges + Countdown ── */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '18px',
                gap: '16px',
            }}>
                {/* Chap: Title + badges */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    flexWrap: 'wrap',
                    flex: 1,
                    minWidth: 0,
                }}>
                    <h1 style={{
                        fontSize: '22px',
                        fontWeight: '800',
                        letterSpacing: '-0.02em',
                        color: 'var(--text-primary)',
                        margin: 0,
                        fontFamily: 'var(--font-sans)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        lineHeight: 1.2,
                    }}>
                        {contest.title}
                    </h1>

                    {/* Status badge */}
                    {contest.status === 'running' && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'rgba(16,185,129,0.10)',
                            border: '1px solid rgba(16,185,129,0.22)',
                            borderRadius: '100px',
                            padding: '4px 12px',
                        }}>
                            <div style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: '#10b981',
                                boxShadow: '0 0 6px #10b981',
                                animation: 'pulse 2s infinite',
                                flexShrink: 0,
                            }} />
                            <span style={{
                                fontSize: '11px',
                                fontWeight: '700',
                                letterSpacing: '0.06em',
                                color: '#10b981',
                            }}>
                                JONLI
                            </span>
                        </div>
                    )}

                    {contest.is_rated && (
                        <span style={{
                            background: 'rgba(99,102,241,0.10)',
                            border: '1px solid rgba(99,102,241,0.22)',
                            borderRadius: '100px',
                            padding: '4px 12px',
                            fontSize: '11px',
                            fontWeight: '700',
                            letterSpacing: '0.04em',
                            color: 'var(--accent-hover)',
                        }}>
                            Reytingli
                        </span>
                    )}

                    {contest.is_team && (
                        <span style={{
                            background: 'rgba(245,158,11,0.10)',
                            border: '1px solid rgba(245,158,11,0.22)',
                            borderRadius: '100px',
                            padding: '4px 12px',
                            fontSize: '11px',
                            fontWeight: '700',
                            letterSpacing: '0.04em',
                            color: '#f59e0b',
                        }}>
                            Jamoaviy
                        </span>
                    )}
                </div>

                {/* O'ng: INLINE COUNTDOWN */}
                {countdownTarget && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'var(--bg-surface)',
                        border: `1px solid ${countdown.h === 0 && countdown.m < 10
                            ? 'rgba(239,68,68,0.30)'
                            : countdown.h === 0
                                ? 'rgba(245,158,11,0.25)'
                                : 'var(--border-default)'
                            }`,
                        borderRadius: '12px',
                        padding: '8px 16px',
                        flexShrink: 0,
                        boxShadow: 'var(--card-shadow)',
                    }}>
                        <span style={{
                            fontSize: '12px',
                            fontWeight: '500',
                            color: 'var(--text-muted)',
                            marginRight: '4px',
                            whiteSpace: 'nowrap',
                        }}>
                            {contest.status === 'upcoming'
                                ? 'Boshlanishiga:'
                                : 'Tugashiga:'}
                        </span>

                        {/* HH:MM:SS inline */}
                        {[
                            { val: countdown.h, label: 'soat' },
                            { val: countdown.m, label: 'min' },
                            { val: countdown.s, label: 'sek' },
                        ].map((t, i) => (
                            <React.Fragment key={i}>
                                {i > 0 && (
                                    <span style={{
                                        color: 'var(--text-muted)',
                                        fontSize: '18px',
                                        fontWeight: '300',
                                        margin: '0 1px',
                                        opacity: 0.5,
                                    }}>
                                        :
                                    </span>
                                )}
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{
                                        fontSize: '22px',
                                        fontWeight: '700',
                                        fontFamily: 'var(--font-mono)',
                                        color: countdown.h === 0 && countdown.m < 10
                                            ? '#ef4444'
                                            : countdown.h === 0
                                                ? '#f59e0b'
                                                : '#10b981',
                                        lineHeight: 1,
                                        minWidth: '30px',
                                    }}>
                                        {String(t.val).padStart(2, '0')}
                                    </div>
                                    <div style={{
                                        fontSize: '10px',
                                        fontWeight: '500',
                                        color: 'var(--text-muted)',
                                        marginTop: '3px',
                                        letterSpacing: '0.03em',
                                    }}>
                                        {t.label}
                                    </div>
                                </div>
                            </React.Fragment>
                        ))}
                    </div>
                )}
            </div>

            {/* Two column layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>

                {/* LEFT PANEL */}
                <div>
                    {/* Upcoming — masalalar yashiriladi */}
                    {contest.status === 'upcoming' && (
                        <div style={{
                            background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                            borderRadius: 14, padding: '40px 20px', textAlign: 'center',
                        }}>
                            <span style={{ fontSize: 40, display: 'block', marginBottom: 12 }}>🔒</span>
                            <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>
                                Masalalar kontest boshlanganidan keyin ko'rinadi
                            </p>
                        </div>
                    )}

                    {/* Problem tabs */}
                    {problems.length > 0 && contest.status !== 'upcoming' && (
                        <>
                            {/* ── UCHINCHI QATOR: Problem tabs ── */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                flexWrap: 'wrap',
                                marginBottom: '16px',
                            }}>
                                {problems.map((prob, i) => {
                                    const status = getProblemStatus(prob.label);
                                    const tabStyle = TAB_STATUS[status];
                                    const isActive = i === selectedProblem;
                                    const pr = probResults[prob.label];

                                    return (
                                        <div
                                            key={prob.label}
                                            onClick={() => { setSelectedProblem(i); setSubmitState('idle'); setSubmitResult(null); }}
                                            title={pr ? `${prob.label}: ${prob.title} — ${pr.solved ? `Accepted (+${pr.time} min, -${pr.attempts - 1} WA)` : `${pr.attempts} ta urinish (WA)`}` : `${prob.label}: ${prob.title}`}
                                            style={{
                                                position: 'relative',
                                                width: '48px',
                                                height: '40px',
                                                borderRadius: '8px',
                                                border: `1px solid ${isActive ? '#6366f1' : tabStyle.border
                                                    }`,
                                                background: isActive
                                                    ? 'rgba(99,102,241,0.15)'
                                                    : tabStyle.bg,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '2px',
                                                transition: 'all 0.15s',
                                            }}
                                        >
                                            <span style={{
                                                fontSize: '14px',
                                                fontWeight: '700',
                                                color: isActive
                                                    ? '#a5b4fc'
                                                    : (tabStyle.icon ? tabStyle.color : 'var(--text-muted)'),
                                                lineHeight: 1,
                                            }}>
                                                {prob.label}
                                            </span>
                                            {tabStyle.icon && (
                                                <span style={{
                                                    fontSize: '9px',
                                                    fontWeight: '800',
                                                    color: tabStyle.color,
                                                    lineHeight: 1,
                                                }}>
                                                    {tabStyle.icon}
                                                </span>
                                            )}
                                            {isActive && (
                                                <div style={{
                                                    position: 'absolute',
                                                    bottom: 0,
                                                    left: '20%',
                                                    right: '20%',
                                                    height: '2px',
                                                    borderRadius: '2px 2px 0 0',
                                                    background:
                                                        'linear-gradient(90deg,#6366f1,#8b5cf6)',
                                                }} />
                                            )}
                                        </div>
                                    )
                                })}

                                {/* Contest meta — tabs yonida */}
                                <div style={{
                                    marginLeft: 'auto',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '14px',
                                    fontSize: '13px',
                                    fontWeight: '500',
                                    color: 'var(--text-muted)',
                                }}>
                                    <span>
                                        📅 {new Date(contest.start_time).toLocaleDateString('uz-UZ')} {new Date(contest.start_time).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <span>⏱ {contest.duration_min || 0} daqiqa</span>
                                </div>
                            </div>

                            {/* Problem content */}
                            {currentProblem && (
                                <div style={{
                                    background: 'var(--bg-surface)',
                                    border: '1px solid var(--border-default)',
                                    borderRadius: 16,
                                    padding: '28px 30px',
                                    boxShadow: 'var(--card-shadow)',
                                }}>
                                    <h2 style={{
                                        fontSize: 20,
                                        fontWeight: 700,
                                        color: 'var(--text-primary)',
                                        marginBottom: 8,
                                        fontFamily: 'var(--font-sans)',
                                        letterSpacing: '-0.01em',
                                        lineHeight: 1.3,
                                    }}>
                                        {currentProblem.label}. {currentProblem.title}
                                    </h2>
                                    <div style={{
                                        display: 'flex',
                                        gap: 8,
                                        marginBottom: 20,
                                        paddingBottom: 20,
                                        borderBottom: '1px solid var(--border-subtle)',
                                    }}>
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center', gap: 5,
                                            padding: '4px 10px', borderRadius: 6,
                                            background: 'var(--bg-elevated)',
                                            border: '1px solid var(--border-subtle)',
                                            fontSize: 12, fontWeight: 600,
                                            color: 'var(--text-secondary)',
                                        }}>⏱ {currentProblem.time_limit}s</span>
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center', gap: 5,
                                            padding: '4px 10px', borderRadius: 6,
                                            background: 'var(--bg-elevated)',
                                            border: '1px solid var(--border-subtle)',
                                            fontSize: 12, fontWeight: 600,
                                            color: 'var(--text-secondary)',
                                        }}>💾 {currentProblem.memory_limit}MB</span>
                                    </div>

                                    <div className="prose prose-invert" style={{
                                        maxWidth: 'none',
                                        fontSize: 15,
                                        lineHeight: 1.85,
                                        color: 'var(--text-secondary)',
                                        fontFamily: 'var(--font-sans)',
                                    }}>
                                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex, rehypeHighlight]}>{currentProblem.description || ''}</ReactMarkdown>

                                        {currentProblem.input_format && (
                                            <>
                                                <h3 style={{
                                                    fontSize: 15,
                                                    fontWeight: 700,
                                                    color: 'var(--text-primary)',
                                                    marginTop: 24,
                                                    marginBottom: 8,
                                                }}>Kirish formati</h3>
                                                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex, rehypeHighlight]}>{currentProblem.input_format}</ReactMarkdown>
                                            </>
                                        )}
                                        {currentProblem.output_format && (
                                            <>
                                                <h3 style={{
                                                    fontSize: 15,
                                                    fontWeight: 700,
                                                    color: 'var(--text-primary)',
                                                    marginTop: 24,
                                                    marginBottom: 8,
                                                }}>Chiqish formati</h3>
                                                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex, rehypeHighlight]}>{currentProblem.output_format}</ReactMarkdown>
                                            </>
                                        )}
                                    </div>

                                    {/* Samples */}
                                    {currentProblem.samples?.length > 0 && (
                                        <div style={{ marginTop: 28 }}>
                                            <h3 style={{
                                                fontSize: 14,
                                                fontWeight: 700,
                                                color: 'var(--text-primary)',
                                                marginBottom: 14,
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.06em',
                                                opacity: 0.7,
                                            }}>Misollar</h3>
                                            {currentProblem.samples.map((s, i) => (
                                                <div key={i} style={{
                                                    background: 'var(--bg-elevated)',
                                                    border: '1px solid var(--border-default)',
                                                    borderRadius: 12,
                                                    overflow: 'hidden',
                                                    marginBottom: 16,
                                                    boxShadow: 'var(--card-shadow)',
                                                }}>
                                                    <div style={{
                                                        padding: '10px 16px',
                                                        background: 'var(--bg-overlay)',
                                                        borderBottom: '1px solid var(--border-subtle)',
                                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                                    }}>
                                                        <span style={{
                                                            fontSize: 12,
                                                            fontWeight: 700,
                                                            color: 'var(--text-secondary)',
                                                            letterSpacing: '0.05em',
                                                            textTransform: 'uppercase',
                                                        }}>
                                                            Namuna #{i + 1}
                                                        </span>
                                                        <button
                                                            onClick={(e) => {
                                                                navigator.clipboard.writeText(`${s.input}\n---\n${s.output}`);
                                                                const btn = e.currentTarget;
                                                                const orig = btn.innerText;
                                                                btn.innerText = '✓ Nusxalandi';
                                                                btn.style.color = '#10b981';
                                                                btn.style.borderColor = 'rgba(16,185,129,0.4)';
                                                                setTimeout(() => {
                                                                    btn.innerText = orig;
                                                                    btn.style.color = 'var(--text-muted)';
                                                                    btn.style.borderColor = 'var(--border-default)';
                                                                }, 1500);
                                                            }}
                                                            style={{
                                                                background: 'transparent',
                                                                border: '1px solid var(--border-default)',
                                                                color: 'var(--text-muted)',
                                                                fontSize: 11,
                                                                fontWeight: 600,
                                                                padding: '4px 12px',
                                                                borderRadius: 6,
                                                                cursor: 'pointer',
                                                                transition: 'all 0.15s',
                                                                fontFamily: 'var(--font-sans)',
                                                            }}
                                                            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-strong)'; }}
                                                            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-default)'; }}
                                                        >
                                                            Nusxa
                                                        </button>
                                                    </div>
                                                    <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16 }}>
                                                        <div>
                                                            <div style={{
                                                                fontSize: 11,
                                                                fontWeight: 700,
                                                                color: 'var(--accent-hover)',
                                                                marginBottom: 8,
                                                                letterSpacing: '0.07em',
                                                                textTransform: 'uppercase',
                                                            }}>Kirish</div>
                                                            <pre style={{
                                                                background: 'var(--bg-base)',
                                                                border: '1px solid var(--border-default)',
                                                                borderRadius: 8,
                                                                padding: '12px 16px',
                                                                fontSize: 14,
                                                                lineHeight: 1.7,
                                                                color: 'var(--text-primary)',
                                                                fontFamily: 'var(--font-mono)',
                                                                whiteSpace: 'pre-wrap',
                                                                wordBreak: 'break-word',
                                                                margin: 0,
                                                            }}>{s.input}</pre>
                                                        </div>
                                                        <div>
                                                            <div style={{
                                                                fontSize: 11,
                                                                fontWeight: 700,
                                                                color: '#10b981',
                                                                marginBottom: 8,
                                                                letterSpacing: '0.07em',
                                                                textTransform: 'uppercase',
                                                            }}>Chiqish</div>
                                                            <pre style={{
                                                                background: 'var(--bg-base)',
                                                                border: '1px solid var(--border-default)',
                                                                borderRadius: 8,
                                                                padding: '12px 16px',
                                                                fontSize: 14,
                                                                lineHeight: 1.7,
                                                                color: 'var(--text-primary)',
                                                                fontFamily: 'var(--font-mono)',
                                                                whiteSpace: 'pre-wrap',
                                                                wordBreak: 'break-word',
                                                                margin: 0,
                                                            }}>{s.output}</pre>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Code editor */}
                                    {contest.registered && (contest.status === 'running' || contest.status === 'frozen') && (
                                        <div style={{ marginTop: 28, borderTop: '1px solid var(--border-subtle)', paddingTop: 24 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Yechim yozing</span>
                                                <select
                                                    value={lang}
                                                    onChange={e => handleLangChange(e.target.value)}
                                                    style={{
                                                        padding: '6px 12px',
                                                        borderRadius: 8,
                                                        fontSize: 13,
                                                        fontFamily: 'var(--font-sans)',
                                                        fontWeight: 600,
                                                        background: 'var(--input-bg) !important',
                                                        color: 'var(--input-text) !important',
                                                        border: '1px solid var(--border-default) !important',
                                                        width: 'auto',
                                                    }}
                                                >
                                                    {LANGS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                                                </select>
                                            </div>
                                            <div style={{
                                                height: 380, width: '100%',
                                                border: '1px solid var(--border-default)',
                                                borderRadius: 10, overflow: 'hidden'
                                            }}>
                                                <Editor
                                                    height="100%"
                                                    language={lang === 'cpp' ? 'cpp' : lang}
                                                    value={code}
                                                    onChange={(val) => setCode(val || '')}
                                                    theme="judge-dark"
                                                    beforeMount={handleEditorBeforeMount}
                                                    options={{
                                                        fontSize: 14, fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontLigatures: true,
                                                        minimap: { enabled: false }, scrollBeyondLastLine: false, lineNumbers: 'on', glyphMargin: false,
                                                        folding: true, lineDecorationsWidth: 8, lineNumbersMinChars: 3, renderLineHighlight: 'line',
                                                        cursorBlinking: 'smooth', cursorSmoothCaretAnimation: 'on', smoothScrolling: true,
                                                        padding: { top: 16, bottom: 16 }, bracketPairColorization: { enabled: true },
                                                        autoIndent: 'full', formatOnPaste: true, tabSize: 4, wordWrap: 'off',
                                                        scrollbar: { vertical: 'visible', horizontal: 'visible', verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
                                                    }}
                                                />
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                                                <button
                                                    onClick={handleSubmit}
                                                    disabled={submitting || !code.trim() || submitState === 'running'}
                                                    style={{
                                                        padding: '10px 24px', borderRadius: 8,
                                                        background: submitting ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                                        border: 'none', color: 'white', fontSize: 14, fontWeight: 700,
                                                        cursor: (submitting || submitState === 'running') ? 'wait' : 'pointer',
                                                        boxShadow: submitting ? 'none' : '0 0 16px rgba(99,102,241,0.3)',
                                                        transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6,
                                                    }}
                                                >
                                                    {submitState === 'running' || submitting ? (
                                                        <span style={{
                                                            width: 14, height: 14, borderRadius: '50%',
                                                            border: '2px solid rgba(255,255,255,0.3)',
                                                            borderTopColor: 'white', animation: 'spin 0.6s linear infinite',
                                                        }} />
                                                    ) : '⚡'} Yuborish — {currentProblem.label}
                                                </button>
                                            </div>

                                            {/* RICH SUBMISSION FEEDBACK PANEL */}
                                            {submitState !== 'idle' && (
                                                <div style={{
                                                    marginTop: 16, borderRadius: 10, padding: '14px 18px',
                                                    background: submitState === 'running' ? 'rgba(245,158,11,0.05)'
                                                        : submitResult?.status === 'ACCEPTED' ? 'rgba(16,185,129,0.08)'
                                                            : submitState === 'error' || submitResult?.status === 'WRONG_ANSWER' || submitResult?.status?.includes('ERROR') ? 'rgba(239,68,68,0.06)'
                                                                : 'var(--bg-elevated)',
                                                    border: `1px solid ${submitState === 'running' ? 'rgba(245,158,11,0.2)'
                                                        : submitResult?.status === 'ACCEPTED' ? 'rgba(16,185,129,0.25)'
                                                            : submitState === 'error' || submitResult?.status === 'WRONG_ANSWER' || submitResult?.status?.includes('ERROR') ? 'rgba(239,68,68,0.20)'
                                                                : 'var(--border-default)'
                                                        }`
                                                }}>
                                                    {submitState === 'running' && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#f59e0b', fontWeight: 600 }}>
                                                            <div style={{ width: 16, height: 16, border: '2px solid rgba(245,158,11,0.3)', borderTopColor: '#f59e0b', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                                                            ⚙️ Tekshirilmoqda... Kutib turing
                                                        </div>
                                                    )}
                                                    {submitState === 'error' && (
                                                        <div style={{ color: '#ef4444', fontWeight: 600 }}>
                                                            ❌ Xatolik: {submitResult?.error}
                                                        </div>
                                                    )}
                                                    {submitState === 'done' && submitResult && (
                                                        <div>
                                                            {submitResult.status === 'ACCEPTED' && (
                                                                <>
                                                                    <div style={{ color: '#10b981', fontSize: 16, fontWeight: 800, marginBottom: 4 }}>✅ Accepted</div>
                                                                    <div style={{ color: '#a7f3d0', fontSize: 13, marginBottom: 8 }}>{currentProblem.label} masalasi muvaffaqiyatli yechildi!</div>
                                                                    <div style={{ fontSize: 12, color: '#ecfdf5', opacity: 0.8, display: 'flex', gap: 12 }}>
                                                                        <span>Vaqt: {submitResult.time_used}ms</span>
                                                                        <span>Xotira: {submitResult.memory_used}MB</span>
                                                                    </div>
                                                                </>
                                                            )}
                                                            {submitResult.status === 'WRONG_ANSWER' && (
                                                                <>
                                                                    <div style={{ color: '#ef4444', fontSize: 16, fontWeight: 800, marginBottom: 4 }}>❌ Wrong Answer</div>
                                                                    <div style={{ color: '#fca5a5', fontSize: 13 }}>Testlarda xatolik mavjud. Qayta urinib ko'ring.</div>
                                                                    <div style={{ fontSize: 12, marginTop: 4, color: '#fee2e2', opacity: 0.8 }}>Vaqt: {submitResult.time_used}ms</div>
                                                                </>
                                                            )}
                                                            {submitResult.status === 'TIME_LIMIT_EXCEEDED' && (
                                                                <>
                                                                    <div style={{ color: '#f59e0b', fontSize: 16, fontWeight: 800, marginBottom: 4 }}>⏱ Time Limit Exceeded</div>
                                                                    <div style={{ color: '#fde68a', fontSize: 13 }}>Vaqt chegarasidan oshib ketdi ({currentProblem.time_limit}s).</div>
                                                                </>
                                                            )}
                                                            {submitResult.status === 'COMPILATION_ERROR' && (
                                                                <>
                                                                    <div style={{ color: '#f97316', fontSize: 16, fontWeight: 800, marginBottom: 4 }}>🔧 Compilation Error</div>
                                                                    <div style={{ color: '#fdba74', fontSize: 13 }}>Sintaktik xatolik mavjud.</div>
                                                                    <pre style={{ mt: 8, p: 8, background: 'rgba(0,0,0,0.3)', borderRadius: 4, fontSize: 11, color: '#ffedd5', overflowX: 'auto' }}>
                                                                        {submitResult.error_message || 'Xato matni yo\'q'}
                                                                    </pre>
                                                                </>
                                                            )}
                                                            {submitResult.status === 'RUNTIME_ERROR' && (
                                                                <>
                                                                    <div style={{ color: '#ef4444', fontSize: 16, fontWeight: 800, marginBottom: 4 }}>💥 Runtime Error</div>
                                                                    <div style={{ color: '#fca5a5', fontSize: 13 }}>Dastur ishlash vaqtida qulab tushdi.</div>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {/* No problems yet (only for non-upcoming statuses) */}
                    {problems.length === 0 && contest.status !== 'upcoming' && (
                        <div style={{
                            background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                            borderRadius: 14, padding: '40px 20px', textAlign: 'center',
                        }}>
                            {!contest.registered ? (
                                <>
                                    <span style={{ fontSize: 40, display: 'block', marginBottom: 12 }}>🔐</span>
                                    <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                                        Masalalarni ko'rish uchun ro'yxatdan o'ting
                                    </p>
                                </>
                            ) : (
                                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Masalalar mavjud emas</p>
                            )}
                        </div>
                    )}

                    {/* Description */}
                    {contest.description && (
                        <div style={{
                            marginTop: 20, background: 'var(--bg-elevated)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 14, padding: 24,
                        }}>
                            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Tavsif</h3>
                            <div className="prose prose-invert" style={{ maxWidth: 'none', fontSize: 14, color: 'var(--text-secondary)' }}>
                                <ReactMarkdown>{contest.description}</ReactMarkdown>
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT SIDEBAR */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 80 }}>

                    {/* A) Mening natijam */}
                    {userStats && (
                        <div style={{
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-default)',
                            borderRadius: 14,
                            padding: '18px 20px',
                            boxShadow: 'var(--card-shadow)',
                        }}>
                            <h4 style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: 'var(--text-muted)',
                                marginBottom: 14,
                                textTransform: 'uppercase',
                                letterSpacing: '0.08em',
                                fontFamily: 'var(--font-sans)',
                            }}>
                                Mening natijam
                            </h4>

                            {/* Stats */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
                                {[
                                    { val: `#${userStats.rank}`, label: "O'rin", color: 'var(--text-primary)' },
                                    { val: `${userStats.solved}/${userStats.total}`, label: 'Yechildi', color: '#10b981' },
                                    { val: userStats.penalty, label: 'Penalty', color: 'var(--text-secondary)' },
                                ].map((item, i) => (
                                    <div key={i} style={{
                                        background: 'var(--bg-elevated)',
                                        borderRadius: 10,
                                        padding: '12px 6px',
                                        textAlign: 'center',
                                        border: '1px solid var(--border-subtle)',
                                    }}>
                                        <div style={{
                                            fontSize: 20,
                                            fontWeight: 800,
                                            color: item.color,
                                            fontFamily: 'var(--font-mono)',
                                            lineHeight: 1,
                                            marginBottom: 5,
                                        }}>{item.val}</div>
                                        <div style={{
                                            fontSize: 10,
                                            fontWeight: 600,
                                            color: 'var(--text-muted)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                        }}>{item.label}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Progress bar */}
                            <div style={{ marginBottom: 16 }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontSize: 12,
                                    fontWeight: 500,
                                    color: 'var(--text-secondary)',
                                    marginBottom: 6,
                                }}>
                                    <span>Jami progress</span>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                                        {Math.round((userStats.solved / (userStats.total || 1)) * 100)}%
                                    </span>
                                </div>
                                <div style={{ height: 5, background: 'var(--border-default)', borderRadius: 3, overflow: 'hidden' }}>
                                    <div style={{
                                        height: '100%',
                                        background: 'linear-gradient(90deg, #10b981, #34d399)',
                                        width: `${(userStats.solved / (userStats.total || 1)) * 100}%`,
                                        transition: 'width 0.5s ease',
                                        borderRadius: 3,
                                    }} />
                                </div>
                            </div>

                            {/* Mini grid */}
                            <div style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: 'var(--text-muted)',
                                marginBottom: 8,
                                textTransform: 'uppercase',
                                letterSpacing: '0.07em',
                            }}>Masalalar</div>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {problems.map((p, i) => {
                                    const st = getProblemStatus(p.label);
                                    const pr = userStats.pr[p.label];
                                    return (
                                        <button
                                            key={p.label}
                                            onClick={() => setSelectedProblem(i)}
                                            title={pr ? `${p.label}: ${pr.solved ? `${pr.time} daq (-${pr.attempts - 1} WA)` : `${pr.attempts} ta urinish`}` : `${p.label}: Urinilmagan`}
                                            style={{
                                                width: 38,
                                                height: 38,
                                                borderRadius: 9,
                                                border: `1px solid ${TAB_STATUS[st].border}`,
                                                background: TAB_STATUS[st].bg,
                                                color: st === 'none' ? 'var(--text-secondary)' : TAB_STATUS[st].color,
                                                fontSize: 13,
                                                fontWeight: 700,
                                                fontFamily: 'var(--font-sans)',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                transition: 'all 0.15s',
                                            }}
                                        >
                                            {st === 'accepted' ? '✓' : st === 'wrong' ? '✗' : st === 'pending' ? '•' : p.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* B) Mening submissionlarim */}
                    {userStats && (
                        <div style={{
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-default)',
                            borderRadius: 14,
                            padding: '18px 20px',
                            maxHeight: 320,
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: 'var(--card-shadow)',
                        }}>
                            <h4 style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: 'var(--text-muted)',
                                marginBottom: 3,
                                textTransform: 'uppercase',
                                letterSpacing: '0.08em',
                                fontFamily: 'var(--font-sans)',
                            }}>
                                Mening submissionlarim
                            </h4>
                            <div style={{
                                fontSize: 12,
                                fontWeight: 500,
                                color: 'var(--text-muted)',
                                marginBottom: 12,
                            }}>Ushbu contest ichida</div>

                            <div style={{ overflowY: 'auto', flex: 1 }}>
                                {mySubmissions.length === 0 ? (
                                    <div style={{
                                        textAlign: 'center',
                                        padding: '20px 0',
                                        color: 'var(--text-muted)',
                                        fontSize: 13,
                                        lineHeight: 1.7,
                                    }}>
                                        Hali submission yo'q.<br />Masalani yechishni boshlang →
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        {mySubmissions.map(s => {
                                            const sUpper = s.status?.toUpperCase() || '';
                                            const isAc = sUpper === 'ACCEPTED';
                                            const isWa = sUpper === 'WRONG_ANSWER';
                                            const isPd = ['PENDING', 'RUNNING'].includes(sUpper);
                                            return (
                                                <div key={s.id} style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 10,
                                                    padding: '9px 0',
                                                    borderBottom: '1px solid var(--border-subtle)',
                                                }}>
                                                    <span style={{
                                                        fontSize: 11,
                                                        fontWeight: 700,
                                                        fontFamily: 'var(--font-mono)',
                                                        padding: '3px 7px',
                                                        borderRadius: 5,
                                                        background: isAc ? 'rgba(16,185,129,0.12)' : isWa ? 'rgba(239,68,68,0.10)' : isPd ? 'rgba(245,158,11,0.10)' : 'var(--bg-elevated)',
                                                        color: isAc ? '#10b981' : isWa ? '#ef4444' : isPd ? '#f59e0b' : 'var(--text-muted)',
                                                        minWidth: 40,
                                                        textAlign: 'center',
                                                        flexShrink: 0,
                                                    }}>
                                                        {isAc ? 'AC' : isWa ? 'WA' : isPd ? '···' : s.status.substring(0, 3)}
                                                    </span>
                                                    <span style={{
                                                        fontSize: 13,
                                                        fontWeight: 700,
                                                        fontFamily: 'var(--font-mono)',
                                                        color: 'var(--accent-hover)',
                                                        width: 18,
                                                        flexShrink: 0,
                                                    }}>{s.label}</span>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{
                                                            fontSize: 12,
                                                            fontWeight: 500,
                                                            color: 'var(--text-secondary)',
                                                            whiteSpace: 'nowrap',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                        }}>{s.problem_title}</div>
                                                        <div style={{
                                                            fontSize: 11,
                                                            color: 'var(--text-muted)',
                                                            marginTop: 1,
                                                            fontFamily: 'var(--font-mono)',
                                                        }}>
                                                            {new Date(s.created_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })} · {s.time_used}ms
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* C) Reyting o'zgarishi Card */}
                    {contest.is_rated && userStats && (
                        <div style={{
                            background: 'var(--bg-surface)',
                            border: `1px solid ${contest.status !== 'finished' ? 'var(--border-default)' : (!ratingData?.available ? 'rgba(245,158,11,0.20)' : 'var(--border-default)')}`,
                            borderRadius: 14,
                            padding: '18px 20px',
                            boxShadow: 'var(--card-shadow)',
                        }}>
                            <h4 style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: 'var(--text-muted)',
                                marginBottom: 14,
                                textTransform: 'uppercase',
                                letterSpacing: '0.08em',
                                fontFamily: 'var(--font-sans)',
                            }}>
                                Reyting o'zgarishi
                            </h4>

                            {contest.status !== 'finished' ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)' }}>
                                    <span style={{ fontSize: 18, flexShrink: 0 }}>🔒</span>
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                                            Musobaqa tugagandan keyin hisoblanadi
                                        </div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                                            Reytingli musobaqa
                                        </div>
                                    </div>
                                </div>
                            ) : !ratingData?.available ? (
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{
                                            width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                                            border: '2px solid rgba(245,158,11,0.20)',
                                            borderTopColor: '#f59e0b',
                                            animation: 'spin 1s linear infinite',
                                        }} />
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 600, color: '#f59e0b' }}>
                                                Reyting hisoblanmoqda...
                                            </div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                                                Har 10 soniyada tekshiriladi
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{
                                        marginTop: 12, padding: '10px 12px',
                                        background: 'rgba(245,158,11,0.06)',
                                        border: '1px solid rgba(245,158,11,0.12)',
                                        borderRadius: 8,
                                        fontSize: 12,
                                        lineHeight: 1.5,
                                        color: 'var(--text-muted)',
                                    }}>
                                        💡 Agar uzoq vaqt o'tsa, sahifani yangilang.
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    {(() => {
                                        const myChange = ratingData.changes?.find(c => c.username === currentUser?.username);
                                        return myChange ? (
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                                    <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                                                        {myChange.old_rating}
                                                    </span>
                                                    <span style={{ color: 'var(--text-muted)', fontSize: 16 }}>→</span>
                                                    <span style={{ fontSize: 20, fontWeight: 800, color: getRatingColor(myChange.new_rating), fontFamily: 'var(--font-mono)' }}>
                                                        {myChange.new_rating}
                                                    </span>
                                                    <span style={{
                                                        padding: '3px 9px', borderRadius: 100, fontSize: 12, fontWeight: 700,
                                                        fontFamily: 'var(--font-mono)',
                                                        background: myChange.delta > 0 ? 'rgba(16,185,129,0.12)' : myChange.delta < 0 ? 'rgba(239,68,68,0.10)' : 'rgba(107,114,128,0.10)',
                                                        color: myChange.delta > 0 ? '#10b981' : myChange.delta < 0 ? '#ef4444' : 'var(--text-muted)',
                                                    }}>
                                                        {myChange.delta > 0 ? `▲ +${myChange.delta}` : myChange.delta < 0 ? `▼ ${myChange.delta}` : '= 0'}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>
                                                    O'rin: <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>#{myChange.rank}</strong>
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Siz musobaqada ishtirok etmadingiz</div>
                                        );
                                    })()}
                                    <button
                                        onClick={() => navigate(`/contests/${slug}/scoreboard`)}
                                        style={{
                                            width: '100%', marginTop: 14, height: 34, borderRadius: 8,
                                            background: 'rgba(99,102,241,0.08)',
                                            border: '1px solid rgba(99,102,241,0.18)',
                                            color: 'var(--accent-hover)',
                                            fontSize: 13, fontWeight: 600, cursor: 'pointer',
                                            fontFamily: 'var(--font-sans)',
                                            transition: 'all 0.15s',
                                        }}
                                    >📊 Batafsil reyting o'zgarishlari</button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Team Card */}
                    {contest.is_team && contest.registered && (
                        <div style={{
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-default)',
                            borderRadius: 14,
                            padding: '18px 20px',
                            boxShadow: 'var(--card-shadow)',
                        }}>
                            <h4 style={{
                                fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
                                marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.08em',
                            }}>Jamoa</h4>
                            {contest.team ? (
                                <div>
                                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{contest.team.name}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, fontWeight: 500 }}>
                                        Invite: <code style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>{contest.team.invite_code}</code>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                        {contest.team.members?.map(m => (
                                            <div key={m.username} style={{
                                                display: 'flex', alignItems: 'center', gap: 8,
                                                padding: '6px 10px', borderRadius: 8,
                                                background: 'var(--bg-elevated)',
                                                border: '1px solid var(--border-subtle)',
                                            }}>
                                                <span style={{
                                                    width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                                                    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: 11, fontWeight: 700, color: 'white',
                                                }}>{m.username[0].toUpperCase()}</span>
                                                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{m.username}</span>
                                                {m.role === 'leader' && <span style={{ fontSize: 11, marginLeft: 'auto' }}>👑</span>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    <div>
                                        <input value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="Jamoa nomi..." style={{ fontSize: 13 }} />
                                        <button onClick={handleCreateTeam} style={{
                                            marginTop: 8, padding: '8px 14px', borderRadius: 8,
                                            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                                            border: 'none', color: 'white', fontSize: 13, fontWeight: 600,
                                            cursor: 'pointer', width: '100%', fontFamily: 'var(--font-sans)',
                                        }}>+ Jamoa yaratish</button>
                                    </div>
                                    <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>yoki</div>
                                    <div>
                                        <input value={inviteCode} onChange={e => setInviteCode(e.target.value)} placeholder="Invite code..." style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }} />
                                        <button onClick={handleJoinTeam} style={{
                                            marginTop: 8, padding: '8px 14px', borderRadius: 8,
                                            background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
                                            color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600,
                                            cursor: 'pointer', width: '100%', fontFamily: 'var(--font-sans)',
                                        }}>Qo'shilish</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Registration Card */}
                    {!contest.registered && (
                        <div style={{
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-default)',
                            borderRadius: 14,
                            padding: '18px 20px',
                            boxShadow: 'var(--card-shadow)',
                        }}>
                            {contest.status === 'finished' && contest.is_virtual_allowed ? (
                                <div style={{ textAlign: 'center' }}>
                                    <span style={{ fontSize: 26, display: 'block', marginBottom: 8 }}>▶</span>
                                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5 }}>
                                        O'tgan contestni qaytadan ishlang
                                    </p>
                                    <button
                                        onClick={() => handleRegister(true)}
                                        disabled={registering}
                                        style={{
                                            padding: '10px 20px', borderRadius: 8, width: '100%',
                                            background: 'rgba(6,182,212,0.10)', border: '1px solid rgba(6,182,212,0.22)',
                                            color: '#67e8f9', fontSize: 13, fontWeight: 700,
                                            cursor: 'pointer', fontFamily: 'var(--font-sans)',
                                        }}
                                    >{registering ? 'Kutib turing...' : 'Virtual ishtirok'}</button>
                                </div>
                            ) : contest.status !== 'finished' ? (
                                <div style={{ textAlign: 'center' }}>
                                    <span style={{ fontSize: 26, display: 'block', marginBottom: 8 }}>🔔</span>
                                    <button
                                        onClick={() => handleRegister(false)}
                                        disabled={registering}
                                        style={{
                                            padding: '11px 20px', borderRadius: 9, width: '100%',
                                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                            border: 'none', color: 'white', fontSize: 14, fontWeight: 700,
                                            cursor: 'pointer', fontFamily: 'var(--font-sans)',
                                            boxShadow: '0 4px 16px rgba(99,102,241,0.30)',
                                            transition: 'all 0.15s',
                                        }}
                                    >{registering ? 'Kutib turing...' : "Ro'yxatdan o'tish"}</button>
                                </div>
                            ) : null}
                        </div>
                    )}

                    {/* Scoreboard link */}
                    {contest.status !== 'upcoming' && (
                        <Link to={`/contests/${contest.slug}/scoreboard`} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            padding: '11px 16px', borderRadius: 10, textDecoration: 'none',
                            background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
                            color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600,
                            transition: 'all 0.15s', boxShadow: 'var(--card-shadow)',
                        }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-strong)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-surface)'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-default)'; }}
                        >🏆 Scoreboard</Link>
                    )}

                    {/* Meta info */}
                    <div style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-default)',
                        borderRadius: 14,
                        padding: '16px 20px',
                        boxShadow: 'var(--card-shadow)',
                    }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {[
                                { icon: '📅', label: 'Boshlanish', value: new Date(contest.start_time).toLocaleString('uz-UZ') },
                                { icon: '🏁', label: 'Tugash', value: new Date(contest.end_time).toLocaleString('uz-UZ') },
                                { icon: '⏱', label: 'Davomiyligi', value: `${Math.floor(contest.duration_min / 60)} soat ${contest.duration_min % 60} daqiqa` },
                                { icon: '👥', label: 'Ishtirokchilar', value: contest.reg_count },
                            ].map(m => (
                                <div key={m.label} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'baseline',
                                    gap: 8,
                                    fontSize: 13,
                                    paddingBottom: 10,
                                    borderBottom: '1px solid var(--border-subtle)',
                                }}>
                                    <span style={{ color: 'var(--text-muted)', fontWeight: 500, flexShrink: 0 }}>{m.icon} {m.label}</span>
                                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600, textAlign: 'right' }}>{m.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}