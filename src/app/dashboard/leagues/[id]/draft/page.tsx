'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useParams, useRouter } from 'next/navigation';
import { Search, Plus, X, Lock, Loader2, Copy, Check, Trash2 } from 'lucide-react';

export default function DraftPage() {
    const params = useParams(); // { id }
    const router = useRouter();
    const [league, setLeague] = useState<any>(null);
    const [portfolio, setPortfolio] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isOwner, setIsOwner] = useState(false);

    // Each stock: { symbol, name, price, allocation: number (0-100) }
    const [selectedStocks, setSelectedStocks] = useState<any[]>([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [copied, setCopied] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        const loadInitialData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: leagueData } = await supabase
                .from('leagues')
                .select('*')
                .eq('id', params.id)
                .single();
            setLeague(leagueData);

            if (leagueData && leagueData.admin_id === user.id) {
                setIsOwner(true);
            }

            const { data: memberData } = await supabase
                .from('league_members')
                .select('id')
                .eq('league_id', params.id)
                .eq('user_id', user.id)
                .single();

            if (memberData) {
                const { data: portData } = await supabase
                    .from('portfolios')
                    .select('*')
                    .eq('member_id', memberData.id)
                    .single();

                setPortfolio(portData);

                if (portData && leagueData) {
                    const { data: holdings } = await supabase
                        .from('holdings')
                        .select('*, stocks(*)')
                        .eq('portfolio_id', portData.id);

                    if (holdings) {
                        // Reverse engineer percentage from quantity? 
                        // Qty * Price = Value. Value / Budget * 100 = %
                        const totalBudget = leagueData.budget;

                        const mapped = holdings.map(h => {
                            const val = h.quantity * h.avg_price;
                            const pct = totalBudget ? (val / totalBudget) * 100 : 0; // Default to 0 if budget is somehow 0 to avoid NaN
                            return {
                                symbol: h.stock_symbol,
                                description: h.stocks?.name,
                                price: h.avg_price,
                                allocation: parseFloat(pct.toFixed(1)) // rounded
                            };
                        });
                        setSelectedStocks(mapped);
                    }
                }
            }
            setLoading(false);
        };
        loadInitialData();
    }, [params.id]);

    // Search logic
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchQuery.length < 2) {
                setSearchResults([]);
                return;
            }
            setIsSearching(true);
            try {
                const res = await fetch(`/api/stocks/search?q=${searchQuery}`);
                const data = await res.json();
                if (data.result) setSearchResults(data.result.slice(0, 5));
            } catch (e) { console.error(e); }
            finally { setIsSearching(false); }
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    const addStock = async (stockResult: any) => {
        if (selectedStocks.find(s => s.symbol === stockResult.symbol)) return;

        try {
            const sym = stockResult.displaySymbol || stockResult.symbol;
            const res = await fetch(`/api/stocks/quote?symbol=${sym}`);
            const quoteData = await res.json();

            if (!quoteData || !quoteData.c) {
                alert("Could not fetch price for " + sym);
                return;
            }

            const newStock = {
                symbol: sym,
                name: stockResult.description,
                description: stockResult.description,
                price: quoteData.c,
                allocation: 0 // Init at 0%
            };

            setSelectedStocks([...selectedStocks, newStock]);
            setSearchQuery('');
            setSearchResults([]);
        } catch (e) {
            alert("Error fetching price");
        }
    };

    const removeStock = (symbol: string) => {
        setSelectedStocks(selectedStocks.filter(s => s.symbol !== symbol));
    };

    const updateAllocation = (symbol: string, val: string) => {
        // Allow empty string to let user clear input
        if (val === '') {
            setSelectedStocks(selectedStocks.map(s =>
                s.symbol === symbol ? { ...s, allocation: 0 } : s // or handle empty differently?? 
                // Better: keep it as 0 or empty string if allowed.
                // But my state expects number. Let's keep it 0 if empty for now or better
            ));
            return;
        }

        // Regex for valid number (positive float)
        if (!/^\d*\.?\d{0,2}$/.test(val)) return;

        // Prevent multiple decimals
        const num = parseFloat(val);
        if (isNaN(num) || num > 100) return; // Cap at 100 for percentage

        setSelectedStocks(selectedStocks.map(s =>
            s.symbol === symbol ? { ...s, allocation: num } : s
        ));
    };

    const totalAllocation = selectedStocks.reduce((sum, s) => sum + (s.allocation || 0), 0);

    const savePortfolio = async () => {
        if (!portfolio || !league) return;

        if (Math.abs(totalAllocation - 100) > 0.1) {
            alert(`Total allocation must be 100%. Currently: ${totalAllocation.toFixed(1)}%`);
            return;
        }

        setSaving(true);
        try {
            // Upsert Stocks
            const stocksToUpsert = selectedStocks.map(s => ({
                symbol: s.symbol,
                name: s.description || s.name,
                current_price: s.price,
                last_updated: new Date().toISOString()
            }));

            if (stocksToUpsert.length > 0) {
                await supabase.from('stocks').upsert(stocksToUpsert, { onConflict: 'symbol' });
            }

            // Calculate Holdings
            const holdingsToInsert = selectedStocks.map(s => {
                const allocatedCash = league.budget * (s.allocation / 100);
                const quantity = allocatedCash / s.price;

                return {
                    portfolio_id: portfolio.id,
                    stock_symbol: s.symbol,
                    quantity: quantity,
                    avg_price: s.price
                };
            });

            await supabase.from('holdings').delete().eq('portfolio_id', portfolio.id);

            if (holdingsToInsert.length > 0) {
                await supabase.from('holdings').insert(holdingsToInsert);
            }

            // Verify cash balance? In this model, we are fully invested or cash is 0?
            // If <100% allowed, remainder is cash. But user said "allocate 20, 30..." implying 100 total.
            // Let's set cash_balance based on remainder if we allow <100.
            // For now, prompt strict 100%.

            // Update portfolio cash (fake money spent)
            // Actually, if we hold stocks, our cash balance goes down.
            // Remaining cash = Budget - Allocated.
            const allocatedTotal = selectedStocks.reduce((sum, s) => sum + (league.budget * (s.allocation / 100)), 0);
            const remainingCash = league.budget - allocatedTotal;

            await supabase.from('portfolios').update({
                cash_balance: remainingCash,
                // total_value is strictly sum of holdings + cash. Since we just bought at current price, it equals budget.
            }).eq('id', portfolio.id);

            alert("Reference saved! Good luck.");
            router.push('/dashboard/portfolio');

        } catch (e: any) {
            alert("Save failed: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    const deleteLeague = async () => {
        if (!window.confirm("ARE YOU SURE? This will permanently delete this league and all portfolios within it. This action cannot be undone.")) return;
        setDeleting(true);

        try {
            // Manual Cascade Delete
            const { data: members } = await supabase.from('league_members').select('id').eq('league_id', league.id);
            const memberIds = members?.map(m => m.id) || [];

            if (memberIds.length > 0) {
                const { data: portfolios } = await supabase.from('portfolios').select('id').in('member_id', memberIds);
                const portfolioIds = portfolios?.map(p => p.id) || [];

                if (portfolioIds.length > 0) {
                    await supabase.from('holdings').delete().in('portfolio_id', portfolioIds);
                    await supabase.from('portfolios').delete().in('id', portfolioIds);
                }
                await supabase.from('league_members').delete().eq('league_id', league.id);
            }

            const { error } = await supabase.from('leagues').delete().eq('id', league.id);
            if (error) throw error;

            router.push('/dashboard');

        } catch (e: any) {
            console.error(e);
            alert("Failed to delete league: " + e.message);
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

    if (loading) return <div className="p-10 text-center">Loading...</div>;

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className="text-gradient" style={{ fontSize: '2rem', fontWeight: 'bold' }}>Draft Room</h1>
                    <p style={{ color: '#a1a1aa' }}>{league?.name} • Budget: ${league?.budget?.toLocaleString()}</p>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        onClick={savePortfolio}
                        className="btn-primary"
                        disabled={saving}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '140px', justifyContent: 'center' }}
                    >
                        {saving ? <Loader2 className="animate-spin" /> : <Lock size={18} />}
                        {saving ? 'Saving...' : 'Lock Portfolio'}
                    </button>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 450px', gap: '2rem' }}>

                {/* SEARCH AREA */}
                <div className="glass-panel" style={{ padding: '1.5rem', height: 'fit-content' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Market</h2>
                    <div style={{ position: 'relative' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                            <Search size={18} color="#a1a1aa" />
                            <input
                                type="text"
                                placeholder="Type symbol (e.g. NEBIUS, AAPL)..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                style={{ background: 'none', border: 'none', outline: 'none', color: 'white', width: '100%' }}
                            />
                            {isSearching && <Loader2 size={16} className="animate-spin" color="#a1a1aa" />}
                        </div>
                        {searchResults.length > 0 && (
                            <div style={{ marginTop: '0.5rem', background: '#171717', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', overflow: 'hidden' }}>
                                {searchResults.map((res) => (
                                    <button
                                        key={res.symbol}
                                        onClick={() => addStock(res)}
                                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '0.75rem', background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'white', cursor: 'pointer', textAlign: 'left' }}
                                    >
                                        <div>
                                            <span style={{ fontWeight: 'bold' }}>{res.displaySymbol}</span>
                                            <span style={{ display: 'block', fontSize: '0.75rem', color: '#a1a1aa' }}>{res.description}</span>
                                        </div>
                                        <Plus size={16} />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* PORTFOLIO AREA */}
                <div className="glass-panel" style={{ padding: '1.5rem', height: 'fit-content' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Allocations</h2>
                        <span style={{
                            fontWeight: 'bold',
                            color: totalAllocation > 100 ? '#ef4444' : (totalAllocation === 100 ? '#10b981' : '#eab308')
                        }}>
                            {totalAllocation.toFixed(1)}% / 100%
                        </span>
                    </div>

                    {selectedStocks.length === 0 ? (
                        <p style={{ color: '#a1a1aa', textAlign: 'center', padding: '2rem 0' }}>Search stocks to add them</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {selectedStocks.map((stock) => (
                                <div key={stock.symbol} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                            <span style={{ fontWeight: 'bold' }}>{stock.symbol}</span>
                                            <span style={{ fontSize: '0.875rem' }}>${stock.price?.toFixed(2)}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="100"
                                                    step="5"
                                                    value={stock.allocation || 0}
                                                    onChange={e => updateAllocation(stock.symbol, e.target.value)}
                                                    style={{
                                                        flex: 1,
                                                        accentColor: '#3b82f6',
                                                        height: '6px',
                                                        borderRadius: '3px',
                                                        cursor: 'pointer'
                                                    }}
                                                />
                                                <span style={{
                                                    minWidth: '3.5rem',
                                                    textAlign: 'right',
                                                    fontWeight: 'bold',
                                                    fontSize: '1rem'
                                                }}>
                                                    {stock.allocation || 0}%
                                                </span>
                                            </div>
                                            <span style={{ fontSize: '0.75rem', color: '#a1a1aa', minWidth: '80px', textAlign: 'right' }}>
                                                ≈ ${(league.budget * ((stock.allocation || 0) / 100)).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                    <button onClick={() => removeStock(stock.symbol)} style={{ marginLeft: '1rem', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>
                                        <X size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
