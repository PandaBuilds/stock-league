'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function PortfolioPage() {
    const [portfolios, setPortfolios] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPortfolios = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch portfolios linked to leagues
            const { data, error } = await supabase
                .from('portfolios')
                .select(`
            id,
            total_value,
            cash_balance,
            league_members (
                leagues (
                    id,
                    name
                )
            )
        `)
            // We need to join through league_members to filter by user_id
            // But supabase query syntax for deep filtering on M:M or reverse relations can be tricky.
            // Easier way: Get league_members for user first, then portfolios.

            // Let's try the direct nested filter approach if RLS allows
        };

        // Simpler 2-step fetch for safety
        const fetchMyPortfolios = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: members } = await supabase
                .from('league_members')
                .select('id, leagues(id, name)')
                .eq('user_id', user.id);

            if (members && members.length > 0) {
                const memberIds = members.map(m => m.id);
                const { data: ports } = await supabase
                    .from('portfolios')
                    .select('id, total_value, cash_balance, member_id')
                    .in('member_id', memberIds);

                if (ports) {
                    // Merge data
                    const unified = ports.map(p => {
                        const mem = members.find(m => m.id === p.member_id);
                        const league = Array.isArray(mem?.leagues) ? mem.leagues[0] : mem?.leagues;
                        return {
                            ...p,
                            leagueName: league?.name,
                            leagueId: league?.id
                        };
                    });
                    setPortfolios(unified);
                }
            }
            setLoading(false);
        };

        fetchMyPortfolios();
    }, []);

    if (loading) return <div className="p-8 text-white">Loading portfolios...</div>;

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <h1 className="text-gradient" style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '2rem' }}>My Portfolios</h1>

            {portfolios.length === 0 ? (
                <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
                    <p style={{ color: '#a1a1aa', marginBottom: '1rem' }}>You don't have any active portfolios.</p>
                    <Link href="/dashboard/leagues/create" className="btn-primary">Join a League</Link>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {portfolios.map(port => (
                        <div key={port.id} className="glass-panel" style={{ padding: '1.5rem' }}>
                            <p style={{ color: '#a1a1aa', fontSize: '0.875rem' }}>{port.leagueName}</p>
                            <h2 style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0.5rem 0' }}>
                                ${port.total_value?.toLocaleString()}
                            </h2>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                                <span style={{ color: '#a1a1aa' }}>Cash Available</span>
                                <span>${port.cash_balance?.toLocaleString()}</span>
                            </div>
                            <div style={{ marginTop: '1rem' }}>
                                <Link href={`/dashboard/leagues/${port.leagueId}/draft`} style={{ color: '#8b5cf6', fontSize: '0.875rem', fontWeight: 'bold' }}>
                                    Manage Holdings &rarr;
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
