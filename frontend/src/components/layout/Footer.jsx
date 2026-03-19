import { Code2 } from 'lucide-react';
import Container from '../ui/Container';

export default function Footer() {
    return (
        <footer className="mt-auto border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]">
            <Container className="py-6 flex items-center justify-between font-sans">
                <div className="flex items-center gap-2 text-[13px] text-[var(--text-muted)] font-medium">
                    <Code2 className="w-4 h-4" />
                    <span>OnlineJudge © {new Date().getFullYear()}</span>
                </div>
                <div className="text-[12px] text-[var(--text-muted)] font-mono tracking-tight">
                    Powered by <span className="font-semibold text-[var(--text-secondary)]">Judge0</span>
                </div>
            </Container>
        </footer>
    );
}
