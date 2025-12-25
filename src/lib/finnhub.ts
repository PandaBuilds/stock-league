export const FINNHUB_API_KEY = process.env.NEXT_PUBLIC_FINNHUB_API_KEY;

if (!FINNHUB_API_KEY) {
    console.warn('Finnhub API key is missing. Ensure NEXT_PUBLIC_FINNHUB_API_KEY is set in your environment.');
}

const BASE_URL = 'https://finnhub.io/api/v1';

export type NewsItem = {
    category: string;
    datetime: number;
    headline: string;
    id: number;
    image: string;
    related: string;
    source: string;
    summary: string;
    url: string;
};

export type SentimentData = {
    symbol: string;
    sentiment: {
        bullishPercent: number;
        bearishPercent: number;
    } | null;
    score: number | null; // Derived score if not directly provided
};

export const finnhubClient = {
    /**
     * Fetch general market news
     * Category examples: 'general', 'forex', 'crypto', 'merger'
     */
    getGeneralNews: async (category: string = 'general'): Promise<NewsItem[]> => {
        try {
            const res = await fetch(`${BASE_URL}/news?category=${category}&token=${FINNHUB_API_KEY}`);
            if (!res.ok) throw new Error('Failed to fetch general news');
            return await res.json();
        } catch (error) {
            console.error('Error fetching general news:', error);
            return [];
        }
    },

    /**
     * Fetch company specific news
     * Date format: YYYY-MM-DD
     */
    getCompanyNews: async (symbol: string, from: string, to: string): Promise<NewsItem[]> => {
        try {
            const res = await fetch(
                `${BASE_URL}/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`
            );
            if (!res.ok) throw new Error(`Failed to fetch news for ${symbol}`);
            return await res.json();
        } catch (error) {
            console.error(`Error fetching news for ${symbol}:`, error);
            return [];
        }
    },

    /**
     * Fetch quote for a symbol
     */
    getQuote: async (symbol: string) => {
        try {
            const res = await fetch(`${BASE_URL}/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`);
            if (!res.ok) throw new Error(`Failed to fetch quote for ${symbol}`);
            return await res.json();
        } catch (error) {
            console.error(`Error fetching quote for ${symbol}:`, error);
            return null;
        }
    },

    /**
     * Search for symbols
     */
    searchSymbols: async (q: string) => {
        try {
            const res = await fetch(`${BASE_URL}/search?q=${q}&token=${FINNHUB_API_KEY}`);
            if (!res.ok) throw new Error(`Failed to search for ${q}`);
            return await res.json();
        } catch (error) {
            console.error(`Error searching symbols:`, error);
            return { result: [] };
        }
    }
};
