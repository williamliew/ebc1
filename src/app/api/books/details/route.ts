import { NextResponse } from 'next/server';
import { getBooksDetails } from '@/lib/google-books';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get('ids');
    if (!idsParam || !idsParam.trim()) {
        return NextResponse.json(
            { error: 'Missing ids query (e.g. ?ids=id1,id2)' },
            { status: 400 },
        );
    }
    const ids = idsParam
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
    if (ids.length === 0 || ids.length > 10) {
        return NextResponse.json(
            { error: 'ids must be 1–10 comma-separated volume IDs' },
            { status: 400 },
        );
    }

    try {
        const books = await getBooksDetails(ids);
        return NextResponse.json({ books });
    } catch (err) {
        console.error('Book details error:', err);
        return NextResponse.json(
            { error: 'Failed to fetch book details' },
            { status: 500 },
        );
    }
}
