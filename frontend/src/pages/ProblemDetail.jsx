import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import Editor from '@monaco-editor/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronDown, RotateCcw, Copy, Check,
    Clock, Cpu, Send, Play, Lock, X, Code2,
    Zap, Shield, AlertTriangle, CheckCircle2, XCircle,
    Terminal, BookOpen, History, ChevronUp,
} from 'lucide-react';
import { getProblem } from '../api/problems';
import api from '../api/axios';
import { useAuthStore } from '../store/authStore';
import { submitCode } from '../services/judge';
import SubmissionCodeModal from '../components/submissions/SubmissionCodeModal';

/* ═══════════════════════════════════════════════════
   DESIGN TOKENS — Neural Terminal (unified system)
   ═══════════════════════════════════════════════════ */
const T = {
    bg: 'var(--bg-base)',
    surf: 'var(--bg-surface)',
    surf2: 'var(--bg-elevated)',
    surf3: '#0d0d1f',
    b: 'rgba(255,255,255,0.055)',
    bA: 'rgba(0,212,255,0.25)',
    text: 'var(--text-primary)',
    sub: 'var(--text-muted)',
    dim: '#0e0e22',
    cyan: '#00d4ff',
    grn: '#00e676',
    amb: '#ffb300',
    red: '#ff2d55',
    pur: '#a855f7',
    ind: '#6366f1',
    org: '#f97316',
    teal: '#14b8a6',
};

/* ═══════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════ */
const mockProblem = {
    id: 42, slug: 'two-sum', title: 'Two Sum', difficulty: 'easy',
    time_limit: 1.0, memory_limit: 256,
    tags: [{ name: 'array' }, { name: 'hash-table' }],
    description: `## Masala tavsifi\nButun sonlar massivi \`nums\` va \`target\` soni berilgan.\nIkkita indeks toping — ularning yig\'indisi \`target\`ga teng bo\'lsin.\n\n## Kirish formati\n- Birinchi qator: \`n\` — massiv uzunligi\n- Ikkinchi qator: \`n\` ta butun son\n- Uchinchi qator: \`target\` soni\n\n## Chiqish formati\nIkki indeks: \`i j\` (0-indeksli)\n\n### Muhim\n- Har doim **faqat bitta** yechim bor\n- Bir elementni ikki marta ishlatish mumkin emas`,
    sample_test_cases: [
        { input: '4\n2 7 11 15\n9', expected_output: '0 1' },
        { input: '3\n3 2 4\n6', expected_output: '1 2' },
    ],
};

const starterCode = {
    python: "import sys\ninput = sys.stdin.readline\n\ndef solve():\n    n = int(input())\n    nums = list(map(int, input().split()))\n    target = int(input())\n    # Yechimingizni shu yerga yozing\n    \n\nsolve()\n",
    cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    int n;\n    cin >> n;\n    // Yechimingizni shu yerga yozing\n    return 0;\n}\n",
    java: `import java.util.*;\nimport java.io.*;\n\npublic class Solution {\n    public static void main(String[] args) throws IOException {\n        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\n        StringTokenizer st = new StringTokenizer(br.readLine());\n        // Yechimingizni shu yerga yozing\n        \n    }\n}`,
    csharp: `using System;\n\nclass Solution {\n    static void Main() {\n        // Yechimingizni shu yerga yozing\n    }\n}`
};

const LANGUAGES = [
    { value: 'python', label: 'Python 3.13', short: 'PY', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', icon: '🐍' },
    { value: 'cpp', label: 'GNU C++ 17', short: 'C+', color: '#818cf8', bg: 'rgba(129,140,248,0.12)', icon: '⚙️' },
    { value: 'java', label: 'Java 17', short: 'JV', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: '☕' },
    { value: 'csharp', label: 'C# (.NET 8)', short: 'C#', color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: '🟣' },
];

const DIFF = {
    easy: { label: 'Easy', color: '#00e676', bg: 'rgba(0,230,118,0.09)', bd: 'rgba(0,230,118,0.22)', glow: 'rgba(0,230,118,0.25)' },
    medium: { label: 'Medium', color: '#ffb300', bg: 'rgba(255,179,0,0.09)', bd: 'rgba(255,179,0,0.22)', glow: 'rgba(255,179,0,0.25)' },
    hard: { label: 'Hard', color: '#ff2d55', bg: 'rgba(255,45,85,0.09)', bd: 'rgba(255,45,85,0.22)', glow: 'rgba(255,45,85,0.25)' },
};

const SUB_STATUS = {
    ACCEPTED: { short: 'AC', color: '#00e676', bg: 'rgba(0,230,118,0.10)', bd: 'rgba(0,230,118,0.22)' },
    WRONG_ANSWER: { short: 'WA', color: '#ff2d55', bg: 'rgba(255,45,85,0.10)', bd: 'rgba(255,45,85,0.22)' },
    TIME_LIMIT_EXCEEDED: { short: 'TLE', color: '#ffb300', bg: 'rgba(255,179,0,0.10)', bd: 'rgba(255,179,0,0.22)' },
    MEMORY_LIMIT_EXCEEDED: { short: 'MLE', color: '#ffb300', bg: 'rgba(255,179,0,0.10)', bd: 'rgba(255,179,0,0.22)' },
    RUNTIME_ERROR: { short: 'RE', color: '#ff2d55', bg: 'rgba(255,45,85,0.10)', bd: 'rgba(255,45,85,0.22)' },
    COMPILATION_ERROR: { short: 'CE', color: '#f97316', bg: 'rgba(249,115,22,0.10)', bd: 'rgba(249,115,22,0.22)' },
    SECURITY_VIOLATION: { short: 'BL', color: '#a855f7', bg: 'rgba(168,85,247,0.10)', bd: 'rgba(168,85,247,0.22)' },
    PENDING: { short: '···', color: '#6366f1', bg: 'rgba(99,102,241,0.10)', bd: 'rgba(99,102,241,0.22)' },
    RUNNING: { short: '···', color: '#00d4ff', bg: 'rgba(0,212,255,0.10)', bd: 'rgba(0,212,255,0.22)' },
};

/* ═══════════════════════════════════════════════════
   GLOBAL STYLES
   ═══════════════════════════════════════════════════ */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;0,700;1,400&family=DM+Sans:wght@400;500;600&display=swap');
  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
  :root { color-scheme:dark; }

  @keyframes scan-v {
    0%   { transform:translateY(-100%); opacity:0; }
    5%   { opacity:.04; }
    95%  { opacity:.04; }
    100% { transform:translateY(110vh); opacity:0; }
  }
  @keyframes spin { to { transform:rotate(360deg); } }
  @keyframes shimmer {
    0%   { background-position:-200% 0; }
    100% { background-position:200% 0; }
  }
  @keyframes ring-ping {
    0%   { transform:scale(1);   opacity:.7; }
    100% { transform:scale(2.4); opacity:0; }
  }
  @keyframes pulse-slow {
    0%,100% { opacity:1; }
    50%     { opacity:.4; }
  }
  @keyframes accepted-burst {
    0%   { transform:scale(0.6) translateY(10px); opacity:0; }
    60%  { transform:scale(1.06) translateY(-3px); opacity:1; }
    100% { transform:scale(1)   translateY(0);    opacity:1; }
  }
  @keyframes particle-fly {
    0%   { transform:translate(0,0) scale(1);   opacity:1; }
    100% { transform:translate(var(--dx,20px), var(--dy,-60px)) scale(0); opacity:0; }
  }
  @keyframes slide-up {
    from { transform:translateY(10px); opacity:0; }
    to   { transform:translateY(0);    opacity:1; }
  }
  @keyframes bar-expand {
    from { transform:scaleX(0); transform-origin:left; }
    to   { transform:scaleX(1); transform-origin:left; }
  }
  @keyframes glow-cycle {
    0%,100% { box-shadow: 0 0 16px rgba(0,212,255,0.15); }
    50%     { box-shadow: 0 0 32px rgba(0,212,255,0.35), 0 0 64px rgba(0,212,255,0.10); }
  }
  @keyframes drag-pulse {
    0%,100% { background:rgba(99,102,241,0.4); }
    50%     { background:rgba(0,212,255,0.7); }
  }
  @keyframes result-in {
    from { opacity:0; transform:translateY(8px); }
    to   { opacity:1; transform:translateY(0);   }
  }
  @keyframes check-draw {
    from { stroke-dashoffset:100; }
    to   { stroke-dashoffset:0; }
  }
  @keyframes tab-glow {
    0%,100% { text-shadow:none; }
    50%     { text-shadow:0 0 12px rgba(0,212,255,0.5); }
  }
  @keyframes progress-stripe {
    0%   { background-position:0 0; }
    100% { background-position:32px 0; }
  }
  @keyframes float-icon {
    0%,100% { transform:translateY(0); }
    50%     { transform:translateY(-6px); }
  }

  .skel {
    border-radius:4px;
    background:linear-gradient(90deg,
      var(--bg-elevated) 25%,
      var(--border-subtle) 50%,
      var(--bg-elevated) 75%);
    background-size:200% 100%;
    animation:shimmer 1.6s ease-in-out infinite;
  }

  /* Scrollbar */
  ::-webkit-scrollbar       { width:4px; height:4px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:var(--border-subtle); border-radius:4px; }
  ::-webkit-scrollbar-thumb:hover { background:rgba(0,212,255,.25); }

  /* Prose overrides */
  .judge-prose h2 {
    font-family:'Syne',sans-serif;
    font-size:16px; font-weight:700; color:#dde0f5;
    margin:24px 0 10px; letter-spacing:-0.02em;
    padding-bottom:6px;
    border-bottom:1px solid var(--border-subtle);
  }
  .judge-prose h3 {
    font-family:'Syne',sans-serif;
    font-size:14px; font-weight:700; color:#a0a4cc;
    margin:18px 0 8px;
  }
  .judge-prose p  { margin:8px 0; line-height:1.8; }
  .judge-prose ul { padding-left:20px; margin:8px 0; }
  .judge-prose li { margin:4px 0; line-height:1.7; }
  .judge-prose code {
    fontFamily:"'IBM Plex Mono',monospace";
    font-size:12px; background:rgba(99,102,241,0.1);
    border:1px solid rgba(99,102,241,0.2);
    border-radius:5px; padding:2px 7px; color:#a5b4fc;
  }
  .judge-prose strong { color:#dde0f5; font-weight:700; }
  .judge-prose blockquote {
    border-left:3px solid rgba(0,212,255,0.3);
    padding:8px 16px; margin:12px 0;
    background:rgba(0,212,255,0.04);
    border-radius:0 8px 8px 0;
  }

  /* Monaco override */
  .monaco-editor .margin { background:#07071a !important; }
  .monaco-editor-background { background:#07071a !important; }
`;

/* ═══════════════════════════════════════════════════
   MICRO-COMPONENTS
   ═══════════════════════════════════════════════════ */

/* Monospace span */
function M({ ch, col = T.sub, sz = 12, w = 500 }) {
    return (
        <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: sz, fontWeight: w, color: col }}>
            {ch}
        </span>
    );
}

/* Live dot */
function Dot({ color = T.grn, size = 7, pulse = true }) {
    return (
        <span style={{ position: 'relative', display: 'inline-flex', width: size, height: size, flexShrink: 0 }}>
            {pulse && (
                <span style={{
                    position: 'absolute', inset: 0, borderRadius: '50%',
                    background: color, animation: 'ring-ping 2s ease-out infinite'
                }} />
            )}
            <span style={{
                position: 'relative', width: '100%', height: '100%',
                borderRadius: '50%', background: color,
                boxShadow: `0 0 ${size * 2}px ${color}cc`,
                animation: pulse ? 'pulse-slow 2s ease-in-out infinite' : 'none'
            }} />
        </span>
    );
}

/* Difficulty badge */
function DiffBadge({ diff }) {
    const d = DIFF[diff] || DIFF.easy;
    return (
        <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            height: 26, padding: '0 12px', borderRadius: 8,
            background: d.bg, border: `1px solid ${d.bd}`,
            boxShadow: `0 0 16px ${d.glow}`,
        }}>
            <span style={{
                width: 5, height: 5, borderRadius: '50%',
                background: d.color, display: 'inline-block',
                boxShadow: `0 0 7px ${d.color}`,
            }} />
            <span style={{
                fontFamily: "'IBM Plex Mono',monospace",
                fontSize: 11, fontWeight: 700, color: d.color,
                letterSpacing: '.04em', textTransform: 'uppercase',
            }}>{d.label}</span>
        </div>
    );
}

/* Tag chip */
function Tag({ label }) {
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', height: 22,
            padding: '0 10px', borderRadius: 100,
            background: `${T.ind}0c`, border: `1px solid ${T.ind}22`,
            fontFamily: "'DM Sans',sans-serif",
            fontSize: 11, fontWeight: 600, color: '#7880c4',
            letterSpacing: '.02em',
        }}>{label}</span>
    );
}

/* Language badge (toolbar) */
function LangBadge({ lang }) {
    const l = LANGUAGES.find(x => x.value === lang) || LANGUAGES[0];
    return (
        <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            height: 22, padding: '0 8px', borderRadius: 6,
            background: l.bg, border: `1px solid ${l.color}28`,
        }}>
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, fontWeight: 700, color: l.color, letterSpacing: '.04em' }}>{l.short}</span>
        </div>
    );
}

/* Stat chip (time/memory info) */
function StatChip({ icon: Icon, value, label }) {
    return (
        <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            height: 26, padding: '0 10px', borderRadius: 7,
            background: 'var(--bg-elevated)', border: `1px solid ${T.b}`,
        }}>
            <Icon size={11} color={T.sub} />
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, fontWeight: 600, color: T.text }}>
                {value}
            </span>
            <span style={{ fontSize: 10, color: T.sub }}>{label}</span>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   RESULT PANEL CONTENT
   ═══════════════════════════════════════════════════ */
function ResultContent({ submitState, fakeProgress, problem, onRetry, onSubmitFull }) {
    const { state, result, message, runType } = submitState;

    /* IDLE */
    if (state === 'idle') return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
            <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>
                <Terminal size={36} color={T.sub} style={{ opacity: .4 }} />
            </motion.div>
            <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: T.sub, letterSpacing: '.04em' }}>
                CTRL+' → Run &nbsp;|&nbsp; CTRL+ENTER → Submit
            </p>
        </div>
    );

    /* RUNNING / SUBMITTING */
    if (state === 'running' || state === 'submitting') {
        const isRun = runType === 'run';
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 18 }}>
                {/* Spinning rings */}
                <div style={{ position: 'relative', width: 56, height: 56 }}>
                    <div style={{
                        position: 'absolute', inset: 0, borderRadius: '50%',
                        border: `2px solid ${T.ind}22`,
                        borderTopColor: T.ind,
                        animation: 'spin .75s linear infinite',
                    }} />
                    <div style={{
                        position: 'absolute', inset: 8, borderRadius: '50%',
                        border: `1.5px solid ${T.cyan}18`,
                        borderTopColor: T.cyan,
                        animation: 'spin .5s linear infinite reverse',
                    }} />
                    <div style={{
                        position: 'absolute', inset: 0, display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                    }}>
                        {isRun
                            ? <Play size={14} color={T.grn} />
                            : <Send size={12} color={T.ind} />
                        }
                    </div>
                </div>

                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 4 }}>
                        {isRun ? 'Namuna testlar tekshirilmoqda' : 'Sandbox baholayapti'}
                    </div>
                    <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: T.sub }}>
                        {isRun ? 'sample test cases' : 'barcha test caselar'}
                    </div>
                </div>

                {/* Progress bar */}
                <div style={{ width: 260, height: 3, borderRadius: 99, background: 'var(--border-subtle)', overflow: 'hidden' }}>
                    <div style={{
                        height: '100%', borderRadius: 99,
                        background: isRun
                            ? `linear-gradient(90deg,${T.grn},${T.teal})`
                            : `linear-gradient(90deg,${T.ind},${T.cyan})`,
                        width: `${fakeProgress}%`,
                        transition: 'width .4s ease',
                        boxShadow: isRun ? `0 0 8px ${T.grn}66` : `0 0 8px ${T.ind}66`,
                    }} />
                </div>
                <M ch={`${Math.round(fakeProgress)}%`} col={isRun ? T.grn : T.ind} sz={11} w={700} />
            </div>
        );
    }

    /* ERROR */
    if (state === 'error') return (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ animation: 'result-in .3s ease both' }}>
            <div style={{
                borderLeft: `3px solid ${T.red}`,
                borderRadius: 10, padding: 20,
                background: `rgba(255,45,85,0.04)`,
                border: `1px solid rgba(255,45,85,0.12)`,
                borderLeftColor: T.red,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <AlertTriangle size={18} color={T.red} />
                    <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 700, color: T.red }}>
                        Xatolik yuz berdi
                    </span>
                </div>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: T.sub, marginBottom: 16, lineHeight: 1.6 }}>
                    {message}
                </p>
                <button onClick={onRetry} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    height: 32, padding: '0 14px', borderRadius: 8,
                    background: 'rgba(255,45,85,0.08)', border: `1px solid rgba(255,45,85,0.22)`,
                    color: T.red, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    fontFamily: "'DM Sans',sans-serif",
                }}>
                    <RotateCcw size={12} /> Qayta urinish
                </button>
            </div>
        </motion.div>
    );

    /* DONE — RUN (sync) */
    if (state === 'done' && result && result.is_sync_run) {
        const tests = result.test_results || [];
        const allOk = result.status === 'ACCEPTED';
        const isCE = result.status === 'COMPILATION_ERROR';

        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ animation: 'result-in .3s ease both' }}>
                {/* Summary header */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginBottom: 16, padding: '12px 16px', borderRadius: 10,
                    background: allOk ? 'rgba(0,230,118,0.06)' : 'rgba(255,45,85,0.05)',
                    border: `1px solid ${allOk ? 'rgba(0,230,118,0.18)' : 'rgba(255,45,85,0.15)'}`,
                    borderLeft: `3px solid ${allOk ? T.grn : T.red}`,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {allOk
                            ? <CheckCircle2 size={20} color={T.grn} />
                            : <XCircle size={20} color={T.red} />
                        }
                        <div>
                            <div style={{
                                fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 700,
                                color: allOk ? T.grn : T.red
                            }}>
                                {allOk ? "Barcha namuna testlar o'tdi!" : isCE ? 'Kompilyatsiya xatosi' : 'Xato topildi'}
                            </div>
                            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: T.sub, marginTop: 2 }}>
                                Run mode · sample test cases
                            </div>
                        </div>
                    </div>
                    {allOk && (
                        <div style={{
                            padding: '4px 14px', borderRadius: 100,
                            background: 'rgba(0,230,118,0.12)', border: '1px solid rgba(0,230,118,0.25)',
                            fontFamily: "'IBM Plex Mono',monospace",
                            fontSize: 11, fontWeight: 700, color: T.grn,
                        }}>100% PASS</div>
                    )}
                </div>

                {/* CE */}
                {isCE && (
                    <pre style={{
                        background: 'rgba(255,45,85,0.05)', border: '1px solid rgba(255,45,85,0.15)',
                        borderRadius: 8, padding: 14, fontFamily: "'IBM Plex Mono',monospace",
                        fontSize: 12, color: '#ff8fa3', lineHeight: 1.6, overflowX: 'auto',
                        marginBottom: 16, whiteSpace: 'pre-wrap',
                    }}>{result.error_message}</pre>
                )}

                {/* Test rows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {tests.map((t, idx) => {
                        const ok = t.status === 'ACCEPTED';
                        return (
                            <motion.div key={idx}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * .06 }}
                                style={{
                                    borderRadius: 10, overflow: 'hidden',
                                    border: `1px solid ${ok ? 'rgba(0,230,118,0.15)' : 'rgba(255,45,85,0.15)'}`,
                                    background: ok ? 'rgba(0,230,118,0.04)' : 'rgba(255,45,85,0.04)',
                                }}
                            >
                                {/* Test header */}
                                <div style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '9px 14px',
                                    background: ok ? 'rgba(0,230,118,0.06)' : 'rgba(255,45,85,0.06)',
                                    borderBottom: `1px solid ${ok ? 'rgba(0,230,118,0.1)' : 'rgba(255,45,85,0.1)'}`,
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{
                                            fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, fontWeight: 700,
                                            color: ok ? T.grn : T.red
                                        }}>
                                            {ok ? '✓' : '✗'} Test #{t.test_num}
                                        </span>
                                        {t.time_ms && (
                                            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: T.sub }}>
                                                {t.time_ms}ms
                                            </span>
                                        )}
                                    </div>
                                    <span style={{
                                        fontFamily: "'IBM Plex Mono',monospace",
                                        fontSize: 10, fontWeight: 700,
                                        color: ok ? T.grn : T.red,
                                        background: ok ? 'rgba(0,230,118,0.1)' : 'rgba(255,45,85,0.1)',
                                        padding: '2px 8px', borderRadius: 4,
                                    }}>{t.status}</span>
                                </div>

                                {/* Test body */}
                                <div style={{ padding: '12px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div>
                                        <div style={{
                                            fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, fontWeight: 700,
                                            color: T.sub, letterSpacing: '.1em', marginBottom: 6
                                        }}>KIRISH</div>
                                        <pre style={{
                                            fontFamily: "'IBM Plex Mono',monospace", fontSize: 12,
                                            color: 'var(--text-primary)', background: 'var(--bg-elevated)',
                                            border: '1px solid var(--border-subtle)', borderRadius: 6,
                                            padding: '8px 10px', margin: 0, whiteSpace: 'pre-wrap'
                                        }}>{t.input}</pre>
                                    </div>
                                    <div>
                                        <div style={{
                                            fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, fontWeight: 700,
                                            color: T.sub, letterSpacing: '.1em', marginBottom: 6
                                        }}>
                                            {ok ? 'CHIQISH' : 'KUTILGAN / KELGAN'}
                                        </div>
                                        <pre style={{
                                            fontFamily: "'IBM Plex Mono',monospace", fontSize: 12,
                                            color: ok ? T.grn : T.red,
                                            background: ok ? 'rgba(0,230,118,0.04)' : 'rgba(255,45,85,0.04)',
                                            border: `1px solid ${ok ? 'rgba(0,230,118,0.12)' : 'rgba(255,45,85,0.12)'}`,
                                            borderRadius: 6, padding: '8px 10px', margin: 0, whiteSpace: 'pre-wrap'
                                        }}>
                                            {ok ? t.actual : `${t.expected}\n─────────\n${t.actual}`}
                                        </pre>
                                    </div>
                                </div>
                                {t.stderr && (
                                    <div style={{ padding: '0 14px 12px' }}>
                                        <div style={{
                                            fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, fontWeight: 700,
                                            color: T.red, letterSpacing: '.1em', marginBottom: 4
                                        }}>STDERR</div>
                                        <pre style={{
                                            fontFamily: "'IBM Plex Mono',monospace", fontSize: 11,
                                            color: '#ff8fa3', background: 'rgba(255,45,85,0.05)',
                                            padding: '8px 10px', borderRadius: 6, margin: 0, overflowX: 'auto'
                                        }}>
                                            {t.stderr}
                                        </pre>
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </div>

                {/* Submit CTA */}
                {allOk && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .3 }}
                        style={{
                            marginTop: 20, textAlign: 'center',
                            padding: '16px', borderRadius: 10,
                            background: 'rgba(0,212,255,0.04)',
                            border: '1px solid rgba(0,212,255,0.12)',
                        }}
                    >
                        <p style={{ fontSize: 12, color: T.sub, marginBottom: 10, fontFamily: "'DM Sans',sans-serif" }}>
                            Barcha namuna testlar muvaffaqiyatli o'tdi!
                        </p>
                        <button onClick={onSubmitFull} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 8,
                            height: 36, padding: '0 20px', borderRadius: 9,
                            background: `linear-gradient(135deg,${T.ind},${T.cyan})`,
                            border: 'none', color: 'var(--bg-base)',
                            fontSize: 13, fontWeight: 700, cursor: 'pointer',
                            fontFamily: "'DM Sans',sans-serif",
                            boxShadow: `0 0 24px ${T.cyan}35`,
                        }}>
                            <Send size={13} /> Rasmiy topshirish →
                        </button>
                    </motion.div>
                )}
            </motion.div>
        );
    }

    /* DONE — ASYNC (submit results) */
    if (state === 'done' && result) {
        const st = result.status || '';

        /* ACCEPTED — big celebration */
        if (st === 'ACCEPTED') return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ animation: 'accepted-burst .5s cubic-bezier(.34,1.56,.64,1) both' }}>
                <div style={{
                    borderRadius: 14, padding: 24,
                    background: 'rgba(0,230,118,0.06)',
                    border: '1px solid rgba(0,230,118,0.22)',
                    borderLeft: `4px solid ${T.grn}`,
                    position: 'relative', overflow: 'hidden',
                }}>
                    {/* Background glow burst */}
                    <div style={{
                        position: 'absolute', top: '50%', left: '50%',
                        transform: 'translate(-50%,-50%)',
                        width: 300, height: 300, borderRadius: '50%',
                        background: 'radial-gradient(circle,rgba(0,230,118,0.07),transparent 65%)',
                        pointerEvents: 'none',
                    }} />

                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                        <div style={{
                            width: 52, height: 52, borderRadius: 16, flexShrink: 0,
                            background: 'rgba(0,230,118,0.12)',
                            border: '1px solid rgba(0,230,118,0.28)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 0 24px rgba(0,230,118,0.3)',
                        }}>
                            <CheckCircle2 size={24} color={T.grn} />
                        </div>
                        <div>
                            <div style={{
                                fontFamily: "'Syne',sans-serif",
                                fontSize: 24, fontWeight: 800, color: T.grn,
                                textShadow: `0 0 24px ${T.grn}44`,
                                letterSpacing: '-.02em',
                            }}>Accepted!</div>
                            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: 'rgba(0,230,118,0.6)', marginTop: 2 }}>
                                Barcha test caselar muvaffaqiyatli o'tdi ✓
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, position: 'relative' }}>
                        {[
                            { icon: Clock, val: result.time_used ? `${result.time_used}ms` : '—', label: 'Runtime', color: T.text },
                            { icon: Cpu, val: result.memory_used ? `${result.memory_used}MB` : '—', label: 'Memory', color: T.text },
                        ].map((s, i) => (
                            <div key={i} style={{
                                background: 'var(--bg-elevated)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: 10, padding: '14px 16px',
                                display: 'flex', alignItems: 'center', gap: 10,
                            }}>
                                <s.icon size={14} color={T.grn} />
                                <div>
                                    <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 18, fontWeight: 700, color: s.color, lineHeight: 1 }}>
                                        {s.val}
                                    </div>
                                    <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 10, color: T.sub, marginTop: 3, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                                        {s.label}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>
        );

        /* WRONG ANSWER */
        if (st === 'WRONG_ANSWER') return (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <div style={{
                    borderRadius: 12, padding: 20,
                    background: 'rgba(255,45,85,0.04)',
                    border: '1px solid rgba(255,45,85,0.14)',
                    borderLeft: `3px solid ${T.red}`,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                        <XCircle size={20} color={T.red} />
                        <div>
                            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 17, fontWeight: 700, color: T.red }}>Wrong Answer</div>
                            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: T.sub, marginTop: 2 }}>
                                Test #{result.failed_test?.number || '?'} da xato
                            </div>
                        </div>
                    </div>
                    <div style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,45,85,0.12)', borderRadius: 10, padding: 16 }}>
                        {[
                            { label: 'KIRISH', value: result.failed_test?.input || '—', color: 'var(--text-primary)' },
                            { label: 'KUTILGAN', value: result.failed_test?.expected || '—', color: T.grn },
                            { label: 'SIZNIKI', value: result.failed_test?.actual || '—', color: T.red },
                        ].map((r, i) => (
                            <div key={i} style={{ marginBottom: i < 2 ? 14 : 0 }}>
                                <div style={{
                                    fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, fontWeight: 700,
                                    letterSpacing: '.1em', color: T.sub, marginBottom: 6
                                }}>{r.label}</div>
                                <pre style={{
                                    fontFamily: "'IBM Plex Mono',monospace", fontSize: 12,
                                    background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                                    borderRadius: 6, padding: '8px 12px', margin: 0, whiteSpace: 'pre-wrap', color: r.color
                                }}>
                                    {r.value}
                                </pre>
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>
        );

        /* COMPILATION ERROR */
        if (st === 'COMPILATION_ERROR') return (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <div style={{ borderRadius: 12, padding: 20, background: 'rgba(249,115,22,0.04)', border: '1px solid rgba(249,115,22,0.14)', borderLeft: `3px solid ${T.org}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                        <AlertTriangle size={18} color={T.org} />
                        <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 700, color: T.org }}>Compilation Error</span>
                    </div>
                    <pre style={{
                        fontFamily: "'IBM Plex Mono',monospace", fontSize: 12,
                        background: 'rgba(249,115,22,0.04)', border: '1px solid rgba(249,115,22,0.12)',
                        borderRadius: 8, padding: 14, color: '#fdba74', lineHeight: 1.6, overflowX: 'auto', whiteSpace: 'pre-wrap', margin: 0
                    }}>
                        {result.error_message || 'Compilation error'}
                    </pre>
                </div>
            </motion.div>
        );

        /* TLE */
        if (st === 'TIME_LIMIT_EXCEEDED') return (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <div style={{ borderRadius: 12, padding: 20, background: 'rgba(255,179,0,0.04)', border: '1px solid rgba(255,179,0,0.14)', borderLeft: `3px solid ${T.amb}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <Clock size={18} color={T.amb} />
                        <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 700, color: T.amb }}>Time Limit Exceeded</span>
                    </div>
                    <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: T.sub, lineHeight: 1.6 }}>
                        Kod <M ch={`${problem?.time_limit || 1}s`} col={T.amb} sz={13} w={700} /> dan ko'proq vaqt oldi. Algoritmni optimizatsiya qiling.
                    </p>
                </div>
            </motion.div>
        );

        /* RUNTIME ERROR */
        if (st === 'RUNTIME_ERROR') return (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <div style={{ borderRadius: 12, padding: 20, background: 'rgba(255,45,85,0.04)', border: '1px solid rgba(255,45,85,0.14)', borderLeft: `3px solid ${T.red}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                        <Zap size={18} color={T.red} />
                        <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 700, color: T.red }}>Runtime Error</span>
                    </div>
                    <pre style={{
                        fontFamily: "'IBM Plex Mono',monospace", fontSize: 12,
                        background: 'rgba(255,45,85,0.04)', border: '1px solid rgba(255,45,85,0.12)',
                        borderRadius: 8, padding: 14, color: '#ff8fa3', lineHeight: 1.6, overflowX: 'auto', whiteSpace: 'pre-wrap', margin: 0
                    }}>
                        {result.error_message || 'Runtime error'}
                    </pre>
                </div>
            </motion.div>
        );

        /* SECURITY VIOLATION */
        if (st === 'SECURITY_VIOLATION') return (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <div style={{ borderRadius: 12, padding: 20, background: 'rgba(168,85,247,0.04)', border: '1px solid rgba(168,85,247,0.14)', borderLeft: `3px solid ${T.pur}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                        <Shield size={18} color={T.pur} />
                        <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 700, color: T.pur }}>Security Violation</span>
                    </div>
                    <pre style={{
                        fontFamily: "'IBM Plex Mono',monospace", fontSize: 12,
                        background: 'rgba(168,85,247,0.04)', border: '1px solid rgba(168,85,247,0.12)',
                        borderRadius: 8, padding: 14, color: '#c4b5fd', lineHeight: 1.6, overflowX: 'auto', whiteSpace: 'pre-wrap', margin: 0
                    }}>
                        {result.error_message || 'Taqiqlangan kod ishlatildi'}
                    </pre>
                </div>
            </motion.div>
        );

        /* GENERIC */
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div style={{ borderLeft: `3px solid ${T.sub}`, borderRadius: 10, padding: 20, background: 'var(--bg-elevated)' }}>
                    <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 700, color: T.sub }}>
                        {st.replace(/_/g, ' ')}
                    </div>
                    {result.error_message && (
                        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: T.sub, marginTop: 8 }}>
                            {result.error_message}
                        </p>
                    )}
                </div>
            </motion.div>
        );
    }

    return null;
}

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════ */
export default function ProblemDetail() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const isAuth = useAuthStore(s => s.isAuthenticated);

    const [problem, setProblem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('problem');
    const [language, setLanguage] = useState('python');
    const [code, setCode] = useState(starterCode.python);
    const [langDropOpen, setLangDropOpen] = useState(false);
    const langDropRef = useRef(null);

    const [submitState, setSubmitState] = useState({ state: 'idle', result: null, message: '' });
    const [resultOpen, setResultOpen] = useState(false);
    const [resultHeight, setResultHeight] = useState(260);
    const [fakeProgress, setFakeProgress] = useState(0);
    const fakeProgressRef = useRef(null);

    const [leftWidth, setLeftWidth] = useState(44);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef(null);

    const [copiedIdx, setCopiedIdx] = useState(null);
    const [showAuthModal, setShowAuthModal] = useState(false);

    const [submissions, setSubmissions] = useState([]);
    const [subsLoading, setSubsLoading] = useState(false);
    const [subsRefresh, setSubsRefresh] = useState(0);
    const [codeModalId, setCodeModalId] = useState(null);

    /* fetch problem */
    useEffect(() => {
        (async () => {
            try {
                const res = await getProblem(slug);
                setProblem(res.data);
                document.title = `${res.data.title} — OnlineJudge`;
            } catch {
                setProblem(mockProblem);
                document.title = `${mockProblem.title} — OnlineJudge`;
            } finally { setLoading(false); }
        })();
    }, [slug]);

    /* fetch submissions */
    useEffect(() => {
        if (tab !== 'submissions' || !isAuth) return;
        (async () => {
            setSubsLoading(true);
            try {
                const { data } = await api.get(`/problems/${slug}/submissions/`);
                setSubmissions(data.results || data);
            } catch { setSubmissions([]); }
            finally { setSubsLoading(false); }
        })();
    }, [tab, slug, subsRefresh]);

    /* close lang dropdown */
    useEffect(() => {
        const h = e => { if (langDropRef.current && !langDropRef.current.contains(e.target)) setLangDropOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    /* lang change */
    const handleLangChange = val => {
        setLanguage(val);
        setLangDropOpen(false);
        const isDefault = Object.values(starterCode).some(s => code.trim() === s.trim());
        if (!code || isDefault) setCode(starterCode[val]);
    };

    /* drag handle */
    const startDrag = useCallback(e => { e.preventDefault(); setIsDragging(true); }, []);
    useEffect(() => {
        if (!isDragging) return;
        const onMove = e => {
            if (!containerRef.current) return;
            const r = containerRef.current.getBoundingClientRect();
            setLeftWidth(Math.min(60, Math.max(28, ((e.clientX - r.left) / r.width) * 100)));
        };
        const onUp = () => setIsDragging(false);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    }, [isDragging]);

    /* fake progress */
    const startFakeProgress = () => {
        setFakeProgress(0);
        if (fakeProgressRef.current) clearInterval(fakeProgressRef.current);
        fakeProgressRef.current = setInterval(() => {
            setFakeProgress(p => { if (p >= 85) { clearInterval(fakeProgressRef.current); return 85; } return p + Math.random() * 8; });
        }, 400);
    };
    const stopFakeProgress = () => { if (fakeProgressRef.current) clearInterval(fakeProgressRef.current); setFakeProgress(100); };

    /* run */
    const handleRun = async () => {
        if (!isAuth) { setShowAuthModal(true); return; }
        if (!problem || isRunning) return;
        setResultOpen(true);
        startFakeProgress();
        setSubmitState({ state: 'submitting', runType: 'run' });

        try {
            // 1. Create run submission via /run/ endpoint
            const { data: createData } = await api.post(`/problems/${slug}/run/`, { code, language });
            const subId = createData.id;
            setSubmitState({ state: 'running', runType: 'run', id: subId });

            // 2. Poll for result
            const POLL_MS = 2000;
            const MAX_POLLS = 20;
            const TERMINAL = ['ACCEPTED','WRONG_ANSWER','TIME_LIMIT_EXCEEDED','MEMORY_LIMIT_EXCEEDED','RUNTIME_ERROR','COMPILATION_ERROR','SECURITY_VIOLATION','SYSTEM_ERROR'];

            for (let i = 0; i < MAX_POLLS; i++) {
                await new Promise(r => setTimeout(r, POLL_MS));
                const { data } = await api.get(`/submissions/run_status/${subId}/`);
                if (TERMINAL.includes(data.status)) {
                    stopFakeProgress();
                    setSubmitState({
                        state: 'done', runType: 'run', result: {
                            status: data.status,
                            time_used: data.time_used || 0,
                            memory_used: data.memory_used || 0,
                            error_message: data.error_message || '',
                            failed_test: data.failed_test || null,
                            extra_data: data.extra_data || null,
                            is_sync_run: data.is_sync_run || true,
                        }
                    });
                    return;
                }
            }
            stopFakeProgress();
            setSubmitState({ state: 'error', runType: 'run', message: 'Timeout: 40 soniya ichida natija kelmadi' });
        } catch (err) {
            stopFakeProgress();
            setSubmitState({ state: 'error', runType: 'run', message: err.response?.data?.detail || 'Xato yuz berdi' });
        }
    };

    /* submit */
    const handleSubmit = async () => {
        if (!isAuth) { setShowAuthModal(true); return; }
        if (!problem || isRunning) return;
        setResultOpen(true);
        startFakeProgress();
        await submitCode({
            problemId: problem.id, language, code, runType: 'submit',
            onStatusUpdate: update => {
                setSubmitState(update);
                if (update.state === 'done' || update.state === 'error') {
                    stopFakeProgress();
                    setSubsRefresh(k => k + 1);
                }
            },
        });
    };

    /* keyboard shortcuts */
    useEffect(() => {
        const h = e => {
            if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); handleSubmit(); }
            if (e.ctrlKey && e.key === "'") { e.preventDefault(); handleRun(); }
            if (e.ctrlKey && e.key === '\\') { e.preventDefault(); setResultOpen(o => !o); }
            if (e.ctrlKey && e.shiftKey && (e.key === 'Z' || e.key === 'z')) { e.preventDefault(); setCode(starterCode[language]); }
        };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [language, problem, isAuth, code, submitState]);

    /* copy */
    const handleCopy = (text, idx) => {
        navigator.clipboard.writeText(text);
        setCopiedIdx(idx);
        setTimeout(() => setCopiedIdx(null), 1500);
    };

    /* monaco theme */
    const handleEditorBeforeMount = monaco => {
        monaco.editor.defineTheme('judge-dark', {
            base: 'vs-dark', inherit: true,
            rules: [
                { token: 'comment', foreground: '3a3a5a', fontStyle: 'italic' },
                { token: 'keyword', foreground: '818cf8' },
                { token: 'string', foreground: '00c896' },
                { token: 'number', foreground: 'f59e0b' },
                { token: 'function', foreground: '60a5fa' },
                { token: 'type', foreground: 'a78bfa' },
                { token: 'variable', foreground: 'dde0f5' },
            ],
            colors: {
                'editor.background': '#0f172a',
                'editor.foreground': '#f8fafc',
                'editor.lineHighlightBackground': '#1e293b',
                'editor.selectionBackground': '#6366f122',
                'editorLineNumber.foreground': '#475569',
                'editorLineNumber.activeForeground': '#6366f1',
                'editorCursor.foreground': '#00d4ff',
                'editorIndentGuide.background': '#ffffff05',
                'editorIndentGuide.activeBackground': '#6366f130',
                'editor.findMatchBackground': '#6366f130',
                'editorBracketMatch.background': '#6366f115',
                'editorBracketMatch.border': '#6366f150',
                'editorWidget.background': '#0f172a',
                'editorSuggestWidget.background': '#1e293b',
                'editorSuggestWidget.border': '#ffffff0a',
                'editorSuggestWidget.selectedBackground': '#6366f118',
                'scrollbarSlider.background': '#ffffff08',
                'scrollbarSlider.hoverBackground': '#6366f125',
            },
        });
    };

    /* loading state */
    if (loading) return (
        <>
            <style>{CSS}</style>
            <style>{`@keyframes gspin{to{transform:rotate(360deg)}}.gspin{width:32px;height:32px;border:2px solid rgba(99,102,241,0.12);border-top-color:#6366f1;border-radius:50%;animation:gspin .8s linear infinite}`}</style>
            <div style={{ height: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: T.bg }}>
                <div className="gspin" />
                <M ch="Masala yuklanmoqda..." col={T.sub} sz={12} />
            </div>
        </>
    );

    const p = problem || mockProblem;
    const dc = DIFF[p.difficulty] || DIFF.easy;
    const curLang = LANGUAGES.find(l => l.value === language);
    const isRunning = submitState.state === 'submitting' || submitState.state === 'running';

    /* result panel status */
    const getResultMeta = () => {
        if (isRunning) return { dot: T.amb, label: 'Baholanmoqda...', labelColor: T.amb };
        if (submitState.state === 'done' && submitState.result) {
            const st = submitState.result.status;
            if (st === 'ACCEPTED') return { dot: T.grn, label: 'Accepted', labelColor: T.grn };
            if (st === 'WRONG_ANSWER') return { dot: T.red, label: 'Wrong Answer', labelColor: T.red };
            if (st === 'TIME_LIMIT_EXCEEDED') return { dot: T.amb, label: 'Time Limit', labelColor: T.amb };
            if (st === 'COMPILATION_ERROR') return { dot: T.org, label: 'Compile Error', labelColor: T.org };
            if (st === 'RUNTIME_ERROR') return { dot: T.red, label: 'Runtime Error', labelColor: T.red };
            if (st === 'SECURITY_VIOLATION') return { dot: T.pur, label: 'Blocked', labelColor: T.pur };
            return { dot: T.sub, label: st.replace(/_/g, ' '), labelColor: T.sub };
        }
        if (submitState.state === 'error') return { dot: T.red, label: 'Xatolik', labelColor: T.red };
        return { dot: '#22224a', label: 'Natija', labelColor: T.sub };
    };
    const rm = getResultMeta();

    return (
        <>
            <style>{CSS}</style>
            <style>{`@keyframes gspin{to{transform:rotate(360deg)}}.gspin{width:20px;height:20px;border:2px solid rgba(99,102,241,0.10);border-top-color:#6366f1;border-radius:50%;animation:gspin .75s linear infinite}`}</style>

            {/* Subtle background scanline */}
            <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
                <div style={{
                    position: 'absolute', left: 0, right: 0, height: '1px',
                    background: `linear-gradient(90deg,transparent 5%,${T.ind}33 40%,${T.cyan}22 60%,transparent 95%)`,
                    animation: 'scan-v 16s linear infinite',
                }} />
                <div style={{
                    position: 'absolute', inset: 0, opacity: .012,
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.6) 1px,transparent 1px)`,
                    backgroundSize: '40px 40px',
                    pointerEvents: 'none',
                }} />
            </div>

            <div
                ref={containerRef}
                style={{
                    position: 'relative', zIndex: 1,
                    display: 'flex', height: 'calc(100vh - 56px)',
                    overflow: 'hidden',
                    userSelect: isDragging ? 'none' : 'auto',
                    fontFamily: "'DM Sans',sans-serif",
                    color: T.text,
                }}
            >

                {/* ══════════════════════════════════════
                    LEFT PANEL — Problem description
                ══════════════════════════════════════ */}
                <div style={{
                    width: `${leftWidth}%`,
                    background: T.surf,
                    borderRight: `1px solid ${T.b}`,
                    display: 'flex', flexDirection: 'column',
                    minWidth: 0,
                }}>

                    {/* Tab bar */}
                    <div style={{
                        height: 46,
                        background: T.surf,
                        borderBottom: `1px solid ${T.b}`,
                        padding: '0 18px',
                        display: 'flex', alignItems: 'flex-end', gap: 2,
                        flexShrink: 0,
                        position: 'relative',
                    }}>
                        {[
                            { key: 'problem', label: 'Masala', Icon: BookOpen },
                            { key: 'submissions', label: 'Mening yechimlarim', Icon: History },
                        ].map(t => {
                            const active = tab === t.key;
                            return (
                                <button key={t.key} onClick={() => setTab(t.key)} style={{
                                    display: 'flex', alignItems: 'center', gap: 7,
                                    padding: '10px 14px', fontSize: 12, fontWeight: active ? 700 : 500,
                                    cursor: 'pointer', border: 'none', background: 'transparent',
                                    fontFamily: "'DM Sans',sans-serif",
                                    color: active ? T.cyan : T.sub,
                                    borderRadius: '6px 6px 0 0',
                                    position: 'relative', transition: 'color .15s',
                                }}>
                                    <t.Icon size={13} />
                                    {t.label}
                                    {active && (
                                        <motion.div layoutId="lpanel-tab"
                                            style={{
                                                position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
                                                background: `linear-gradient(90deg,transparent,${T.cyan},transparent)`,
                                                borderRadius: '2px 2px 0 0',
                                                boxShadow: `0 0 8px ${T.cyan}55`,
                                            }}
                                            transition={{ type: 'spring', bounce: .2, duration: .35 }}
                                        />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Content scroll area */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: tab === 'problem' ? '24px 22px' : '16px' }}>

                        {/* ── PROBLEM TAB ── */}
                        {tab === 'problem' && (
                            <>
                                {/* Problem header */}
                                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .3 }}>
                                    {/* ID + title */}
                                    <div style={{ marginBottom: 16 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                            <M ch={`#${p.id}`} sz={10} col={T.sub} />
                                            <div style={{ width: 1, height: 10, background: T.b }} />
                                            <M ch={p.slug} sz={10} col={T.sub} />
                                        </div>
                                        <h1 style={{
                                            fontFamily: "'Syne',sans-serif",
                                            fontSize: 22, fontWeight: 800, color: T.text,
                                            letterSpacing: '-.03em', lineHeight: 1.2, margin: 0,
                                        }}>{p.title}</h1>
                                    </div>

                                    {/* Meta row */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                                        <DiffBadge diff={p.difficulty} />
                                        <StatChip icon={Clock} value={`${p.time_limit}s`} label="TL" />
                                        <StatChip icon={Cpu} value={`${p.memory_limit}MB`} label="ML" />
                                    </div>

                                    {/* Tags */}
                                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 22 }}>
                                        {(p.tags || []).map((tag, i) => (
                                            <Tag key={i} label={tag.name || tag} />
                                        ))}
                                    </div>
                                </motion.div>

                                {/* Divider */}
                                <div style={{ height: 1, background: `linear-gradient(90deg,transparent,${T.b},transparent)`, marginBottom: 22 }} />

                                {/* Description */}
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .1 }}>
                                    <div className="judge-prose" style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--text-secondary)' }}>
                                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex, rehypeHighlight]}>
                                            {p.description}
                                        </ReactMarkdown>
                                    </div>
                                </motion.div>

                                {/* Input/Output format */}
                                {p.input_format && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .15 }} style={{ marginTop: 20 }}>
                                        <div style={{
                                            padding: '12px 16px', borderRadius: 10,
                                            background: `${T.ind}06`, border: `1px solid ${T.ind}16`,
                                        }}>
                                            <div style={{
                                                fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, fontWeight: 700,
                                                color: T.ind, letterSpacing: '.1em', marginBottom: 8
                                            }}>KIRISH FORMATI</div>
                                            <div className="judge-prose" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex, rehypeHighlight]}>
                                                    {p.input_format}
                                                </ReactMarkdown>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                                {p.output_format && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .18 }} style={{ marginTop: 12 }}>
                                        <div style={{
                                            padding: '12px 16px', borderRadius: 10,
                                            background: 'rgba(0,230,118,0.04)', border: '1px solid rgba(0,230,118,0.10)',
                                        }}>
                                            <div style={{
                                                fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, fontWeight: 700,
                                                color: T.grn, letterSpacing: '.1em', marginBottom: 8
                                            }}>CHIQISH FORMATI</div>
                                            <div className="judge-prose" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex, rehypeHighlight]}>
                                                    {p.output_format}
                                                </ReactMarkdown>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Section divider */}
                                <div style={{ height: 1, background: `linear-gradient(90deg,transparent,${T.b},transparent)`, margin: '24px 0' }} />

                                {/* Sample tests */}
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                                        <div style={{ width: 2, height: 14, borderRadius: 1, background: T.cyan }} />
                                        <M ch="NAMUNA TESTLAR" col={T.sub} sz={10} w={700} />
                                    </div>

                                    {(p.sample_test_cases || []).map((tc, i) => (
                                        <motion.div key={i}
                                            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .15 + i * .08 }}
                                            style={{
                                                background: T.surf2,
                                                border: `1px solid ${T.b}`,
                                                borderRadius: 12, overflow: 'hidden',
                                                marginBottom: 12,
                                            }}
                                        >
                                            {/* Card header */}
                                            <div style={{
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                padding: '9px 14px',
                                                background: 'rgba(255,255,255,0.025)',
                                                borderBottom: `1px solid ${T.b}`,
                                            }}>
                                                <M ch={`Namuna #${i + 1}`} sz={10} w={700} />
                                                <motion.button
                                                    whileHover={{ scale: 1.1 }} whileTap={{ scale: .9 }}
                                                    onClick={() => handleCopy(`${tc.input}\n---\n${tc.expected_output}`, i)}
                                                    style={{
                                                        width: 26, height: 26, borderRadius: 6,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        background: copiedIdx === i ? 'rgba(0,230,118,0.1)' : 'var(--bg-elevated)',
                                                        border: `1px solid ${copiedIdx === i ? 'rgba(0,230,118,0.25)' : T.b}`,
                                                        color: copiedIdx === i ? T.grn : T.sub, cursor: 'pointer', transition: 'all .15s',
                                                    }}
                                                >
                                                    {copiedIdx === i ? <Check size={12} /> : <Copy size={12} />}
                                                </motion.button>
                                            </div>

                                            {/* Card body */}
                                            <div style={{ padding: '12px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                                {[
                                                    { label: 'Kirish', value: tc.input, color: T.cyan },
                                                    { label: 'Chiqish', value: tc.expected_output, color: T.grn },
                                                ].map((side, si) => (
                                                    <div key={si}>
                                                        <div style={{
                                                            fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, fontWeight: 700,
                                                            color: side.color, letterSpacing: '.1em', marginBottom: 6, opacity: .7
                                                        }}>
                                                            {side.label.toUpperCase()}
                                                        </div>
                                                        <pre style={{
                                                            fontFamily: "'IBM Plex Mono',monospace", fontSize: 12,
                                                            color: 'var(--text-primary)',
                                                            background: 'var(--bg-elevated)',
                                                            border: `1px solid var(--border-subtle)`,
                                                            borderRadius: 7, padding: '10px 12px',
                                                            margin: 0, lineHeight: 1.7, whiteSpace: 'pre', overflowX: 'auto',
                                                        }}>{side.value}</pre>
                                                    </div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </>
                        )}

                        {/* ── SUBMISSIONS TAB ── */}
                        {tab === 'submissions' && (
                            <div>
                                {!isAuth ? (
                                    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                                        <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity }}>
                                            <Lock size={40} color={T.sub} style={{ opacity: .5, margin: '0 auto 16px' }} />
                                        </motion.div>
                                        <div style={{
                                            fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 700,
                                            color: T.sub, marginBottom: 8
                                        }}>Kiring</div>
                                        <p style={{ fontSize: 13, color: T.sub, marginBottom: 20 }}>
                                            Submissionlarni ko'rish uchun hisobingizga kiring
                                        </p>
                                        <motion.button
                                            whileHover={{ scale: 1.04 }} whileTap={{ scale: .96 }}
                                            onClick={() => navigate('/login')}
                                            style={{
                                                height: 36, padding: '0 20px', borderRadius: 9,
                                                background: `${T.ind}14`, border: `1px solid ${T.ind}35`,
                                                color: '#818cf8', fontSize: 13, fontWeight: 600,
                                                cursor: 'pointer', fontFamily: "'DM Sans',sans-serif",
                                            }}
                                        >Kirish →</motion.button>
                                    </div>
                                ) : subsLoading ? (
                                    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                                        <div className="gspin" style={{ margin: '0 auto 12px' }} />
                                        <M ch="Yuklanmoqda..." col={T.sub} sz={12} />
                                    </div>
                                ) : submissions.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                                        <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity }}
                                            style={{ fontSize: 44, marginBottom: 16 }}>📭</motion.div>
                                        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 700, color: T.sub, marginBottom: 6 }}>
                                            Hali submission yo'q
                                        </div>
                                        <p style={{ fontSize: 12, color: T.sub }}>Birinchi yechimingizni yuboring!</p>
                                    </div>
                                ) : (
                                    <div style={{
                                        borderRadius: 12, overflow: 'hidden',
                                        border: `1px solid ${T.b}`,
                                    }}>
                                        {/* Header */}
                                        <div style={{
                                            display: 'grid', gridTemplateColumns: '1fr 72px 90px 70px 70px',
                                            padding: '10px 16px',
                                            background: `linear-gradient(90deg,rgba(99,102,241,0.06),transparent)`,
                                            borderBottom: `1px solid ${T.b}`,
                                        }}>
                                            {['VAQT', 'NATIJA', 'TIL', 'MS', 'MB'].map((h, i) => (
                                                <span key={i} style={{
                                                    fontFamily: "'IBM Plex Mono',monospace",
                                                    fontSize: 9, fontWeight: 700, color: T.sub, letterSpacing: '.1em'
                                                }}>{h}</span>
                                            ))}
                                        </div>

                                        {/* Rows */}
                                        {submissions.map((sub, idx) => {
                                            const sc = SUB_STATUS[sub.status] || SUB_STATUS.PENDING;
                                            return (
                                                <motion.div key={sub.id}
                                                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: idx * .04 }}
                                                    onClick={() => setCodeModalId(sub.id)}
                                                    style={{
                                                        display: 'grid', gridTemplateColumns: '1fr 72px 90px 70px 70px',
                                                        padding: '13px 16px',
                                                        borderBottom: `1px solid rgba(255,255,255,0.035)`,
                                                        alignItems: 'center', cursor: 'pointer',
                                                        transition: 'background .12s',
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,212,255,0.025)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    <span style={{ fontSize: 11, color: T.sub, fontFamily: "'IBM Plex Mono',monospace" }}>
                                                        {new Date(sub.created_at).toLocaleString('uz-UZ')}
                                                    </span>
                                                    <span style={{
                                                        display: 'inline-block', padding: '3px 8px',
                                                        borderRadius: 6, fontSize: 10, fontWeight: 700,
                                                        color: sc.color, background: sc.bg, border: `1px solid ${sc.bd}`,
                                                        fontFamily: "'IBM Plex Mono',monospace",
                                                        width: 'fit-content',
                                                    }}>{sc.short}</span>
                                                    <LangBadge lang={sub.language} />
                                                    <M ch={sub.time_used ? `${sub.time_used}` : '—'} sz={11} />
                                                    <M ch={sub.memory_used ? `${sub.memory_used}` : '—'} sz={11} />
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* ══════════════════════════════════════
                    DRAG HANDLE
                ══════════════════════════════════════ */}
                <div
                    onMouseDown={startDrag}
                    style={{
                        width: 5, cursor: 'col-resize', flexShrink: 0,
                        background: isDragging
                            ? `linear-gradient(180deg,transparent,${T.ind},${T.cyan},${T.ind},transparent)`
                            : 'var(--bg-elevated)',
                        transition: isDragging ? 'none' : 'background .2s',
                        boxShadow: isDragging ? `0 0 18px ${T.ind}50` : 'none',
                        position: 'relative', zIndex: 10,
                    }}
                    onMouseEnter={e => { if (!isDragging) e.currentTarget.style.background = `${T.ind}50`; }}
                    onMouseLeave={e => { if (!isDragging) e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                />

                {/* ══════════════════════════════════════
                    RIGHT PANEL — Editor + Result
                ══════════════════════════════════════ */}
                <div style={{
                    flex: 1, background: T.surf,
                    display: 'flex', flexDirection: 'column', minWidth: 0,
                    borderLeft: `1px solid ${T.b}`,
                }}>

                    {/* ── Toolbar ── */}
                    <div style={{
                        height: 52, flexShrink: 0,
                        background: T.surf,
                        borderBottom: `1px solid ${T.b}`,
                        padding: '0 14px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        gap: 10,
                    }}>
                        {/* Left: language dropdown */}
                        <div ref={langDropRef} style={{ position: 'relative' }}>
                            <motion.button
                                whileTap={{ scale: .96 }}
                                onClick={() => setLangDropOpen(!langDropOpen)}
                                style={{
                                    background: langDropOpen ? 'rgba(99,102,241,0.12)' : 'var(--bg-elevated)',
                                    border: `1px solid ${langDropOpen ? 'rgba(99,102,241,0.35)' : T.b}`,
                                    borderRadius: 9, padding: '0 14px', height: 34,
                                    display: 'flex', alignItems: 'center', gap: 9,
                                    fontSize: 12, fontWeight: 600, color: T.text,
                                    cursor: 'pointer', minWidth: 148,
                                    fontFamily: "'DM Sans',sans-serif",
                                    transition: 'all .15s',
                                }}
                            >
                                <span style={{ fontSize: 14 }}>{curLang?.icon}</span>
                                <span style={{ flex: 1, textAlign: 'left' }}>{curLang?.label}</span>
                                <ChevronDown size={13} color={T.sub} style={{
                                    transform: langDropOpen ? 'rotate(180deg)' : 'none',
                                    transition: 'transform .2s',
                                }} />
                            </motion.button>

                            <AnimatePresence>
                                {langDropOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 6, scale: .97 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 4, scale: .97 }}
                                        transition={{ duration: .13 }}
                                        style={{
                                            position: 'absolute', zIndex: 200, left: 0, top: 'calc(100% + 8px)',
                                            background: T.surf2, border: `1px solid ${T.b}`,
                                            borderRadius: 12, padding: 6,
                                            boxShadow: `0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.1)`,
                                            minWidth: 170,
                                        }}
                                    >
                                        {LANGUAGES.map(l => (
                                            <button key={l.value} onClick={() => handleLangChange(l.value)}
                                                style={{
                                                    width: '100%', height: 36, borderRadius: 8,
                                                    display: 'flex', alignItems: 'center', gap: 10,
                                                    padding: '0 12px', fontSize: 12, fontWeight: 500,
                                                    cursor: 'pointer', border: 'none',
                                                    fontFamily: "'DM Sans',sans-serif",
                                                    background: language === l.value ? `${l.bg}` : 'transparent',
                                                    color: language === l.value ? l.color : T.sub,
                                                    transition: 'all .1s',
                                                }}
                                                onMouseEnter={e => { if (language !== l.value) e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                                                onMouseLeave={e => { if (language !== l.value) e.currentTarget.style.background = 'transparent'; }}
                                            >
                                                <span style={{
                                                    fontFamily: "'IBM Plex Mono',monospace",
                                                    fontSize: 9, fontWeight: 700, color: l.color,
                                                    background: l.bg, padding: '2px 5px', borderRadius: 4
                                                }}>{l.short}</span>
                                                {l.label}
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Right: action buttons */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {/* Reset */}
                            <motion.button
                                whileHover={{ scale: 1.04 }} whileTap={{ scale: .94 }}
                                onClick={() => setCode(starterCode[language])}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 6, height: 34,
                                    padding: '0 12px', borderRadius: 8,
                                    background: 'transparent', border: `1px solid ${T.b}`,
                                    color: T.sub, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                    fontFamily: "'DM Sans',sans-serif", transition: 'all .15s',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.color = T.text; e.currentTarget.style.borderColor = 'var(--border-default)'; }}
                                onMouseLeave={e => { e.currentTarget.style.color = T.sub; e.currentTarget.style.borderColor = T.b; }}
                            >
                                <RotateCcw size={12} /> Reset
                            </motion.button>

                            <div style={{ width: 1, height: 22, background: T.b }} />

                            {/* Run */}
                            <motion.button
                                whileHover={{ scale: 1.04 }} whileTap={{ scale: .94 }}
                                onClick={handleRun}
                                disabled={isRunning}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 7, height: 34,
                                    padding: '0 16px', borderRadius: 8,
                                    background: 'rgba(0,230,118,0.09)', border: `1px solid rgba(0,230,118,0.22)`,
                                    color: T.grn, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                                    fontFamily: "'DM Sans',sans-serif", transition: 'all .15s',
                                    opacity: isRunning ? .75 : 1,
                                }}
                                onMouseEnter={e => { if (!isRunning) { e.currentTarget.style.background = 'rgba(0,230,118,0.16)'; e.currentTarget.style.boxShadow = `0 0 16px rgba(0,230,118,0.2)`; } }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,230,118,0.09)'; e.currentTarget.style.boxShadow = 'none'; }}
                            >
                                <Play size={13} /> Run
                                <M ch="Ctrl+'" sz={9} col="rgba(0,230,118,0.45)" />
                            </motion.button>

                            {/* Submit */}
                            <motion.button
                                whileHover={!isRunning ? { scale: 1.04 } : {}}
                                whileTap={!isRunning ? { scale: .94 } : {}}
                                onClick={handleSubmit}
                                disabled={isRunning}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 7, height: 34,
                                    padding: '0 18px', borderRadius: 8,
                                    background: `linear-gradient(135deg,${T.ind},#7c3aed)`,
                                    border: 'none',
                                    color: 'white', fontSize: 12, fontWeight: 700,
                                    cursor: isRunning ? 'not-allowed' : 'pointer',
                                    opacity: isRunning ? .8 : 1,
                                    fontFamily: "'DM Sans',sans-serif",
                                    boxShadow: `0 0 20px rgba(99,102,241,0.3)`,
                                    transition: 'all .15s',
                                }}
                                onMouseEnter={e => { if (!isRunning) e.currentTarget.style.boxShadow = `0 0 32px rgba(99,102,241,0.55)`; }}
                                onMouseLeave={e => { e.currentTarget.style.boxShadow = `0 0 20px rgba(99,102,241,0.3)`; }}
                            >
                                {isRunning ? (
                                    <><div className="gspin" style={{ width: 13, height: 13, borderWidth: 1.5 }} /> Yuborilmoqda</>
                                ) : (
                                    <><Send size={12} /> Submit <M ch="Ctrl+↵" sz={9} col="rgba(255,255,255,0.4)" /></>
                                )}
                            </motion.button>
                        </div>
                    </div>

                    {/* ── Monaco Editor ── */}
                    <div style={{ flex: 1, minHeight: 0 }}>
                        <Editor
                            height="100%"
                            language={language === 'cpp' ? 'cpp' : language}
                            value={code}
                            onChange={val => setCode(val || '')}
                            theme="judge-dark"
                            beforeMount={handleEditorBeforeMount}
                            options={{
                                fontSize: 14,
                                fontFamily: "'JetBrains Mono','Fira Code',monospace",
                                fontLigatures: true,
                                minimap: { enabled: true, renderCharacters: false, scale: 0.75 },
                                scrollBeyondLastLine: false,
                                lineNumbers: 'on',
                                glyphMargin: false,
                                folding: true,
                                lineDecorationsWidth: 6,
                                lineNumbersMinChars: 3,
                                renderLineHighlight: 'all',
                                cursorBlinking: 'smooth',
                                cursorSmoothCaretAnimation: 'on',
                                smoothScrolling: true,
                                padding: { top: 16, bottom: 16 },
                                bracketPairColorization: { enabled: true, independentColorPoolPerBracketType: true },
                                autoIndent: 'full',
                                formatOnPaste: true,
                                formatOnType: true,
                                autoClosingBrackets: 'always',
                                autoClosingQuotes: 'always',
                                suggestOnTriggerCharacters: true,
                                tabSize: 4,
                                wordWrap: 'on',
                                scrollbar: { vertical: 'visible', horizontal: 'visible', verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
                                overviewRulerLanes: 0,
                                renderWhitespace: 'selection',
                                multiCursorModifier: 'alt',
                            }}
                        />
                    </div>

                    {/* ══════════════════════════════════════
                        RESULT PANEL
                    ══════════════════════════════════════ */}
                    <div style={{ flexShrink: 0 }}>
                        {/* Result panel header */}
                        <div
                            onClick={() => setResultOpen(o => !o)}
                            style={{
                                height: 42, flexShrink: 0,
                                background: T.surf2,
                                borderTop: `1px solid ${T.b}`,
                                padding: '0 16px',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                cursor: 'pointer', userSelect: 'none',
                                transition: 'background .12s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,212,255,0.025)'}
                            onMouseLeave={e => e.currentTarget.style.background = T.surf2}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                                {isRunning ? (
                                    <div style={{
                                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                                        border: `1.5px solid ${rm.dot}44`, borderTopColor: rm.dot,
                                        animation: 'spin .65s linear infinite',
                                    }} />
                                ) : (
                                    <Dot color={rm.dot} size={7} pulse={false} />
                                )}
                                <span style={{
                                    fontFamily: "'IBM Plex Mono',monospace",
                                    fontSize: 12, fontWeight: 600, color: rm.labelColor,
                                    letterSpacing: '.03em',
                                }}>{rm.label}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <M ch="Ctrl+\\" sz={9} col={T.sub} />
                                {resultOpen
                                    ? <ChevronDown size={15} color={T.sub} />
                                    : <ChevronUp size={15} color={T.sub} />
                                }
                            </div>
                        </div>

                        {/* Result body */}
                        <AnimatePresence>
                            {resultOpen && (
                                <motion.div
                                    key="result-body"
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: resultHeight, opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: .25, ease: [.22, 1, .36, 1] }}
                                    style={{ overflow: 'hidden' }}
                                >
                                    <div style={{
                                        height: resultHeight,
                                        padding: '16px 18px',
                                        overflowY: 'auto',
                                        background: '#060614',
                                        borderTop: `1px solid ${T.b}`,
                                    }}>
                                        <ResultContent
                                            submitState={submitState}
                                            fakeProgress={fakeProgress}
                                            problem={p}
                                            onRetry={handleSubmit}
                                            onSubmitFull={handleSubmit}
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Status bar */}
                    <div style={{
                        height: 22, flexShrink: 0,
                        background: T.dim,
                        borderTop: `1px solid var(--bg-elevated)`,
                        padding: '0 16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                        <M ch="Ctrl+' → Run  ·  Ctrl+Enter → Submit  ·  Ctrl+\\ → Panel" sz={9} col="#1e1e40" />
                        <M ch={`judge-dark · UTF-8 · ${curLang?.label}`} sz={9} col="#1e1e40" />
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════
                AUTH MODAL
            ══════════════════════════════════════ */}
            <AnimatePresence>
                {showAuthModal && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 500,
                            background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(10px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                        onClick={() => setShowAuthModal(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: .92, y: 16 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: .92, y: 16 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            onClick={e => e.stopPropagation()}
                            style={{
                                background: T.surf2,
                                border: `1px solid ${T.b}`,
                                borderRadius: 18, padding: 32,
                                textAlign: 'center', maxWidth: 360, width: '90%',
                                boxShadow: `0 40px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(99,102,241,0.12)`,
                            }}
                        >
                            <div style={{
                                width: 52, height: 52, borderRadius: 14,
                                background: `${T.ind}12`, border: `1px solid ${T.ind}28`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 20px',
                                boxShadow: `0 0 24px ${T.ind}22`,
                            }}>
                                <Lock size={22} color='#818cf8' />
                            </div>
                            <h3 style={{
                                fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800,
                                color: T.text, marginBottom: 8
                            }}>
                                Kirish kerak
                            </h3>
                            <p style={{ fontSize: 13, color: T.sub, marginBottom: 24, lineHeight: 1.6 }}>
                                Kod yuborish uchun hisobingizga kiring yoki ro'yxatdan o'ting
                            </p>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                                <motion.button
                                    whileTap={{ scale: .96 }}
                                    onClick={() => setShowAuthModal(false)}
                                    style={{
                                        height: 36, padding: '0 18px', borderRadius: 9,
                                        border: `1px solid ${T.b}`, background: 'transparent',
                                        color: T.sub, fontSize: 12, fontWeight: 600,
                                        cursor: 'pointer', fontFamily: "'DM Sans',sans-serif",
                                    }}
                                >Bekor qilish</motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.04 }} whileTap={{ scale: .96 }}
                                    onClick={() => { setShowAuthModal(false); navigate('/login'); }}
                                    style={{
                                        height: 36, padding: '0 22px', borderRadius: 9,
                                        background: `linear-gradient(135deg,${T.ind},#7c3aed)`,
                                        border: 'none', color: 'white',
                                        fontSize: 12, fontWeight: 700, cursor: 'pointer',
                                        fontFamily: "'DM Sans',sans-serif",
                                        boxShadow: `0 0 20px ${T.ind}44`,
                                    }}
                                >Kirish →</motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Code viewer modal */}
            {codeModalId && (
                <SubmissionCodeModal submissionId={codeModalId} onClose={() => setCodeModalId(null)} />
            )}
        </>
    );
}
