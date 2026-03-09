import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home } from 'lucide-react';
import { useEffect } from 'react';

export default function NotFound() {
    useEffect(() => { document.title = '404 — OnlineJudge'; }, []);

    return (
        <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
                <h1 className="text-8xl font-extrabold bg-gradient-to-r from-accent to-error bg-clip-text text-transparent">
                    404
                </h1>
                <p className="text-xl text-text-secondary mt-4 mb-8">Sahifa topilmadi</p>
                <Link
                    to="/"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent hover:bg-accent-hover text-white font-medium transition-colors"
                >
                    <Home className="w-4 h-4" />
                    Bosh sahifaga
                </Link>
            </motion.div>
        </div>
    );
}
