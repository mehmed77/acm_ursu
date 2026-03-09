import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Info } from 'lucide-react';

let addToastRef = null;

export const toast = {
    success: (msg) => addToastRef && addToastRef('success', msg),
    error: (msg) => addToastRef && addToastRef('error', msg),
    info: (msg) => addToastRef && addToastRef('info', msg),
};

export function ToastContainer() {
    const [toasts, setToasts] = useState([]);

    useEffect(() => {
        addToastRef = (type, message) => {
            const id = Date.now() + Math.random();
            setToasts(prev => [...prev, { id, type, message }]);
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
            }, 3000);
        };
    }, []);

    return (
        <div style={{ position: 'fixed', top: '72px', right: '20px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px', pointerEvents: 'none' }}>
            <AnimatePresence>
                {toasts.map(t => (
                    <motion.div
                        key={t.id}
                        initial={{ x: 100, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 100, opacity: 0 }}
                        style={{
                            background: t.type === 'success' ? 'rgba(16,185,129,0.12)' : t.type === 'error' ? 'rgba(239,68,68,0.12)' : 'rgba(99,102,241,0.12)',
                            border: `1px solid ${t.type === 'success' ? 'rgba(16,185,129,0.25)' : t.type === 'error' ? 'rgba(239,68,68,0.25)' : 'rgba(99,102,241,0.25)'}`,
                            borderRadius: '8px', padding: '12px 16px', fontSize: '13px', fontWeight: 500,
                            display: 'flex', alignItems: 'center', gap: '8px', color: 'white', pointerEvents: 'auto',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                        }}
                    >
                        {t.type === 'success' ? <CheckCircle size={18} color="#10b981" /> : t.type === 'error' ? <XCircle size={18} color="#ef4444" /> : <Info size={18} color="#6366f1" />}
                        {t.message}
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
