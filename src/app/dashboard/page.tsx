'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { TrendingUp, Users, Trophy } from 'lucide-react';

export default function DashboardPage() {
    const [stats, setStats] = useState({ totalValue: 0, activeLeagues: 0, rank: 0 });
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadDashboard = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Get User's Portfolios & Leagues from Member table
            const { data: members } = await supabase.from('league_members')
                .select('id, league_id, portfolios(id, total_value)')
                .eq('user_id', user.id);

            if (members) {
                const totalVal = members.reduce((sum, m) => sum + (m.portfolios?.[0]?.total_value || 0), 0);
                setStats({
                    totalValue: totalVal,
                    activeLeagues: members.length,
                    rank: 1 // Placeholder for global rank logic
                });

                // 2. Fetch History for Charting
                const portIds = members.map(m => m.portfolios?.[0]?.id).filter(Boolean);
                if (portIds.length > 0) {
                    const { data: hist } = await supabase
                        .from('portfolio_history')
                        .select('*')
                        .in('portfolio_id', portIds)
                        .order('recorded_at', { ascending: true });

                    if (hist) {
                        // Aggregate by date (Sum all portfolios for that day)
                        const aggMap = new Map<string, number>();
                        hist.forEach(h => {
                            const date = h.recorded_at;
                            aggMap.set(date, (aggMap.get(date) || 0) + h.total_value);
                        });

                        // Convert to array
                        const chartData = Array.from(aggMap.entries()).map(([date, val]) => ({ date, value: val }));
                        setHistory(chartData);
                    }
                }
            }
            setLoading(false);
        };
        loadDashboard();
    }, []);

    // Simple SVG Line Chart Component
    const Chart = ({ data }: { data: { date: string, value: number }[] }) => {
        if (!data || data.length < 2) return <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a1a1aa' }}>Not enough data yet</div>;

        const maxVal = Math.max(...data.map(d => d.value));
        const minVal = Math.min(...data.map(d => d.value)) * 0.95; // 5% buffer bottom
        const range = maxVal - minVal;

        // Normalize points to 0-100 range for SVG
        const points = data.map((d, i) => {
            const x = (i / (data.length - 1)) * 100;
            const y = 100 - ((d.value - minVal) / range) * 100; // Invert Y
            return `${x},${y}`;
        }).join(' ');

        return (
            <div style={{ width: '100%', height: '200px', position: 'relative' }}>
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                    {/* Gradient Definition */}
                    <defs>
                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.5" />
                            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                        </linearGradient>
                    </defs>

                    {/* Area under curve */}
                    <path d={`M0,100 ${points} V100 H0 Z`} fill="url(#chartGradient)" stroke="none" />

                    {/* Line */}
                    <polyline points={points} fill="none" stroke="#8b5cf6" strokeWidth="2" vectorEffect="non-scaling-stroke" />

                    {/* Dots */}
                    {data.map((d, i) => {
                        const x = (i / (data.length - 1)) * 100;
                        const y = 100 - ((d.value - minVal) / range) * 100;
                        return (
                            <circle key={i} cx={x} cy={y} r="2" fill="white" stroke="#8b5cf6" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                        );
                    })}
                </svg>
                {/* Labels (First and Last) */}
                <div style={{ position: 'absolute', bottom: '-20px', left: 0, fontSize: '0.75rem', color: '#a1a1aa' }}>{data[0].date}</div>
                <div style={{ position: 'absolute', bottom: '-20px', right: 0, fontSize: '0.75rem', color: '#a1a1aa' }}>{data[data.length - 1].date}</div>
            </div>
        );
    };

    if (loading) return <div className="p-10">Loading Dashboard...</div>;

    return (
        <div>
            <h1 className="text-gradient" style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '2rem' }}>Overview</h1>

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                        <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(74, 222, 128, 0.2)', color: '#4ade80' }}><TrendingUp size={24} /></div>
                        <span style={{ color: '#a1a1aa' }}>Total Net Worth</span>
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>${stats.totalValue.toLocaleString()}</div>
                </div>

                <Link href="/dashboard/leagues" className="glass-panel" style={{ padding: '1.5rem', transition: 'transform 0.2s', display: 'block' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                        <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(96, 165, 250, 0.2)', color: '#60a5fa' }}><Users size={24} /></div>
                        <span style={{ color: '#a1a1aa' }}>Active Leagues</span>
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.activeLeagues}</div>
                </Link>

                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                        <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(234, 179, 8, 0.2)', color: '#eab308' }}><Trophy size={24} /></div>
                        <span style={{ color: '#a1a1aa' }}>Global Rank</span>
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>#{stats.rank}</div>
                </div>
            </div>

            {/* Daily Chart */}
            <div className="glass-panel" style={{ padding: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Daily Net Worth</h2>
                <Chart data={history} />
            </div>
        </div>
    );
}
