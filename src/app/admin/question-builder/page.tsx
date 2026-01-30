'use client';

import { useQuery } from '@tanstack/react-query';
import { useRef, useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

const PRESET_BACKGROUNDS = [
    { value: 'cream', label: 'Cream', color: '#fffbeb' },
    { value: 'sage', label: 'Sage', color: '#f0fdf4' },
    { value: 'slate', label: 'Slate', color: '#f1f5f9' },
    { value: 'lavender', label: 'Lavender', color: '#f5f3ff' },
];

type NominationBook = {
    id: number;
    title: string;
    author: string;
    coverUrl: string | null;
};

export default function QuestionBuilderPage() {
    const printRef = useRef<HTMLDivElement>(null);
    const [questions, setQuestions] = useState<string[]>(['']);
    const [backgroundType, setBackgroundType] = useState<
        'preset' | 'gradient' | 'upload' | 'url'
    >('preset');
    const [presetBackground, setPresetBackground] = useState('cream');
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

    const addQuestion = () => setQuestions((q) => [...q, '']);
    const removeQuestion = (index: number) =>
        setQuestions((q) => q.filter((_, i) => i !== index));
    const setQuestion = (index: number, value: string) =>
        setQuestions((q) => {
            const next = [...q];
            next[index] = value;
            return next;
        });

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

    const backgroundStyle =
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
              : backgroundType === 'gradient'
                ? {
                      background:
                          'linear-gradient(135deg, #fef3c7 0%, #ddd6fe 100%)',
                  }
                : backgroundType === 'preset'
                  ? {
                        backgroundColor:
                            PRESET_BACKGROUNDS.find(
                                (p) => p.value === presetBackground,
                            )?.color ?? '#fffbeb',
                    }
                  : {};

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
            <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-4 print:hidden">
                <h1 className="text-xl font-semibold">
                    Question building page
                </h1>
                <p className="text-sm text-zinc-500 mt-1">
                    Build an icebreaker spread with questions and a QR code for
                    the WhatsApp group.
                </p>
            </header>

            <div className="max-w-4xl mx-auto p-4 flex flex-col lg:flex-row gap-8 print:block">
                {/* Form - hidden when printing */}
                <section className="flex-1 space-y-6 print:hidden">
                    <div>
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 block mb-2">
                            Main heading
                        </label>
                        <input
                            type="text"
                            value={bookclubTitle}
                            onChange={(e) => setBookclubTitle(e.target.value)}
                            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
                            placeholder="e.g. Elwood Book Club"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 block mb-2">
                            Book (from latest nomination)
                        </label>
                        {latestBook ? (
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                Using: <strong>{latestBook.title}</strong> by{' '}
                                {latestBook.author}
                            </p>
                        ) : (
                            <p className="text-sm text-zinc-500">
                                No nomination round yet. Fill in manually below.
                            </p>
                        )}
                        <div className="mt-2 grid grid-cols-2 gap-2">
                            <input
                                type="text"
                                value={bookTitle || (latestBook?.title ?? '')}
                                onChange={(e) => setBookTitle(e.target.value)}
                                className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
                                placeholder="Book title"
                            />
                            <input
                                type="text"
                                value={bookAuthor || (latestBook?.author ?? '')}
                                onChange={(e) => setBookAuthor(e.target.value)}
                                className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
                                placeholder="Book author"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 block mb-2">
                            Questions
                        </label>
                        {questions.map((q, i) => (
                            <div key={i} className="flex gap-2 mb-2">
                                <input
                                    type="text"
                                    value={q}
                                    onChange={(e) =>
                                        setQuestion(i, e.target.value)
                                    }
                                    className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
                                    placeholder={`Question ${i + 1}`}
                                />
                                <button
                                    type="button"
                                    onClick={() => removeQuestion(i)}
                                    disabled={questions.length <= 1}
                                    className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
                                    aria-label="Remove question"
                                >
                                    Remove
                                </button>
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={addQuestion}
                            className="rounded-lg border border-dashed border-zinc-400 dark:border-zinc-600 px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        >
                            Add another question
                        </button>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 block mb-2">
                            Additional text (optional)
                        </label>
                        <textarea
                            value={additionalText}
                            onChange={(e) => setAdditionalText(e.target.value)}
                            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm min-h-[80px]"
                            placeholder="Extra text for the spread"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 block mb-2">
                            QR code URL (e.g. WhatsApp group link)
                        </label>
                        <input
                            type="url"
                            value={qrUrl}
                            onChange={(e) => setQrUrl(e.target.value)}
                            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
                            placeholder="https://chat.whatsapp.com/..."
                        />
                    </div>

                    <div>
                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 block mb-2">
                            Background
                        </span>
                        <div className="flex flex-wrap gap-3 mb-2">
                            {(
                                ['preset', 'gradient', 'upload', 'url'] as const
                            ).map((type) => (
                                <label
                                    key={type}
                                    className="flex items-center gap-2 cursor-pointer"
                                >
                                    <input
                                        type="radio"
                                        name="bg"
                                        checked={backgroundType === type}
                                        onChange={() => setBackgroundType(type)}
                                        className="rounded"
                                    />
                                    <span className="text-sm capitalize">
                                        {type === 'url' ? 'Image URL' : type}
                                    </span>
                                </label>
                            ))}
                        </div>
                        {backgroundType === 'preset' && (
                            <select
                                value={presetBackground}
                                onChange={(e) =>
                                    setPresetBackground(e.target.value)
                                }
                                className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
                            >
                                {PRESET_BACKGROUNDS.map((p) => (
                                    <option key={p.value} value={p.value}>
                                        {p.label}
                                    </option>
                                ))}
                            </select>
                        )}
                        {backgroundType === 'upload' && (
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleBackgroundUpload}
                                className="block text-sm text-zinc-600 dark:text-zinc-400 file:mr-2 file:rounded file:border file:px-3 file:py-1.5 file:text-sm"
                            />
                        )}
                        {backgroundType === 'url' && (
                            <input
                                type="url"
                                value={backgroundImageUrlInput}
                                onChange={(e) =>
                                    setBackgroundImageUrlInput(e.target.value)
                                }
                                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
                                placeholder="https://..."
                            />
                        )}
                    </div>

                    <div>
                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 block mb-2">
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

                    <button
                        type="button"
                        onClick={() => setIsPreviewFullScreen(true)}
                        className="rounded-lg bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 px-4 py-2 text-sm font-medium hover:bg-zinc-700 dark:hover:bg-zinc-300"
                    >
                        Preview in full screen to screenshot
                    </button>
                </section>

                {/* Preview - shown in-page and when printing */}
                <section className="flex-1 print:flex-1 print:max-w-none">
                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2 print:hidden">
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
                                    backgroundColor:
                                        textColor === 'white'
                                            ? 'rgba(0,0,0,0.5)'
                                            : 'rgba(255,255,255,0.5)',
                                    color:
                                        textColor === 'white' ? '#fff' : '#111',
                                    padding: '1rem 1.25rem',
                                    borderRadius: '0.5rem',
                                }}
                            >
                                <h2 className="text-lg font-semibold mb-1">
                                    {bookclubTitle || 'Elwood Book Club'}
                                </h2>
                                <p className="text-sm font-medium opacity-90">
                                    {bookTitle || 'Book title'} by{' '}
                                    {bookAuthor || 'Author'}
                                </p>
                                {additionalText && (
                                    <p className="text-sm mt-2 opacity-90">
                                        {additionalText}
                                    </p>
                                )}
                                <ul className="mt-4 space-y-2 list-disc list-inside text-sm opacity-90">
                                    {questions.filter(Boolean).map((q, i) => (
                                        <li key={i}>{q}</li>
                                    ))}
                                </ul>
                            </div>
                            {qrUrl && (
                                <div className="mt-4 flex justify-end">
                                    <div
                                        className="p-2 rounded-lg"
                                        style={{
                                            backgroundColor:
                                                textColor === 'white'
                                                    ? 'rgba(255,255,255,0.9)'
                                                    : 'rgba(255,255,255,0.9)',
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
                    className="fixed inset-0 z-50 flex flex-col bg-zinc-900"
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
                                className="rounded-lg bg-zinc-700/90 text-white px-3 py-1.5 text-sm font-medium hover:bg-zinc-600"
                            >
                                Close
                            </button>
                        </div>
                        <p className="text-center pb-4 text-sm text-white/80 pointer-events-none">
                            Click/tap screen to show or hide close button
                        </p>
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
                                    backgroundColor:
                                        textColor === 'white'
                                            ? 'rgba(0,0,0,0.5)'
                                            : 'rgba(255,255,255,0.5)',
                                    color:
                                        textColor === 'white' ? '#fff' : '#111',
                                    padding: '1.5rem 2rem',
                                    borderRadius: '0.5rem',
                                }}
                            >
                                <h2 className="text-xl font-semibold mb-1">
                                    {bookclubTitle || 'Elwood Book Club'}
                                </h2>
                                <p className="text-base font-medium opacity-90">
                                    {bookTitle || 'Book title'} by{' '}
                                    {bookAuthor || 'Author'}
                                </p>
                                {additionalText && (
                                    <p className="text-base mt-2 opacity-90">
                                        {additionalText}
                                    </p>
                                )}
                                <ul className="mt-6 space-y-2 list-disc list-inside text-base opacity-90">
                                    {questions.filter(Boolean).map((q, i) => (
                                        <li key={i}>{q}</li>
                                    ))}
                                </ul>
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
