import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
    arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { adminApi } from '../../api/admin';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/atom-one-dark.css';

// -----------------------------------------------------------------------------
// HELPER COMPONENTS
// -----------------------------------------------------------------------------

const Card = ({ title, color, children, badge, style }) => (
    <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 16,
        padding: 24,
        position: 'relative',
        overflow: 'hidden',
        ...style
    }}>
        <div style={{
            fontSize: 11, fontWeight: 700, color: '#3a3a5a', letterSpacing: '0.1em',
            textTransform: 'uppercase', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8
        }}>
            <div style={{ width: 3, height: 14, background: color, borderRadius: 2 }}></div>
            {title}
            {badge && <span style={{
                background: `${color}20`, color: color, padding: '2px 8px',
                borderRadius: 12, fontSize: 10, marginLeft: 'auto'
            }}>{badge}</span>}
        </div>
        {children}
    </div>
);

const Label = ({ children, required }) => (
    <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
        {children}
        {required && <span style={{ color: '#ef4444', fontSize: 14 }}>*</span>}
    </label>
);

const Input = ({ ...props }) => (
    <input {...props} style={{
        height: props.height || 42, background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10,
        padding: '0 14px', color: '#e8e8f0', fontSize: props.fontSize || 13,
        outline: 'none', width: '100%', transition: 'all 0.15s',
        ...props.style
    }} />
);

const Toggle = ({ checked, onChange }) => (
    <div
        onClick={onChange}
        style={{
            width: 44, height: 24, borderRadius: 100, cursor: 'pointer', position: 'relative',
            transition: 'all 0.2s ease',
            background: checked ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.08)',
            border: checked ? 'none' : '1px solid rgba(255,255,255,0.12)',
            boxShadow: checked ? '0 0 12px rgba(99,102,241,0.40)' : 'none',
        }}
    >
        <div style={{
            width: 18, height: 18, borderRadius: '50%', background: 'white',
            position: 'absolute', top: checked ? 3 : 2,
            left: checked ? 23 : 3, transition: 'left 0.2s ease',
            boxShadow: '0 1px 4px rgba(0,0,0,0.3)'
        }} />
    </div>
);

const Pill = ({ active, color, onClick, children }) => (
    <div onClick={onClick} style={{
        height: 32, padding: '0 14px', borderRadius: 100, cursor: 'pointer',
        fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', transition: 'all 0.15s',
        background: active ? `${color}20` : 'rgba(255,255,255,0.03)',
        border: `1px solid ${active ? color + '40' : 'rgba(255,255,255,0.08)'}`,
        color: active ? color : '#3a3a5a'
    }}>
        {children}
    </div>
);

const FormatCard = ({ icon, label, desc, active, onClick }) => (
    <div onClick={onClick} style={{
        padding: '12px 14px', borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s',
        background: active ? 'rgba(99,102,241,0.10)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${active ? 'rgba(99,102,241,0.40)' : 'rgba(255,255,255,0.08)'}`,
        boxShadow: active ? '0 0 0 1px rgba(99,102,241,0.20)' : 'none',
        transform: active ? 'scale(1)' : 'scale(0.97)'
    }}>
        <div style={{ fontSize: 20, marginBottom: 8 }}>{icon}</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: active ? '#a5b4fc' : '#e8e8f0', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 11, color: '#4a4a6a', lineHeight: 1.3 }}>{desc}</div>
    </div>
);

const SortableProblemItem = ({ id, item, onRemove, onUpdate }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

    return (
        <div
            ref={setNodeRef}
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
                display: 'grid', gridTemplateColumns: 'auto 30px 1fr 100px 90px auto auto', gap: 12, alignItems: 'center',
                padding: '10px 14px', background: isDragging ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isDragging ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.07)'}`,
                borderRadius: 8, marginBottom: 4,
                boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.4)' : 'none',
                scale: isDragging ? '1.02' : '1', zIndex: isDragging ? 999 : 1,
            }}
        >
            <div {...attributes} {...listeners} style={{ cursor: 'grab', color: '#2a2a4a', fontSize: 16, transition: 'color 0.1s' }}
                onMouseOver={e => e.currentTarget.style.color = '#6b7280'}
                onMouseOut={e => e.currentTarget.style.color = '#2a2a4a'}
            >
                ⠿
            </div>

            <div style={{
                width: 28, height: 28, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)',
                borderRadius: 6, fontSize: 12, fontWeight: 800, color: '#a5b4fc', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                {item.label}
            </div>

            <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#d4d4e8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.title}
                </div>
                <div style={{ fontSize: 10, color: '#3a3a5a', fontFamily: 'monospace' }}>
                    {item.problem_id}
                </div>
            </div>

            <div>
                <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: 2 }}>MAX BALL</div>
                <select
                    value={item.score || 0}
                    onChange={e => onUpdate(id, 'score', parseInt(e.target.value))}
                    style={{
                        width: '100%', height: 26, background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.09)', borderRadius: 6,
                        color: '#e8e8f0', fontSize: 12, padding: '0 4px', outline: 'none'
                    }}
                >
                    <option value={0}>ICPC</option>
                    <option value={500}>500</option>
                    <option value={1000}>1000</option>
                    <option value={1500}>1500</option>
                    <option value={2000}>2000</option>
                    <option value={2500}>2500</option>
                    <option value={3000}>3000</option>
                </select>
            </div>

            <div>
                <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: 2 }}>JARIMA</div>
                <input
                    type="number"
                    value={item.wrong_penalty !== undefined ? item.wrong_penalty : 50}
                    onChange={e => onUpdate(id, 'wrong_penalty', parseInt(e.target.value))}
                    min={0} max={500} step={10}
                    style={{
                        width: '100%', height: 26, background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.09)', borderRadius: 6,
                        color: '#e8e8f0', fontSize: 12, padding: '0 8px', outline: 'none'
                    }}
                />
            </div>

            <div style={{
                padding: '2px 8px', borderRadius: 100, fontSize: 10, fontWeight: 600,
                background: item.difficulty === 'Oson' ? 'rgba(16,185,129,0.1)' : item.difficulty === 'Qiyin' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                color: item.difficulty === 'Oson' ? '#10b981' : item.difficulty === 'Qiyin' ? '#ef4444' : '#f59e0b',
                whiteSpace: 'nowrap'
            }}>
                {item.difficulty}
            </div>

            <button
                type="button" onClick={() => onRemove(id)}
                style={{
                    background: 'transparent', border: 'none', color: '#3a3a5a', cursor: 'pointer',
                    fontSize: 16, transition: 'all 0.15s', padding: '0 4px'
                }}
                onMouseOver={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.transform = 'scale(1.1)' }}
                onMouseOut={e => { e.currentTarget.style.color = '#3a3a5a'; e.currentTarget.style.transform = 'scale(1)' }}
            >
                ✕
            </button>
        </div>
    );
};

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------

export default function AdminContestForm() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const isEdit = Boolean(slug);

    const [loading, setLoading] = useState(isEdit);
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState(null); // 'success', 'error'
    const [allProblems, setAllProblems] = useState([]);
    const [searchProb, setSearchProb] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [descTab, setDescTab] = useState('write'); // 'write', 'preview'
    const [errors, setErrors] = useState({});

    // Debounce search
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchProb), 400);
        return () => clearTimeout(t);
    }, [searchProb]);

    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        contest_type: 'icpc',
        status: 'draft',
        start_time: '',
        duration_hours: 2,
        duration_minutes: 30,
        enable_freeze: false,
        freeze_duration: 60,
        is_team_contest: false,
        max_team_size: 3,
        is_virtual_allowed: true,
        is_rated: true,
        is_public: true,
        problems: [],
        // internal: end_time, freeze_time handled dynamically before save
    });

    useEffect(() => {
        adminApi.getProblems({ page_size: 100 }) // Load initial batch
            .then(res => setAllProblems(res.data.results || res.data))
            .catch(console.error);

        if (isEdit) {
            adminApi.getContest(slug).then(res => {
                const c = res.data;
                const d = (dateStr) => {
                    if (!dateStr) return '';
                    const date = new Date(dateStr);
                    // Generate YYYY-MM-DDThh:mm string in local time, not UTC
                    const tzOffset = date.getTimezoneOffset() * 60000;
                    return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
                };

                let h = 2, m = 30;
                if (c.start_time && c.end_time) {
                    const st = new Date(c.start_time);
                    const et = new Date(c.end_time);
                    const diffMin = Math.round((et - st) / 60000);
                    h = Math.floor(diffMin / 60);
                    m = diffMin % 60;
                }

                let freezeDur = 60, enableFrz = false;
                if (c.freeze_time && c.end_time) {
                    const et = new Date(c.end_time);
                    const ft = new Date(c.freeze_time);
                    freezeDur = Math.round((et - ft) / 60000);
                    enableFrz = true;
                }

                setFormData({
                    title: c.title,
                    description: c.description || '',
                    contest_type: c.contest_type,
                    status: c.status,
                    start_time: d(c.start_time),
                    duration_hours: h,
                    duration_minutes: m,
                    enable_freeze: enableFrz,
                    freeze_duration: freezeDur,
                    is_team_contest: c.is_team_contest,
                    max_team_size: c.max_team_size || 3,
                    is_virtual_allowed: c.is_virtual_allowed,
                    is_rated: c.is_rated,
                    is_public: c.is_public,
                    problems: c.problems.map((p, i) => ({
                        id: `p-${p.id}`,
                        problem_id: p.id,
                        label: p.label || alphabet[i] || `${i}`,
                        score: p.score || p.max_score || 0,
                        wrong_penalty: p.wrong_penalty !== undefined ? p.wrong_penalty : 50,
                        title: p.title,
                        difficulty: p.difficulty || 'O\'rta',
                    }))
                });
            }).catch(console.error).finally(() => setLoading(false));
        }
    }, [slug, isEdit]);

    // Derived values
    const generatedSlug = useMemo(() => {
        if (!formData.title) return '';
        return formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    }, [formData.title]);

    const end_time_obj = useMemo(() => {
        if (!formData.start_time) return null;
        const d = new Date(formData.start_time);
        d.setMinutes(d.getMinutes() + (formData.duration_hours || 0) * 60 + (formData.duration_minutes || 0));
        return d;
    }, [formData.start_time, formData.duration_hours, formData.duration_minutes]);

    // Validation
    const validate = () => {
        const errs = {};
        if (!formData.title.trim()) errs.title = "Musobaqa nomini kiriting";
        else if (formData.title.length < 3) errs.title = "Nom juda qisqa";

        if (!formData.start_time) errs.start_time = "Boshlanish vaqtini tanlang";
        else if (!isEdit && new Date(formData.start_time) < new Date()) errs.start_time = "Boshlanish vaqti o'tib ketgan";

        const totalMin = (formData.duration_hours || 0) * 60 + (formData.duration_minutes || 0);
        if (totalMin <= 0) errs.duration = "Davomiylik 0 dan katta bo'lishi kerak";
        if (totalMin > 360 * 60) errs.duration = "Juda uzun musobaqa";

        if (formData.problems.length === 0) errs.problems = "Kamida 1 ta masala qo'shing";

        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    // Warn on exit if unsaved (simplified approach, handled via effect usually but let's stick to simple implementation)
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (formData.title) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [formData]);

    const handleChange = (name, value) => {
        setFormData(p => ({ ...p, [name]: value }));
        if (errors[name]) setErrors(p => ({ ...p, [name]: null }));
    };

    // DND Handlers
    const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            setFormData(p => {
                const oldIndex = p.problems.findIndex(pr => pr.id === active.id);
                const newIndex = p.problems.findIndex(pr => pr.id === over.id);
                const newArr = arrayMove(p.problems, oldIndex, newIndex);
                // Re-assign labels
                return { ...p, problems: newArr.map((pr, i) => ({ ...pr, label: alphabet[i] || `${i}` })) };
            });
        }
    };

    const addProblem = (prob) => {
        if (formData.problems.find(p => p.problem_id === prob.id)) return;
        setFormData(p => {
            const nextIdx = p.problems.length;
            const nextLabel = nextIdx < 26 ? alphabet[nextIdx] : `${nextIdx}`;
            return {
                ...p,
                problems: [...p.problems, {
                    id: `p-${prob.id}`,
                    problem_id: prob.id,
                    label: nextLabel,
                    score: 100, // default score
                    title: prob.title,
                    difficulty: prob.difficulty || 'O\'rta',
                }]
            };
        });
        if (errors.problems) setErrors(e => ({ ...e, problems: null }));
    };

    const removeProblem = (id) => {
        setFormData(p => {
            const newArr = p.problems.filter(pr => pr.id !== id);
            // Re-assign labels
            return { ...p, problems: newArr.map((pr, i) => ({ ...pr, label: alphabet[i] || `${i}` })) };
        });
    };

    const updateProblemItem = (id, field, value) => {
        setFormData(p => ({
            ...p,
            problems: p.problems.map(pr => pr.id === id ? { ...pr, [field]: value } : pr)
        }));
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (!validate()) return;

        setSaving(true);
        setSaveStatus(null);
        try {
            // Calculate final times
            const start = new Date(formData.start_time);
            const end = end_time_obj;
            let freeze = null;

            if (formData.enable_freeze && formData.freeze_duration) {
                freeze = new Date(end.getTime() - formData.freeze_duration * 60000);
            }

            const payload = {
                title: formData.title,
                description: formData.description,
                contest_type: formData.contest_type,
                status: formData.status,
                start_time: start.toISOString(),
                end_time: end.toISOString(),
                freeze_time: freeze ? freeze.toISOString() : null,
                is_team_contest: formData.is_team_contest,
                max_team_size: formData.max_team_size,
                is_virtual_allowed: formData.is_virtual_allowed,
                is_rated: formData.is_rated,
                is_public: formData.is_public,
                problems: formData.problems.map((p, i) => ({
                    problem_id: p.problem_id,
                    order: i,
                    label: p.label,
                    max_score: p.score,          // Send as max_score to match backend
                    wrong_penalty: p.wrong_penalty,
                })),
            };

            if (isEdit) {
                await adminApi.updateContest(slug, payload);
            } else {
                await adminApi.createContest(payload);
            }

            setSaveStatus('success');
            setTimeout(() => {
                setSaveStatus(null);
                navigate('/admin/contests');
            }, 2000);
        } catch (err) {
            console.error(err);
            setSaveStatus('error');
            setTimeout(() => setSaveStatus(null), 3000);
        } finally {
            setSaving(false);
        }
    };

    const filteredProblems = useMemo(() => {
        if (!debouncedSearch) return [];
        const lowerSearch = debouncedSearch.toLowerCase();
        return allProblems.filter(p => p.title.toLowerCase().includes(lowerSearch) || p.id.toString().includes(lowerSearch));
    }, [allProblems, debouncedSearch]);


    if (loading) return <div style={{ padding: 40, color: '#9898bb' }}>Yuklanmoqda...</div>;

    const btnStyle = {
        background: saveStatus === 'success' ? '#10b981' : saveStatus === 'error' ? '#ef4444' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
        boxShadow: saveStatus === 'success' ? '0 0 20px rgba(16,185,129,0.3)' : saveStatus === 'error' ? '0 0 20px rgba(239,68,68,0.3)' : '0 0 20px rgba(99,102,241,0.35)',
        padding: '0 28px', height: 40, borderRadius: 8, color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', transition: 'all 0.3s'
    };

    return (
        <div style={{ paddingBottom: 80, fontFamily: 'Inter, sans-serif' }}>
            {/* HEADER */}
            <div style={{
                background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.07)',
                padding: '20px 32px', position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(12px)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32
            }}>
                <div>
                    <div style={{ fontSize: 12, color: '#3a3a5a', marginBottom: 4 }}>
                        <span style={{ cursor: 'pointer' }} onMouseOver={e => e.currentTarget.style.color = '#a5b4fc'} onMouseOut={e => e.currentTarget.style.color = '#3a3a5a'} onClick={() => navigate('/admin')}>Boshqaruv</span>
                        {" / "}
                        <span style={{ cursor: 'pointer' }} onMouseOver={e => e.currentTarget.style.color = '#a5b4fc'} onMouseOut={e => e.currentTarget.style.color = '#3a3a5a'} onClick={() => navigate('/admin/contests')}>Musobaqalar</span>
                        {" / "}
                        <span style={{ color: '#6b7280' }}>{isEdit ? 'Tahrirlash' : 'Yangi'}</span>
                    </div>
                    <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f0f0ff', margin: 0 }}>
                        {isEdit ? `✏️ ${formData.title}` : 'Yangi musobaqa yaratish'}
                    </h1>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                    <button className="btn-ghost" onClick={() => navigate('/admin/contests')}>← Orqaga</button>
                    {isEdit && <button className="btn-ghost" style={{ color: '#a5b4fc', borderColor: 'rgba(99,102,241,0.3)' }} onClick={() => window.open(`/contests/${slug}`, '_blank')}>Ko'zdan kechirish ↗</button>}
                    {isEdit && <button className="btn-ghost" style={{ color: '#fca5a5', borderColor: 'rgba(239,68,68,0.3)' }} onClick={() => { if (window.confirm('Rostdan o\'chirasizmi?')) console.log('delete logic here'); }}>🗑 O'chirish</button>}
                    <button style={btnStyle} onClick={handleSubmit} disabled={saving}>
                        {saveStatus === 'success' ? '✅ Saqlandi' : saveStatus === 'error' ? '❌ Xato' : saving ? 'Saqlanmoqda...' : '💾 Saqlash'}
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div style={{ padding: '0 32px', display: 'flex', gap: 32, flexDirection: window.innerWidth < 1024 ? 'column' : 'row' }}>

                {/* LEFT PANEL (65%) */}
                <div style={{ flex: '0 0 65%', display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0 }}>

                    {/* ASOSIY MA'LUMOT */}
                    <Card title="ASOSIY MA'LUMOTLAR" color="#6366f1">
                        <div style={{ marginBottom: 20 }}>
                            <Label required>Musobaqa nomi</Label>
                            <Input
                                value={formData.title}
                                onChange={e => handleChange('title', e.target.value)}
                                placeholder="Masalan: ICPC Uzbekistan Round #1"
                                height={48} fontSize={15}
                                style={{ borderColor: errors.title ? 'rgba(239,68,68,0.5)' : undefined }}
                            />
                            {errors.title ? (
                                <div style={{ color: '#ef4444', fontSize: 11, marginTop: 4, animation: 'slideDown 0.2s ease' }}>⚠ {errors.title}</div>
                            ) : (
                                formData.title && <div style={{ fontSize: 11, color: '#4a4a6a', marginTop: 4 }}>🔗 musobaqalar/{generatedSlug}</div>
                            )}
                        </div>

                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <Label>Tavsif</Label>
                                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 6, padding: 2 }}>
                                    <div onClick={() => setDescTab('write')} style={{ padding: '2px 10px', fontSize: 11, cursor: 'pointer', borderRadius: 4, background: descTab === 'write' ? 'rgba(255,255,255,0.1)' : 'transparent', color: descTab === 'write' ? 'white' : '#6b7280' }}>✏️ Yozish</div>
                                    <div onClick={() => setDescTab('preview')} style={{ padding: '2px 10px', fontSize: 11, cursor: 'pointer', borderRadius: 4, background: descTab === 'preview' ? 'rgba(255,255,255,0.1)' : 'transparent', color: descTab === 'preview' ? 'white' : '#6b7280' }}>👁 Ko'rish</div>
                                </div>
                            </div>

                            <div style={{ height: 160, border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10, overflow: 'hidden' }}>
                                {descTab === 'write' ? (
                                    <Editor
                                        height="100%"
                                        defaultLanguage="markdown"
                                        theme="vs-dark"
                                        value={formData.description}
                                        onChange={(v) => handleChange('description', v)}
                                        options={{ minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false, wordWrap: 'on' }}
                                    />
                                ) : (
                                    <div className="prose" style={{ padding: 16, height: '100%', overflowY: 'auto', background: 'rgba(255,255,255,0.02)', fontSize: 13 }}>
                                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex, rehypeHighlight]}>
                                            {formData.description || '*Tavsif bo\'sh*'}
                                        </ReactMarkdown>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>

                    {/* VAQT */}
                    <Card title="VAQT SOZLAMALARI" color="#f59e0b">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                            <div>
                                <Label required>Boshlanish vaqti</Label>
                                <Input
                                    type="datetime-local"
                                    value={formData.start_time}
                                    onChange={e => handleChange('start_time', e.target.value)}
                                    style={{ borderColor: errors.start_time ? 'rgba(239,68,68,0.5)' : undefined }}
                                />
                                {errors.start_time && <div style={{ color: '#ef4444', fontSize: 11, marginTop: 4, animation: 'slideDown 0.2s ease' }}>⚠ {errors.start_time}</div>}
                            </div>

                            <div>
                                <Label required>Davomiyligi</Label>
                                <div style={{ display: 'flex', gap: 10 }}>
                                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.04)', border: `1px solid ${errors.duration ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.09)'}`, borderRadius: 10, paddingRight: 14 }}>
                                        <input type="number" min="0" max="24" value={formData.duration_hours} onChange={e => handleChange('duration_hours', parseInt(e.target.value) || 0)} style={{ width: '100%', background: 'transparent', border: 'none', color: '#e8e8f0', padding: '0 14px', height: 42, outline: 'none' }} />
                                        <span style={{ fontSize: 12, color: '#6b7280' }}>soat</span>
                                    </div>
                                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.04)', border: `1px solid ${errors.duration ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.09)'}`, borderRadius: 10, paddingRight: 14 }}>
                                        <input type="number" min="0" max="59" value={formData.duration_minutes} onChange={e => handleChange('duration_minutes', parseInt(e.target.value) || 0)} style={{ width: '100%', background: 'transparent', border: 'none', color: '#e8e8f0', padding: '0 14px', height: 42, outline: 'none' }} />
                                        <span style={{ fontSize: 12, color: '#6b7280' }}>daqiqa</span>
                                    </div>
                                </div>
                                {errors.duration ? (
                                    <div style={{ color: '#ef4444', fontSize: 11, marginTop: 4, animation: 'slideDown 0.2s ease' }}>⚠ {errors.duration}</div>
                                ) : (
                                    end_time_obj && <div style={{ fontSize: 12, color: '#10b981', marginTop: 8 }}>🏁 Tugash: {end_time_obj.toLocaleString('uz-UZ', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>
                                )}
                            </div>
                        </div>

                        <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: '#e8e8f0' }}>Scoreboard muzlatish (ixtiyoriy)</span>
                                    <div style={{ fontSize: 11, color: '#6b7280' }}>{formData.enable_freeze ? 'Muzlatiladi' : 'Muzlatilmaydi'}</div>
                                </div>
                                <Toggle checked={formData.enable_freeze} onChange={() => handleChange('enable_freeze', !formData.enable_freeze)} />
                            </div>

                            {formData.enable_freeze && (
                                <div style={{ marginTop: 16, animation: 'fadeIn 0.2s ease' }}>
                                    <Label>Tugashidan necha daqiqa oldin muzlatiladi?</Label>
                                    <Input type="number" value={formData.freeze_duration} onChange={e => handleChange('freeze_duration', parseInt(e.target.value) || 0)} />
                                    <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 8, padding: '10px 14px', marginTop: 12, fontSize: 12, color: '#93c5fd' }}>
                                        ❄ Oxirgi {formData.freeze_duration} daqiqada scoreboard yangilanmaydi. ICPC NERC uslubi.
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* MASALALAR */}
                    <Card title="MASALALAR" color="#10b981" badge={`${formData.problems.length} ta qo'shildi`} style={{ overflow: 'visible' }}>
                        {formData.problems.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px 0', border: errors.problems ? '1px dashed #ef4444' : '1px dashed rgba(255,255,255,0.1)', borderRadius: 12 }}>
                                <div style={{ fontSize: 40, opacity: 0.5, marginBottom: 12 }}>📭</div>
                                <div style={{ fontSize: 14, color: '#e8e8f0', fontWeight: 600 }}>Hali masala qo'shilmagan</div>
                                <div style={{ fontSize: 12, color: '#6b7280' }}>Quyidagi qidiruvdan masala tanlang</div>
                            </div>
                        ) : (
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                <SortableContext items={formData.problems} strategy={verticalListSortingStrategy}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        {formData.problems.map(p => (
                                            <SortableProblemItem key={p.id} id={p.id} item={p} onRemove={removeProblem} onUpdate={updateProblemItem} />
                                        ))}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        )}
                        {errors.problems && <div style={{ color: '#ef4444', fontSize: 11, marginTop: 4, textAlign: 'center' }}>⚠ {errors.problems}</div>}

                        <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
                            <Label>Masala qo'shish</Label>
                            <Input
                                placeholder="🔍 Masala nomi yoki kodi bo'yicha..."
                                value={searchProb} onChange={e => setSearchProb(e.target.value)}
                                height={40}
                            />

                            {debouncedSearch && (
                                <div style={{
                                    background: '#0e0e1a', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 10,
                                    maxHeight: 240, overflowY: 'auto', boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
                                    marginTop: 8, position: 'absolute', width: '100%', zIndex: 50
                                }}>
                                    {filteredProblems.length > 0 ? filteredProblems.map(p => {
                                        const isAdded = formData.problems.some(added => added.problem_id === p.id);
                                        return (
                                            <div key={p.id} style={{
                                                padding: '10px 14px', display: 'flex', gap: 12, alignItems: 'center',
                                                borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: isAdded ? 'not-allowed' : 'pointer',
                                                opacity: isAdded ? 0.4 : 1, transition: 'background 0.1s'
                                            }}
                                                onMouseOver={e => { if (!isAdded) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                                                onMouseOut={e => { if (!isAdded) e.currentTarget.style.background = 'transparent' }}
                                                onClick={() => !isAdded && addProblem(p)}
                                            >
                                                <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#4a4a6a', background: 'rgba(255,255,255,0.04)', borderRadius: 4, padding: '2px 6px' }}>{p.id}</div>
                                                <div style={{ fontSize: 13, color: '#d4d4e8', flex: 1 }}>{p.title}</div>
                                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: p.difficulty === 'Oson' ? '#10b981' : p.difficulty === 'Qiyin' ? '#ef4444' : '#f59e0b' }} />

                                                {isAdded ? (
                                                    <span style={{ fontSize: 11, color: '#6b7280' }}>✓ Qo'shilgan</span>
                                                ) : (
                                                    <button style={{ height: 28, padding: '0 12px', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 6, color: '#a5b4fc', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>+ Qo'shish</button>
                                                )}
                                            </div>
                                        );
                                    }) : (
                                        <div style={{ padding: 20, textAlign: 'center', fontSize: 13, color: '#4a4a6a' }}>Masala topilmadi 🔍</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                {/* RIGHT PANEL (35%) */}
                <div style={{ flex: '0 0 calc(35% - 32px)', position: 'sticky', top: 80, alignSelf: 'start', display: 'flex', flexDirection: 'column', gap: 16 }}>

                    {/* FORMAT KARTASI */}
                    <Card title="MUSOBAQA FORMATI" color="#3b82f6">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            <FormatCard icon="🏅" label="ACM/ICPC" desc="Jarima vaqti bilan klassik format" active={formData.contest_type === 'icpc'} onClick={() => handleChange('contest_type', 'icpc')} />
                            <FormatCard icon="📈" label="Reytingli" desc="Reyting o'zgaradi" active={formData.contest_type === 'rated'} onClick={() => handleChange('contest_type', 'rated')} />
                            <FormatCard icon="🎮" label="Virtual" desc="O'tgan musobaqani qayta ishlash" active={formData.contest_type === 'virtual'} onClick={() => handleChange('contest_type', 'virtual')} />
                            <FormatCard icon="🎯" label="Unrated" desc="Mashq uchun, ta'sirsiz" active={formData.contest_type === 'unrated'} onClick={() => handleChange('contest_type', 'unrated')} />
                        </div>
                    </Card>

                    {/* STATUS KARTASI */}
                    <Card title="HOLAT" color="#f43f5e">
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            <Pill active={formData.status === 'draft'} color="#9ca3af" onClick={() => handleChange('status', 'draft')}>Qoralama</Pill>
                            <Pill active={formData.status === 'upcoming'} color="#f59e0b" onClick={() => handleChange('status', 'upcoming')}>Kutilmoqda</Pill>
                            <Pill active={formData.status === 'running'} color="#10b981" onClick={() => handleChange('status', 'running')}>Jonli</Pill>
                            <Pill active={formData.status === 'frozen'} color="#3b82f6" onClick={() => handleChange('status', 'frozen')}>Muzlatilgan</Pill>
                            <Pill active={formData.status === 'finished'} color="#6b7280" onClick={() => handleChange('status', 'finished')}>Tugadi</Pill>
                        </div>
                    </Card>

                    {/* IMKONIYATLAR */}
                    <Card title="IMKONIYATLAR" color="#a855f7">
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {[
                                { id: 'is_public', name: 'Hammaga ochiq', icon: '🌐', desc: 'Barcha foydalanuvchilar ko\'ra oladi' },
                                { id: 'is_rated', name: 'Reytingli musobaqa', icon: '📈', desc: 'Natija reytingga ta\'sir qiladi' },
                                { id: 'is_virtual_allowed', name: 'Virtual ishtirok ruxsat', icon: '🎮', desc: 'Tugagan musobaqada qatnashish' },
                                { id: 'is_team_contest', name: 'Jamoaviy musobaqa', icon: '👥', desc: 'Foydalanuvchilar jamoada qatnashadi' }
                            ].map((t, idx) => (
                                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: idx < 3 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 500, color: '#e8e8f0' }}>{t.icon} {t.name}</div>
                                        <div style={{ fontSize: 11, color: '#4a4a6a', paddingLeft: 22 }}>{t.desc}</div>
                                    </div>
                                    <Toggle checked={formData[t.id]} onChange={() => handleChange(t.id, !formData[t.id])} />
                                </div>
                            ))}

                            {formData.is_team_contest && (
                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 10, marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', animation: 'slideDown 0.2s ease' }}>
                                    <span style={{ fontSize: 12, color: '#d4d4e8' }}>Jamoada maksimal a'zolar</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, border: '1px solid rgba(99,102,241,0.3)', borderRadius: 6, padding: 2 }}>
                                        <button onClick={() => handleChange('max_team_size', Math.max(2, formData.max_team_size - 1))} style={{ width: 24, height: 24, background: 'transparent', border: 'none', color: '#a5b4fc', cursor: 'pointer', fontSize: 16 }}>-</button>
                                        <span style={{ fontSize: 13, fontWeight: 700, color: '#e8e8f0', minWidth: 16, textAlign: 'center' }}>{formData.max_team_size}</span>
                                        <button onClick={() => handleChange('max_team_size', Math.min(5, formData.max_team_size + 1))} style={{ width: 24, height: 24, background: 'transparent', border: 'none', color: '#a5b4fc', cursor: 'pointer', fontSize: 16 }}>+</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* XULOSA */}
                    <Card title="XULOSA" color="#64748b">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                <span style={{ color: '#4a4a6a' }}>📝 Masalalar</span>
                                <span style={{ color: '#e8e8f0', fontWeight: 600 }}>{formData.problems.length} ta</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                <span style={{ color: '#4a4a6a' }}>⏱ Davomiyligi</span>
                                <span style={{ color: '#e8e8f0', fontWeight: 600 }}>{formData.duration_hours} soat {formData.duration_minutes} min</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                <span style={{ color: '#4a4a6a' }}>👥 Format</span>
                                <span style={{ color: '#e8e8f0', fontWeight: 600 }}>{formData.contest_type.toUpperCase()}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                <span style={{ color: '#4a4a6a' }}>📈 Reyting</span>
                                <span style={{ color: '#e8e8f0', fontWeight: 600 }}>{formData.is_rated ? 'Tasir qiladi' : 'Qilmaydi'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                <span style={{ color: '#4a4a6a' }}>🌐 Ochiq</span>
                                <span style={{ color: '#e8e8f0', fontWeight: 600 }}>{formData.is_public ? 'Barchaga' : 'Yashirin'}</span>
                            </div>
                        </div>
                    </Card>

                </div>
            </div>
        </div>
    );
}
