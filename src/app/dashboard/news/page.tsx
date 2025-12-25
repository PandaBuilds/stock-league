'use client';

import { useState, useEffect } from 'react';
import { finnhubClient, NewsItem } from '@/lib/finnhub';
import { supabase } from '@/lib/supabaseClient';
import { Search, TrendingUp, Newspaper, ArrowRight, Loader2 } from 'lucide-react';
import styles from './page.module.css';

export default function NewsPage() {
    const [generalNews, setGeneralNews] = useState<NewsItem[]>([]);
    const [portfolioNews, setPortfolioNews] = useState<NewsItem[]>([]);
    const [searchResults, setSearchResults] = useState<NewsItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searching, setSearching] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // 1. Fetch General Market News
                const marketNews = await finnhubClient.getGeneralNews('general');
                setGeneralNews(marketNews.slice(0, 5));

                // 2. Fetch User's League Stocks
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: leagues } = await supabase
                        .from('league_participants')
                        .select(`
                            league_id,
                            leagues ( status ),
                            portfolio_value
                        `)
                        .eq('user_id', user.id)
                        .eq('leagues.status', 'active')
                        .limit(1);

                    if (leagues && leagues.length > 0) {
                        const leagueId = leagues[0].league_id;
                        const { data: portfolio } = await supabase
                            .from('portfolio_stocks')
                            .select('symbol')
                            .eq('league_id', leagueId)
                            .eq('user_id', user.id);

                        if (portfolio && portfolio.length > 0) {
                            const symbols = portfolio.map(p => p.symbol).slice(0, 3);
                            const today = new Date().toISOString().split('T')[0];
                            const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

                            const newsPromises = symbols.map(sym => finnhubClient.getCompanyNews(sym, lastWeek, today));
                            const results = await Promise.all(newsPromises);
                            const combinedNews = results.flat().sort((a, b) => b.datetime - a.datetime).slice(0, 10);
                            setPortfolioNews(combinedNews);
                        }
                    }
                }

            } catch (error) {
                console.error('Error loading news:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setSearching(true);
        try {
            const today = new Date().toISOString().split('T')[0];
            const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const news = await finnhubClient.getCompanyNews(searchQuery.toUpperCase(), lastMonth, today);
            setSearchResults(news);
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setSearching(false);
        }
    };

    const NewsCard = ({ item }: { item: NewsItem }) => (
        <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.newsCard}
        >
            {item.image && (
                <div className={styles.cardImageWrapper}>
                    <img
                        src={item.image}
                        alt={item.headline}
                        className={styles.cardImage}
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                        }}
                    />
                </div>
            )}
            <div className={styles.cardContent}>
                <div>
                    <div className={styles.meta}>
                        <span className={styles.categoryTag}>
                            {item.category.toUpperCase()}
                        </span>
                        <span className={styles.date}>
                            {new Date(item.datetime * 1000).toLocaleDateString()}
                        </span>
                        <span className={styles.date}>
                            {item.source}
                        </span>
                    </div>
                    <h3 className={styles.headline}>
                        {item.headline}
                    </h3>
                    <p className={styles.summary}>
                        {item.summary}
                    </p>
                </div>
                <div className={styles.readMore}>
                    Read Full Story <ArrowRight size={14} style={{ marginLeft: '4px' }} />
                </div>
            </div>
        </a>
    );

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>
                    Market Intelligence
                </h1>
                <p className={styles.subtitle}>
                    Stay informed with the latest market updates and daily recaps.
                </p>
            </header>

            <div className={styles.grid}>
                {/* Left Column */}
                <div className={styles.column}>

                    {/* Search Section */}
                    <div className={`glass-panel ${styles.section}`}>
                        <h2 className={styles.sectionTitle}>
                            <Search size={20} className={styles.sectionIcon} />
                            Search News
                        </h2>
                        <form onSubmit={handleSearch} className={styles.searchForm}>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Enter symbol (e.g. AAPL)..."
                                className={styles.searchInput}
                            />
                            <button
                                type="submit"
                                disabled={searching}
                                className={styles.searchButton}
                            >
                                {searching ? <Loader2 size={18} className={styles.loader} /> : 'Search'}
                            </button>
                        </form>

                        {/* Search Results */}
                        {searchResults.length > 0 && (
                            <div className={styles.cardList}>
                                {searchResults.map((item) => (
                                    <NewsCard key={item.id} item={item} />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* General News Section */}
                    <div className={`glass-panel ${styles.section}`}>
                        <h2 className={styles.sectionTitle}>
                            <TrendingUp size={20} className={styles.sectionIcon} />
                            Daily Market Recap
                        </h2>
                        {loading ? (
                            <div className={styles.centerLoader}>
                                <Loader2 size={32} className={styles.loader} />
                            </div>
                        ) : (
                            <div className={styles.cardList}>
                                {generalNews.map((item) => (
                                    <NewsCard key={item.id} item={item} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Portfolio News */}
                <div className={styles.column}>
                    <div className={`glass-panel ${styles.section}`} style={{ position: 'sticky', top: '1.5rem' }}>
                        <h2 className={styles.sectionTitle}>
                            <Newspaper size={20} className={styles.sectionIcon} />
                            Your Portfolio News
                        </h2>

                        {loading ? (
                            <div className={styles.centerLoader}>
                                <Loader2 size={32} className={styles.loader} />
                            </div>
                        ) : portfolioNews.length > 0 ? (
                            <div>
                                {portfolioNews.map((item) => (
                                    <div key={item.id} className={styles.portfolioItem}>
                                        <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                                            <div className={styles.portfolioItemHeader}>
                                                <span className={styles.tickerTag}>
                                                    {item.related || 'PORTFOLIO'}
                                                </span>
                                                <span className={styles.date}>
                                                    {new Date(item.datetime * 1000).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <h4 className={styles.headline} style={{ fontSize: '1rem' }}>
                                                {item.headline}
                                            </h4>
                                            {item.image && (
                                                <img
                                                    src={item.image}
                                                    alt="News"
                                                    className={styles.portfolioImage}
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                    }}
                                                />
                                            )}
                                        </a>
                                        <div className={styles.divider} />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className={styles.emptyState}>
                                <p>No portfolio news available.</p>
                                <p className={styles.summary} style={{ marginTop: '0.5rem' }}>Join a league and pick stocks to see personalized news here.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
