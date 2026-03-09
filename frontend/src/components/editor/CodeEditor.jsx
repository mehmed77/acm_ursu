import { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Send, ChevronDown } from 'lucide-react';
import Button from '../ui/Button';

const languages = [
    { value: 'python', label: 'Python 3', monaco: 'python' },
    { value: 'cpp', label: 'C++ 17', monaco: 'cpp' },
    { value: 'java', label: 'Java', monaco: 'java' },
    { value: 'csharp', label: 'C#', monaco: 'csharp' },
];

const defaultCode = {
    python: '# Your code here\n\n',
    cpp: '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}\n',
    java: `import java.util.*;
import java.io.*;

public class Solution {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        StringTokenizer st = new StringTokenizer(br.readLine());
        // Yechimingizni shu yerga yozing
        
    }
}`,
    csharp: `using System;

class Solution {
    static void Main() {
        // Yechimingizni shu yerga yozing
    }
}`,
};

export default function CodeEditor({ language, setLanguage, code, setCode, onSubmit, loading }) {
    const [showLangMenu, setShowLangMenu] = useState(false);
    const currentLang = languages.find((l) => l.value === language) || languages[0];

    const handleLanguageChange = (lang) => {
        setLanguage(lang.value);
        if (!code || code.trim() === '' || Object.values(defaultCode).some(d => code.trim() === d.trim())) {
            setCode(defaultCode[lang.value] || '');
        }
        setShowLangMenu(false);
    };

    return (
        <div className="flex flex-col h-full bg-bg-secondary rounded-xl border border-border overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-bg-primary/50">
                {/* Language selector */}
                <div className="relative">
                    <button
                        onClick={() => setShowLangMenu(!showLangMenu)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-bg-tertiary border border-border hover:border-border-bright transition-colors"
                    >
                        {currentLang.label}
                        <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
                    </button>
                    {showLangMenu && (
                        <div className="absolute top-full mt-1 left-0 bg-bg-secondary border border-border rounded-lg shadow-xl z-10 py-1 min-w-[140px]">
                            {languages.map((lang) => (
                                <button
                                    key={lang.value}
                                    onClick={() => handleLanguageChange(lang)}
                                    className={`w-full text-left px-3 py-1.5 text-sm hover:bg-bg-tertiary transition-colors ${lang.value === language ? 'text-accent' : 'text-text-secondary'
                                        }`}
                                >
                                    {lang.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Submit Button */}
                <div className="flex items-center gap-2">
                    <Button onClick={onSubmit} loading={loading} className="gap-1.5">
                        <Send className="w-4 h-4" />
                        Submit
                    </Button>
                </div>
            </div>

            {/* Monaco Editor */}
            <div className="flex-1 min-h-[400px]">
                <Editor
                    height="100%"
                    language={currentLang.monaco}
                    value={code}
                    onChange={(value) => setCode(value || '')}
                    theme="vs-dark"
                    options={{
                        fontSize: 14,
                        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        padding: { top: 16 },
                        lineNumbersMinChars: 3,
                        roundedSelection: true,
                        smoothScrolling: true,
                        cursorBlinking: 'smooth',
                        cursorSmoothCaretAnimation: 'on',
                        renderLineHighlight: 'gutter',
                        bracketPairColorization: { enabled: true },
                    }}
                />
            </div>
        </div>
    );
}
