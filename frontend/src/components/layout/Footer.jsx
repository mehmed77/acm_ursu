import { Code2 } from 'lucide-react';

export default function Footer() {
    return (
        <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} className="mt-auto">
            <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[13px]" style={{ color: '#55556a' }}>
                    <Code2 className="w-3.5 h-3.5" />
                    <span>OnlineJudge © {new Date().getFullYear()}</span>
                </div>
                <div className="text-[12px]" style={{ color: '#55556a' }}>
                    Powered by Judge0
                </div>
            </div>
        </footer>
    );
}
