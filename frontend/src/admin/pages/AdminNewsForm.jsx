import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminApi } from '../../api/admin';
import { toast } from '../components/Toast';
import { Save, ArrowLeft, Image as ImageIcon } from 'lucide-react';

export default function AdminNewsForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const isEditing = !!id;

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(isEditing);
    
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    useEffect(() => {
        if (isEditing) {
            fetchNewsItem();
        }
    }, [id]);

    const fetchNewsItem = async () => {
        try {
            const res = await adminApi.getNewsItem(id);
            setTitle(res.data.title);
            setContent(res.data.content);
            if (res.data.image) {
                setImagePreview(res.data.image);
            }
        } catch (error) {
            toast.error("Yangilik ma'lumotlarini yuklashda xatolik yuz berdi");
            navigate('/admin/news');
        } finally {
            setFetching(false);
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!title.trim() || !content.trim()) {
            toast.error("Sarlavha va kontent bo'sh bo'lishi mumkin emas!");
            return;
        }

        const formData = new FormData();
        formData.append('title', title);
        formData.append('content', content);
        if (image) {
            formData.append('image', image);
        }

        try {
            setLoading(true);
            if (isEditing) {
                await adminApi.updateNews(id, formData);
                toast.success("Yangilik muvaffaqiyatli yangilandi");
            } else {
                await adminApi.createNews(formData);
                toast.success("Yangilik muvaffaqiyatli yaratildi");
            }
            navigate('/admin/news');
        } catch (error) {
            console.error(error);
            toast.error("Saqlashda xatolik yuz berdi");
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return <div style={{ color: 'white', padding: 40, textAlign: 'center' }}>Yuklanmoqda...</div>;
    }

    return (
        <div style={{ maxWidth: 800 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
                <button 
                    onClick={() => navigate('/admin/news')}
                    style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#a5b4fc', width: 40, height: 40, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                    <ArrowLeft size={20} />
                </button>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: 'white' }}>
                    {isEditing ? 'Yangilikni tahrirlash' : 'Yangi yangilik qo\'shish'}
                </h1>
            </div>

            <form onSubmit={handleSubmit} style={{ background: '#1a1a32', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', padding: 32 }}>
                
                <div style={{ marginBottom: 24 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500, color: '#d1d5db' }}>Sarlavha</label>
                    <input 
                        type="text" 
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Yangilik sarlavhasini kiriting"
                        style={{
                            width: '100%', padding: '12px 16px', background: '#111122', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 8, color: 'white', fontSize: 15, outline: 'none'
                        }}
                        required
                    />
                </div>

                <div style={{ marginBottom: 24 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500, color: '#d1d5db' }}>Rasm</label>
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                            width: '100%', height: 200, background: '#111122', border: '1px dashed rgba(255,255,255,0.2)',
                            borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', position: 'relative', overflow: 'hidden'
                        }}
                    >
                        {imagePreview ? (
                            <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <>
                                <ImageIcon size={40} color="#6b7280" style={{ marginBottom: 12 }} />
                                <span style={{ color: '#9ca3af', fontSize: 14 }}>Rasm yuklash uchun bu yerni bosing</span>
                            </>
                        )}
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleImageChange} 
                            accept="image/*" 
                            style={{ display: 'none' }} 
                        />
                    </div>
                </div>

                <div style={{ marginBottom: 32 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500, color: '#d1d5db' }}>Kontent (HTML ruxsat etilgan)</label>
                    <textarea 
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Yangilik matnini kiriting..."
                        style={{
                            width: '100%', minHeight: 300, padding: '16px', background: '#111122', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 8, color: 'white', fontSize: 15, outline: 'none', resize: 'vertical', fontFamily: 'inherit'
                        }}
                        required
                    />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="btn-glow"
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', opacity: loading ? 0.7 : 1 }}
                    >
                        <Save size={18} /> {loading ? 'Saqlanmoqda...' : 'Saqlash'}
                    </button>
                </div>
            </form>
        </div>
    );
}
