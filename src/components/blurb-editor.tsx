'use client';

import { useEditor, EditorContent, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect } from 'react';
import { sanitiseBlurb } from '@/lib/sanitize-blurb';

type BlurbEditorProps = {
    initialContent?: string | null;
    onUpdate?: (html: string) => void;
    placeholder?: string;
    className?: string;
};

/**
 * TipTap editor for book description/blurb: bold, italic, underline.
 * Used in admin create-a-vote review step to edit or replace search descriptions.
 */
export function BlurbEditor({
    initialContent,
    onUpdate,
    placeholder = 'Add or edit description…',
    className = '',
}: BlurbEditorProps) {
    const safeInitial = sanitiseBlurb(initialContent ?? undefined);

    const editor = useEditor(
        {
            extensions: [
                StarterKit.configure({
                    bulletList: false,
                    orderedList: false,
                    blockquote: false,
                    codeBlock: false,
                    heading: false,
                    horizontalRule: false,
                }),
                Placeholder.configure({ placeholder }),
            ],
            content:
                safeInitial && safeInitial.trim() !== '' ? safeInitial : undefined,
            editorProps: {
                attributes: {
                    class: 'blurb-editor-content focus:outline-none min-h-[80px] text-sm prose prose-sm dark:prose-invert max-w-none',
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

    if (editor === null) {
        return (
            <div
                className={`rounded-lg border border-border bg-surface px-3 py-2 text-sm ${className}`}
                style={{ minHeight: 80 }}
            >
                <div className="text-muted-foreground">{placeholder}</div>
            </div>
        );
    }

    return (
        <div
            className={`rounded-lg border border-border bg-surface overflow-hidden ${className}`}
        >
            <div className="flex flex-wrap items-center gap-0.5 border-b border-border px-2 py-1 bg-[var(--surface)]">
                <BlurbToolbarButtons editor={editor} />
            </div>
            <div className="px-3 py-2 relative">
                <EditorContent editor={editor} />
            </div>
        </div>
    );
}

function BlurbToolbarButtons({
    editor,
}: {
    editor: NonNullable<ReturnType<typeof useEditor>>;
}) {
    const active = useEditorState({
        editor,
        selector: (snapshot) => ({
            bold: snapshot.editor.isActive('bold'),
            italic: snapshot.editor.isActive('italic'),
            underline: snapshot.editor.isActive('underline'),
        }),
    });

    const btn =
        'p-1.5 rounded text-muted-foreground hover:bg-[var(--surface-hover)] hover:text-foreground disabled:opacity-50';
    const activeBtn = 'bg-[var(--surface-hover)] text-foreground';

    return (
        <>
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
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                className={`${btn} ${active.underline ? activeBtn : ''}`}
                title="Underline"
                aria-pressed={active.underline}
            >
                <UnderlineIcon />
            </button>
        </>
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
            aria-hidden
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
            aria-hidden
        >
            <line x1="19" y1="4" x2="10" y2="4" />
            <line x1="14" y1="20" x2="5" y2="20" />
            <line x1="15" y1="4" x2="9" y2="20" />
        </svg>
    );
}
function UnderlineIcon() {
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
            aria-hidden
        >
            <path d="M6 3v7a6 6 0 0 0 12 0V3" />
            <line x1="4" y1="21" x2="20" y2="21" />
        </svg>
    );
}
