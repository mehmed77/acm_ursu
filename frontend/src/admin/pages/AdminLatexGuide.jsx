import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import 'katex/dist/katex.min.css';
import { BookOpen } from 'lucide-react';

export default function AdminLatexGuide() {
    const guideContent = `
Ushbu sahifa orqali siz masala shartlari va ehtiyot qismlarini yozishda kerak bo'ladigan barcha matematik formulalarni qanday shakllantirishni o'rganishingiz mumkin.

### 1. Asosiy qoidalar
- **Qator ichida (Inline):** Matn orasida yozish uchun bitta \`$\` belgisi ishlatiladi. Masalan: \`$x=5$\` render bo'lganda $x=5$ shaklida ko'rinadi.
- **Alohida blokda (Block):** Markazlashtirib, katta qilib yozish uchun ikkita \`$$\` belgisi ishlatiladi.

---

### 2. Asosiy Arifmetika va Kasrlar
| Ko'rinishi qanday bo'ladi? | Qanday yoziladi? (Kodi) |
| :--- | :--- |
| $a + b - c$ | \`$a + b - c$\` |
| $a \\times b$ yoki $a \\cdot b$ | \`$a \\times b$\` yoki \`$a \\cdot b$\` |
| $a \\div b$ | \`$a \\div b$\` |
| $a \\pm b$ va $a \\mp b$ | \`$a \\pm b$\` va \`$a \\mp b$\` |
| $\\frac{a}{b}$ | \`$\\frac{a}{b}$\` |
| $\\frac{x+1}{x-1}$ | \`$\\frac{x+1}{x-1}$\` |

---

### 3. Daraja, Indeks va Ildizlar
| Ko'rinishi qanday bo'ladi? | Qanday yoziladi? |
| :--- | :--- |
| $x^2$ | \`$x^2$\` |
| $2^{10}$ | \`$2^{10}$\` |
| $e^{x+y}$ | \`$e^{x+y}$\` |
| $A_i$ | \`$A_i$\` |
| $dp_{i, j}$ | \`$dp_{i, j}$\` |
| $x_i^2$ | \`$x_i^2$\` yoki \`$x^2_i$\` |
| $\\sqrt{x}$ | \`$\\sqrt{x}$\` |
| $\\sqrt[3]{x}$ yoki $\\sqrt[n]{x}$ | \`$\\sqrt[3]{x}$\` yoki \`$\\sqrt[n]{x}$\` |

---

### 4. Munosabat va Taqoslash belgilari
| Ko'rinishi qanday bo'ladi? | Qanday yoziladi? |
| :--- | :--- |
| $x = y$ | \`$x = y$\` |
| $x \\neq y$ | \`$x \\neq y$\` |
| $x > y$ va $x < y$ | \`$x > y$\` va \`$x < y$\` |
| $x \\ge y$ | \`$x \\ge y$\` yoki \`$x \\geq y$\` |
| $x \\le y$ | \`$x \\le y$\` yoki \`$x \\leq y$\` |
| $x \\approx y$ | \`$x \\approx y$\` |
| $x \\equiv y \\pmod m$ | \`$x \\equiv y \\pmod m$\` |

---

### 5. Yig'indi, Ko'paytma va Limit
| Ko'rinishi qanday bo'ladi? | Qanday yoziladi? |
| :--- | :--- |
| $\\sum_{i=1}^{n} i$ | \`$\\sum_{i=1}^{n} i$\` |
| $\\prod_{i=1}^{n} x_i$ | \`$\\prod_{i=1}^{n} x_i$\` |
| $\\lim_{x \\to \\infty} f(x)$ | \`$\\lim_{x \\to \\infty} f(x)$\` |
| $\\int_{a}^{b} x^2 \\,dx$ | \`$\\int_{a}^{b} x^2 \\,dx$\` |
| $f'(x)$ yoki $\\frac{dy}{dx}$ | \`$f'(x)$\` yoki \`$\\frac{dy}{dx}$\` |

**(Blok ichida yozilsa chegaralar ostida/ustida chiroyli va katta bo'lib ko'rinadi)**
$$ \\sum_{i=1}^{n} i $$

---

### 6. To'plamlar o'zaro munosabati
| Ko'rinishi qanday bo'ladi? | Qanday yoziladi? |
| :--- | :--- |
| $A \\in B$ | \`$A \\in B$\` |
| $A \\notin B$ | \`$A \\notin B$\` |
| $A \\subset B$ | \`$A \\subset B$\` |
| $A \\cup B$ (Birlashma) | \`$A \\cup B$\` |
| $A \\cap B$ (Kesishma) | \`$A \\cap B$\` |
| $\\emptyset$ (Bo'sh to'plam) | \`$\\emptyset$\` |

---

### 7. Trigonometriya, Logarifmlar va Funksiyalar
| Ko'rinishi qanday bo'ladi? | Qanday yoziladi? |
| :--- | :--- |
| $\\sin(x), \\cos(x), \\tan(x)$ | \`$\\sin(x), \\cos(x), \\tan(x)$\` |
| $\\log_2(n)$ | \`$\\log_2(n)$\` |
| $\\ln(x)$ | \`$\\ln(x)$\` |
| $\\max(a, b)$ | \`$\\max(a, b)$\` |
| $\\min(a, b)$ | \`$\\min(a, b)$\` |

---

### 8. Moslashuvchan Qavslar (Katta qavslar)
Agar qavs ichida kasr yoki murakkab ifoda bo'lsa, uni to'g'ri o'lchamga keltirish uchun \`\\left\` va \`\\right\` ishlatiladi:
- Kichik qavs: \`$(\\frac{x}{y})$\` $\\to$ $(\\frac{x}{y})$
- **Katta qavs:** \`$\\left( \\frac{x}{y} \\right)$\` $\\to$ $\\left( \\frac{x}{y} \\right)$

| Ko'rinishi qanday bo'ladi? | Qanday yoziladi? |
| :--- | :--- |
| $|x|$ (Modul) | \`$\\left| x \\right|$\` yoki \`|x|\` |
| $\\lfloor x \\rfloor$ (Pastga yaxlitlash) | \`$\\lfloor x \\rfloor$\` |
| $\\lceil x \\rceil$ (Tepaga yaxlitlash) | \`$\\lceil x \\rceil$\` |

---

### 9. Muhim Belgilar va Grek harflari
| Ko'rinishi qanday bo'ladi? | Qanday yoziladi? |
| :--- | :--- |
| $\\infty$ (Cheksizlik) | \`$\\infty$\` |
| $\\to$ (Strelka) | \`$\\to$\` |
| $1, 2, \\dots, n$ | \`$1, 2, \\dots, n$\` |
| $\\pi, \\alpha, \\beta, \\gamma$ | \`$\\pi, \\alpha, \\beta, \\gamma$\` |
| $\\Delta$ | \`$\\Delta$\` |

---

### Makkabroq namunalar

**1. Katta (Ikkinchi darajali) Tenglama:**
Kodi:
\`\`\`text
$$ x_{1,2} = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a} $$
\`\`\`
Natija:
$$ x_{1,2} = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a} $$

**2. Ko'p qatorli qavslar (Tizimlar):**
Kodi:
\`\`\`text
$$
f(n) = \\begin{cases} 
n/2, & \\text{agar } n \\text{ juft bo'lsa} \\\\
3n+1, & \\text{agar } n \\text{ toq bo'lsa}
\\end{cases}
$$
\`\`\`
Natija:
$$
f(n) = \\begin{cases} 
n/2, & \\text{agar } n \\text{ juft bo'lsa} \\\\
3n+1, & \\text{agar } n \\text{ toq bo'lsa}
\\end{cases}
$$

**3. Matritsa:**
Kodi:
\`\`\`text
$$
\\begin{bmatrix}
1 & 2 & 3 \\\\
4 & 5 & 6 \\\\
7 & 8 & 9
\\end{bmatrix}
$$
\`\`\`
Natija:
$$
\\begin{bmatrix}
1 & 2 & 3 \\\\
4 & 5 & 6 \\\\
7 & 8 & 9
\\end{bmatrix}
$$
`;

    return (
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <div style={{
                    width: 48, height: 48, borderRadius: 12,
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))',
                    border: '1px solid rgba(99,102,241,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#a5b4fc',
                }}>
                    <BookOpen size={24} />
                </div>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, color: '#f0f0ff', margin: 0 }}>LaTeX (KaTeX) Qo'llanmasi</h1>
                    <p style={{ color: '#9898bb', fontSize: 13, margin: '4px 0 0 0' }}>Masalalar dizayniga matematika va formulalarni chiroyli qo'shish tartibi</p>
                </div>
            </div>

            <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 16,
                padding: '32px 40px',
            }}>
                <div className="prose prose-invert lg:prose-lg" style={{
                    maxWidth: 'none',
                    color: '#c4c4e0',
                }}>
                    <ReactMarkdown
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeKatex, rehypeHighlight]}
                    >
                        {guideContent}
                    </ReactMarkdown>
                </div>
            </div>
        </div>
    );
}
