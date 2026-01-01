'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const [username, setUsername] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');

    const presets = ["😎", "🚀", "💎", "🦍", "🐂", "🐻", "💰", "📉", "📈", "🏦"];

    useEffect(() => {
        const loadProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUser(user);
                const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
                if (profile) {
                    setUsername(profile.username || '');
                    setAvatarUrl(profile.avatar_url || '');
                }
            }
            setLoading(false);
        };
        loadProfile();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { error } = await supabase.from('profiles').update({
                username,
                avatar_url: avatarUrl
            }).eq('id', user.id);

            if (error) throw error;
            alert("Profile updated!");
        } catch (e: any) {
            alert(e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = async () => {
        setLoggingOut(true);
        await supabase.auth.signOut();
        router.push('/');
    };

    if (loading) return <div className="p-10">Loading...</div>;

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h1 className="text-gradient" style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '2rem' }}>Account Settings</h1>

            <div className="glass-panel" style={{ padding: '2rem' }}>
                <form onSubmit={handleSave} style={{ marginBottom: '2rem' }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#a1a1aa' }}>Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            placeholder="Choose a display name"
                            className="input-field"
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                        />
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#a1a1aa' }}>Avatar</label>

                        {/* Presets */}
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                            {presets.map(p => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => setAvatarUrl(p)}
                                    style={{
                                        fontSize: '1.5rem',
                                        padding: '0.5rem',
                                        borderRadius: '8px',
                                        border: avatarUrl === p ? '2px solid #8b5cf6' : '1px solid rgba(255,255,255,0.1)',
                                        background: 'rgba(255,255,255,0.05)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={saving}
                        style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}
                    >
                        {saving ? <Loader2 className="animate-spin" /> : 'Save Changes'}
                    </button>
                </form>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '2rem' }}>
                    <button
                        onClick={handleLogout}
                        className="btn-danger"
                        disabled={loggingOut}
                        style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}
                    >
                        {loggingOut ? <Loader2 className="animate-spin" /> : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <LogOut size={20} /> Log Out
                            </div>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
