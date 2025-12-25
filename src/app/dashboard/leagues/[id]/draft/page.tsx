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
    const [deleting, setDeleting] = useState(false);
    const [copied, setCopied] = useState(false);

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
                        const totalBudget = leagueData.budget;
                        const mapped = holdings.map(h => {
                            const val = h.quantity * h.avg_price;
                            const pct = totalBudget ? (val / totalBudget) * 100 : 0;
                            return {
                                symbol: h.stock_symbol,
                                description: h.stocks?.name,
                                price: h.avg_price,
                                allocation: parseFloat(pct.toFixed(1))
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
        if (!league || league.is_locked) return; // Disable search if locked

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
    }, [searchQuery, league]);

    const addStock = async (stockResult: any) => {
        if (league.is_locked) return;
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
        if (league.is_locked) return;
        setSelectedStocks(selectedStocks.filter(s => s.symbol !== symbol));
    };

    const updateAllocation = (symbol: string, val: string) => {
        if (league.is_locked) return;

        // Allow empty string to let user clear input
        if (val === '') {
            setSelectedStocks(selectedStocks.map(s =>
                s.symbol === symbol ? { ...s, allocation: 0 } : s
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
        if (league.is_locked) {
            alert("League is locked. You cannot save changes.");
            return;
        }

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

            const allocatedTotal = selectedStocks.reduce((sum, s) => sum + (league.budget * (s.allocation / 100)), 0);
            const remainingCash = league.budget - allocatedTotal;

            await supabase.from('portfolios').update({
                cash_balance: remainingCash,
            }).eq('id', portfolio.id);

            alert("Portfolio saved successfully!");
            router.push('/dashboard/portfolio');

        } catch (e: any) {
            alert("Save failed: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-10 text-center">Loading...</div>;

    const isLocked = league?.is_locked;

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '4rem' }}>
            <header style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 className="text-gradient" style={{ fontSize: '2rem', fontWeight: 'bold' }}>Draft Room</h1>
                        <p style={{ color: '#a1a1aa' }}>{league?.name} • Budget: ${league?.budget?.toLocaleString()}</p>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        {/* Save Button (Only if NOT locked) */}
                        {!isLocked && (
                            <button
                                onClick={savePortfolio}
                                className="btn-primary" // Assuming global class or we style inline
                                disabled={saving}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '140px', justifyContent: 'center',
                                    background: 'linear-gradient(135deg, #34d399 0%, #22d3ee 100%)',
                                    color: '#0f172a',
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: '8px',
                                    border: 'none',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                {saving ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                                {saving ? 'Saving...' : 'Save Portfolio'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Locked Banner */}
                {
                    isLocked && (
                        <div style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: '8px',
                            padding: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            color: '#f87171'
                        }}>
                            <Lock size={24} />
                            <div>
                                <h3 style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>League is Locked</h3>
                                <p style={{ fontSize: '0.875rem', opacity: 0.9 }}>
                                    The admin has locked this league. Portfolios cannot be modified at this time.
                                    {isOwner && " You can unlock it above to make changes."}
                                </p>
                            </div>
                        </div>
                    )
                }
            </header >

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>

                {/* SEARCH AREA */}
                <div className="glass-panel" style={{ flex: '1 1 300px', padding: '1.5rem', height: 'fit-content', opacity: isLocked ? 0.5 : 1, pointerEvents: isLocked ? 'none' : 'auto' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Market</h2>
                    <div style={{ position: 'relative' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                            <Search size={18} color="#a1a1aa" />
                            <input
                                type="text"
                                placeholder={isLocked ? "Search disabled (Locked)" : "Type symbol (e.g. NEBIUS, AAPL)..."}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                disabled={isLocked}
                                style={{ background: 'none', border: 'none', outline: 'none', color: 'white', width: '100%', cursor: isLocked ? 'not-allowed' : 'text' }}
                            />
                            {isSearching && <Loader2 size={16} className="animate-spin" color="#a1a1aa" />}
                        </div>
                        {searchResults.length > 0 && (
                            <div style={{ marginTop: '0.5rem', background: '#171717', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', overflow: 'hidden', position: 'absolute', width: '100%', zIndex: 10 }}>
                                {searchResults.map((res) => (
                                    <button
                                        key={res.symbol}
                                        onClick={() => addStock(res)}
                                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '0.75rem', background: '#1e293b', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'white', cursor: 'pointer', textAlign: 'left' }}
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
                <div className="glass-panel" style={{ flex: '1 1 400px', padding: '1.5rem', height: 'fit-content' }}>
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
                        <p style={{ color: '#a1a1aa', textAlign: 'center', padding: '2rem 0' }}>{isLocked ? "No stocks selected." : "Search stocks to add them"}</p>
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
                                                    disabled={isLocked}
                                                    value={stock.allocation || 0}
                                                    onChange={e => updateAllocation(stock.symbol, e.target.value)}
                                                    style={{
                                                        flex: 1,
                                                        accentColor: isLocked ? '#64748b' : '#3b82f6',
                                                        height: '6px',
                                                        borderRadius: '3px',
                                                        cursor: isLocked ? 'not-allowed' : 'pointer',
                                                        opacity: isLocked ? 0.5 : 1
                                                    }}
                                                />
                                                <span style={{
                                                    minWidth: '3.5rem',
                                                    textAlign: 'right',
                                                    fontWeight: 'bold',
                                                    fontSize: '1rem',
                                                    color: isLocked ? '#94a3b8' : 'white'
                                                }}>
                                                    {stock.allocation || 0}%
                                                </span>
                                            </div>
                                            <span style={{ fontSize: '0.75rem', color: '#a1a1aa', minWidth: '80px', textAlign: 'right' }}>
                                                ≈ ${(league.budget * ((stock.allocation || 0) / 100)).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => removeStock(stock.symbol)}
                                        disabled={isLocked}
                                        style={{
                                            marginLeft: '1rem',
                                            color: isLocked ? '#64748b' : '#ef4444',
                                            background: 'none',
                                            border: 'none',
                                            cursor: isLocked ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
}
