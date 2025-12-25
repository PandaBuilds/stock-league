import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');

    if (!q) {
        return NextResponse.json({ result: [] });
    }

    const apiKey = process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: 'API Key missing' }, { status: 500 });
    }

    try {
        // Finnhub Symbol Search
        const res = await fetch(`https://finnhub.io/api/v1/search?q=${q}&token=${apiKey}`);
        const data = await res.json();

        // Filter for common stocks to reduce noise (US exchanges roughly)
        // Finnhub returns a lot of stuff. We'll send back top matches.
        return NextResponse.json(data);
    } catch (e) {
        return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
    }
}
