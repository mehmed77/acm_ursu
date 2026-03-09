import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import api from '../../api/axios';

const LANG_MAP = { python: 'python', cpp: 'cpp', java: 'java', csharp: 'csharp' };
const LANG_LABEL = { python: '🐍 Python 3', cpp: '⚙️ C++ 17', java: '☕ Java', csharp: '🟣 C#' };

const STATUS_CFG = {
    ACCEPTED: { label: 'Accepted', color: '#10b981' },
    WRONG_ANSWER: { label: 'Wrong Answer', color: '#ef4444' },
    TIME_LIMIT_EXCEEDED: { label: 'TLE', color: '#f59e0b' },
    MEMORY_LIMIT_EXCEEDED: { label: 'MLE', color: '#f59e0b' },
    RUNTIME_ERROR: { label: 'Runtime Error', color: '#ef4444' },
    COMPILATION_ERROR: { label: 'Compile Error', color: '#f97316' },
    SECURITY_VIOLATION: { label: 'Blocked', color: '#8b5cf6' },
};

export default function SubmissionCodeModal({ submissionId, onClose }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const fetchCode = async () => {
            try {
                const res = await api.get(`/submissions/${submissionId}/code/`);
                setData(res.data);
            } catch {
                setError("Kodni yuklashda xatolik");
            } finally {
                setLoading(false);
            }
        };
        fetchCode();

        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [submissionId, onClose]);

    const handleCopy = () => {
        navigator.clipboard.writeText(data?.code || '');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const cfg = STATUS_CFG[data?.status] || { label: data?.status, color: '#6b7280' };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={onClose}
                style={{
                    position: 'fixed', inset: 0, zIndex: 1000,
                    background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
                }}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ duration: 0.2 }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        width: '100%', maxWidth: 860, maxHeight: '90vh',
                        background: '#0e0e1a', border: '1px solid rgba(255,255,255,0.10)',
                        borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column',
                        boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
                    }}
                >
                    {/* HEADER */}
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)',
                        background: '#0a0a0f', flexShrink: 0,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{
                                width: 10, height: 10, borderRadius: '50%',
                                background: cfg.color, boxShadow: `0 0 8px ${cfg.color}`,
                            }} />
                            <div>
                                <div style={{ fontSize: 15, fontWeight: 600, color: '#f0f0ff' }}>
                                    {data?.problem_title || 'Submission'}
                                    <span style={{ marginLeft: 8, fontSize: 12, color: cfg.color, fontWeight: 700 }}>
                                        {cfg.label}
                                    </span>
                                </div>
                                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2, display: 'flex', gap: 16 }}>
                                    <span>{LANG_LABEL[data?.language] || data?.language}</span>
                                    {data?.time_used > 0 && <span>⚡ {data.time_used}ms</span>}
                                    {data?.memory_used > 0 && <span>💾 {data.memory_used}MB</span>}
                                    {data?.created_at && <span>{new Date(data.created_at).toLocaleString()}</span>}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <button onClick={handleCopy} style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '7px 14px', borderRadius: 8,
                                background: copied ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.05)',
                                border: `1px solid ${copied ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.10)'}`,
                                color: copied ? '#10b981' : '#9898bb',
                                fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                                fontFamily: 'Inter, sans-serif',
                            }}>
                                {copied ? '✓ Nusxalandi' : '⎘ Nusxalash'}
                            </button>
                            <button onClick={onClose} style={{
                                width: 32, height: 32, borderRadius: 8,
                                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)',
                                color: '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <X style={{ width: 16, height: 16 }} />
                            </button>
                        </div>
                    </div>

                    {/* CONTENT — Monaco Editor needs explicit height */}
                    <div style={{ height: 400, position: 'relative', flexShrink: 0 }}>
                        {loading && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 12 }}>
                                <div className="global-spin" style={{ width: 32, height: 32 }} />
                                <span style={{ color: '#6b7280', fontSize: 13 }}>Yuklanmoqda...</span>
                            </div>
                        )}
                        {error && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 8 }}>
                                <span style={{ fontSize: 32 }}>⚠️</span>
                                <span style={{ color: '#ef4444', fontSize: 14 }}>{error}</span>
                            </div>
                        )}
                        {data && !loading && (
                            <Editor
                                height="400px"
                                language={LANG_MAP[data.language] || 'python'}
                                value={data.code}
                                theme="judge-view"
                                options={{
                                    readOnly: true, fontSize: 14,
                                    fontFamily: "'JetBrains Mono','Fira Code',monospace",
                                    fontLigatures: true, minimap: { enabled: false },
                                    scrollBeyondLastLine: false, lineNumbers: 'on',
                                    padding: { top: 16, bottom: 16 },
                                    renderLineHighlight: 'line', smoothScrolling: true,
                                    cursorBlinking: 'solid', domReadOnly: true, contextmenu: false,
                                }}
                                beforeMount={(monaco) => {
                                    monaco.editor.defineTheme('judge-view', {
                                        base: 'vs-dark', inherit: true,
                                        rules: [
                                            { token: 'keyword', foreground: '8b5cf6' },
                                            { token: 'string', foreground: '10b981' },
                                            { token: 'number', foreground: 'f59e0b' },
                                            { token: 'comment', foreground: '4a4a6a', fontStyle: 'italic' },
                                        ],
                                        colors: {
                                            'editor.background': '#0a0a0f',
                                            'editor.lineHighlightBackground': '#13131f',
                                            'editorLineNumber.foreground': '#2a2a4a',
                                            'editorLineNumber.activeForeground': '#6366f1',
                                        },
                                    });
                                }}
                            />
                        )}
                    </div>

                    {/* FOOTER — failed test info */}
                    {data?.failed_test && (
                        <div style={{
                            borderTop: '1px solid rgba(255,255,255,0.07)',
                            padding: '12px 20px', background: 'rgba(239,68,68,0.04)', flexShrink: 0,
                        }}>
                            <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 600 }}>
                                ✗ Test #{data.failed_test.number} da xato
                            </span>
                            {data.failed_test.input !== 'Hidden' && (
                                <div style={{ display: 'flex', gap: 20, marginTop: 8, fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>
                                    <span style={{ color: '#6b7280' }}>Kirish: {data.failed_test.input}</span>
                                    <span style={{ color: '#10b981' }}>Kutilgan: {data.failed_test.expected}</span>
                                    <span style={{ color: '#ef4444' }}>Sizniki: {data.failed_test.actual}</span>
                                </div>
                            )}
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
