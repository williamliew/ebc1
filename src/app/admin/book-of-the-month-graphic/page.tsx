'use client';

import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { useRef, useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { HeadlessEditor } from '@/components/headless-editor';
import { sanitiseBlurb } from '@/lib/sanitize-blurb';

const QRCodeSVG = dynamic(
    () => import('qrcode.react').then((mod) => ({ default: mod.QRCodeSVG })),
    { ssr: false },
);

const PREVIEW_FONTS = [
    {
        value: 'Playwrite NZ',
        label: 'Playwrite New Zealand Basic',
        fontFamily: '"Playwrite NZ", cursive',
    },
    {
        value: 'Great Vibes',
        label: 'Great Vibes',
        fontFamily: '"Great Vibes", cursive',
    },
    {
        value: 'Courgette',
        label: 'Courgette',
        fontFamily: 'Courgette, cursive',
    },
];

type NominationBook = {
    externalId: string;
    title: string;
    author: string;
    coverUrl: string | null;
};

export default function QuestionBuilderPage() {
    const printRef = useRef<HTMLDivElement>(null);
    const [backgroundType, setBackgroundType] = useState<
        'colour' | 'upload' | 'url'
    >('colour');
    const [backgroundColour, setBackgroundColour] = useState('#fffbeb');
    const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(
        null,
    );
    const [backgroundImageUrlInput, setBackgroundImageUrlInput] = useState('');
    const [bookclubTitle, setBookclubTitle] = useState('Elwood Book Club');
    const [bookTitle, setBookTitle] = useState('');
    const [bookAuthor, setBookAuthor] = useState('');
    const [additionalText, setAdditionalText] = useState('');
    const [qrUrl, setQrUrl] = useState('https://www.google.com/');
    const [textColor, setTextColor] = useState<'white' | 'black'>('black');
    const [textOverlay, setTextOverlay] = useState<'none' | 'dark' | 'light'>(
        'none',
    );
    const [previewFont, setPreviewFont] = useState(PREVIEW_FONTS[0].fontFamily);
    const [previewFontSize, setPreviewFontSize] = useState(100); // scale 75–150%

    const { data: nominationData } = useQuery({
        queryKey: ['nomination'],
        queryFn: async () => {
            const res = await fetch('/api/nomination');
            if (!res.ok) return null;
            return res.json() as Promise<{
                round: { meetingDate: string } | null;
                books: NominationBook[];
            }>;
        },
    });

    const books = nominationData?.books ?? [];
    const latestBook = books[0];

    const hasAdditionalText =
        additionalText && additionalText.replace(/<[^>]+>/g, '').trim() !== '';

    const textOverlayBackground =
        textOverlay === 'none'
            ? 'transparent'
            : textOverlay === 'dark'
              ? 'rgba(0,0,0,0.5)'
              : 'rgba(255,255,255,0.5)';

    const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        setBackgroundImageUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
        });
    };

    const [isPreviewFullScreen, setIsPreviewFullScreen] = useState(false);
    const [fullscreenControlsVisible, setFullscreenControlsVisible] =
        useState(true);

    useEffect(() => {
        if (!isPreviewFullScreen) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsPreviewFullScreen(false);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isPreviewFullScreen]);

    const previewTextStyle = useMemo(
        () => ({
            fontFamily: previewFont,
            fontSize: `${(previewFontSize / 100) * 16}px`,
        }),
        [previewFont, previewFontSize],
    );

    const backgroundStyle = useMemo(
        () =>
            backgroundType === 'upload' && backgroundImageUrl
                ? {
                      backgroundImage: `url(${backgroundImageUrl})`,
                      backgroundSize: 'auto 100%' as const,
                      backgroundPosition: 'center',
                  }
                : backgroundType === 'url' && backgroundImageUrlInput.trim()
                  ? {
                        backgroundImage: `url(${backgroundImageUrlInput.trim()})`,
                        backgroundSize: 'auto 100%' as const,
                        backgroundPosition: 'center',
                    }
                  : backgroundType === 'colour'
                    ? { backgroundColor: backgroundColour }
                    : {},
        [
            backgroundType,
            backgroundImageUrl,
            backgroundImageUrlInput,
            backgroundColour,
        ],
    );

    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="border-b border-border bg-surface px-4 py-4 print:hidden">
                <Link
                    href="/"
                    className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground mb-2"
                >
                    ← Back to home
                </Link>
                <h1 className="text-xl font-semibold">
                    Book of the month graphic
                </h1>
                <p className="text-sm text-muted mt-1">
                    Build a spread with a QR code for the WhatsApp group.
                </p>
            </header>

            <div className="max-w-4xl mx-auto p-4 flex flex-col lg:flex-row gap-8 print:block">
                {/* Form - hidden when printing */}
                <section className="flex-1 space-y-6 print:hidden">
                    <div>
                        <label className="text-sm font-medium text-foreground block mb-2">
                            Main heading
                        </label>
                        <input
                            type="text"
                            value={bookclubTitle}
                            onChange={(e) => setBookclubTitle(e.target.value)}
                            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                            placeholder="e.g. Elwood Book Club"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium text-foreground block mb-2">
                            Book (from latest nomination)
                        </label>
                        {latestBook ? (
                            <p className="text-sm text-muted">
                                Using: <strong>{latestBook.title}</strong> by{' '}
                                {latestBook.author}
                            </p>
                        ) : (
                            <p className="text-sm text-muted">
                                No nomination round yet. Fill in manually below.
                            </p>
                        )}
                        <div className="mt-2 grid grid-cols-2 gap-2">
                            <input
                                type="text"
                                value={bookTitle || (latestBook?.title ?? '')}
                                onChange={(e) => setBookTitle(e.target.value)}
                                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                                placeholder="Book title"
                            />
                            <input
                                type="text"
                                value={bookAuthor || (latestBook?.author ?? '')}
                                onChange={(e) => setBookAuthor(e.target.value)}
                                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                                placeholder="Book author"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-foreground block mb-2">
                            Body text
                        </label>
                        <HeadlessEditor
                            initialContent=""
                            onUpdate={setAdditionalText}
                            placeholder="Extra text for the spread (supports bold, italic, lists)"
                            className="w-full"
                            minHeight="80px"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium text-foreground block mb-2">
                            QR code URL (e.g. WhatsApp group link)
                        </label>
                        <input
                            type="url"
                            value={qrUrl}
                            onChange={(e) => setQrUrl(e.target.value)}
                            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                            placeholder="https://chat.whatsapp.com/..."
                        />
                    </div>

                    <div>
                        <span className="text-sm font-medium text-foreground block mb-2">
                            Background
                        </span>
                        <div className="flex flex-wrap gap-3 mb-2">
                            {(['colour', 'upload', 'url'] as const).map(
                                (type) => (
                                    <label
                                        key={type}
                                        className="flex items-center gap-2 cursor-pointer"
                                    >
                                        <input
                                            type="radio"
                                            name="bg"
                                            checked={backgroundType === type}
                                            onChange={() =>
                                                setBackgroundType(type)
                                            }
                                            className="rounded"
                                        />
                                        <span className="text-sm capitalize">
                                            {type === 'url'
                                                ? 'Image URL'
                                                : type}
                                        </span>
                                    </label>
                                ),
                            )}
                        </div>
                        {backgroundType === 'colour' && (
                            <div className="flex items-center gap-3">
                                <input
                                    type="color"
                                    value={backgroundColour}
                                    onChange={(e) =>
                                        setBackgroundColour(e.target.value)
                                    }
                                    className="h-10 w-14 cursor-pointer rounded border border-border bg-surface p-0.5"
                                    aria-label="Background colour"
                                />
                                <input
                                    type="text"
                                    value={backgroundColour}
                                    onChange={(e) =>
                                        setBackgroundColour(e.target.value)
                                    }
                                    className="rounded-lg border border-border bg-surface px-3 py-2 text-sm font-mono w-24 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                    aria-label="Background colour (hex)"
                                />
                            </div>
                        )}
                        {backgroundType === 'upload' && (
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleBackgroundUpload}
                                className="block text-sm text-muted file:mr-2 file:rounded file:border file:px-3 file:py-1.5 file:text-sm"
                            />
                        )}
                        {backgroundType === 'url' && (
                            <input
                                type="url"
                                value={backgroundImageUrlInput}
                                onChange={(e) =>
                                    setBackgroundImageUrlInput(e.target.value)
                                }
                                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                                placeholder="https://..."
                            />
                        )}
                    </div>

                    <div>
                        <span className="text-sm font-medium text-foreground block mb-2">
                            Text colour
                        </span>
                        <div className="flex gap-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="textColor"
                                    checked={textColor === 'black'}
                                    onChange={() => setTextColor('black')}
                                    className="rounded"
                                />
                                <span className="text-sm">Black</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="textColor"
                                    checked={textColor === 'white'}
                                    onChange={() => setTextColor('white')}
                                    className="rounded"
                                />
                                <span className="text-sm">White</span>
                            </label>
                        </div>
                    </div>

                    <div>
                        <span className="text-sm font-medium text-foreground block mb-2">
                            Transparent background (for text readability)
                        </span>
                        <div className="flex gap-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="textOverlay"
                                    checked={textOverlay === 'none'}
                                    onChange={() => setTextOverlay('none')}
                                    className="rounded"
                                />
                                <span className="text-sm">None</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="textOverlay"
                                    checked={textOverlay === 'dark'}
                                    onChange={() => setTextOverlay('dark')}
                                    className="rounded"
                                />
                                <span className="text-sm">Dark</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="textOverlay"
                                    checked={textOverlay === 'light'}
                                    onChange={() => setTextOverlay('light')}
                                    className="rounded"
                                />
                                <span className="text-sm">Light</span>
                            </label>
                        </div>
                    </div>

                    <div>
                        <label
                            htmlFor="preview-font"
                            className="text-sm font-medium text-foreground block mb-2"
                        >
                            Font
                        </label>
                        <select
                            id="preview-font"
                            value={previewFont}
                            onChange={(e) => setPreviewFont(e.target.value)}
                            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                            style={{ fontFamily: previewFont }}
                        >
                            {PREVIEW_FONTS.map((f) => (
                                <option key={f.value} value={f.fontFamily}>
                                    {f.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label
                            htmlFor="preview-font-size"
                            className="text-sm font-medium text-foreground block mb-2"
                        >
                            Font size ({previewFontSize}%)
                        </label>
                        <input
                            id="preview-font-size"
                            type="range"
                            min={75}
                            max={150}
                            value={previewFontSize}
                            onChange={(e) =>
                                setPreviewFontSize(Number(e.target.value))
                            }
                            className="w-full h-2 rounded-lg appearance-none bg-border accent-primary"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsPreviewFullScreen(true)}
                        className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-[var(--primary-hover)]"
                    >
                        Preview in full screen to screenshot
                    </button>
                </section>

                {/* Preview - shown in-page and when printing */}
                <section className="flex-1 print:flex-1 print:max-w-none">
                    <p className="text-sm font-medium text-muted mb-2 print:hidden">
                        Preview
                    </p>
                    <div
                        ref={printRef}
                        data-print-area
                        className="print-area rounded-xl overflow-hidden shadow-lg print:shadow-none print:rounded-none print:min-h-[100vh] print:absolute print:inset-0 print:w-full print:max-w-none"
                        style={{
                            ...backgroundStyle,
                            minHeight: '420px',
                        }}
                    >
                        {/* Semi-transparent overlay behind text for contrast */}
                        <div
                            className="p-6 min-h-[420px] flex flex-col justify-between"
                            style={{
                                backgroundColor: 'rgba(255,255,255,0.5)',
                            }}
                        >
                            <div
                                className="flex-1"
                                style={{
                                    ...previewTextStyle,
                                    backgroundColor: textOverlayBackground,
                                    color:
                                        textColor === 'white' ? '#fff' : '#111',
                                    padding: '1rem 1.25rem',
                                    borderRadius: '0.5rem',
                                }}
                            >
                                <h2
                                    className="font-semibold mb-1"
                                    style={{ fontSize: '1.125em' }}
                                >
                                    {bookclubTitle || 'Elwood Book Club'}
                                </h2>
                                <p
                                    className="font-medium opacity-90"
                                    style={{ fontSize: '0.875em' }}
                                >
                                    {bookTitle || 'Book title'} by{' '}
                                    {bookAuthor || 'Author'}
                                </p>
                                {hasAdditionalText && (
                                    <div
                                        className="additional-text-preview mt-2 opacity-90"
                                        style={{ fontSize: '0.875em' }}
                                        dangerouslySetInnerHTML={{
                                            __html: sanitiseBlurb(
                                                additionalText,
                                            ),
                                        }}
                                    />
                                )}
                            </div>
                            {qrUrl && (
                                <div className="mt-4 flex justify-end">
                                    <div
                                        className="p-2 rounded-lg"
                                        style={{
                                            backgroundColor:
                                                'rgba(255,255,255,0.9)',
                                        }}
                                    >
                                        <QRCodeSVG
                                            value={qrUrl}
                                            size={100}
                                            level="M"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </div>

            {/* Full-screen preview for screenshot */}
            {isPreviewFullScreen && (
                <div
                    className="fixed inset-0 z-50 flex flex-col bg-black/90"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Preview full screen"
                    onClick={() => setFullscreenControlsVisible((v) => !v)}
                >
                    <div
                        className={`absolute inset-0 z-10 flex flex-col justify-between transition-opacity duration-500 ${
                            fullscreenControlsVisible
                                ? 'opacity-100 pointer-events-none'
                                : 'opacity-0 pointer-events-none'
                        }`}
                        aria-hidden={!fullscreenControlsVisible}
                    >
                        <div
                            className={`flex justify-end p-4 ${
                                fullscreenControlsVisible
                                    ? 'pointer-events-auto'
                                    : 'pointer-events-none'
                            }`}
                        >
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsPreviewFullScreen(false);
                                }}
                                className="rounded-lg bg-primary/90 text-primary-foreground px-3 py-1.5 text-sm font-medium hover:bg-[var(--primary-hover)]/90"
                            >
                                Close
                            </button>
                        </div>
                        <div className="flex justify-center pb-4">
                            <p className="text-sm text-white/90 pointer-events-none bg-black/70 px-4 py-2 rounded-lg">
                                Click/tap screen to show or hide close button
                            </p>
                        </div>
                    </div>
                    {/* When button is hidden, this overlay captures tap to show it again */}
                    <div
                        className={`absolute inset-0 z-[9] ${
                            fullscreenControlsVisible
                                ? 'pointer-events-none'
                                : 'pointer-events-auto'
                        }`}
                        onClick={(e) => {
                            e.stopPropagation();
                            setFullscreenControlsVisible(true);
                        }}
                    />
                    <div
                        className="flex-1 w-full min-h-screen flex flex-col"
                        style={{
                            ...backgroundStyle,
                        }}
                    >
                        <div
                            className="flex-1 p-6 flex flex-col justify-between min-h-screen"
                            style={{
                                backgroundColor: 'rgba(255,255,255,0.5)',
                            }}
                        >
                            <div
                                className="flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full"
                                style={{
                                    ...previewTextStyle,
                                    backgroundColor: textOverlayBackground,
                                    color:
                                        textColor === 'white' ? '#fff' : '#111',
                                    padding: '1.5rem 2rem',
                                    borderRadius: '0.5rem',
                                }}
                            >
                                <h2
                                    className="font-semibold mb-1"
                                    style={{ fontSize: '1.25em' }}
                                >
                                    {bookclubTitle || 'Elwood Book Club'}
                                </h2>
                                <p
                                    className="font-medium opacity-90"
                                    style={{ fontSize: '1em' }}
                                >
                                    {bookTitle || 'Book title'} by{' '}
                                    {bookAuthor || 'Author'}
                                </p>
                                {hasAdditionalText && (
                                    <div
                                        className="additional-text-preview mt-2 opacity-90"
                                        style={{ fontSize: '1em' }}
                                        dangerouslySetInnerHTML={{
                                            __html: sanitiseBlurb(
                                                additionalText,
                                            ),
                                        }}
                                    />
                                )}
                            </div>
                            {qrUrl && (
                                <div className="flex justify-end pb-6">
                                    <div
                                        className="p-2 rounded-lg"
                                        style={{
                                            backgroundColor:
                                                'rgba(255,255,255,0.9)',
                                        }}
                                    >
                                        <QRCodeSVG
                                            value={qrUrl}
                                            size={120}
                                            level="M"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Print: show only the preview card */}
            <style
                dangerouslySetInnerHTML={{
                    __html: `
                @media print {
                    body * { visibility: hidden; }
                    .print-area, .print-area * { visibility: visible; }
                    .print-area {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        max-width: none !important;
                        min-height: 100vh !important;
                    }
                    .print\\:hidden { display: none !important; }
                }
            `,
                }}
            />
        </div>
    );
}
