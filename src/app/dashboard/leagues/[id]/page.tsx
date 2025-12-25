'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, RefreshCw, Trophy, ArrowUpRight, ArrowDownRight, User, Trash2, Copy, Check, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

export default function LeaguePage() {
    const params = useParams();
    const router = useRouter();
    const [league, setLeague] = useState<any>(null);
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [isOwner, setIsOwner] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [copied, setCopied] = useState(false);

    const fetchLeagueData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setCurrentUser(user);

        // 1. Get League (Including anonymous_mode)
        const { data: leagueData } = await supabase
            .from('leagues')
            .select('*')
            .eq('id', params.id)
            .single();
        setLeague(leagueData);

        if (user && leagueData && leagueData.admin_id === user.id) {
            setIsOwner(true);
        }

        // 2. Get Members & Portfolios
        const { data: members } = await supabase
            .from('league_members')
            .select(`
        id,
        user_id,
        profiles (username, avatar_url),
        portfolios (id, total_value, cash_balance)
      `)
            .eq('league_id', params.id);

        if (members) {
            const sorted = members
                .map(m => {
                    const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
                    return {
                        memberId: m.id,
                        userId: m.user_id,
                        username: profile?.username || 'Anonymous',
                        avatar: profile?.avatar_url,
                        totalValue: m.portfolios?.[0]?.total_value || 0,
                        cash: m.portfolios?.[0]?.cash_balance || 0,
                    };
                })
                .sort((a, b) => b.totalValue - a.totalValue);

            setLeaderboard(sorted);
        }
    };

    useEffect(() => {
        fetchLeagueData().then(() => setLoading(false));
    }, [params.id]);

    const handleRefreshPrices = async () => {
        setRefreshing(true);
        try {
            const { data: members } = await supabase.from('league_members').select('id').eq('league_id', params.id);
            const memberIds = members?.map(m => m.id) || [];
            const { data: portfolios } = await supabase.from('portfolios').select('id').in('member_id', memberIds);
            const portIds = portfolios?.map(p => p.id) || [];
            const { data: holdings } = await supabase.from('holdings').select('stock_symbol, quantity').in('portfolio_id', portIds);
            const uniqueSymbols = Array.from(new Set(holdings?.map(h => h.stock_symbol) || []));

            if (uniqueSymbols.length === 0) {
                alert("No stocks to update.");
                return;
            }

            for (const sym of uniqueSymbols) {
                const res = await fetch(`/api/stocks/quote?symbol=${sym}`);
                const data = await res.json();
                if (data.c) {
                    await supabase.from('stocks').update({
                        current_price: data.c,
                        last_updated: new Date().toISOString()
                    }).eq('symbol', sym);
                }
            }

            const { data: updatedStocks } = await supabase.from('stocks').select('symbol, current_price').in('symbol', uniqueSymbols);
            const stockMap = new Map(updatedStocks?.map(s => [s.symbol, s.current_price]) || []);

            for (const pid of portIds) {
                const { data: portHoldings } = await supabase.from('holdings').select('stock_symbol, quantity').eq('portfolio_id', pid);
                const { data: port } = await supabase.from('portfolios').select('cash_balance').eq('id', pid).single();
                let stockValue = 0;
                portHoldings?.forEach(h => {
                    const price = stockMap.get(h.stock_symbol) || 0;
                    stockValue += (h.quantity * price);
                });
                const newTotal = (port?.cash_balance || 0) + stockValue;
                await supabase.from('portfolios').update({ total_value: newTotal }).eq('id', pid);

                // 4. Save History (Snapshot for today)
                // UPSERT on (portfolio_id, recorded_at) to avoid dupes if refreshed multiple times
                await supabase.from('portfolio_history').upsert({
                    portfolio_id: pid,
                    recorded_at: new Date().toISOString().split('T')[0], // YYYY-MM-DD
                    total_value: newTotal
                }, { onConflict: 'portfolio_id, recorded_at' });
            }
            await fetchLeagueData();
            alert("Prices and Leaderboard Updated!");
        } catch (e) { console.error(e); }
        finally { setRefreshing(false); }
    };

    const deleteLeague = async () => {
        if (!window.confirm("ARE YOU SURE? This will permanently delete this league and all portfolios within it. This action cannot be undone.")) return;
        setDeleting(true);
        try {
            // 1. Get all related IDs first
            const { data: members } = await supabase.from('league_members').select('id').eq('league_id', league.id);
            const memberIds = members?.map(m => m.id) || [];

            let portfolioIds: any[] = [];
            if (memberIds.length > 0) {
                const { data: portfolios } = await supabase.from('portfolios').select('id').in('member_id', memberIds);
                portfolioIds = portfolios?.map(p => p.id) || [];
            }

            // 2. Delete in order (Holdings -> Portfolios -> Members -> League)
            // We verify each step but continue if "success" (even if 0 rows)

            if (portfolioIds.length > 0) {
                await supabase.from('holdings').delete().in('portfolio_id', portfolioIds);
                await supabase.from('portfolios').delete().in('id', portfolioIds);
            }

            if (memberIds.length > 0) {
                await supabase.from('league_members').delete().eq('league_id', league.id);
            }

            const { error: leagueErr } = await supabase.from('leagues').delete().eq('id', league.id);

            if (leagueErr) {
                throw leagueErr;
            }

            router.push('/dashboard/leagues');

        } catch (e: any) {
            console.error(e);
            alert("Delete failed: " + e.message);
        } finally {
            setDeleting(false);
        }
    };

    const copyInvite = () => {
        const url = `${window.location.origin}/dashboard/leagues/join?code=${league.id}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const toggleAnonymous = async () => {
        const newVal = !league.anonymous_mode;
        const { error } = await supabase.from('leagues').update({ anonymous_mode: newVal }).eq('id', league.id);
        if (!error) {
            setLeague({ ...league, anonymous_mode: newVal });
        }
    };

    if (loading) return <div className="p-10 text-center">Loading League...</div>;

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header */}
            <div className="page-header">
                <div>
                    <Link href="/dashboard" style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem', display: 'block' }}>&larr; Back to Dashboard</Link>
                    <h1 className="text-gradient" style={{ fontSize: '2.5rem', fontWeight: 'bold', lineHeight: '1.1' }}>{league?.name}</h1>

                    {/* Admin Access Code Display */}
                    {isOwner && league?.join_code && (
                        <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{
                                background: 'rgba(255,255,255,0.1)',
                                padding: '0.3rem 0.8rem',
                                borderRadius: '8px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.6rem'
                            }}>
                                <span style={{ color: '#a1a1aa', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Join Code:</span>
                                <span style={{ fontSize: '1rem', fontWeight: 'bold', letterSpacing: '0.2rem', fontFamily: 'monospace' }}>{league.join_code}</span>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(league.join_code);
                                        setCopied(true);
                                        setTimeout(() => setCopied(false), 2000);
                                    }}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        color: copied ? '#4ade80' : '#a1a1aa',
                                        padding: '0.25rem',
                                        marginLeft: '0.25rem'
                                    }}
                                    title="Copy Code"
                                >
                                    {copied ? <Check size={14} /> : <Copy size={14} />}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    {/* Admin Controls */}
                    {isOwner && (
                        <div style={{ display: 'flex', gap: '0.5rem', paddingRight: '1rem', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
                            <button
                                onClick={toggleAnonymous}
                                title={league.anonymous_mode ? "Show Names" : "Mask Names"}
                                style={{ padding: '0.75rem', borderRadius: '8px', background: league.anonymous_mode ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.05)', color: league.anonymous_mode ? '#818cf8' : 'white', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}
                            >
                                {league.anonymous_mode ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                            <button
                                onClick={deleteLeague}
                                disabled={deleting}
                                title="Delete League"
                                style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', cursor: 'pointer' }}
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    )}

                    <button
                        onClick={handleRefreshPrices}
                        disabled={refreshing}
                        title="Refresh Prices"
                        style={{ padding: '0.75rem', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', color: 'white', border: 'none', cursor: 'pointer' }}
                    >
                        <RefreshCw size={20} className={refreshing ? "animate-spin" : ""} />
                    </button>
                    <Link href={`/dashboard/leagues/${params.id}/draft`} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <User size={18} />
                        My Portfolio
                    </Link>
                </div>
            </div>

            {/* Leaderboard */}
            <div className="glass-panel" style={{ padding: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Trophy color="#eab308" /> Leaderboard
                </h2>

                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ textAlign: 'left', color: '#a1a1aa', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                            <th style={{ padding: '1rem' }}>Rank</th>
                            <th style={{ padding: '1rem' }}>Player</th>
                            <th style={{ padding: '1rem', textAlign: 'right' }}>Portfolio Value</th>
                            <th style={{ padding: '1rem', textAlign: 'right' }}>Return</th>
                        </tr>
                    </thead>
                    <tbody>
                        {leaderboard.map((member, index) => {
                            const startBudget = league.budget;
                            const returnPct = ((member.totalValue - startBudget) / startBudget) * 100;
                            const isPositive = returnPct >= 0;
                            const isCurrentUser = member.userId === currentUser?.id;

                            // Masking Logic:
                            // If anonymous_mode is ON:
                            // - Hide Name (show "Player X") UNLESS it is the current user.
                            // - Admin sees all? User said "Admin should be the only one to have that power [to mask]". 
                            // Usually this means Admin enables masking for EVERYONE. 
                            // Does Admin see through mask? "Name Masking... The admin should be the only one to have that power as well".
                            // I'll assume masking applies to everyone to keep it fair/exciting, but maybe Admin can toggle it off to peek.
                            // So if mode is ON, mask everyone else.

                            let displayName = member.username;
                            let displayAvatar = member.avatar;

                            if (league.anonymous_mode && !isCurrentUser) {
                                displayName = `Player ${index + 1}`;
                                displayAvatar = null; // Hide avatar
                            }

                            return (
                                <tr key={member.memberId} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '1rem', fontWeight: 'bold', fontSize: '1.25rem' }}>
                                        {index + 1}
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: displayAvatar ? '1.2rem' : '0.9rem' }}>
                                                {displayAvatar ? displayAvatar : (league.anonymous_mode ? '?' : displayName.charAt(0).toUpperCase())}
                                                {/* Note: displayAvatar might be emoji, or URL. If URL we need img tag, but for now assuming emoji based on presets */}
                                            </div>
                                            <div>
                                                <span style={{ display: 'block' }}>{displayName} {isCurrentUser ? '(You)' : ''}</span>
                                                {(!league.anonymous_mode || isCurrentUser) && (
                                                    <Link href={`/dashboard/leagues/${params.id}/member/${member.memberId}`} style={{ fontSize: '0.75rem', color: '#a1a1aa', textDecoration: 'underline' }}>
                                                        View Picks
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold', fontSize: '1.1rem' }}>
                                        ${member.totalValue.toLocaleString()}
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                                        <span style={{
                                            color: isPositive ? '#4ade80' : '#ef4444',
                                            display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                                            background: isPositive ? 'rgba(74, 222, 128, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                            padding: '0.25rem 0.5rem', borderRadius: '12px', fontSize: '0.875rem'
                                        }}>
                                            {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                            {returnPct.toFixed(2)}%
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
