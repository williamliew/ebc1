'use client';

import { useEditor, EditorContent, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useCallback } from 'react';

type HeadlessEditorProps = {
    /** Initial HTML content (used only on mount). */
    initialContent?: string;
    /** Called when content changes. Receives HTML string. */
    onUpdate?: (html: string) => void;
    placeholder?: string;
    className?: string;
    minHeight?: string;
};

/**
 * Tiptap editor with a minimal toolbar (bold, italic, lists).
 * Supports StarterKit formatting via toolbar and keyboard.
 */
export function HeadlessEditor({
    initialContent = '',
    onUpdate,
    placeholder = 'Start typing…',
    className = '',
    minHeight = '80px',
}: HeadlessEditorProps) {
    const editor = useEditor(
        {
            extensions: [StarterKit, Placeholder.configure({ placeholder })],
            content: initialContent || undefined,
            editorProps: {
                attributes: {
                    class: 'headless-editor-content focus:outline-none min-h-[var(--min-h)]',
                },
            },
            immediatelyRender: false,
        },
        [],
    );

    useEffect(() => {
        if (!editor || !onUpdate) return;
        const fn = () => onUpdate(editor.getHTML());
        editor.on('update', fn);
        return () => {
            editor.off('update', fn);
        };
    }, [editor, onUpdate]);

    const setMinHeight = useCallback(
        (el: HTMLDivElement | null) => {
            if (el) el.style.setProperty('--min-h', minHeight);
        },
        [minHeight],
    );

    if (editor === null) {
        return (
            <div
                ref={setMinHeight}
                className={`rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm ${className}`}
                style={{ minHeight }}
            >
                <div className="text-muted">{placeholder}</div>
            </div>
        );
    }

    return (
        <div
            ref={setMinHeight}
            className={`rounded-lg border border-border bg-surface overflow-hidden ${className}`}
        >
            <EditorToolbar editor={editor} />
            <div className="px-3 py-2 text-sm">
                <EditorContent editor={editor} />
            </div>
        </div>
    );
}

type ToolbarProps = { editor: NonNullable<ReturnType<typeof useEditor>> };

function EditorToolbar({ editor }: ToolbarProps) {
    const active = useEditorState({
        editor,
        selector: (snapshot) => ({
            bold: snapshot.editor.isActive('bold'),
            italic: snapshot.editor.isActive('italic'),
            bulletList: snapshot.editor.isActive('bulletList'),
            orderedList: snapshot.editor.isActive('orderedList'),
        }),
    });

    if (!active) return null;

    const btn =
        'p-1.5 rounded text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-50';
    const activeBtn = 'bg-zinc-200 text-zinc-900';

    return (
        <div className="flex flex-wrap items-center gap-0.5 border-b border-zinc-200 px-2 py-1 bg-white">
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={`${btn} ${active.bold ? activeBtn : ''}`}
                title="Bold"
                aria-pressed={active.bold}
            >
                <BoldIcon />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={`${btn} ${active.italic ? activeBtn : ''}`}
                title="Italic"
                aria-pressed={active.italic}
            >
                <ItalicIcon />
            </button>
            <span className="w-px h-5 bg-border mx-0.5" />
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={`${btn} ${active.bulletList ? activeBtn : ''}`}
                title="Bullet list"
                aria-pressed={active.bulletList}
            >
                <BulletListIcon />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={`${btn} ${active.orderedList ? activeBtn : ''}`}
                title="Numbered list"
                aria-pressed={active.orderedList}
            >
                <OrderedListIcon />
            </button>
        </div>
    );
}

function BoldIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
            <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
        </svg>
    );
}
function ItalicIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <line x1="19" y1="4" x2="10" y2="4" />
            <line x1="14" y1="20" x2="5" y2="20" />
            <line x1="15" y1="4" x2="9" y2="20" />
        </svg>
    );
}
function BulletListIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
    );
}
function OrderedListIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <line x1="10" y1="6" x2="21" y2="6" />
            <line x1="10" y1="12" x2="21" y2="12" />
            <line x1="10" y1="18" x2="21" y2="18" />
            <path d="M4 6h1v4" />
            <path d="M4 10h2" />
            <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
        </svg>
    );
}
