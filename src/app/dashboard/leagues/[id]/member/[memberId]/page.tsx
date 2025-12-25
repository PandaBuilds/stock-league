'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function MemberPortfolioPage() {
    const params = useParams(); // { id (league), memberId }
    const [holdings, setHoldings] = useState<any[]>([]);
    const [memberProfile, setMemberProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            // Get Member Profile Info
            const { data: member } = await supabase
                .from('league_members')
                .select('profiles(username, avatar_url)')
                .eq('id', params.memberId)
                .single();
            setMemberProfile(member?.profiles);

            // Get Portfolio & Holdings
            const { data: portfolio } = await supabase
                .from('portfolios')
                .select('id')
                .eq('member_id', params.memberId)
                .single();

            if (portfolio) {
                const { data: held } = await supabase
                    .from('holdings')
                    .select('*, stocks(*)')
                    .eq('portfolio_id', portfolio.id);

                setHoldings(held || []);
            }
            setLoading(false);
        };
        fetchData();
    }, [params.memberId]);

    if (loading) return <div className="p-10">Loading...</div>;

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <Link href={`/dashboard/leagues/${params.id}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#a1a1aa', marginBottom: '2rem' }}>
                <ArrowLeft size={16} /> Back to League
            </Link>

            <header style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold' }}>
                    {memberProfile?.username?.charAt(0).toUpperCase()}
                </div>
                <div>
                    <h1 className="text-gradient" style={{ fontSize: '2rem', fontWeight: 'bold' }}>{memberProfile?.username}'s Picks</h1>
                    <p style={{ color: '#a1a1aa' }}>League Member</p>
                </div>
            </header>

            <div className="glass-panel" style={{ padding: '2rem' }}>
                {holdings.length === 0 ? (
                    <p style={{ color: '#a1a1aa' }}>No holdings found.</p>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', color: '#a1a1aa', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                <th style={{ padding: '1rem' }}>Stock</th>
                                <th style={{ padding: '1rem', textAlign: 'right' }}>Shares</th>
                                <th style={{ padding: '1rem', textAlign: 'right' }}>Stock Price</th>
                                <th style={{ padding: '1rem', textAlign: 'right' }}>Current Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            {holdings.map(h => (
                                <tr key={h.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '1rem' }}>
                                        <span style={{ fontWeight: 'bold', display: 'block' }}>{h.stock_symbol}</span>
                                        <span style={{ fontSize: '0.875rem', color: '#a1a1aa' }}>{h.stocks?.name}</span>
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'right' }}>{Number(h.quantity).toFixed(2)}</td>
                                    <td style={{ padding: '1rem', textAlign: 'right' }}>${(h.stocks?.current_price || h.avg_price)?.toFixed(2)}</td>
                                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold' }}>
                                        ${(h.quantity * (h.stocks?.current_price || h.avg_price)).toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
