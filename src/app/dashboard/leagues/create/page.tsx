'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function CreateLeaguePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        budget: 100000,
        enrollmentDays: 7,
        durationMonths: 3, // Quarterly
    });

    // Check auth immediately
    const [user, setUser] = useState<any>(null);
    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) {
                console.log('No user found, redirecting...');
                router.push('/login');
            } else {
                setUser(user);
            }
        });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const startDate = new Date();
            const enrollmentDeadline = new Date();
            enrollmentDeadline.setDate(startDate.getDate() + formData.enrollmentDays);

            const endDate = new Date();
            endDate.setMonth(startDate.getMonth() + formData.durationMonths);

            const { data, error } = await supabase.from('leagues').insert({
                name: formData.name,
                admin_id: user.id,
                budget: formData.budget,
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
                is_active: true
            }).select().single();

            if (error) throw error;

            // Add admin as first member
            await supabase.from('league_members').insert({
                league_id: data.id,
                user_id: user.id,
                is_masked: false
            });

            // Create portfolio for admin
            // Note: Trigger or subsequent logic should handle this ideally, but doing manually for speed.
            // Need member_id first.
            const { data: memberData } = await supabase
                .from('league_members')
                .select('id')
                .eq('league_id', data.id)
                .eq('user_id', user.id)
                .single();

            if (memberData) {
                await supabase.from('portfolios').insert({
                    member_id: memberData.id,
                    cash_balance: formData.budget,
                    total_value: formData.budget
                });
            }

            router.push(`/dashboard/leagues/${data.id}/draft`);

        } catch (error: any) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h1 className="text-gradient" style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '2rem' }}>Create New League</h1>

            <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#a1a1aa' }}>League Name</label>
                    <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Q1 Family Shootout"
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            borderRadius: '8px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: 'white'
                        }}
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#a1a1aa' }}>Starting Budget ($)</label>
                        <input
                            type="number"
                            value={formData.budget}
                            onChange={e => setFormData({ ...formData, budget: Number(e.target.value) })}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#a1a1aa' }}>Enrollment Period (Days)</label>
                        <input
                            type="number"
                            value={formData.enrollmentDays}
                            onChange={e => setFormData({ ...formData, enrollmentDays: Number(e.target.value) })}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                        />
                    </div>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#a1a1aa' }}>Duration</label>
                    <select
                        value={formData.durationMonths}
                        onChange={e => setFormData({ ...formData, durationMonths: Number(e.target.value) })}
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                    >
                        <option value={1}>1 Month (Sprint)</option>
                        <option value={3}>3 Months (Quarterly)</option>
                        <option value={12}>1 Year (Marathon)</option>
                    </select>
                </div>

                <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '1rem' }}>
                    {loading ? 'Creating...' : 'Create League'}
                </button>
            </form>
        </div>
    );
}
