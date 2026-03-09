import { motion } from 'framer-motion';

export default function Card({ children, className = '', hover = true, glow = false, ...props }) {
    return (
        <motion.div
            whileHover={hover ? { y: -2 } : {}}
            transition={{ duration: 0.2 }}
            className={`glass p-6 transition-all duration-300 ${className}`}
            style={{
                ...(hover ? {} : {}),
                ...(glow ? { boxShadow: '0 0 30px rgba(99,102,241,0.06)' } : {}),
            }}
            onMouseEnter={(e) => {
                if (hover) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
            }}
            onMouseLeave={(e) => {
                if (hover) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
            }}
            {...props}
        >
            {children}
        </motion.div>
    );
}
