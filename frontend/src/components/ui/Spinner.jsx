export default function Spinner({ size = 'md', className = '' }) {
    const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' };
    return (
        <div className={`flex justify-center items-center ${className}`}>
            <div
                className={`${sizes[size]} rounded-full animate-spin`}
                style={{
                    border: '2px solid rgba(255,255,255,0.06)',
                    borderTopColor: '#6366f1',
                }}
            />
        </div>
    );
}
