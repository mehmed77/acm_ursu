import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import MDEditor from '@uiw/react-md-editor'
import {
    Save, Trash2, Eye, ArrowLeft, Plus, X,
    FileText, Upload, Download, Search,
    Copy, Play, ChevronDown, ChevronUp,
    Check, AlertCircle, Clock, HardDrive,
    Tag, Globe, Lock, Zap, Database,
    FolderOpen, RefreshCw, Archive
} from 'lucide-react'
import { adminApi } from '../../api/admin'

// KRITIK FIX: static import (dynamic import emas)
import JSZip from 'jszip'

export default function AdminProblemForm() {
    const navigate = useNavigate()
    const { slug } = useParams()
    const isEdit = Boolean(slug)

    // ── State ──────────────────────────────────
    const [activeTab, setActiveTab] = useState('problem')
    const [saveState, setSaveState] = useState('idle')
    // idle | loading | success | error

    // Tab 1 — Masala
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [inputFmt, setInputFmt] = useState('')
    const [outputFmt, setOutputFmt] = useState('')
    const [note, setNote] = useState('')
    const [noteOpen, setNoteOpen] = useState(false)
    const [mdMode, setMdMode] = useState('write')
    // write | preview

    // Tab 1 O'ng panel
    const [published, setPublished] = useState(false)
    const [difficulty, setDifficulty] = useState('')
    const [timeLimit, setTimeLimit] = useState(1.0)
    const [memoryLimit, setMemoryLimit] = useState(256)
    const [tags, setTags] = useState([])
    const [allTags, setAllTags] = useState([])
    const [newTag, setNewTag] = useState('')

    // Tab 2 — Testlar
    const [tests, setTests] = useState([])
    const [testStats, setTestStats] = useState({
        total: 0, sample: 0, hidden: 0, files: 0
    })
    const [bulkModal, setBulkModal] = useState(false)
    const [bulkMode, setBulkMode] = useState('text')
    // text | zip
    const [bulkText, setBulkText] = useState('')
    const [bulkParsed, setBulkParsed] = useState([])
    const [bulkZipFile, setBulkZipFile] = useState(null)
    const [bulkLoading, setBulkLoading] = useState(false)
    const [zipDragging, setZipDragging] = useState(false)

    // Tab 3 — Sozlamalar
    const [customSlug, setCustomSlug] = useState('')

    // Validatsiya
    const [errors, setErrors] = useState({})

    // Unsaved changes ogohlantirish
    const [isDirty, setIsDirty] = useState(false)

    // ── Slug preview ───────────────────────────
    const slugPreview = useMemo(() => {
        if (isEdit && customSlug) return customSlug
        return title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim()
    }, [title, customSlug, isEdit])

    // ── Ma'lumot yuklash ───────────────────────
    useEffect(() => {
        if (isEdit) loadProblem()
        loadTags()
    }, [slug])

    useEffect(() => {
        if (isEdit && slug) loadTestCases()
    }, [slug])

    // Unsaved changes — sahifadan chiqishda ogohlantirish
    useEffect(() => {
        const handler = (e) => {
            if (isDirty) {
                e.preventDefault()
                e.returnValue = ''
            }
        }
        window.addEventListener('beforeunload', handler)
        return () => window.removeEventListener('beforeunload', handler)
    }, [isDirty])

    const loadProblem = async () => {
        try {
            const { data } = await adminApi.getProblem(slug)
            setTitle(data.title || '')
            setDescription(data.description || '')
            setInputFmt(data.input_format || '')
            setOutputFmt(data.output_format || '')
            setNote(data.note || '')
            setPublished(data.is_published || false)
            setDifficulty(data.difficulty || '')
            setTimeLimit(data.time_limit || 1.0)
            setMemoryLimit(data.memory_limit || 256)
            setTags(data.tags?.map(t => t.slug) || [])
            setCustomSlug(data.slug || '')
        } catch (err) {
            console.error('Masala yuklanmadi:', err)
        }
    }

    const loadTags = async () => {
        try {
            const { data } = await adminApi.getTags()
            setAllTags(data.results || data || [])
        } catch (err) { /* ignore */ }
    }

    const loadTestCases = async () => {
        try {
            const { data } = await adminApi.getTestCases(slug)
            setTests(data.tests || [])
            setTestStats(data.stats || {
                total: 0, sample: 0, hidden: 0, files: 0
            })
        } catch (err) { /* ignore */ }
    }

    // ── SAQLASH ────────────────────────────────
    const validate = () => {
        const errs = {}
        if (!title.trim()) errs.title = 'Masala sarlavhasi kiritilishi shart'
        if (title.trim().length < 3) errs.title = 'Sarlavha kamida 3 ta belgidan iborat bo\'lishi kerak'
        if (!description.trim()) errs.description = 'Masala matni kiritilishi shart'
        if (!difficulty) errs.difficulty = 'Qiyinlik darajasi tanlanishi shart'
        if (timeLimit < 0.5) errs.timeLimit = 'Vaqt limiti 0.5s dan kichik bo\'lmasligi kerak'
        if (memoryLimit < 32) errs.memoryLimit = 'Xotira limiti 32MB dan kichik bo\'lmasligi kerak'
        setErrors(errs)
        return Object.keys(errs).length === 0
    }

    const handleSave = async () => {
        if (!validate()) return
        setSaveState('loading')
        try {
            const payload = {
                title,
                description,
                input_format: inputFmt,
                output_format: outputFmt,
                note,
                is_published: published,
                difficulty,
                time_limit: timeLimit,
                memory_limit: memoryLimit,
                tag_ids: tags.map(slug => {
                    const found = allTags.find(t => t.slug === slug);
                    return found ? found.id : null;
                }).filter(Boolean),
                ...(isEdit && customSlug ? { slug: customSlug } : {}),
            }

            if (isEdit) {
                await adminApi.updateProblem(slug, payload)
            } else {
                const { data } = await adminApi.createProblem(payload)
                navigate(`/admin/problems/${data.slug}`, { replace: true })
            }

            setSaveState('success')
            setIsDirty(false)
            setTimeout(() => setSaveState('idle'), 2000)
        } catch (err) {
            setSaveState('error')
            setTimeout(() => setSaveState('idle'), 2000)
        }
    }

    // ── TEST AMALLAR ───────────────────────────
    const handleAddTest = async () => {
        if (!isEdit) {
            alert('Avval masalani saqlang')
            return
        }
        const newTest = {
            id: `new_${Date.now()}`,
            input: '',
            output: '',
            is_sample: false,
            file_number: null,
            isNew: true,
        }
        setTests(prev => [...prev, newTest])
    }

    // KRITIK FIX: save queue — race condition oldini olish
    const saveQueueRef = useRef([])
    const isSavingRef = useRef(false)

    const processNextSave = useCallback(async () => {
        if (saveQueueRef.current.length === 0) {
            isSavingRef.current = false
            return
        }
        isSavingRef.current = true
        const { test, resolve } = saveQueueRef.current.shift()

        try {
            let saved
            if (test.isNew) {
                // Yangi test
                const { data } = await adminApi.addTestCase(slug, {
                    input: test.input,
                    output: test.output,
                    is_sample: test.is_sample,
                })
                saved = data
            } else {
                // Mavjud testni yangilash
                const { data } = await adminApi.updateTestCase(test.id, {
                    input: test.input,
                    output: test.output,
                    is_sample: test.is_sample,
                })
                saved = data
            }
            resolve({ ok: true, data: saved })
        } catch (err) {
            resolve({ ok: false, error: err })
        }

        processNextSave()
    }, [slug])

    const saveTest = useCallback((test) => {
        return new Promise((resolve) => {
            saveQueueRef.current.push({ test, resolve })
            if (!isSavingRef.current) {
                processNextSave()
            }
        })
    }, [processNextSave])

    const handleSaveTest = async (testId) => {
        const test = tests.find(t => t.id === testId)
        if (!test) return

        setTests(prev => prev.map(t =>
            t.id === testId ? { ...t, saveState: 'loading' } : t
        ))

        const result = await saveTest(test)

        if (result.ok) {
            setTests(prev => prev.map(t =>
                t.id === testId
                    ? { ...result.data, saveState: 'success', isNew: false }
                    : t
            ))
            // Stats yangilash
            loadTestCases()
            setTimeout(() => {
                setTests(prev => prev.map(t =>
                    t.id === result.data.id
                        ? { ...t, saveState: 'idle' }
                        : t
                ))
            }, 1500)
        } else {
            setTests(prev => prev.map(t =>
                t.id === testId ? { ...t, saveState: 'error' } : t
            ))
            setTimeout(() => {
                setTests(prev => prev.map(t =>
                    t.id === testId ? { ...t, saveState: 'idle' } : t
                ))
            }, 2000)
        }
    }

    const handleDeleteTest = async (testId) => {
        const test = tests.find(t => t.id === testId)
        if (!test) return

        if (test.isNew) {
            setTests(prev => prev.filter(t => t.id !== testId))
            return
        }

        try {
            await adminApi.deleteTestCase(testId)
            setTests(prev => prev.filter(t => t.id !== testId))
            loadTestCases()
        } catch (err) {
            console.error('Test o\'chirishda xato:', err)
        }
    }

    // ── BULK TEXT PARSE ───────────────────────
    const parseBulkText = useCallback((text) => {
        try {
            const parsed = text
                .split('===')
                .map(block => block.trim())
                .filter(Boolean)
                .map(block => {
                    const parts = block.split('---').map(s => s.trim())
                    return {
                        input: parts[0] || '',
                        output: parts[1] || '',
                        is_sample: false,
                    }
                })
                .filter(t => t.input && t.output)
            setBulkParsed(parsed)
        } catch (e) {
            setBulkParsed([])
        }
    }, [])

    useEffect(() => {
        if (bulkText) parseBulkText(bulkText)
    }, [bulkText, parseBulkText])

    // ── ZIP PARSE — server-side ───────────────
    // KRITIK FIX: ZIP ni serverga yuboramiz,
    // browser da parse qilmaymiz (katta fayllar uchun)
    const handleZipImport = async () => {
        if (!bulkZipFile) return
        setBulkLoading(true)
        try {
            const formData = new FormData()
            formData.append('zip_file', bulkZipFile)
            formData.append('clear_existing', 'false')

            const { data } = await adminApi.zipImport(slug, formData)

            setBulkModal(false)
            setBulkZipFile(null)
            loadTestCases()
            alert(`✅ ${data.imported} ta test import qilindi`)
        } catch (err) {
            alert('ZIP import xatosi: ' + (err.response?.data?.detail || err.message))
        } finally {
            setBulkLoading(false)
        }
    }

    const handleBulkTextImport = async () => {
        if (bulkParsed.length === 0) return
        setBulkLoading(true)
        try {
            await adminApi.bulkImport(slug, {
                tests: bulkParsed,
                clear_existing: false,
            })
            setBulkModal(false)
            setBulkText('')
            setBulkParsed([])
            loadTestCases()
        } catch (err) {
            alert('Import xatosi: ' + (err.response?.data?.detail || err.message))
        } finally {
            setBulkLoading(false)
        }
    }

    // ── TAG AMALLAR ────────────────────────────
    const handleAddTag = async () => {
        if (!newTag.trim()) return
        try {
            const { data } = await adminApi.createTag({ name: newTag.trim() })
            setAllTags(prev => [...prev, data])
            setTags(prev => [...prev, data.slug])
            setNewTag('')
        } catch (err) { /* ignore */ }
    }


    // ── RENDER ─────────────────────────────────
    return (
        <div style={{ minHeight: '100vh', background: '#08080f' }}>

            {/* ══════════════════════════════════
                STICKY HEADER
            ══════════════════════════════════ */}
            <div style={{
                position: 'sticky',
                top: 0,
                zIndex: 100,
                height: '56px',
                background: 'rgba(8,8,16,0.92)',
                backdropFilter: 'blur(16px)',
                borderBottom: '1px solid rgba(255,255,255,0.07)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 32px',
            }}>
                {/* Breadcrumb */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {[
                        { label: 'Boshqaruv', path: '/admin' },
                        { label: 'Masalalar', path: '/admin/problems' },
                        { label: isEdit ? title || slug : 'Yangi masala', path: null },
                    ].map((crumb, i, arr) => (
                        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {i > 0 && <span style={{ color: '#2a2a4a', fontSize: '12px' }}>/</span>}
                            <span
                                onClick={() => crumb.path && navigate(crumb.path)}
                                style={{
                                    fontSize: '12px',
                                    color: i === arr.length - 1 ? '#9898bb' : '#4a4a6a',
                                    cursor: crumb.path ? 'pointer' : 'default',
                                    fontWeight: i === arr.length - 1 ? '600' : '400',
                                    maxWidth: '180px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}
                                onMouseEnter={e => crumb.path && (e.target.style.color = '#a5b4fc')}
                                onMouseLeave={e => crumb.path && (e.target.style.color = '#4a4a6a')}
                            >
                                {crumb.label}
                            </span>
                        </span>
                    ))}
                </div>

                {/* Action tugmalar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <HeaderBtn
                        icon={<ArrowLeft size={14} />}
                        label="Orqaga"
                        onClick={() => {
                            if (isDirty && !confirm('O\'zgarishlar saqlanmagan. Chiqishni xohlaysizmi?')) return
                            navigate('/admin/problems')
                        }}
                    />
                    {isEdit && (
                        <>
                            <HeaderBtn
                                icon={<Eye size={14} />}
                                label="Ko'rish ↗"
                                color="#a5b4fc"
                                onClick={() => window.open(`/problems/${slug}`, '_blank')}
                            />
                            <HeaderBtn
                                icon={<Trash2 size={14} />}
                                label="O'chirish"
                                color="#ef4444"
                                onClick={async () => {
                                    if (!confirm(`"${title}" masalasini o'chirishni tasdiqlaysizmi? Bu amal qaytarib bo'lmaydi.`)) return
                                    try {
                                        await adminApi.deleteProblem(slug)
                                        navigate('/admin/problems')
                                    } catch (err) {
                                        alert('O\'chirishda xato yuz berdi')
                                    }
                                }}
                            />
                        </>
                    )}

                    {/* Saqlash tugmasi */}
                    <button
                        onClick={handleSave}
                        disabled={saveState === 'loading'}
                        style={{
                            height: '36px',
                            padding: '0 20px',
                            borderRadius: '9px',
                            border: 'none',
                            cursor: saveState === 'loading' ? 'not-allowed' : 'pointer',
                            fontSize: '13px',
                            fontWeight: '700',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.15s',
                            background: saveState === 'success'
                                ? 'linear-gradient(135deg,#059669,#10b981)'
                                : saveState === 'error'
                                    ? 'linear-gradient(135deg,#dc2626,#ef4444)'
                                    : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                            boxShadow: saveState === 'success'
                                ? '0 0 20px rgba(16,185,129,0.35)'
                                : saveState === 'error'
                                    ? '0 0 20px rgba(239,68,68,0.35)'
                                    : '0 0 20px rgba(99,102,241,0.35)',
                            color: 'white',
                            opacity: saveState === 'loading' ? 0.7 : 1,
                        }}
                    >
                        {saveState === 'loading' ? (
                            <><Spinner /> Saqlanmoqda...</>
                        ) : saveState === 'success' ? (
                            <><Check size={14} /> Saqlandi</>
                        ) : saveState === 'error' ? (
                            <><AlertCircle size={14} /> Xato yuz berdi</>
                        ) : (
                            <><Save size={14} /> Saqlash</>
                        )}
                    </button>
                </div>
            </div>

            {/* ══════════════════════════════════
                TABS
            ══════════════════════════════════ */}
            <div style={{
                display: 'flex',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                padding: '0 32px',
                background: 'rgba(255,255,255,0.01)',
            }}>
                {[
                    { key: 'problem', icon: <FileText size={14} />, label: 'Masala ma\'lumotlari' },
                    {
                        key: 'tests', icon: <Database size={14} />, label: 'Test ma\'lumotlari',
                        badge: testStats.total || null
                    },
                    { key: 'settings', icon: <Zap size={14} />, label: 'Sozlamalar' },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        style={{
                            height: '48px',
                            padding: '0 20px',
                            fontSize: '13px',
                            fontWeight: activeTab === tab.key ? '600' : '500',
                            color: activeTab === tab.key ? '#e8e8f0' : '#6b7280',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '7px',
                            transition: 'color 0.15s',
                        }}
                    >
                        <span style={{
                            color: activeTab === tab.key ? '#a5b4fc' : 'currentColor'
                        }}>
                            {tab.icon}
                        </span>
                        {tab.label}
                        {tab.badge && (
                            <span style={{
                                background: 'rgba(99,102,241,0.15)',
                                border: '1px solid rgba(99,102,241,0.25)',
                                borderRadius: '100px',
                                padding: '1px 7px',
                                fontSize: '10px',
                                fontWeight: '700',
                                color: '#a5b4fc',
                            }}>
                                {tab.badge}
                            </span>
                        )}
                        {activeTab === tab.key && (
                            <div style={{
                                position: 'absolute',
                                bottom: 0,
                                left: '20px',
                                right: '20px',
                                height: '2px',
                                borderRadius: '2px 2px 0 0',
                                background: 'linear-gradient(90deg,#6366f1,#8b5cf6)',
                            }} />
                        )}
                    </button>
                ))}
            </div>

            {/* ══════════════════════════════════
                TAB CONTENT
            ══════════════════════════════════ */}
            <div style={{ padding: '24px 32px' }}>

                {/* ──────────────────────────────
                    TAB 1: MASALA MA'LUMOTLARI
                ────────────────────────────── */}
                {activeTab === 'problem' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px' }}>

                        {/* CHAP */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                            {/* Sarlavha */}
                            <FormCard title="ASOSIY MA'LUMOTLAR" accentColor="#6366f1">
                                <FormLabel required>Masala sarlavhasi</FormLabel>
                                <input
                                    value={title}
                                    onChange={e => { setTitle(e.target.value); setIsDirty(true) }}
                                    placeholder="Masalan: Yig'indi A + B"
                                    style={{
                                        ...inputStyle,
                                        height: '48px',
                                        fontSize: '15px',
                                        borderColor: errors.title
                                            ? 'rgba(239,68,68,0.50)' : undefined,
                                    }}
                                />
                                {errors.title && <FieldError msg={errors.title} />}
                                {slugPreview && (
                                    <div style={{ fontSize: '11px', color: '#3a3a5a', marginTop: '6px' }}>
                                        🔗 /masalalar/<span style={{ color: '#6366f1' }}>{slugPreview}</span>
                                    </div>
                                )}

                                <div style={{ marginTop: '16px' }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        marginBottom: '8px',
                                    }}>
                                        <FormLabel required>Masala matni (Markdown)</FormLabel>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            {['write', 'preview'].map(m => (
                                                <button key={m}
                                                    onClick={() => setMdMode(m)}
                                                    style={{
                                                        height: '26px',
                                                        padding: '0 12px',
                                                        borderRadius: '6px',
                                                        fontSize: '11px',
                                                        fontWeight: '600',
                                                        cursor: 'pointer',
                                                        border: 'none',
                                                        background: mdMode === m
                                                            ? 'rgba(99,102,241,0.20)'
                                                            : 'rgba(255,255,255,0.04)',
                                                        color: mdMode === m ? '#a5b4fc' : '#6b7280',
                                                    }}
                                                >
                                                    {m === 'write' ? '✏️ Yozish' : '👁 Ko\'rish'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {mdMode === 'write' ? (
                                        <textarea
                                            value={description}
                                            onChange={e => { setDescription(e.target.value); setIsDirty(true) }}
                                            placeholder={'Masala shartini yozing.\n\nMarkdown qo\'llab-quvvatlanadi:\n**Qalin**, *kursiv*, `kod`\n\n```cpp\n#include <bits/stdc++.h>\n```'}
                                            style={{
                                                ...textareaStyle,
                                                height: '280px',
                                                borderColor: errors.description
                                                    ? 'rgba(239,68,68,0.50)' : undefined,
                                            }}
                                        />
                                    ) : (
                                        <div style={{
                                            minHeight: '280px',
                                            background: 'rgba(255,255,255,0.02)',
                                            border: '1px solid rgba(255,255,255,0.09)',
                                            borderRadius: '10px',
                                            padding: '16px',
                                            color: '#d4d4e8',
                                            fontSize: '14px',
                                            lineHeight: 1.7,
                                        }}>
                                            {description
                                                ? <MarkdownPreview content={description} />
                                                : <span style={{ color: '#3a3a5a' }}>Yozish rejimida matn kiriting...</span>
                                            }
                                        </div>
                                    )}
                                    {errors.description && <FieldError msg={errors.description} />}
                                </div>
                            </FormCard>

                            {/* Kirish/Chiqish */}
                            <FormCard title="KIRISH / CHIQISH FORMATI" accentColor="#10b981">
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <FormLabel>Kirish formati</FormLabel>
                                        <textarea
                                            value={inputFmt}
                                            onChange={e => { setInputFmt(e.target.value); setIsDirty(true) }}
                                            placeholder="Kirishda nimalar berilishini tushuntiring."
                                            style={{ ...textareaStyle, height: '120px' }}
                                        />
                                    </div>
                                    <div>
                                        <FormLabel>Chiqish formati</FormLabel>
                                        <textarea
                                            value={outputFmt}
                                            onChange={e => { setOutputFmt(e.target.value); setIsDirty(true) }}
                                            placeholder="Chiqishda nima bo'lishi kerakligini tushuntiring."
                                            style={{ ...textareaStyle, height: '120px' }}
                                        />
                                    </div>
                                </div>
                            </FormCard>

                            {/* Izoh — collapsible */}
                            <FormCard
                                title="IZOH"
                                accentColor="#8b5cf6"
                                rightContent={
                                    <button
                                        onClick={() => setNoteOpen(o => !o)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}
                                    >
                                        {noteOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                    </button>
                                }
                            >
                                {noteOpen && (
                                    <textarea
                                        value={note}
                                        onChange={e => { setNote(e.target.value); setIsDirty(true) }}
                                        placeholder="Qo'shimcha tushuntirishlar, cheklovlar yoki misollar haqida izoh..."
                                        style={{ ...textareaStyle, height: '100px' }}
                                    />
                                )}
                                {!noteOpen && (
                                    <button
                                        onClick={() => setNoteOpen(true)}
                                        style={{
                                            background: 'none', border: '1px dashed rgba(255,255,255,0.10)',
                                            borderRadius: '8px', padding: '10px', width: '100%',
                                            color: '#3a3a5a', fontSize: '12px', cursor: 'pointer',
                                        }}
                                    >
                                        + Izoh qo'shish
                                    </button>
                                )}
                            </FormCard>
                        </div>

                        {/* O'NG — sticky */}
                        <div style={{
                            position: 'sticky',
                            top: '72px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '14px',
                            alignSelf: 'flex-start',
                            maxHeight: 'calc(100vh - 100px)',
                            overflowY: 'auto',
                        }}>

                            {/* Chop etish */}
                            <FormCard title="CHOP ETISH" accentColor={published ? '#10b981' : '#6b7280'}>
                                <div style={{
                                    display: 'flex', alignItems: 'center',
                                    justifyContent: 'space-between',
                                }}>
                                    <div>
                                        <div style={{ fontSize: '14px', fontWeight: '700', color: published ? '#10b981' : '#6b7280' }}>
                                            {published ? '🌍 Chop etilgan' : '📋 Qoralama'}
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#3a3a5a', marginTop: '3px' }}>
                                            {published
                                                ? 'Barcha foydalanuvchilar ko\'ra oladi'
                                                : 'Faqat adminlar ko\'ra oladi'}
                                        </div>
                                    </div>
                                    <PremiumToggle
                                        checked={published}
                                        onChange={v => { setPublished(v); setIsDirty(true) }}
                                    />
                                </div>
                            </FormCard>

                            {/* Qiyinlik */}
                            <FormCard title="QIYINLIK DARAJASI" accentColor="#f59e0b">
                                {[
                                    { key: 'easy', label: 'Oson', color: '#10b981', desc: 'Boshlang\'ichlar uchun' },
                                    { key: 'medium', label: 'O\'rta', color: '#f59e0b', desc: 'O\'rta daraja' },
                                    { key: 'hard', label: 'Qiyin', color: '#ef4444', desc: 'Tajribali ishtirokchilar' },
                                ].map(d => (
                                    <div
                                        key={d.key}
                                        onClick={() => { setDifficulty(d.key); setIsDirty(true) }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            padding: '10px 12px',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            marginBottom: '6px',
                                            transition: 'all 0.12s',
                                            background: difficulty === d.key ? `${d.color}15` : 'rgba(255,255,255,0.02)',
                                            border: `1px solid ${difficulty === d.key ? `${d.color}40` : 'rgba(255,255,255,0.07)'}`,
                                            opacity: difficulty && difficulty !== d.key ? 0.4 : 1,
                                        }}
                                    >
                                        <div style={{
                                            width: '10px', height: '10px', borderRadius: '50%',
                                            background: d.color, flexShrink: 0,
                                            boxShadow: difficulty === d.key ? `0 0 8px ${d.color}` : 'none',
                                        }} />
                                        <div>
                                            <div style={{ fontSize: '13px', fontWeight: '600', color: difficulty === d.key ? d.color : '#9898bb' }}>
                                                {d.label}
                                            </div>
                                            <div style={{ fontSize: '10px', color: '#3a3a5a' }}>{d.desc}</div>
                                        </div>
                                        {difficulty === d.key && (
                                            <Check size={14} style={{ marginLeft: 'auto', color: d.color }} />
                                        )}
                                    </div>
                                ))}
                                {errors.difficulty && <FieldError msg={errors.difficulty} />}
                            </FormCard>

                            {/* Limitlar */}
                            <FormCard title="CHEKLOVLAR" accentColor="#3b82f6">
                                <div style={{ marginBottom: '14px' }}>
                                    <FormLabel>Vaqt limiti</FormLabel>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input
                                            type="number"
                                            value={timeLimit}
                                            onChange={e => { setTimeLimit(parseFloat(e.target.value)); setIsDirty(true) }}
                                            step="0.5" min="0.5" max="10"
                                            style={{ ...inputStyle, width: '90px' }}
                                        />
                                        <span style={{ color: '#6b7280', fontSize: '13px' }}>soniya</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '5px', marginTop: '8px', flexWrap: 'wrap' }}>
                                        {[0.5, 1, 2, 3, 5].map(v => (
                                            <button key={v} onClick={() => { setTimeLimit(v); setIsDirty(true) }}
                                                style={chipStyle(timeLimit === v)}>
                                                {v}s
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <FormLabel>Xotira limiti</FormLabel>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input
                                            type="number"
                                            value={memoryLimit}
                                            onChange={e => { setMemoryLimit(parseInt(e.target.value)); setIsDirty(true) }}
                                            step="64" min="32" max="2048"
                                            style={{ ...inputStyle, width: '90px' }}
                                        />
                                        <span style={{ color: '#6b7280', fontSize: '13px' }}>MB</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '5px', marginTop: '8px', flexWrap: 'wrap' }}>
                                        {[64, 128, 256, 512].map(v => (
                                            <button key={v} onClick={() => { setMemoryLimit(v); setIsDirty(true) }}
                                                style={chipStyle(memoryLimit === v)}>
                                                {v}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </FormCard>

                            {/* Teglar */}
                            <FormCard title="TEGLAR" accentColor="#8b5cf6">
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '10px' }}>
                                    {allTags.map(tag => (
                                        <button
                                            key={tag.slug}
                                            onClick={() => {
                                                setTags(prev =>
                                                    prev.includes(tag.slug)
                                                        ? prev.filter(t => t !== tag.slug)
                                                        : [...prev, tag.slug]
                                                )
                                                setIsDirty(true)
                                            }}
                                            style={{
                                                height: '24px',
                                                padding: '0 10px',
                                                borderRadius: '100px',
                                                fontSize: '11px',
                                                fontWeight: '500',
                                                cursor: 'pointer',
                                                border: 'none',
                                                background: tags.includes(tag.slug)
                                                    ? 'rgba(139,92,246,0.20)' : 'rgba(255,255,255,0.05)',
                                                color: tags.includes(tag.slug) ? '#c4b5fd' : '#4a4a6a',
                                            }}
                                        >
                                            {tag.name}
                                        </button>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <input
                                        value={newTag}
                                        onChange={e => setNewTag(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                                        placeholder="Yangi teg..."
                                        style={{ ...inputStyle, flex: 1, height: '32px', fontSize: '12px' }}
                                    />
                                    <button
                                        onClick={handleAddTag}
                                        style={{
                                            height: '32px', padding: '0 12px',
                                            borderRadius: '8px', border: 'none',
                                            background: 'rgba(139,92,246,0.15)',
                                            color: '#c4b5fd', fontSize: '12px',
                                            fontWeight: '600', cursor: 'pointer',
                                        }}
                                    >
                                        + Qo'shish
                                    </button>
                                </div>
                            </FormCard>
                        </div>
                    </div>
                )}

                {/* ──────────────────────────────
                    TAB 2: TEST MA'LUMOTLARI
                ────────────────────────────── */}
                {activeTab === 'tests' && (
                    <div>
                        {/* Header */}
                        <div style={{
                            display: 'flex', alignItems: 'center',
                            justifyContent: 'space-between', marginBottom: '16px',
                        }}>
                            <div>
                                <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#f0f0ff', margin: 0 }}>
                                    Test ma'lumotlari
                                </h2>
                                <p style={{ fontSize: '12px', color: '#3a3a5a', margin: '4px 0 0' }}>
                                    📁 testcases/{slug || '[slug]'}/
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={() => setBulkModal(true)}
                                    style={{
                                        height: '36px', padding: '0 16px',
                                        borderRadius: '8px', cursor: 'pointer',
                                        fontSize: '12px', fontWeight: '600',
                                        background: 'rgba(255,255,255,0.04)',
                                        border: '1px solid rgba(255,255,255,0.09)',
                                        color: '#9898bb',
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                    }}
                                >
                                    <Archive size={13} /> Ommaviy import
                                </button>
                                <button
                                    onClick={handleAddTest}
                                    style={{
                                        height: '36px', padding: '0 16px',
                                        borderRadius: '8px', cursor: 'pointer',
                                        fontSize: '12px', fontWeight: '700',
                                        background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                                        border: 'none', color: 'white',
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        boxShadow: '0 0 16px rgba(99,102,241,0.30)',
                                    }}
                                >
                                    <Plus size={13} /> Test qo'shish
                                </button>
                            </div>
                        </div>

                        {/* Statistika */}
                        <div style={{
                            display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
                            gap: '10px', marginBottom: '20px',
                        }}>
                            {[
                                { label: 'Jami', value: testStats.total, color: '#a5b4fc', icon: <Database size={14} /> },
                                { label: 'Namuna', value: testStats.sample, color: '#60a5fa', icon: <Eye size={14} /> },
                                { label: 'Yashirin', value: testStats.hidden, color: '#6b7280', icon: <Lock size={14} /> },
                                { label: 'Fayllar', value: testStats.files, color: '#10b981', icon: <FolderOpen size={14} /> },
                            ].map(s => (
                                <div key={s.label} style={{
                                    background: 'rgba(255,255,255,0.02)',
                                    border: '1px solid rgba(255,255,255,0.07)',
                                    borderRadius: '10px', padding: '12px 16px',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: s.color }}>
                                        {s.icon}
                                        <span style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '0.08em' }}>
                                            {s.label.toUpperCase()}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '24px', fontWeight: '800', color: s.color }}>
                                        {s.value}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Test kartalar */}
                        {tests.length === 0 ? (
                            <div style={{
                                textAlign: 'center', padding: '60px 20px',
                                background: 'rgba(255,255,255,0.02)',
                                border: '1px solid rgba(255,255,255,0.07)',
                                borderRadius: '12px',
                            }}>
                                <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
                                <div style={{ color: '#6b7280', fontSize: '14px', fontWeight: '500' }}>
                                    Hali test qo'shilmagan
                                </div>
                                <div style={{ color: '#3a3a5a', fontSize: '12px', marginTop: '6px' }}>
                                    Yuqoridagi "Test qo'shish" tugmasidan foydalaning
                                </div>
                            </div>
                        ) : (
                            tests.map((test, idx) => (
                                <TestCard
                                    key={test.id}
                                    test={test}
                                    index={idx}
                                    onChange={(field, val) => {
                                        setTests(prev => prev.map(t =>
                                            t.id === test.id ? { ...t, [field]: val } : t
                                        ))
                                    }}
                                    onSave={() => handleSaveTest(test.id)}
                                    onDelete={() => handleDeleteTest(test.id)}
                                />
                            ))
                        )}
                    </div>
                )}

                {/* ──────────────────────────────
                    TAB 3: SOZLAMALAR
                ────────────────────────────── */}
                {activeTab === 'settings' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px' }}>
                        <FormCard title="SLUG SOZLAMALARI" accentColor="#6366f1">
                            <FormLabel>Masala slugi (URL)</FormLabel>
                            <input
                                value={customSlug}
                                onChange={e => { setCustomSlug(e.target.value); setIsDirty(true) }}
                                placeholder={slugPreview}
                                style={inputStyle}
                            />
                            <div style={{ fontSize: '11px', color: '#3a3a5a', marginTop: '6px' }}>
                                🔗 /masalalar/<strong style={{ color: '#6366f1' }}>{customSlug || slugPreview}</strong>
                            </div>
                        </FormCard>

                        <FormCard title="MASALA MA'LUMOTLARI" accentColor="#6b7280">
                            {[
                                { label: 'Holat', value: published ? '🌍 Chop etilgan' : '📋 Qoralama' },
                                { label: 'Qiyinlik', value: difficulty || '—' },
                                { label: 'Testlar', value: `${testStats.total} ta` },
                                { label: 'Vaqt', value: `${timeLimit}s` },
                                { label: 'Xotira', value: `${memoryLimit}MB` },
                            ].map(row => (
                                <div key={row.label} style={{
                                    display: 'flex', justifyContent: 'space-between',
                                    padding: '8px 0',
                                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                                }}>
                                    <span style={{ fontSize: '12px', color: '#4a4a6a' }}>{row.label}</span>
                                    <span style={{ fontSize: '12px', color: '#e8e8f0', fontWeight: '600' }}>{row.value}</span>
                                </div>
                            ))}
                        </FormCard>
                    </div>
                )}
            </div>

            {/* ══════════════════════════════════
                BULK IMPORT MODAL
            ══════════════════════════════════ */}
            {bulkModal && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 200,
                    background: 'rgba(0,0,0,0.70)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    animation: 'fadeIn 0.15s ease',
                }}
                    onClick={e => e.target === e.currentTarget && setBulkModal(false)}
                >
                    <div style={{
                        background: '#0e0e1a',
                        border: '1px solid rgba(255,255,255,0.10)',
                        borderRadius: '16px',
                        padding: '28px',
                        width: '600px',
                        maxHeight: '80vh',
                        overflowY: 'auto',
                        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
                        animation: 'slideDown 0.2s ease',
                    }}>
                        <div style={{
                            display: 'flex', alignItems: 'center',
                            justifyContent: 'space-between', marginBottom: '20px',
                        }}>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#f0f0ff' }}>
                                📥 Testlarni ommaviy import qilish
                            </h3>
                            <button onClick={() => setBulkModal(false)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                                <X size={18} />
                            </button>
                        </div>

                        {/* Mode tanlash */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '20px' }}>
                            {[
                                { key: 'text', label: '📝 Matn formati', desc: 'Input/---/Output/===' },
                                { key: 'zip', label: '📦 ZIP fayl', desc: '1.in, 1.out, 2.in...' },
                            ].map(m => (
                                <div key={m.key}
                                    onClick={() => setBulkMode(m.key)}
                                    style={{
                                        padding: '12px 14px',
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        border: `1px solid ${bulkMode === m.key ? 'rgba(99,102,241,0.40)' : 'rgba(255,255,255,0.08)'}`,
                                        background: bulkMode === m.key ? 'rgba(99,102,241,0.10)' : 'rgba(255,255,255,0.02)',
                                        transition: 'all 0.12s',
                                    }}
                                >
                                    <div style={{ fontSize: '13px', fontWeight: '700', color: bulkMode === m.key ? '#a5b4fc' : '#9898bb' }}>
                                        {m.label}
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#3a3a5a', marginTop: '3px' }}>
                                        {m.desc}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {bulkMode === 'text' && (
                            <>
                                {/* Format misoli */}
                                <div style={{
                                    background: 'rgba(255,255,255,0.03)',
                                    borderRadius: '8px', padding: '10px 14px',
                                    marginBottom: '12px',
                                    fontFamily: 'monospace', fontSize: '11px',
                                    color: '#6b7280', lineHeight: 1.6,
                                }}>
                                    12 5<br />
                                    <span style={{ color: '#4a4a6a' }}>---</span><br />
                                    7<br />
                                    <span style={{ color: '#ef4444' }}>===</span><br />
                                    25 12<br />
                                    <span style={{ color: '#4a4a6a' }}>---</span><br />
                                    13
                                </div>
                                <textarea
                                    value={bulkText}
                                    onChange={e => setBulkText(e.target.value)}
                                    placeholder="Testlarni shu yerga yozing..."
                                    style={{ ...textareaStyle, height: '220px', marginBottom: '12px' }}
                                />
                                {bulkParsed.length > 0 && (
                                    <div style={{
                                        background: 'rgba(16,185,129,0.06)',
                                        border: '1px solid rgba(16,185,129,0.20)',
                                        borderRadius: '8px', padding: '10px 14px',
                                        marginBottom: '12px',
                                        fontSize: '12px', color: '#10b981',
                                    }}>
                                        ✅ {bulkParsed.length} ta test aniqlandi
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                    <HeaderBtn label="Bekor qilish" onClick={() => setBulkModal(false)} />
                                    <button
                                        onClick={handleBulkTextImport}
                                        disabled={bulkParsed.length === 0 || bulkLoading}
                                        style={{
                                            height: '36px', padding: '0 20px',
                                            borderRadius: '8px', border: 'none',
                                            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                                            color: 'white', fontSize: '13px', fontWeight: '700',
                                            cursor: bulkParsed.length === 0 ? 'not-allowed' : 'pointer',
                                            opacity: bulkParsed.length === 0 ? 0.5 : 1,
                                            display: 'flex', alignItems: 'center', gap: '6px',
                                        }}
                                    >
                                        {bulkLoading ? <Spinner /> : <Download size={13} />}
                                        {bulkParsed.length > 0 ? `${bulkParsed.length} ta testni import qilish` : 'Import qilish'}
                                    </button>
                                </div>
                            </>
                        )}

                        {bulkMode === 'zip' && (
                            <>
                                {/* Drag & Drop zona */}
                                <div
                                    onDragOver={e => { e.preventDefault(); setZipDragging(true) }}
                                    onDragLeave={() => setZipDragging(false)}
                                    onDrop={e => {
                                        e.preventDefault()
                                        setZipDragging(false)
                                        const file = e.dataTransfer.files[0]
                                        if (file?.name.endsWith('.zip')) setBulkZipFile(file)
                                    }}
                                    style={{
                                        height: '160px',
                                        border: `2px dashed ${zipDragging ? 'rgba(99,102,241,0.60)' : 'rgba(99,102,241,0.25)'}`,
                                        borderRadius: '12px',
                                        background: zipDragging ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.02)',
                                        display: 'flex', flexDirection: 'column',
                                        alignItems: 'center', justifyContent: 'center',
                                        gap: '10px', cursor: 'pointer',
                                        transition: 'all 0.15s', marginBottom: '12px',
                                    }}
                                    onClick={() => document.getElementById('zip-input').click()}
                                >
                                    <input
                                        id="zip-input" type="file" accept=".zip"
                                        style={{ display: 'none' }}
                                        onChange={e => setBulkZipFile(e.target.files[0])}
                                    />
                                    {bulkZipFile ? (
                                        <>
                                            <div style={{ fontSize: '32px' }}>📦</div>
                                            <div style={{ fontSize: '13px', fontWeight: '600', color: '#10b981' }}>
                                                ✅ {bulkZipFile.name}
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#4a4a6a' }}>
                                                {(bulkZipFile.size / 1024).toFixed(1)} KB
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div style={{ fontSize: '32px' }}>📁</div>
                                            <div style={{ fontSize: '13px', color: '#6b7280' }}>
                                                ZIP faylni shu yerga tashlang
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#4a4a6a' }}>
                                                yoki bosing va tanlang
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div style={{
                                    background: 'rgba(59,130,246,0.06)',
                                    border: '1px solid rgba(59,130,246,0.15)',
                                    borderRadius: '8px', padding: '10px 14px',
                                    marginBottom: '12px', fontSize: '11px', color: '#93c5fd',
                                }}>
                                    ℹ️ ZIP ichida: <code>1.in</code>, <code>1.out</code>, <code>2.in</code>, <code>2.out</code> ... formatida bo'lishi kerak.
                                    Server tomonida parse qilinadi (50MB gacha).
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                    <HeaderBtn label="Bekor qilish" onClick={() => setBulkModal(false)} />
                                    <button
                                        onClick={handleZipImport}
                                        disabled={!bulkZipFile || bulkLoading}
                                        style={{
                                            height: '36px', padding: '0 20px',
                                            borderRadius: '8px', border: 'none',
                                            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                                            color: 'white', fontSize: '13px', fontWeight: '700',
                                            cursor: !bulkZipFile ? 'not-allowed' : 'pointer',
                                            opacity: !bulkZipFile ? 0.5 : 1,
                                            display: 'flex', alignItems: 'center', gap: '6px',
                                        }}
                                    >
                                        {bulkLoading ? <Spinner /> : <Upload size={13} />}
                                        ZIP import qilish
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}


// ── Styles ──────────────────────────────────────────────
const inputStyle = {
    width: '100%', height: '42px', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: '10px', padding: '0 14px',
    color: '#e8e8f0', fontSize: '13px', outline: 'none',
    transition: 'border 0.15s, box-shadow 0.15s',
}

const textareaStyle = {
    width: '100%', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: '10px', padding: '12px 14px',
    color: '#e8e8f0', fontSize: '13px',
    outline: 'none', resize: 'vertical',
    fontFamily: 'monospace', lineHeight: 1.6,
    transition: 'border 0.15s',
}

const chipStyle = (active) => ({
    height: '26px', padding: '0 10px', borderRadius: '100px',
    fontSize: '11px', fontWeight: '600', cursor: 'pointer', border: 'none',
    background: active ? 'rgba(99,102,241,0.20)' : 'rgba(255,255,255,0.05)',
    color: active ? '#a5b4fc' : '#4a4a6a',
})

// ── Kichik komponentlar ──────────────────────────────────

function FormCard({ title, accentColor, children, rightContent }) {
    return (
        <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '14px', padding: '20px',
        }}>
            <div style={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', marginBottom: '16px',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                        width: '3px', height: '14px', borderRadius: '2px',
                        background: accentColor,
                    }} />
                    <span style={{
                        fontSize: '10px', fontWeight: '700', color: '#3a3a5a',
                        letterSpacing: '0.10em', textTransform: 'uppercase',
                    }}>
                        {title}
                    </span>
                </div>
                {rightContent}
            </div>
            {children}
        </div>
    )
}

function FormLabel({ children, required }) {
    return (
        <div style={{
            fontSize: '12px', fontWeight: '600', color: '#6b7280',
            marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px',
        }}>
            {children}
            {required && <span style={{ color: '#ef4444', fontSize: '14px' }}>*</span>}
        </div>
    )
}

function FieldError({ msg }) {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            fontSize: '11px', color: '#ef4444', marginTop: '5px',
        }}>
            <AlertCircle size={11} /> {msg}
        </div>
    )
}

function HeaderBtn({ icon, label, onClick, color }) {
    return (
        <button onClick={onClick} style={{
            height: '36px', padding: '0 14px', borderRadius: '9px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.09)',
            color: color || '#6b7280', fontSize: '13px',
            fontWeight: '500', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px',
            transition: 'all 0.12s',
        }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.16)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)' }}
        >
            {icon} {label}
        </button>
    )
}

function PremiumToggle({ checked, onChange }) {
    return (
        <div
            onClick={() => onChange(!checked)}
            style={{
                width: '44px', height: '24px', borderRadius: '100px',
                cursor: 'pointer', position: 'relative',
                transition: 'all 0.2s',
                background: checked
                    ? 'linear-gradient(135deg,#6366f1,#8b5cf6)'
                    : 'rgba(255,255,255,0.08)',
                border: `1px solid ${checked ? 'transparent' : 'rgba(255,255,255,0.12)'}`,
                boxShadow: checked ? '0 0 12px rgba(99,102,241,0.40)' : 'none',
            }}
        >
            <div style={{
                width: '18px', height: '18px', borderRadius: '50%',
                background: 'white',
                position: 'absolute', top: '3px',
                left: checked ? '23px' : '3px',
                transition: 'left 0.2s ease',
                boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
            }} />
        </div>
    )
}

function Spinner() {
    return (
        <div style={{
            width: '14px', height: '14px', borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.3)',
            borderTopColor: 'white',
            animation: 'spin 0.8s linear infinite',
        }} />
    )
}

function MarkdownPreview({ content }) {
    // ReactMarkdown ishlatish
    // import ReactMarkdown from 'react-markdown'
    return <div className="markdown-body">{content}</div>
}

// ── Test Card ────────────────────────────────────────────
function TestCard({ test, index, onChange, onSave, onDelete }) {
    return (
        <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '12px', overflow: 'hidden',
            marginBottom: '10px',
            animation: 'slideDown 0.2s ease',
        }}>
            {/* Header */}
            <div style={{
                padding: '10px 16px',
                background: 'rgba(255,255,255,0.02)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', gap: '10px',
            }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#e8e8f0' }}>
                    Test #{index + 1}
                </span>
                {test.file_number && (
                    <span style={{
                        fontFamily: 'monospace', fontSize: '10px',
                        color: '#3a3a5a', background: 'rgba(255,255,255,0.04)',
                        borderRadius: '4px', padding: '2px 6px',
                    }}>
                        {test.file_number}.in
                    </span>
                )}

                {/* Namuna/Yashirin toggle */}
                <div style={{ display: 'flex', gap: '4px' }}>
                    {[
                        { val: true, label: 'Namuna', color: '#3b82f6' },
                        { val: false, label: 'Yashirin', color: '#6b7280' },
                    ].map(opt => (
                        <button key={String(opt.val)}
                            onClick={() => onChange('is_sample', opt.val)}
                            style={{
                                height: '22px', padding: '0 10px',
                                borderRadius: '100px', border: 'none',
                                fontSize: '10px', fontWeight: '600',
                                cursor: 'pointer',
                                background: test.is_sample === opt.val
                                    ? `${opt.color}20` : 'rgba(255,255,255,0.04)',
                                color: test.is_sample === opt.val
                                    ? opt.color : '#3a3a5a',
                            }}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>

                {/* O'chirish */}
                <button onClick={onDelete}
                    style={{
                        marginLeft: 'auto', background: 'none', border: 'none',
                        cursor: 'pointer', color: '#3a3a5a', padding: '2px',
                        display: 'flex', alignItems: 'center',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                    onMouseLeave={e => e.currentTarget.style.color = '#3a3a5a'}
                >
                    <Trash2 size={13} />
                </button>
            </div>

            {/* Body — kirish/chiqish */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                {[
                    { field: 'input', label: '📥 KIRISH', placeholder: '12 5\n25 12\n...' },
                    { field: 'output', label: '📤 CHIQISH', placeholder: '7\n13\n...' },
                ].map((col, i) => (
                    <div key={col.field} style={{
                        borderRight: i === 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                    }}>
                        <div style={{
                            padding: '6px 12px 4px',
                            fontSize: '9px', fontWeight: '700',
                            color: '#2a2a4a', letterSpacing: '0.10em',
                        }}>
                            {col.label}
                        </div>
                        <textarea
                            value={test[col.field] || ''}
                            onChange={e => onChange(col.field, e.target.value)}
                            placeholder={col.placeholder}
                            style={{
                                width: '100%', boxSizing: 'border-box',
                                height: '110px', padding: '8px 12px',
                                fontFamily: 'monospace', fontSize: '12px',
                                background: 'rgba(255,255,255,0.02)',
                                border: 'none', outline: 'none', resize: 'vertical',
                                color: '#e8e8f0', lineHeight: 1.5,
                            }}
                        />
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div style={{
                padding: '8px 16px',
                borderTop: '1px solid rgba(255,255,255,0.04)',
                display: 'flex', justifyContent: 'flex-end',
            }}>
                <button
                    onClick={onSave}
                    disabled={test.saveState === 'loading'}
                    style={{
                        height: '28px', padding: '0 14px',
                        borderRadius: '6px', border: 'none',
                        fontSize: '11px', fontWeight: '600',
                        cursor: test.saveState === 'loading' ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', gap: '5px',
                        background: test.saveState === 'success'
                            ? 'rgba(16,185,129,0.15)'
                            : test.saveState === 'error'
                                ? 'rgba(239,68,68,0.15)'
                                : 'rgba(99,102,241,0.15)',
                        color: test.saveState === 'success'
                            ? '#34d399'
                            : test.saveState === 'error'
                                ? '#f87171'
                                : '#a5b4fc',
                        transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => {
                        if (test.saveState !== 'loading' && test.saveState === 'idle') {
                            e.currentTarget.style.background = 'rgba(99,102,241,0.25)'
                        }
                    }}
                    onMouseLeave={e => {
                        if (test.saveState !== 'loading' && test.saveState === 'idle') {
                            e.currentTarget.style.background = 'rgba(99,102,241,0.15)'
                        }
                    }}
                >
                    {test.saveState === 'loading' ? (
                        <Spinner />
                    ) : test.saveState === 'success' ? (
                        <Check size={12} />
                    ) : test.saveState === 'error' ? (
                        <AlertCircle size={12} />
                    ) : (
                        <Save size={12} />
                    )}
                    {test.saveState === 'loading'
                        ? 'Saqlanmoqda...'
                        : test.saveState === 'success'
                            ? 'Saqlandi'
                            : test.saveState === 'error'
                                ? 'Xato'
                                : test.isNew
                                    ? 'Yaratish'
                                    : 'Saqlash'
                    }
                </button>
            </div>
        </div>
    )
}