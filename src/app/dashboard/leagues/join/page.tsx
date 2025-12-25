'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function JoinLeaguePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const code = searchParams.get('code'); // This is the league ID

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [leagueCode, setLeagueCode] = useState(code || '');

    // Check auth
    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) router.push(`/login?redirect=/dashboard/leagues/join?code=${code || ''}`);
        });
    }, []);

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }

            // 1. Get League (Validation)
            const { data: league, error: leagueError } = await supabase
                .from('leagues')
                .select('*')
                .eq('id', leagueCode)
                .single();

            if (leagueError || !league) throw new Error('Invalid League Code');

            // 2. Check if already member
            const { data: existing } = await supabase
                .from('league_members')
                .select('id')
                .eq('league_id', league.id)
                .eq('user_id', user.id)
                .single();

            if (existing) {
                // Already joined, just go there
                router.push('/dashboard/leagues');
                return;
            }

            // 3. Join
            const { data: member, error: joinError } = await supabase
                .from('league_members')
                .insert({
                    league_id: league.id,
                    user_id: user.id
                })
                .select()
                .single();

            if (joinError) throw joinError;

            // 4. Init Portfolio
            await supabase.from('portfolios').insert({
                member_id: member.id,
                cash_balance: league.budget,
                total_value: league.budget
            });

            router.push(`/dashboard/leagues/${league.id}/draft`);

        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '400px', margin: '2rem auto', textAlign: 'center' }}>
            <h1 className="text-gradient" style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>Join League</h1>

            <form onSubmit={handleJoin} className="glass-panel" style={{ padding: '2rem' }}>
                <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#a1a1aa' }}>League Code (ID)</label>
                    <input
                        type="text"
                        value={leagueCode}
                        onChange={e => setLeagueCode(e.target.value)}
                        required
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

                {error && <p style={{ color: '#ef4444', marginBottom: '1rem' }}>{error}</p>}

                <button
                    type="submit"
                    className="btn-primary"
                    disabled={loading}
                    style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
                >
                    {loading ? <Loader2 className="animate-spin" /> : 'Join Now'}
                </button>
            </form>
        </div>
    );
}
