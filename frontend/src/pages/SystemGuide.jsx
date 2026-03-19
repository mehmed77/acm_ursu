import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
    BookOpen, Terminal, AlertCircle, Trophy,
    ChevronRight, CheckCircle2, XCircle, Clock,
    Cpu, FileWarning, Code2, Play, Send,
    ArrowRight, Hash, Copy, Check, Zap, Shield
} from "lucide-react";

/* ═══════════════════════════════════════════════════
   DESIGN TOKENS — fully theme-aware
   ═══════════════════════════════════════════════════ */
const C = {
    bg: 'var(--bg-base)',
    surf: 'var(--bg-surface)',
    surf2: 'var(--bg-elevated)',
    border: 'var(--border-subtle)',
    borderD: 'var(--border-default)',
    text: 'var(--text-primary)',
    sub: 'var(--text-muted)',
    sub2: 'var(--text-secondary)',
    ind: "#6366f1",
    pur: "#8b5cf6",
    teal: "#14b8a6",
    grn: "#10b981",
    amb: "#f59e0b",
    red: "#ef4444",
    org: "#f97316",
    pink: "#ec4899",
};

/* ═══════════════════════════════════════════════════
   CSS
   ═══════════════════════════════════════════════════ */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=IBM+Plex+Mono:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap');

  @keyframes shimmer {
    0%   { background-position: -200% 0; }
    100% { background-position:  200% 0; }
  }
  @keyframes pulse-dot {
    0%,100% { opacity:1; transform:scale(1); }
    50%     { opacity:.5; transform:scale(1.4); }
  }
  @keyframes bar-fill {
    from { transform: scaleX(0); transform-origin: left; }
    to   { transform: scaleX(1); transform-origin: left; }
  }
  @keyframes spin { to { transform:rotate(360deg); } }
`;

/* ═══════════════════════════════════════════════════
   ATOMS
   ═══════════════════════════════════════════════════ */
function Dot({ color, size = 7 }) {
    return (
        <span style={{
            display: "inline-block", width: size, height: size,
            borderRadius: "50%", background: color, flexShrink: 0,
            boxShadow: `0 0 ${size * 1.5}px ${color}88`,
            animation: "pulse-dot 2.5s infinite",
        }} />
    );
}

function Badge({ label, color }) {
    return (
        <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "3px 10px", borderRadius: 100,
            border: `1px solid ${color}30`, background: `${color}0c`,
            fontSize: 9, fontWeight: 700, color, letterSpacing: "0.1em",
            textTransform: "uppercase", marginBottom: 10,
            fontFamily: "'IBM Plex Mono',monospace",
        }}>
            <Dot color={color} size={4} />{label}
        </div>
    );
}

function M({ ch, col = C.sub, sz = 11, w = 500 }) {
    return <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: sz, fontWeight: w, color: col, lineHeight: 1 }}>{ch}</span>;
}

/* Premium Section Card */
function Card({ children, style = {}, accent = null }) {
    return (
        <div style={{
            background: C.surf,
            border: `1px solid ${accent ? accent + "18" : C.border}`,
            borderRadius: 12,
            padding: 20,
            position: 'relative',
            overflow: 'hidden',
            boxShadow: 'var(--card-shadow)',
            ...style,
        }}>
            {/* Top accent line */}
            {accent && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                    background: `linear-gradient(90deg,transparent,${accent}50,transparent)`,
                }} />
            )}
            {children}
        </div>
    );
}

/* Code Block — theme-aware */
function CodeBlock({ lang, code, color = C.ind }) {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        navigator.clipboard?.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
    };

    return (
        <div style={{ borderRadius: 10, overflow: "hidden", marginBottom: 4 }}>
            {/* Header bar */}
            <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "6px 14px",
                background: `${color}0c`,
                borderBottom: `1px solid ${color}15`,
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {["#ef4444", "#f59e0b", "#10b981"].map(c => (
                        <div key={c} style={{ width: 7, height: 7, borderRadius: "50%", background: c, opacity: .6 }} />
                    ))}
                    <M ch={lang} col={color} sz={10} w={700} />
                </div>
                <button onClick={copy} style={{
                    display: "flex", alignItems: "center", gap: 4,
                    background: copied ? `${C.grn}12` : "transparent",
                    border: `1px solid ${copied ? C.grn + '30' : C.border}`,
                    borderRadius: 5, padding: "2px 8px",
                    fontSize: 9, fontWeight: 600,
                    color: copied ? C.grn : C.sub,
                    cursor: "pointer", transition: "all .2s",
                }}>
                    {copied ? <Check size={10} /> : <Copy size={10} />}
                    {copied ? "Nusxa olindi" : "Nusxa"}
                </button>
            </div>
            {/* Code body */}
            <pre style={{
                margin: 0, background: C.surf2,
                border: `1px solid ${C.border}`, borderTop: "none",
                padding: "14px 18px", overflowX: "auto",
                fontSize: 12, fontFamily: "'IBM Plex Mono','JetBrains Mono',monospace",
                color: C.text, lineHeight: 1.7,
            }}>
                {code}
            </pre>
        </div>
    );
}

/* Animated number */
function AnimNum({ to, suffix = "", duration = 900 }) {
    const [n, setN] = useState(0);
    const ref = useRef();
    const inView = useInView(ref, { once: true });
    useEffect(() => {
        if (!inView) return;
        const t0 = Date.now();
        const tick = () => {
            const p = Math.min((Date.now() - t0) / duration, 1);
            setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
            if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }, [inView, to, duration]);
    return <span ref={ref}>{n}{suffix}</span>;
}

/* ═══════════════════════════════════════════════════
   NAV CONFIG
   ═══════════════════════════════════════════════════ */
const NAVS = [
    { id: "intro", label: "Tizim qanday ishlaydi", icon: BookOpen, color: C.ind },
    { id: "langs", label: "Dasturlash tillari", icon: Terminal, color: C.teal },
    { id: "run", label: "Run vs Submit", icon: Play, color: C.grn },
    { id: "verdicts", label: "Tekshiruv javoblari", icon: AlertCircle, color: C.amb },
    { id: "rating", label: "Musobaqa va Reyting", icon: Trophy, color: C.org },
];

/* ═══════════════════════════════════════════════════
   ROOT COMPONENT
   ═══════════════════════════════════════════════════ */
export default function SystemGuide() {
    const [active, setActive] = useState("intro");

    return (
        <>
            <style>{CSS}</style>
            <div style={{
                position: 'relative', zIndex: 1,
                width: '100%',
                padding: '20px 5% 60px',
                fontFamily: "'DM Sans',sans-serif", color: C.text,
                minHeight: '100vh',
            }}>
                <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>

                    {/* ── SIDEBAR ───────────────────────── */}
                    <nav style={{ width: 240, flexShrink: 0, position: "sticky", top: 72 }}>
                        {/* Brand */}
                        <div style={{
                            display: "flex", alignItems: "center", gap: 10,
                            marginBottom: 20, padding: "0 4px",
                        }}>
                            <div style={{
                                width: 32, height: 32, borderRadius: 8,
                                background: `linear-gradient(135deg,${C.ind},${C.pur})`,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                boxShadow: `0 4px 12px ${C.ind}40`,
                            }}>
                                <Hash size={15} color="white" />
                            </div>
                            <div>
                                <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>Judge Tizimi</div>
                                <M ch="Qo'llanma · v2.0" sz={9} />
                            </div>
                        </div>

                        {/* Nav items */}
                        <div style={{
                            display: "flex", flexDirection: "column", gap: 2,
                            background: C.surf, border: `1px solid ${C.border}`,
                            borderRadius: 10, padding: 4, overflow: 'hidden',
                        }}>
                            {NAVS.map((n, i) => {
                                const on = active === n.id;
                                const Ic = n.icon;
                                return (
                                    <motion.button
                                        key={n.id}
                                        onClick={() => setActive(n.id)}
                                        initial={{ opacity: 0, x: -12 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * .05 }}
                                        whileHover={{ x: on ? 0 : 2 }}
                                        style={{
                                            display: "flex", alignItems: "center", gap: 8,
                                            padding: "8px 10px", borderRadius: 8,
                                            border: 'none',
                                            background: on ? `${n.color}0e` : "transparent",
                                            color: on ? n.color : C.sub,
                                            fontSize: 12, fontWeight: on ? 700 : 500,
                                            cursor: "pointer", textAlign: "left",
                                            transition: "all .15s",
                                        }}
                                    >
                                        <div style={{
                                            width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                                            background: on ? `${n.color}14` : C.surf2,
                                            border: `1px solid ${on ? n.color + "25" : C.border}`,
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                        }}>
                                            <Ic size={12} color={on ? n.color : C.sub} />
                                        </div>
                                        <span style={{ flex: 1, lineHeight: 1.3 }}>{n.label}</span>
                                        {on && <ChevronRight size={12} style={{ opacity: .6 }} />}
                                    </motion.button>
                                );
                            })}
                        </div>

                        {/* Tip card */}
                        <div style={{
                            marginTop: 14, padding: "10px 12px", borderRadius: 8,
                            background: `${C.ind}06`, border: `1px solid ${C.ind}12`,
                            fontSize: 10, color: C.sub, lineHeight: 1.65,
                        }}>
                            💡 Har bir bo'limni diqqat bilan o'qing —
                            bu musobaqadagi natijangizni yaxshilaydi.
                        </div>
                    </nav>

                    {/* ── CONTENT ───────────────────────── */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={active}
                                initial={{ opacity: 0, y: 12, filter: "blur(3px)" }}
                                animate={{ opacity: 1, y: 0, filter: "blur(0)" }}
                                exit={{ opacity: 0, y: -8, filter: "blur(3px)" }}
                                transition={{ duration: .18, ease: [.4, 0, .2, 1] }}
                            >
                                {active === "intro" && <SIntro />}
                                {active === "langs" && <SLangs />}
                                {active === "run" && <SRun />}
                                {active === "verdicts" && <SVerdicts />}
                                {active === "rating" && <SRating />}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </>
    );
}

/* ═══════════════════════════════════════════════════
   1. INTRO
   ═══════════════════════════════════════════════════ */
function SIntro() {
    const steps = [
        { ic: Code2, color: C.ind, t: "Kompilyatsiya", d: "Yuborgan kodingiz mos kompilyator orqali ishga tayyorlanadi. Sintaksis xato bo'lsa — CE olasiz." },
        { ic: Cpu, color: C.teal, t: "Testlash", d: "Dasturingiz yashirin testlardan ketma-ket o'tkaziladi. Har test: kirish → kutilgan chiqish juftligi." },
        { ic: Shield, color: C.pur, t: "Solishtirish", d: "Chiqish to'g'ri javob bilan simvolma-simvol solishtiriladi. Ortiqcha bo'sh joy ham xato!" },
        { ic: Zap, color: C.amb, t: "Cheklovlar", d: "Vaqt limiti (masalan 1.0s) va xotira limiti (256MB) dan oshib ketmaslik shart." },
    ];
    const stats = [
        { v: 200, s: "ms", l: "Tekshiruv tezligi", color: C.grn },
        { v: 8, s: "+", l: "Dasturlash tillari", color: C.teal },
        { v: 100, s: "%", l: "Xavfsiz Docker sandbox", color: C.ind },
    ];
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Hero */}
            <Card accent={C.ind} style={{ padding: "24px 28px" }}>
                <Badge label="Tizim haqida" color={C.ind} />
                <h1 style={{
                    fontFamily: "'Syne',sans-serif",
                    fontSize: 26, fontWeight: 800, margin: "0 0 10px",
                    letterSpacing: "-.02em", lineHeight: 1.15,
                }}>
                    Online Judge{" "}
                    <span style={{
                        background: `linear-gradient(90deg,${C.ind},${C.pur})`,
                        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                    }}>
                        qanday ishlaydi?
                    </span>
                </h1>
                <p style={{ fontSize: 13, lineHeight: 1.75, color: C.sub, margin: "0 0 18px", maxWidth: 520 }}>
                    Platforma dasturlash masalalarini{" "}
                    <strong style={{ color: C.text }}>avtomatik tekshiruvchi tizim (Online Judge)</strong>.
                    Siz yechim yozasiz — tizim yashirin testlardan o'tkazib natijani qaytaradi.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                    {stats.map(s => (
                        <div key={s.l} style={{
                            padding: "12px", borderRadius: 10, textAlign: "center",
                            background: `${s.color}08`, border: `1px solid ${s.color}18`,
                        }}>
                            <div style={{
                                fontFamily: "'IBM Plex Mono',monospace",
                                fontSize: 22, fontWeight: 800, color: s.color,
                            }}>
                                <AnimNum to={s.v} suffix={s.s} />
                            </div>
                            <div style={{ fontSize: 9, color: C.sub, marginTop: 2, fontWeight: 600 }}>{s.l}</div>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Steps */}
            <div style={{ display: "grid", gap: 6 }}>
                {steps.map((s, i) => {
                    const Ic = s.ic;
                    return (
                        <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * .06 }}>
                            <Card style={{ display: "flex", gap: 14, padding: "14px 18px", alignItems: "center" }}>
                                <div style={{
                                    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                                    background: `${s.color}10`, border: `1px solid ${s.color}22`,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    position: "relative",
                                }}>
                                    <Ic size={17} color={s.color} />
                                    <div style={{
                                        position: "absolute", top: -5, right: -5,
                                        width: 16, height: 16, borderRadius: "50%",
                                        background: s.color, display: "flex", alignItems: "center",
                                        justifyContent: "center", fontSize: 9, fontWeight: 800, color: "white",
                                    }}>{i + 1}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2, color: C.text }}>{s.t}</div>
                                    <div style={{ fontSize: 12, color: C.sub, lineHeight: 1.55 }}>{s.d}</div>
                                </div>
                            </Card>
                        </motion.div>
                    );
                })}
            </div>

            {/* Warning */}
            <div style={{
                padding: "12px 16px", borderRadius: 10,
                background: `${C.amb}08`, border: `1px solid ${C.amb}20`,
                display: "flex", gap: 10, alignItems: "flex-start",
            }}>
                <AlertCircle size={15} color={C.amb} style={{ marginTop: 1, flexShrink: 0 }} />
                <div style={{ fontSize: 12, lineHeight: 1.65, color: C.sub2 }}>
                    <strong style={{ color: C.amb }}>Muhim qoida!</strong> Dasturingiz faqat so'ralgan
                    natijani chiqarishi kerak.{" "}
                    <code style={{ background: `${C.amb}12`, padding: "1px 5px", borderRadius: 3, fontSize: 11, color: C.amb }}>
                        "Natija: "
                    </code>{" "}
                    yoki{" "}
                    <code style={{ background: `${C.amb}12`, padding: "1px 5px", borderRadius: 3, fontSize: 11, color: C.amb }}>
                        "N ni kiriting: "
                    </code>{" "}
                    kabi matnlar <strong style={{ color: C.red }}>Wrong Answer</strong> beriladi!
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   2. LANGUAGES
   ═══════════════════════════════════════════════════ */
function SLangs() {
    const [cur, setCur] = useState("python");
    const langs = {
        python: {
            label: "Python 3", color: "#3b82f6", icon: "🐍",
            tip: "sys.stdin ishlatish input() ga qaraganda 5-10x tezroq.",
            code: `import sys

# Barcha ma'lumotlarni bir yo'la o'qish (musobaqa uchun eng tezkor)
data = sys.stdin.read().split()
a = int(data[0])
b = int(data[1])

print(a + b)`,
        },
        cpp: {
            label: "C++ 17", color: C.ind, icon: "⚡",
            tip: "ios_base::sync_with_stdio(false) I/O ni 10x tezlashtiradi. Unutmang!",
            code: `#include <bits/stdc++.h>
using namespace std;

int main() {
    // Tezkor I/O — musobaqa uchun SHART
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    long long a, b;
    cin >> a >> b;
    cout << a + b << "\\n";   // endl emas, "\\n" ishlating

    return 0;
}`,
        },
        java: {
            label: "Java 17", color: C.org, icon: "☕",
            tip: "Asosiy class nomi doimo aynan 'Main' bo'lishi SHART — boshqacha bo'lsa CE!",
            code: `import java.util.Scanner;

// MUHIM: class nomi "Main" bo'lishi shart!
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        long a = sc.nextLong();
        long b = sc.nextLong();
        System.out.println(a + b);
        sc.close();
    }
}`,
        },
        js: {
            label: "JavaScript", color: "#eab308", icon: "🟨",
            tip: "/dev/stdin orqali o'qish Node.js da eng ishonchli va tezkor usul.",
            code: `const fs = require('fs');

function solve() {
    const tokens = fs.readFileSync('/dev/stdin', 'utf-8')
        .trim().split(/\\s+/);
    const a = parseInt(tokens[0]);
    const b = parseInt(tokens[1]);
    console.log(a + b);
}

solve();`,
        },
    };
    const L = langs[cur];
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Card accent={C.teal}>
                <Badge label="Dasturlash tillari" color={C.teal} />
                <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, margin: "0 0 8px" }}>Standart Kirish / Chiqish</h1>
                <p style={{ fontSize: 13, lineHeight: 1.75, color: C.sub, margin: 0 }}>
                    Barcha masalalarda ma'lumotlar{" "}
                    <code style={{ background: `${C.teal}14`, padding: "1px 5px", borderRadius: 3, color: C.teal, fontSize: 11 }}>stdin</code>
                    {" "}dan o'qiladi, natija{" "}
                    <code style={{ background: `${C.grn}14`, padding: "1px 5px", borderRadius: 3, color: C.grn, fontSize: 11 }}>stdout</code>
                    {" "}ga chiqariladi. Fayl bilan ishlash <strong style={{ color: C.red }}>talab qilinmaydi</strong>.
                </p>
            </Card>

            {/* Language tabs */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {Object.entries(langs).map(([k, v]) => (
                    <button key={k} onClick={() => setCur(k)} style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "6px 14px", borderRadius: 100,
                        border: `1px solid ${cur === k ? v.color + "40" : C.border}`,
                        background: cur === k ? `${v.color}10` : C.surf,
                        color: cur === k ? v.color : C.sub,
                        fontSize: 12, fontWeight: cur === k ? 700 : 500,
                        cursor: "pointer", transition: "all .15s",
                    }}>
                        <span>{v.icon}</span>{v.label}
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                <motion.div key={cur}
                    initial={{ opacity: 0, scale: .98 }} animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: .98 }} transition={{ duration: .15 }}
                >
                    <Card style={{ padding: 0, overflow: "hidden" }}>
                        <div style={{
                            padding: "8px 14px",
                            background: `${L.color}08`, borderBottom: `1px solid ${L.color}15`,
                            display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.sub,
                        }}>
                            <Dot color={L.color} size={5} />
                            {L.tip}
                        </div>
                        <div style={{ padding: 0 }}>
                            <CodeBlock lang={L.label} code={L.code} color={L.color} />
                        </div>
                    </Card>
                </motion.div>
            </AnimatePresence>

            <div style={{
                padding: "10px 14px", borderRadius: 8,
                background: `${C.ind}06`, border: `1px solid ${C.ind}14`,
                fontSize: 12, color: C.sub, lineHeight: 1.65,
            }}>
                <strong style={{ color: C.ind }}>💡 Maslahat:</strong>{" "}
                C++ da <code style={{ color: C.teal, background: `${C.teal}12`, padding: '1px 4px', borderRadius: 3, fontSize: 11 }}>long long</code> ishlatishni odatga aylantiring
                — katta sonlar (10¹⁸ gacha) uchun <code style={{ color: C.red, background: `${C.red}12`, padding: '1px 4px', borderRadius: 3, fontSize: 11 }}>int</code>{" "}
                overflow qiladi va noto'g'ri natija beradi.
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   3. RUN vs SUBMIT
   ═══════════════════════════════════════════════════ */
function SRun() {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Card accent={C.grn}>
                <Badge label="Muhim tushuncha" color={C.grn} />
                <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, margin: "0 0 8px" }}>
                    Run va Submit — Farqi nima?
                </h1>
                <p style={{ fontSize: 13, lineHeight: 1.75, color: C.sub, margin: 0 }}>
                    Platformada <strong style={{ color: C.text }}>ikkita tugma</strong> mavjud.
                    Ularni to'g'ri ishlatish musobaqada vaqtingizni tejaydi va jarima olishni kamaytiradi.
                </p>
            </Card>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {/* RUN */}
                <Card accent={C.grn}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                        <div style={{
                            width: 34, height: 34, borderRadius: 9,
                            background: `${C.grn}12`, border: `1px solid ${C.grn}22`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                            <Play size={15} color={C.grn} />
                        </div>
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: C.grn }}>▶ Run</div>
                            <M ch="Test rejimi" sz={9} />
                        </div>
                    </div>
                    {[
                        ["✅", "Faqat namuna (sample) testlar ishlatiladi"],
                        ["✅", "Natija darhol ko'rsatiladi"],
                        ["✅", "Xatolarni topish uchun ideal"],
                        ["❌", "Bazaga yozilmaydi"],
                        ["❌", "Reyting o'zgarmaydi"],
                        ["❌", "Submission sifatida hisoblanmaydi"],
                    ].map(([ico, txt], i) => (
                        <div key={i} style={{
                            display: "flex", gap: 6, alignItems: "center",
                            fontSize: 12, color: ico === "❌" ? C.sub : C.text,
                            marginBottom: 5,
                        }}>
                            <span style={{ flexShrink: 0, fontSize: 11 }}>{ico}</span>{txt}
                        </div>
                    ))}
                </Card>

                {/* SUBMIT */}
                <Card accent={C.ind}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                        <div style={{
                            width: 34, height: 34, borderRadius: 9,
                            background: `${C.ind}12`, border: `1px solid ${C.ind}22`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                            <Send size={15} color={C.ind} />
                        </div>
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: C.ind }}>➤ Submit</div>
                            <M ch="Rasmiy yuborish" sz={9} />
                        </div>
                    </div>
                    {[
                        ["✅", "Barcha yashirin testlardan o'tkaziladi"],
                        ["✅", "Natija bazaga yoziladi"],
                        ["✅", "Musobaqada reyting o'zgaradi"],
                        ["✅", "Submissions tarixida ko'rinadi"],
                        ["⚠️", "Noto'g'ri submit jarima ball oldirib qo'yishi mumkin"],
                    ].map(([ico, txt], i) => (
                        <div key={i} style={{
                            display: "flex", gap: 6, alignItems: "center",
                            fontSize: 12, color: ico === "⚠️" ? C.amb : C.text,
                            marginBottom: 5,
                        }}>
                            <span style={{ flexShrink: 0, fontSize: 11 }}>{ico}</span>{txt}
                        </div>
                    ))}
                </Card>
            </div>

            {/* Flow */}
            <Card>
                <M ch="SUBMIT JARAYONI" sz={8} w={700} />
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                    {[
                        ["Kod yuboriladi", C.ind],
                        ["Celery task", C.pur],
                        ["Docker sandbox", C.teal],
                        ["Fayl testlar", C.amb],
                        ["Barcha testlar", C.grn],
                        ["Natija bazaga", C.ind],
                    ].map(([lbl, col], i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{
                                padding: "4px 10px", borderRadius: 100,
                                background: `${col}0c`, border: `1px solid ${col}20`,
                                fontSize: 11, fontWeight: 600, color: col, whiteSpace: "nowrap",
                            }}>{lbl}</div>
                            {i < 5 && <ArrowRight size={11} color={C.sub} />}
                        </div>
                    ))}
                </div>
            </Card>

            <div style={{
                padding: "10px 14px", borderRadius: 8,
                background: `${C.grn}06`, border: `1px solid ${C.grn}14`,
                fontSize: 12, color: C.sub, lineHeight: 1.65,
            }}>
                <strong style={{ color: C.grn }}>🎯 Strategiya:</strong>{" "}
                Avval <strong style={{ color: C.text }}>Run</strong> bilan namuna testlarda
                to'g'riligini tekshiring, keyin{" "}
                <strong style={{ color: C.text }}>Submit</strong> qiling.
                Musobaqada har noto'g'ri submit ball kamaytirib qo'yadi.
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   4. VERDICTS
   ═══════════════════════════════════════════════════ */
function SVerdicts() {
    const vs = [
        { code: "AC", name: "Accepted", color: C.grn, ic: CheckCircle2, freq: "Maqsad!", desc: "Tabriklaymiz! Dasturingiz barcha yashirin testlardan o'tdi. Masala hal qilindi.", tip: null },
        { code: "WA", name: "Wrong Answer", color: C.red, ic: XCircle, freq: "Ko'p uchraydi", desc: "Qaysidir testda noto'g'ri natija chiqdi. Algoritm mantig'ini tekshiring.", tip: "Ortiqcha bo'sh joy yoki \\n ham xato hisoblanadi!" },
        { code: "TLE", name: "Time Limit Exceeded", color: C.amb, ic: Clock, freq: "Ko'p uchraydi", desc: "Belgilangan vaqtdan (masalan 1.0s) ko'proq vaqt oldi. Algoritmni optimallashtiring.", tip: "O(n²) ni O(n log n) ga o'zgartiring. C++ da endl o'rniga \\n ishlating." },
        { code: "MLE", name: "Memory Limit Exceeded", color: C.pur, ic: Cpu, freq: "Ba'zan", desc: "Dastur xotiradan juda ko'p foydalandi. Katta massivlarni tekshiring.", tip: "n=10⁶ bo'lsa int massiv ~4MB, long long ~8MB oladi." },
        { code: "CE", name: "Compilation Error", color: C.sub, ic: Code2, freq: "Boshlovchilar", desc: "Kodda sintaksis xato — kompilyatsiya amalga oshmadi. Xato matni ko'rsatiladi.", tip: "Java da class nomi 'Main' bo'lishi shart. Python da indentatsiyani tekshiring." },
        { code: "RE", name: "Runtime Error", color: C.pink, ic: FileWarning, freq: "Ba'zan", desc: "Dastur ishlash paytida kutilmagan xato bilan to'xtadi.", tip: "Nolga bo'lish, massiv chegarasidan chiqish — asosiy sabablar." },
    ];
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Card accent={C.amb}>
                <Badge label="Verdict kodlari" color={C.amb} />
                <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, margin: "0 0 8px" }}>Tekshiruv javoblari</h1>
                <p style={{ fontSize: 13, lineHeight: 1.75, color: C.sub, margin: 0 }}>
                    Har submission quyidagi holatlardan biriga tushadi.
                    Rang va kodlardan darhol tushunib olishingiz mumkin.
                </p>
            </Card>
            <div style={{ display: "grid", gap: 6 }}>
                {vs.map((v, i) => {
                    const Ic = v.ic;
                    return (
                        <motion.div key={v.code} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * .05 }}>
                            <div style={{
                                display: "flex", gap: 14, padding: "14px 16px",
                                background: C.surf,
                                border: `1px solid ${C.border}`, borderRadius: 10,
                                boxShadow: 'var(--card-shadow)',
                                borderLeft: `3px solid ${v.color}`,
                            }}>
                                <div style={{
                                    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                                    background: `${v.color}10`, border: `1px solid ${v.color}22`,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                }}>
                                    <Ic size={17} color={v.color} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                                        <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{v.name}</span>
                                        <code style={{
                                            background: `${v.color}14`, color: v.color,
                                            padding: "1px 7px", borderRadius: 5,
                                            fontSize: 10, fontWeight: 800, letterSpacing: "0.05em",
                                            border: 'none',
                                        }}>{v.code}</code>
                                        <span style={{ fontSize: 9, color: C.sub, marginLeft: "auto" }}>{v.freq}</span>
                                    </div>
                                    <p style={{ fontSize: 12, color: C.sub, margin: 0, lineHeight: 1.55 }}>{v.desc}</p>
                                    {v.tip && (
                                        <div style={{
                                            marginTop: 6, padding: "4px 8px", borderRadius: 6,
                                            background: `${v.color}08`, fontSize: 11, color: v.color,
                                        }}>💡 {v.tip}</div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   5. RATING
   ═══════════════════════════════════════════════════ */
function SRating() {
    const ranks = [
        { range: "0 – 799", name: "Newbie", color: 'var(--text-muted)' },
        { range: "800 – 1199", name: "Pupil", color: "#22c55e" },
        { range: "1200–1399", name: "Specialist", color: "#14b8a6" },
        { range: "1400–1599", name: "Expert", color: "#3b82f6" },
        { range: "1600–1899", name: "Candidate Master", color: "#a855f7" },
        { range: "1900–2099", name: "Master", color: "#f97316" },
        { range: "2100–2299", name: "International Master", color: "#f97316" },
        { range: "2300–2399", name: "Grandmaster", color: "#ef4444" },
        { range: "2400–2599", name: "International Grandmaster", color: "#ef4444" },
        { range: "2600+", name: "Legendary Grandmaster", color: "#ef4444" },
    ];

    const howItems = [
        { e: "🎯", t: "Kutilgan o'rin (Expected Rank)", d: "Reytingingiz barcha ishtirokchilar bilan solishtiriladi. Tizim sizdan qaysi o'rinni kutishini hisoblaydi." },
        { e: "📊", t: "Haqiqiy o'rin (Actual Rank)", d: "Musobaqa tugagach siz egallagan o'rin. Kutilgandan yuqori → katta plus. Past → minus." },
        { e: "⚖️", t: "Delta hisoblash (±)", d: "Kutilgan va haqiqiy o'rin farqi asosida delta hisoblanadi. Kuchli raqiblarni yengish katta plus beradi." },
        { e: "🔒", t: "Muhim qoidalar", d: "1-o'rin ham minus olishi mumkin (agar bu kutilgan natija bo'lsa). Reyting 1 dan past tushmaydi. Virtual ishtiroklar ta'sir qilmaydi." },
    ];

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Card accent={C.org}>
                <Badge label="Reyting tizimi" color={C.org} />
                <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, margin: "0 0 8px" }}>Musobaqa va Reyting</h1>
                <p style={{ fontSize: 13, lineHeight: 1.75, color: C.sub, margin: 0 }}>
                    Platforma{" "}
                    <strong style={{ color: C.text }}>Codeforces Elo algoritmiga</strong>{" "}
                    asoslangan. Musobaqa tugagandan so'ng reyting avtomatik hisoblanadi (Celery orqali).
                </p>
            </Card>

            {/* Rank table */}
            <Card>
                <M ch="10 TA DARAJA MAVJUD" sz={8} w={700} />
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 10 }}>
                    {ranks.map((r, i) => (
                        <motion.div key={r.name}
                            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * .03 }}
                            style={{
                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                padding: "8px 12px", borderRadius: 8,
                                background: `${r.color}06`, border: `1px solid ${r.color}14`,
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <Dot color={r.color} size={6} />
                                <span style={{ fontSize: 12, fontWeight: 700, color: r.color }}>{r.name}</span>
                            </div>
                            <code style={{
                                fontSize: 10, color: C.sub,
                                fontFamily: "'IBM Plex Mono',monospace",
                                background: C.surf2, padding: "2px 8px",
                                borderRadius: 5, border: `1px solid ${C.border}`,
                            }}>{r.range}</code>
                        </motion.div>
                    ))}
                </div>
            </Card>

            {/* How it works */}
            <Card>
                <M ch="REYTING QANDAY HISOBLANADI?" sz={8} w={700} />
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                    {howItems.map((h, i) => (
                        <div key={i} style={{
                            display: "flex", gap: 10, padding: "10px 12px",
                            borderRadius: 8, background: C.surf2,
                            border: `1px solid ${C.border}`,
                        }}>
                            <span style={{ fontSize: 18, flexShrink: 0 }}>{h.e}</span>
                            <div>
                                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2, color: C.text }}>{h.t}</div>
                                <div style={{ fontSize: 11, color: C.sub, lineHeight: 1.55 }}>{h.d}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Formula */}
            <div style={{
                padding: "10px 14px", borderRadius: 8,
                background: `${C.ind}06`, border: `1px solid ${C.ind}14`,
                fontSize: 12, color: C.sub, lineHeight: 1.75,
            }}>
                <strong style={{ color: C.ind }}>📐 Formula:</strong>{" "}
                <code style={{
                    background: `${C.ind}12`, color: C.ind,
                    padding: "2px 8px", borderRadius: 4,
                    fontFamily: "'IBM Plex Mono',monospace", fontSize: 11,
                    border: 'none',
                }}>
                    P(A {">"} B) = 1 / (1 + 6^((R_B − R_A) / 400))
                </code>
                {" "}— Codeforces ning haqiqiy implementatsiyasi.
            </div>
        </div>
    );
}
