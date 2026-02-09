'use client';

import { useState, useCallback } from 'react';
import { BackArrowIcon } from '@/components/back-arrow-icon';

const COMMON_TIMEZONES = [
    'Australia/Melbourne',
    'Australia/Sydney',
    'Australia/Brisbane',
    'Australia/Adelaide',
    'Australia/Perth',
    'UTC',
    'Europe/London',
];

export type EventbriteFormState = {
    eventName: string;
    description: string;
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
    timezone: string;
    currency: string;
    isFree: boolean;
    onlineEvent: boolean;
    venueName: string;
    address1: string;
    address2: string;
    city: string;
    region: string;
    postalCode: string;
    country: string;
    capacity: string;
};

export function getDefaultEventbriteForm(
    bookTitle: string,
    bookAuthor: string,
    meetingDate?: string | null,
): EventbriteFormState {
    const pad = (n: number) => String(n).padStart(2, '0');
    let start: Date;
    if (meetingDate) {
        start = new Date(meetingDate + 'T12:00:00');
        start.setHours(18, 30, 0, 0);
    } else {
        const now = new Date();
        start = new Date(now);
        start.setMonth(start.getMonth() + 1);
        start.setDate(15);
        start.setHours(18, 30, 0, 0);
    }
    const end = new Date(start);
    end.setHours(21, 0, 0, 0);
    return {
        eventName: 'Monthly social book club',
        description: `Elwood Book Club is a social monthly book club.\n\nFor each meet-up we try out a new bar near Elwood. This month we are meeting at Republica in St Kilda.\n\nWe are a pretty chilled bunch - our meet-ups are relaxed catch ups where we chat about the book and also each other.\n\nOur members choose our book each month. This month we are reading '${bookTitle}' by ${bookAuthor}.\n\nWe're pretty keen on keeping it low-key, so if you've had a hectic week at work and not finished the book..rock up anyway. No judgement or pressure here.`,
        startDate: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
        startTime: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
        endDate: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`,
        endTime: `${pad(end.getHours())}:${pad(end.getMinutes())}`,
        timezone: 'Australia/Melbourne',
        currency: 'AUD',
        isFree: true,
        onlineEvent: false,
        venueName: 'Republica St Kilda Beach',
        address1: '10-18 Jacka Boulevard',
        address2: '#1A-1D St Kilda',
        city: 'St Kilda',
        region: 'VIC',
        postalCode: '3182',
        country: 'AU',
        capacity: '30',
    };
}

export function EventbriteForm({
    bookTitle,
    bookAuthor,
    meetingDate,
    onBack,
    showBackButton = true,
}: {
    bookTitle: string;
    bookAuthor: string;
    meetingDate?: string | null;
    onBack?: () => void;
    showBackButton?: boolean;
}) {
    const [form, setForm] = useState<EventbriteFormState>(() =>
        getDefaultEventbriteForm(bookTitle, bookAuthor, meetingDate),
    );
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [eventUrl, setEventUrl] = useState<string | null>(null);

    const update = useCallback(
        <K extends keyof EventbriteFormState>(
            key: K,
            value: EventbriteFormState[K],
        ) => {
            setForm((prev) => ({ ...prev, [key]: value }));
        },
        [],
    );

    const handleSubmit = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();
            setSubmitting(true);
            setSubmitError(null);
            try {
                const res = await fetch('/api/admin/create-eventbrite-event', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        eventName: form.eventName,
                        description: form.description,
                        startDate: form.startDate,
                        startTime: form.startTime,
                        endDate: form.endDate,
                        endTime: form.endTime,
                        timezone: form.timezone,
                        currency: form.currency,
                        isFree: form.isFree,
                        onlineEvent: form.onlineEvent,
                        venueName: form.venueName,
                        address1: form.address1,
                        address2: form.address2,
                        city: form.city,
                        region: form.region,
                        postalCode: form.postalCode,
                        country: form.country,
                        capacity: form.capacity
                            ? parseInt(form.capacity, 10)
                            : undefined,
                    }),
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                    setSubmitError(data.error ?? 'Failed to create event');
                    return;
                }
                setSubmitSuccess(true);
                if (data.eventUrl) setEventUrl(data.eventUrl);
            } catch {
                setSubmitError('Network error');
            } finally {
                setSubmitting(false);
            }
        },
        [form],
    );

    if (submitSuccess) {
        return (
            <div className="space-y-4">
                <div className="rounded-lg border border-border bg-surface p-4 text-center">
                    <p className="text-lg font-semibold text-foreground">
                        Event created on Eventbrite
                    </p>
                    {eventUrl && (
                        <a
                            href={eventUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-block text-sm text-[var(--primary)] underline"
                        >
                            View event
                        </a>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {showBackButton && onBack && (
                <button
                    type="button"
                    onClick={onBack}
                    className="inline-flex items-center gap-1.5 text-sm text-muted underline hover:no-underline"
                >
                    <BackArrowIcon className="size-4 shrink-0" />
                    Back
                </button>
            )}
            <h2 className="text-lg font-semibold">Create event on Eventbrite</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="text-xs font-medium text-muted block mb-1">
                        Event name
                    </label>
                    <input
                        type="text"
                        value={form.eventName}
                        onChange={(e) => update('eventName', e.target.value)}
                        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                        required
                    />
                </div>
                <div>
                    <label className="text-xs font-medium text-muted block mb-1">
                        Description
                        {bookTitle && bookAuthor && (
                            <span className="font-normal">
                                {' '}
                                (Retrieved book of the month &lsquo;{bookTitle}&rsquo; by{' '}
                                {bookAuthor})
                            </span>
                        )}
                    </label>
                    <textarea
                        value={form.description}
                        onChange={(e) => update('description', e.target.value)}
                        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm min-h-[120px]"
                        rows={6}
                    />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs font-medium text-muted block mb-1">
                            Start date
                        </label>
                        <input
                            type="date"
                            value={form.startDate}
                            onChange={(e) =>
                                update('startDate', e.target.value)
                            }
                            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                            required
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-muted block mb-1">
                            Start time
                        </label>
                        <input
                            type="time"
                            value={form.startTime}
                            onChange={(e) =>
                                update('startTime', e.target.value)
                            }
                            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                            required
                        />
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs font-medium text-muted block mb-1">
                            End date
                        </label>
                        <input
                            type="date"
                            value={form.endDate}
                            onChange={(e) =>
                                update('endDate', e.target.value)
                            }
                            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                            required
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-muted block mb-1">
                            End time
                        </label>
                        <input
                            type="time"
                            value={form.endTime}
                            onChange={(e) =>
                                update('endTime', e.target.value)
                            }
                            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                            required
                        />
                    </div>
                </div>
                <div>
                    <label className="text-xs font-medium text-muted block mb-1">
                        Timezone
                    </label>
                    <select
                        value={form.timezone}
                        onChange={(e) =>
                            update('timezone', e.target.value)
                        }
                        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                    >
                        {COMMON_TIMEZONES.map((tz) => (
                            <option key={tz} value={tz}>
                                {tz}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="text-xs font-medium text-muted block mb-1">
                        Currency
                    </label>
                    <input
                        type="text"
                        value={form.currency}
                        onChange={(e) =>
                            update('currency', e.target.value)
                        }
                        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                        required
                    />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={form.isFree}
                        onChange={(e) =>
                            update('isFree', e.target.checked)
                        }
                        className="rounded border-border"
                    />
                    <span className="text-sm">Free event</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={form.onlineEvent}
                        onChange={(e) =>
                            update('onlineEvent', e.target.checked)
                        }
                        className="rounded border-border"
                    />
                    <span className="text-sm">Online event</span>
                </label>
                {!form.onlineEvent && (
                    <>
                        <div>
                            <label className="text-xs font-medium text-muted block mb-1">
                                Venue name
                            </label>
                            <input
                                type="text"
                                value={form.venueName}
                                onChange={(e) =>
                                    update('venueName', e.target.value)
                                }
                                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted block mb-1">
                                Address line 1
                            </label>
                            <input
                                type="text"
                                value={form.address1}
                                onChange={(e) =>
                                    update('address1', e.target.value)
                                }
                                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted block mb-1">
                                Address line 2
                            </label>
                            <input
                                type="text"
                                value={form.address2}
                                onChange={(e) =>
                                    update('address2', e.target.value)
                                }
                                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <label className="text-xs font-medium text-muted block mb-1">
                                    City
                                </label>
                                <input
                                    type="text"
                                    value={form.city}
                                    onChange={(e) =>
                                        update('city', e.target.value)
                                    }
                                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted block mb-1">
                                    Region / State
                                </label>
                                <input
                                    type="text"
                                    value={form.region}
                                    onChange={(e) =>
                                        update('region', e.target.value)
                                    }
                                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted block mb-1">
                                    Postal code
                                </label>
                                <input
                                    type="text"
                                    value={form.postalCode}
                                    onChange={(e) =>
                                        update('postalCode', e.target.value)
                                    }
                                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted block mb-1">
                                Country (e.g. AU)
                            </label>
                            <input
                                type="text"
                                value={form.country}
                                onChange={(e) =>
                                    update('country', e.target.value)
                                }
                                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                            />
                        </div>
                    </>
                )}
                <div>
                    <label className="text-xs font-medium text-muted block mb-1">
                        Capacity (optional)
                    </label>
                    <input
                        type="number"
                        min={1}
                        value={form.capacity}
                        onChange={(e) =>
                            update('capacity', e.target.value)
                        }
                        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                        placeholder="Leave blank for no limit"
                    />
                </div>
                {submitError && (
                    <p className="text-sm text-red-600 dark:text-red-400">
                        {submitError}
                    </p>
                )}
                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-lg bg-primary text-primary-foreground px-4 py-3 text-sm font-medium hover:bg-[var(--primary-hover)] disabled:opacity-50"
                >
                    {submitting
                        ? 'Creating…'
                        : 'Create event on Eventbrite'}
                </button>
            </form>
        </div>
    );
}
