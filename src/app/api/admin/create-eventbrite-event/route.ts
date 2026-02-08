import { NextResponse } from 'next/server';
import { DateTime } from 'luxon';
import { requireAdmin } from '@/lib/admin-auth';

const EVENTBRITE_API_BASE = 'https://www.eventbriteapi.com/v3';

function toUtcIso(
    dateStr: string,
    timeStr: string,
    timezone: string,
): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    const [h, min] = timeStr.split(':').map(Number);
    const dt = DateTime.fromObject(
        { year: y, month: m, day: d, hour: h, minute: min, second: 0 },
        { zone: timezone },
    );
    if (!dt.isValid) {
        throw new Error(`Invalid date/time: ${dt.invalidReason}`);
    }
    return dt.toUTC().toISO()!;
}

export async function POST(request: Request) {
    const authError = await requireAdmin(request);
    if (authError) return authError;

    const token = process.env.EVENTBRITE_PRIVATE_TOKEN;
    const orgId = process.env.EVENTBRITE_ORGANIZATION_ID;
    if (!token || !orgId) {
        return NextResponse.json(
            {
                error:
                    'Eventbrite is not configured (EVENTBRITE_PRIVATE_TOKEN, EVENTBRITE_ORGANIZATION_ID)',
            },
            { status: 503 },
        );
    }

    let body: {
        eventName: string;
        description?: string;
        startDate: string;
        startTime: string;
        endDate: string;
        endTime: string;
        timezone: string;
        currency: string;
        isFree: boolean;
        onlineEvent: boolean;
        venueName?: string;
        address1?: string;
        address2?: string;
        city?: string;
        region?: string;
        postalCode?: string;
        country?: string;
        capacity?: number;
    };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { error: 'Invalid JSON body' },
            { status: 400 },
        );
    }

    const {
        eventName,
        description = '',
        startDate,
        startTime,
        endDate,
        endTime,
        timezone,
        currency,
        isFree,
        onlineEvent,
        venueName,
        address1,
        address2,
        city,
        region,
        postalCode,
        country,
        capacity,
    } = body;

    if (!eventName || !startDate || !startTime || !endDate || !endTime || !timezone || !currency) {
        return NextResponse.json(
            { error: 'Missing required fields: eventName, startDate, startTime, endDate, endTime, timezone, currency' },
            { status: 400 },
        );
    }

    let startUtc: string;
    let endUtc: string;
    try {
        startUtc = toUtcIso(startDate, startTime, timezone);
        endUtc = toUtcIso(endDate, endTime, timezone);
    } catch (e) {
        return NextResponse.json(
            { error: e instanceof Error ? e.message : 'Invalid date/time' },
            { status: 400 },
        );
    }

    const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
    };

    let venueId: string | null = null;
    if (!onlineEvent && (venueName || address1 || city || country)) {
        const venueRes = await fetch(
            `${EVENTBRITE_API_BASE}/organizations/${orgId}/venues/`,
            {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    venue: {
                        name: venueName || 'Venue',
                        address: {
                            address_1: address1,
                            address_2: address2 || undefined,
                            city: city,
                            region: region || undefined,
                            postal_code: postalCode || undefined,
                            country: country || 'AU',
                        },
                    },
                }),
            },
        );
        if (!venueRes.ok) {
            const err = await venueRes.text();
            console.error('Eventbrite venue creation failed:', venueRes.status, err);
            return NextResponse.json(
                { error: 'Failed to create venue on Eventbrite' },
                { status: 502 },
            );
        }
        const venueData = await venueRes.json();
        venueId = venueData.id ?? null;
    }

    const eventPayload: Record<string, unknown> = {
        name: { html: eventName },
        start: { timezone, utc: startUtc },
        end: { timezone, utc: endUtc },
        currency,
        online_event: onlineEvent,
        listed: true,
    };
    if (venueId) {
        eventPayload.venue_id = venueId;
    }
    if (capacity != null && capacity > 0) {
        eventPayload.capacity = capacity;
    }
    if (description) {
        eventPayload.description = { html: description.replace(/\n/g, '<br>') };
    }

    const eventRes = await fetch(
        `${EVENTBRITE_API_BASE}/organizations/${orgId}/events/`,
        {
            method: 'POST',
            headers,
            body: JSON.stringify({ event: eventPayload }),
        },
    );
    if (!eventRes.ok) {
        const err = await eventRes.text();
        console.error('Eventbrite event creation failed:', eventRes.status, err);
        return NextResponse.json(
            { error: 'Failed to create event on Eventbrite' },
            { status: 502 },
        );
    }
    const eventData = await eventRes.json();
    const eventId = eventData.id;
    const eventUrl = eventData.url;

    const quantityTotal = capacity && capacity > 0 ? capacity : 100;
    const ticketRes = await fetch(
        `${EVENTBRITE_API_BASE}/events/${eventId}/ticket_classes/`,
        {
            method: 'POST',
            headers,
            body: JSON.stringify({
                ticket_class: {
                    name: 'General Admission',
                    quantity_total: quantityTotal,
                    free: isFree,
                },
            }),
        },
    );
    if (!ticketRes.ok) {
        const err = await ticketRes.text();
        console.error('Eventbrite ticket class failed:', ticketRes.status, err);
        return NextResponse.json(
            { error: 'Event created but failed to add ticket class' },
            { status: 502 },
        );
    }

    const publishRes = await fetch(
        `${EVENTBRITE_API_BASE}/events/${eventId}/publish/`,
        {
            method: 'POST',
            headers,
        },
    );
    if (!publishRes.ok) {
        const err = await publishRes.text();
        console.error('Eventbrite publish failed:', publishRes.status, err);
        return NextResponse.json(
            { error: 'Event created but failed to publish' },
            { status: 502 },
        );
    }

    return NextResponse.json({
        eventId,
        eventUrl: eventUrl ?? `https://www.eventbrite.com/e/${eventId}`,
    });
}
