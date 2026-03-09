import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
    BookOpen, Terminal, AlertCircle, Trophy,
    ChevronRight, CheckCircle2, XCircle, Clock,
    Cpu, FileWarning, Code2, Play, Send,
    ArrowRight, Hash, Copy, Check, Zap, Shield, Star
} from "lucide-react";

// ── TOKENS ───────────────────────────────────────────────
const C = {
    bg: "#06060f",
    surf: "#0c0c1a",
    surf2: "#101022",
    border: "rgba(255,255,255,0.06)",
    borderA: "rgba(99,102,241,0.3)",
    text: "#eaeaf8",
    sub: "#8888aa",
    dim: "#333355",
    ind: "#6366f1",
    pur: "#8b5cf6",
    teal: "#14b8a6",
    grn: "#10b981",
    amb: "#f59e0b",
    red: "#ef4444",
    org: "#f97316",
    pink: "#ec4899",
};

// ── GLOW DOT ─────────────────────────────────────────────
function Dot({ color, size = 7 }) {
    return (
        <span style={{
            display: "inline-block", width: size, height: size,
            borderRadius: "50%", background: color, flexShrink: 0,
            boxShadow: `0 0 ${size * 2}px ${color}99`,
        }} />
    );
}

// ── BADGE ────────────────────────────────────────────────
function Badge({ label, color }) {
    return (
        <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "4px 12px", borderRadius: 100,
            border: `1px solid ${color}35`, background: `${color}10`,
            fontSize: 11, fontWeight: 700, color, letterSpacing: "0.08em",
            textTransform: "uppercase", marginBottom: 14,
        }}>
            <Dot color={color} size={5} />{label}
        </div>
    );
}

// ── CARD ─────────────────────────────────────────────────
function Card({ children, style = {}, accent = null }) {
    return (
        <div style={{
            background: C.surf,
            border: `1px solid ${accent ? accent + "25" : C.border}`,
            borderRadius: 16,
            padding: 24,
            boxShadow: accent
                ? `0 0 40px ${accent}08, 0 16px 40px rgba(0,0,0,.25)`
                : "0 8px 32px rgba(0,0,0,.2)",
            ...style,
        }}>
            {children}
        </div>
    );
}

// ── CODE BLOCK ───────────────────────────────────────────
function CodeBlock({ lang, code, color = C.ind }) {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        navigator.clipboard?.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
    };

    // Simple syntax highlight via regex
    const highlighted = code
        .replace(/(&lt;|<)/g, "&lt;")
        .replace(/(&gt;|>)/g, "&gt;");

    return (
        <div style={{ borderRadius: 12, overflow: "hidden", marginBottom: 4 }}>
            {/* bar */}
            <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "7px 14px",
                background: `${color}14`,
                borderTop: `1px solid ${color}28`,
                borderLeft: `1px solid ${color}28`,
                borderRight: `1px solid ${color}28`,
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {["#ef4444", "#f59e0b", "#10b981"].map(c => (
                        <div key={c} style={{ width: 9, height: 9, borderRadius: "50%", background: c, opacity: .7 }} />
                    ))}
                    <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color, letterSpacing: "0.06em" }}>
                        {lang}
                    </span>
                </div>
                <button onClick={copy} style={{
                    display: "flex", alignItems: "center", gap: 5,
                    background: copied ? `${C.grn}18` : "transparent",
                    border: `1px solid ${copied ? C.grn : C.border}`,
                    borderRadius: 6, padding: "3px 10px",
                    fontSize: 10, fontWeight: 600,
                    color: copied ? C.grn : C.sub,
                    cursor: "pointer", transition: "all .2s",
                }}>
                    {copied ? <Check size={11} /> : <Copy size={11} />}
                    {copied ? "Nusxa olindi" : "Nusxa"}
                </button>
            </div>
            {/* body */}
            <pre style={{
                margin: 0, background: "#08081a",
                border: `1px solid ${color}18`, borderTop: "none",
                padding: "18px 22px", overflowX: "auto",
                fontSize: 13, fontFamily: "'JetBrains Mono','Fira Code',monospace",
                color: "#c8c8e0", lineHeight: 1.75,
            }}>
                {code}
            </pre>
        </div>
    );
}

// ── ANIMATED NUMBER ──────────────────────────────────────
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

// ── NAV CONFIG ───────────────────────────────────────────
const NAVS = [
    { id: "intro", label: "Tizim qanday ishlaydi", icon: BookOpen, color: C.ind },
    { id: "langs", label: "Dasturlash tillari", icon: Terminal, color: C.teal },
    { id: "run", label: "Run vs Submit", icon: Play, color: C.grn },
    { id: "verdicts", label: "Tekshiruv javoblari", icon: AlertCircle, color: C.amb },
    { id: "rating", label: "Musobaqa va Reyting", icon: Trophy, color: C.org },
];

// ═════════════════════════════════════════════════════════
// ROOT
// ═════════════════════════════════════════════════════════
export default function SystemGuide() {
    const [active, setActive] = useState("intro");

    return (
        <div style={{
            minHeight: "100vh", background: C.bg,
            fontFamily: "'DM Sans','Inter',sans-serif", color: C.text,
        }}>
            {/* grid bg */}
            <div style={{
                position: "fixed", inset: 0, opacity: .025,
                backgroundImage: `linear-gradient(${C.border} 1px,transparent 1px),linear-gradient(90deg,${C.border} 1px,transparent 1px)`,
                backgroundSize: "48px 48px", pointerEvents: "none", zIndex: 0,
            }} />
            {/* glow */}
            <div style={{
                position: "fixed", top: "-15%", left: "35%",
                width: 700, height: 700, borderRadius: "50%",
                background: `radial-gradient(circle,${C.ind}0d,transparent 65%)`,
                pointerEvents: "none", zIndex: 0,
            }} />

            <div style={{
                position: "relative", zIndex: 1,
                maxWidth: 1160, margin: "0 auto",
                padding: "52px 24px",
                display: "flex", gap: 32, alignItems: "flex-start",
            }}>

                {/* ── SIDEBAR ──────────────────────────────── */}
                <nav style={{ width: 256, flexShrink: 0, position: "sticky", top: 80 }}>
                    {/* brand */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28, padding: "0 4px" }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: 10,
                            background: `linear-gradient(135deg,${C.ind},${C.pur})`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                            <Hash size={17} color="white" />
                        </div>
                        <div>
                            <div style={{ fontSize: 13, fontWeight: 700 }}>Judge Tizimi</div>
                            <div style={{ fontSize: 11, color: C.sub }}>Qo'llanma · v2.0</div>
                        </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        {NAVS.map((n, i) => {
                            const on = active === n.id;
                            const Ic = n.icon;
                            return (
                                <motion.button
                                    key={n.id}
                                    onClick={() => setActive(n.id)}
                                    initial={{ opacity: 0, x: -18 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * .07 }}
                                    whileHover={{ x: on ? 0 : 3 }}
                                    style={{
                                        display: "flex", alignItems: "center", gap: 9,
                                        padding: "9px 13px", borderRadius: 10,
                                        border: on ? `1px solid ${n.color}28` : "1px solid transparent",
                                        background: on ? `${n.color}0f` : "transparent",
                                        color: on ? n.color : C.sub,
                                        fontSize: 13, fontWeight: on ? 600 : 400,
                                        cursor: "pointer", textAlign: "left", transition: "all .15s",
                                    }}
                                >
                                    <div style={{
                                        width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                                        background: on ? `${n.color}18` : C.surf,
                                        border: `1px solid ${on ? n.color + "28" : C.border}`,
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                    }}>
                                        <Ic size={13} color={on ? n.color : C.sub} />
                                    </div>
                                    <span style={{ flex: 1, lineHeight: 1.3 }}>{n.label}</span>
                                    {on && <ChevronRight size={13} />}
                                </motion.button>
                            );
                        })}
                    </div>

                    <div style={{
                        marginTop: 24, padding: "13px 14px", borderRadius: 10,
                        background: `${C.ind}08`, border: `1px solid ${C.ind}14`,
                        fontSize: 11, color: C.sub, lineHeight: 1.65,
                    }}>
                        💡 Har bir bo'limni diqqat bilan o'qing —
                        bu musobaqadagi natijangizni yaxshilaydi.
                    </div>
                </nav>

                {/* ── CONTENT ──────────────────────────────── */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={active}
                            initial={{ opacity: 0, y: 14, filter: "blur(4px)" }}
                            animate={{ opacity: 1, y: 0, filter: "blur(0)" }}
                            exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                            transition={{ duration: .2, ease: [.4, 0, .2, 1] }}
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
    );
}

// ═════════════════════════════════════════════════════════
// 1. INTRO
// ═════════════════════════════════════════════════════════
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
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* hero */}
            <Card accent={C.ind} style={{ padding: "38px 40px" }}>
                <Badge label="Tizim haqida" color={C.ind} />
                <h1 style={{ fontSize: 34, fontWeight: 800, margin: "0 0 14px", letterSpacing: "-.025em", lineHeight: 1.15 }}>
                    Online Judge{" "}
                    <span style={{ background: `linear-gradient(90deg,${C.ind},${C.pur})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                        qanday ishlaydi?
                    </span>
                </h1>
                <p style={{ fontSize: 15, lineHeight: 1.8, color: C.sub, margin: "0 0 28px", maxWidth: 540 }}>
                    Platforma dasturlash masalalarini{" "}
                    <strong style={{ color: C.text }}>avtomatik tekshiruvchi tizim (Online Judge)</strong>.
                    Siz yechim yozasiz — tizim yashirin testlardan o'tkazib natijani qaytaradi.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                    {stats.map(s => (
                        <div key={s.l} style={{
                            padding: "14px", borderRadius: 12, textAlign: "center",
                            background: `${s.color}09`, border: `1px solid ${s.color}20`,
                        }}>
                            <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>
                                <AnimNum to={s.v} suffix={s.s} />
                            </div>
                            <div style={{ fontSize: 11, color: C.sub, marginTop: 3 }}>{s.l}</div>
                        </div>
                    ))}
                </div>
            </Card>

            {/* steps */}
            <div style={{ display: "grid", gap: 10 }}>
                {steps.map((s, i) => {
                    const Ic = s.ic;
                    return (
                        <motion.div key={i} initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * .07 }}>
                            <Card style={{ display: "flex", gap: 18, padding: "18px 22px", alignItems: "center" }}>
                                <div style={{
                                    width: 46, height: 46, borderRadius: 13, flexShrink: 0,
                                    background: `${s.color}15`, border: `1px solid ${s.color}28`,
                                    display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
                                }}>
                                    <Ic size={20} color={s.color} />
                                    <div style={{
                                        position: "absolute", top: -6, right: -6,
                                        width: 18, height: 18, borderRadius: "50%",
                                        background: s.color, display: "flex", alignItems: "center",
                                        justifyContent: "center", fontSize: 10, fontWeight: 800, color: "white",
                                    }}>{i + 1}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 3 }}>{s.t}</div>
                                    <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.6 }}>{s.d}</div>
                                </div>
                            </Card>
                        </motion.div>
                    );
                })}
            </div>

            {/* warning */}
            <div style={{
                padding: "14px 18px", borderRadius: 12,
                background: `${C.amb}08`, border: `1px solid ${C.amb}25`,
                display: "flex", gap: 12, alignItems: "flex-start",
            }}>
                <AlertCircle size={17} color={C.amb} style={{ marginTop: 1, flexShrink: 0 }} />
                <div style={{ fontSize: 13, lineHeight: 1.7, color: "#a0700a" }}>
                    <strong style={{ color: C.amb }}>Muhim qoida!</strong> Dasturingiz faqat so'ralgan
                    natijani chiqarishi kerak.{" "}
                    <code style={{ background: `${C.amb}15`, padding: "1px 6px", borderRadius: 4, fontSize: 12 }}>
                        "Natija: "
                    </code>{" "}
                    yoki{" "}
                    <code style={{ background: `${C.amb}15`, padding: "1px 6px", borderRadius: 4, fontSize: 12 }}>
                        "N ni kiriting: "
                    </code>{" "}
                    kabi matnlar <strong style={{ color: C.red }}>Wrong Answer</strong> beriladi!
                </div>
            </div>
        </div>
    );
}

// ═════════════════════════════════════════════════════════
// 2. LANGUAGES
// ═════════════════════════════════════════════════════════
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
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <Card accent={C.teal}>
                <Badge label="Dasturlash tillari" color={C.teal} />
                <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 10px" }}>Standart Kirish / Chiqish</h1>
                <p style={{ fontSize: 14, lineHeight: 1.8, color: C.sub, margin: 0 }}>
                    Barcha masalalarda ma'lumotlar{" "}
                    <code style={{ background: `${C.teal}18`, padding: "1px 6px", borderRadius: 4, color: C.teal }}>stdin</code>
                    {" "}dan o'qiladi, natija{" "}
                    <code style={{ background: `${C.grn}18`, padding: "1px 6px", borderRadius: 4, color: C.grn }}>stdout</code>
                    {" "}ga chiqariladi. Fayl bilan ishlash <strong style={{ color: C.red }}>talab qilinmaydi</strong>.
                </p>
            </Card>

            {/* lang tabs */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {Object.entries(langs).map(([k, v]) => (
                    <button key={k} onClick={() => setCur(k)} style={{
                        display: "flex", alignItems: "center", gap: 7,
                        padding: "7px 16px", borderRadius: 100,
                        border: `1px solid ${cur === k ? v.color + "45" : C.border}`,
                        background: cur === k ? `${v.color}14` : C.surf,
                        color: cur === k ? v.color : C.sub,
                        fontSize: 13, fontWeight: cur === k ? 700 : 500,
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
                            padding: "10px 18px",
                            background: `${L.color}10`, borderBottom: `1px solid ${L.color}20`,
                            display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: C.sub,
                        }}>
                            <Dot color={L.color} size={7} />
                            {L.tip}
                        </div>
                        <div style={{ padding: 0 }}>
                            <CodeBlock lang={L.label} code={L.code} color={L.color} />
                        </div>
                    </Card>
                </motion.div>
            </AnimatePresence>

            <div style={{
                padding: "12px 16px", borderRadius: 10,
                background: `${C.ind}08`, border: `1px solid ${C.ind}18`,
                fontSize: 13, color: C.sub, lineHeight: 1.7,
            }}>
                <strong style={{ color: C.ind }}>💡 Maslahat:</strong>{" "}
                C++ da <code style={{ color: C.teal }}>long long</code> ishlatishni odatga aylantiring
                — katta sonlar (10¹⁸ gacha) uchun <code style={{ color: C.red }}>int</code>{" "}
                overflow qiladi va noto'g'ri natija beradi.
            </div>
        </div>
    );
}

// ═════════════════════════════════════════════════════════
// 3. RUN vs SUBMIT  (YANGI BO'LIM)
// ═════════════════════════════════════════════════════════
function SRun() {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <Card accent={C.grn}>
                <Badge label="Muhim tushuncha" color={C.grn} />
                <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 10px" }}>
                    Run va Submit — Farqi nima?
                </h1>
                <p style={{ fontSize: 14, lineHeight: 1.8, color: C.sub, margin: 0 }}>
                    Platformada <strong style={{ color: C.text }}>ikkita tugma</strong> mavjud.
                    Ularni to'g'ri ishlatish musobaqada vaqtingizni tejaydi va jarima olishni kamaytiradi.
                </p>
            </Card>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {/* RUN */}
                <Card style={{ borderColor: `${C.grn}28` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                        <div style={{
                            width: 40, height: 40, borderRadius: 12,
                            background: `${C.grn}15`, border: `1px solid ${C.grn}28`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                            <Play size={18} color={C.grn} />
                        </div>
                        <div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: C.grn }}>▶ Run</div>
                            <div style={{ fontSize: 11, color: C.sub }}>Test rejimi</div>
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
                            display: "flex", gap: 8, alignItems: "center",
                            fontSize: 13, color: ico === "❌" ? C.sub : C.text,
                            marginBottom: 7,
                        }}>
                            <span style={{ flexShrink: 0 }}>{ico}</span>{txt}
                        </div>
                    ))}
                </Card>

                {/* SUBMIT */}
                <Card style={{ borderColor: `${C.ind}28` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                        <div style={{
                            width: 40, height: 40, borderRadius: 12,
                            background: `${C.ind}15`, border: `1px solid ${C.ind}28`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                            <Send size={18} color={C.ind} />
                        </div>
                        <div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: C.ind }}>➤ Submit</div>
                            <div style={{ fontSize: 11, color: C.sub }}>Rasmiy yuborish</div>
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
                            display: "flex", gap: 8, alignItems: "center",
                            fontSize: 13, color: ico === "⚠️" ? C.amb : C.text,
                            marginBottom: 7,
                        }}>
                            <span style={{ flexShrink: 0 }}>{ico}</span>{txt}
                        </div>
                    ))}
                </Card>
            </div>

            {/* flow */}
            <Card>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.sub, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>
                    Submit jarayoni
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {[
                        ["Kod yuboriladi", C.ind],
                        ["Celery task", C.pur],
                        ["Docker sandbox", C.teal],
                        ["Fayl testlar", C.amb],
                        ["Barcha testlar", C.grn],
                        ["Natija bazaga", C.ind],
                    ].map(([lbl, col], i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{
                                padding: "5px 12px", borderRadius: 100,
                                background: `${col}12`, border: `1px solid ${col}25`,
                                fontSize: 12, fontWeight: 600, color: col, whiteSpace: "nowrap",
                            }}>{lbl}</div>
                            {i < 5 && <ArrowRight size={13} color={C.dim} />}
                        </div>
                    ))}
                </div>
            </Card>

            <div style={{
                padding: "13px 16px", borderRadius: 10,
                background: `${C.grn}08`, border: `1px solid ${C.grn}18`,
                fontSize: 13, color: C.sub, lineHeight: 1.7,
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

// ═════════════════════════════════════════════════════════
// 4. VERDICTS
// ═════════════════════════════════════════════════════════
function SVerdicts() {
    const vs = [
        {
            code: "AC", name: "Accepted", color: C.grn, ic: CheckCircle2, freq: "Maqsad!",
            desc: "Tabriklaymiz! Dasturingiz barcha yashirin testlardan o'tdi. Masala hal qilindi.",
            tip: null
        },
        {
            code: "WA", name: "Wrong Answer", color: C.red, ic: XCircle, freq: "Ko'p uchraydi",
            desc: "Qaysidir testda noto'g'ri natija chiqdi. Algoritm mantig'ini tekshiring.",
            tip: "Ortiqcha bo'sh joy yoki \\n ham xato hisoblanadi!"
        },
        {
            code: "TLE", name: "Time Limit Exceeded", color: C.amb, ic: Clock, freq: "Ko'p uchraydi",
            desc: "Belgilangan vaqtdan (masalan 1.0s) ko'proq vaqt oldi. Algoritmni optimallashtiring.",
            tip: "O(n²) ni O(n log n) ga o'zgartiring. C++ da endl o'rniga \\n ishlating."
        },
        {
            code: "MLE", name: "Memory Limit Exceeded", color: C.pur, ic: Cpu, freq: "Ba'zan",
            desc: "Dastur xotiradan juda ko'p foydalandi. Katta massivlarni tekshiring.",
            tip: "n=10⁶ bo'lsa int massiv ~4MB, long long ~8MB oladi."
        },
        {
            code: "CE", name: "Compilation Error", color: C.sub, ic: Code2, freq: "Boshlovchilar",
            desc: "Kodda sintaksis xato — kompilyatsiya amalga oshmadi. Xato matni ko'rsatiladi.",
            tip: "Java da class nomi 'Main' bo'lishi shart. Python da indentatsiyani tekshiring."
        },
        {
            code: "RE", name: "Runtime Error", color: C.pink, ic: FileWarning, freq: "Ba'zan",
            desc: "Dastur ishlash paytida kutilmagan xato bilan to'xtadi.",
            tip: "Nolga bo'lish, massiv chegarasidan chiqish — asosiy sabablar."
        },
    ];
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <Card accent={C.amb}>
                <Badge label="Verdict kodlari" color={C.amb} />
                <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 10px" }}>Tekshiruv javoblari</h1>
                <p style={{ fontSize: 14, lineHeight: 1.8, color: C.sub, margin: 0 }}>
                    Har submission quyidagi holatlardan biriga tushadi.
                    Rang va kodlardan darhol tushunib olishingiz mumkin.
                </p>
            </Card>
            <div style={{ display: "grid", gap: 10 }}>
                {vs.map((v, i) => {
                    const Ic = v.ic;
                    return (
                        <motion.div key={v.code} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * .06 }}>
                            <div style={{
                                display: "flex", gap: 18, padding: "18px 20px",
                                background: `linear-gradient(100deg,${v.color}07,transparent)`,
                                border: `1px solid ${v.color}22`, borderRadius: 14,
                            }}>
                                <div style={{
                                    width: 46, height: 46, borderRadius: 13, flexShrink: 0,
                                    background: `${v.color}15`, border: `1px solid ${v.color}28`,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                }}>
                                    <Ic size={21} color={v.color} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 5, flexWrap: "wrap" }}>
                                        <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>{v.name}</h3>
                                        <code style={{
                                            background: `${v.color}20`, color: v.color,
                                            padding: "2px 8px", borderRadius: 6,
                                            fontSize: 11, fontWeight: 800, letterSpacing: "0.05em",
                                        }}>{v.code}</code>
                                        <span style={{ fontSize: 11, color: C.sub, marginLeft: "auto" }}>{v.freq}</span>
                                    </div>
                                    <p style={{ fontSize: 13, color: C.sub, margin: 0, lineHeight: 1.6 }}>{v.desc}</p>
                                    {v.tip && (
                                        <div style={{
                                            marginTop: 7, padding: "5px 10px", borderRadius: 7,
                                            background: `${v.color}09`, fontSize: 12, color: v.color,
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

// ═════════════════════════════════════════════════════════
// 5. RATING  — rating_engine.py bilan 100% mos
// ═════════════════════════════════════════════════════════
function SRating() {
    // AYNAN rating_engine.py RANK_LEVELS bilan bir xil
    const ranks = [
        { range: "0 – 799", name: "Newbie", color: "#9ca3af" },
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
        {
            e: "🎯", t: "Kutilgan o'rin (Expected Rank)",
            d: "Reytingingiz barcha ishtirokchilar bilan solishtiriladi. Tizim sizdan qaysi o'rinni kutishini hisoblaydi."
        },
        {
            e: "📊", t: "Haqiqiy o'rin (Actual Rank)",
            d: "Musobaqa tugagach siz egallagan o'rin. Kutilgandan yuqori → katta plus. Past → minus."
        },
        {
            e: "⚖️", t: "Delta hisoblash (±)",
            d: "Kutilgan va haqiqiy o'rin farqi asosida delta hisoblanadi. Kuchli raqiblarni yengish katta plus beradi."
        },
        {
            e: "🔒", t: "Muhim qoidalar",
            d: "1-o'rin ham minus olishi mumkin (agar bu kutilgan natija bo'lsa). Reyting 1 dan past tushmaydi. Virtual ishtiroklar ta'sir qilmaydi."
        },
    ];

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <Card accent={C.org}>
                <Badge label="Reyting tizimi" color={C.org} />
                <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 10px" }}>Musobaqa va Reyting</h1>
                <p style={{ fontSize: 14, lineHeight: 1.8, color: C.sub, margin: 0 }}>
                    Platforma{" "}
                    <strong style={{ color: C.text }}>Codeforces Elo algoritmiga</strong>{" "}
                    asoslangan. Musobaqa tugagandan so'ng reyting avtomatik hisoblanadi (Celery orqali).
                </p>
            </Card>

            {/* rank table */}
            <Card>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.sub, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>
                    10 ta daraja mavjud
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {ranks.map((r, i) => (
                        <motion.div key={r.name}
                            initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * .04 }}
                            style={{
                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                padding: "9px 13px", borderRadius: 9,
                                background: `${r.color}08`, border: `1px solid ${r.color}1a`,
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                                <Dot color={r.color} size={8} />
                                <span style={{ fontSize: 13, fontWeight: 700, color: r.color }}>{r.name}</span>
                            </div>
                            <code style={{
                                fontSize: 12, color: C.sub, fontFamily: "monospace",
                                background: C.surf, padding: "2px 10px",
                                borderRadius: 6, border: `1px solid ${C.border}`,
                            }}>{r.range}</code>
                        </motion.div>
                    ))}
                </div>
            </Card>

            {/* how it works */}
            <Card>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.sub, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>
                    Reyting qanday hisoblanadi?
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {howItems.map((h, i) => (
                        <div key={i} style={{
                            display: "flex", gap: 13, padding: "13px 14px",
                            borderRadius: 10, background: "rgba(255,255,255,0.02)",
                            border: `1px solid ${C.border}`,
                        }}>
                            <span style={{ fontSize: 20, flexShrink: 0 }}>{h.e}</span>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>{h.t}</div>
                                <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.6 }}>{h.d}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            {/* formula */}
            <div style={{
                padding: "14px 18px", borderRadius: 10,
                background: `${C.ind}07`, border: `1px solid ${C.ind}1e`,
                fontSize: 13, color: C.sub, lineHeight: 1.8,
            }}>
                <strong style={{ color: C.ind }}>📐 Formula:</strong>{" "}
                <code style={{
                    background: `${C.ind}18`, color: "#a5b4fc",
                    padding: "2px 9px", borderRadius: 4, fontFamily: "monospace", fontSize: 12,
                }}>
                    P(A {">"} B) = 1 / (1 + 6^((R_B − R_A) / 400))
                </code>
                {" "}— Codeforces ning haqiqiy implementatsiyasi.
            </div>
        </div>
    );
}
