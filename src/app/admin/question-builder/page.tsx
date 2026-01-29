'use client';

import { useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

const PRESET_BACKGROUNDS = [
    { value: 'cream', label: 'Cream', class: 'bg-amber-50' },
    { value: 'sage', label: 'Sage', class: 'bg-green-50' },
    { value: 'slate', label: 'Slate', class: 'bg-slate-100' },
    { value: 'lavender', label: 'Lavender', class: 'bg-violet-50' },
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
        'preset' | 'gradient' | 'upload'
    >('preset');
    const [presetBackground, setPresetBackground] = useState('cream');
    const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(
        null,
    );
    const [bookclubTitle, setBookclubTitle] = useState('Book Club');
    const [bookTitle, setBookTitle] = useState('');
    const [bookAuthor, setBookAuthor] = useState('');
    const [additionalText, setAdditionalText] = useState('');
    const [qrUrl, setQrUrl] = useState('');
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

    const handlePrint = () => {
        window.print();
    };

    const backgroundStyle =
        backgroundType === 'upload' && backgroundImageUrl
            ? {
                  backgroundImage: `url(${backgroundImageUrl})`,
                  backgroundSize: 'cover' as const,
              }
            : backgroundType === 'gradient'
              ? {
                    background:
                        'linear-gradient(135deg, #fef3c7 0%, #ddd6fe 100%)',
                }
              : {};

    const presetClass =
        backgroundType === 'preset'
            ? (PRESET_BACKGROUNDS.find((p) => p.value === presetBackground)
                  ?.class ?? 'bg-amber-50')
            : '';

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
                            Bookclub title
                        </label>
                        <input
                            type="text"
                            value={bookclubTitle}
                            onChange={(e) => setBookclubTitle(e.target.value)}
                            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
                            placeholder="e.g. Book Club"
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
                            Add question
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
                            {(['preset', 'gradient', 'upload'] as const).map(
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
                                            {type}
                                        </span>
                                    </label>
                                ),
                            )}
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
                        onClick={handlePrint}
                        className="rounded-lg bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 px-4 py-2 text-sm font-medium hover:bg-zinc-700 dark:hover:bg-zinc-300"
                    >
                        Print
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
                        className={`print-area rounded-xl overflow-hidden shadow-lg print:shadow-none print:rounded-none print:min-h-[100vh] print:absolute print:inset-0 print:w-full print:max-w-none ${presetClass}`}
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
                                    {bookclubTitle || 'Book Club'}
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
