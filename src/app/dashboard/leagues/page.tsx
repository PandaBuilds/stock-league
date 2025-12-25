'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { Plus, ArrowRight } from 'lucide-react';

export default function LeagueList() {
    const [leagues, setLeagues] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLeagues = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Join leagues table with league_members
            const { data, error } = await supabase
                .from('league_members')
                .select(`
          league_id,
          leagues (
            id,
            name,
            budget,
            end_date
          )
        `)
                .eq('user_id', user.id);

            if (data) {
                setLeagues(data.map((item: any) => item.leagues));
            }
            setLoading(false);
        };

        fetchLeagues();
    }, []);

    if (loading) return <p className="text-a1a1aa">Loading leagues...</p>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>My Leagues</h2>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Link href="/dashboard/leagues/join" className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', padding: '0.5rem 1rem', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', color: 'white' }}>
                        Join League
                    </Link>
                    <Link href="/dashboard/leagues/create" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', background: 'linear-gradient(135deg, #34d399 0%, #22d3ee 100%)', color: '#0f172a', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 'bold' }}>
                        <Plus size={16} /> Create League
                    </Link>
                </div>
            </div>

            {leagues.length === 0 ? (
                <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
                    <p style={{ color: '#a1a1aa', marginBottom: '1rem' }}>You haven't joined any leagues yet.</p>
                    <Link href="/dashboard/leagues/create" className="text-gradient" style={{ fontWeight: 'bold' }}>Start one now &rarr;</Link>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                    {leagues.map(league => (
                        <Link key={league.id} href={`/dashboard/leagues/${league.id}`} className="glass-panel" style={{ padding: '1.5rem', transition: 'transform 0.2s', display: 'block' }}>
                            <h3 style={{ fontWeight: 'bold', fontSize: '1.25rem', marginBottom: '0.5rem' }}>{league.name}</h3>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#a1a1aa', fontSize: '0.875rem' }}>
                                <span>${league.budget?.toLocaleString()} Budget</span>
                                <ArrowRight size={16} />
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
