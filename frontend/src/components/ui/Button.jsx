import { motion } from 'framer-motion';

export default function Button({ children, variant = 'primary', className = '', loading = false, ...props }) {
    const baseClass = variant === 'primary' ? 'btn-glow' : 'btn-ghost';

    return (
        <motion.button
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.985 }}
            className={`${baseClass} inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${className}`}
            disabled={loading || props.disabled}
            {...props}
        >
            {loading && (
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            )}
            {children}
        </motion.button>
    );
}
