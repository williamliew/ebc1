import { NextResponse } from 'next/server';
import { getOpenLibraryBooksDetails } from '@/lib/open-library';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get('ids');
    if (!idsParam || !idsParam.trim()) {
        return NextResponse.json(
            {
                error: 'Missing ids query (e.g. ?ids=/works/OL19922194W,/works/OL123W)',
            },
            { status: 400 },
        );
    }
    const ids = idsParam
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
    if (ids.length === 0 || ids.length > 10) {
        return NextResponse.json(
            {
                error: 'ids must be 1–10 comma-separated Open Library work keys',
            },
            { status: 400 },
        );
    }

    try {
        const books = await getOpenLibraryBooksDetails(ids);
        return NextResponse.json({ books });
    } catch (err) {
        console.error('Book details error:', err);
        return NextResponse.json(
            { error: 'Failed to fetch book details' },
            { status: 500 },
        );
    }
}
