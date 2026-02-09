'use client';

import { createPortal } from 'react-dom';
import { useEditor, EditorContent, useEditorState } from '@tiptap/react';
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { useCallback, useEffect, useRef, useState } from 'react';

/** Common emojis as fallback when the full picker fails or for quick insert */
const QUICK_EMOJIS = ['👍', '❤️', '📚', '✨', '🔥'];

/** Max character count for suggestion comment (plain text, after stripping HTML). */
export const MAX_COMMENT_CHARS = 350;

/** Normalise line breaks to space (strip line breaks for counting). Used so limit is consistent. */
function stripLineBreaks(text: string): string {
    return text.replace(/\r\n|\r|\n/g, ' ').trim();
}

/** Strip HTML and return plain-text length (used for character limit). Spaces count; line breaks normalised to one space. */
export function countCommentChars(html: string): number {
    const text = html
        .replace(/<[^>]*>/g, ' ')
        .replace(/\r\n|\r|\n/g, ' ')
        .trim();
    return text.length;
}

/** Get plain-text length from a ProseMirror doc (same rules: spaces count, line breaks stripped to space). */
function getDocPlainTextLength(doc: {
    textBetween: (a: number, b: number) => string;
    content: { size: number };
}): number {
    const text = stripLineBreaks(doc.textBetween(0, doc.content.size));
    return text.length;
}

/** TipTap extension: reject any typing/paste that would exceed the character limit. */
const CommentCharLimit = Extension.create({
    name: 'commentCharLimit',
    addOptions() {
        return { limit: MAX_COMMENT_CHARS };
    },
    addProseMirrorPlugins() {
        const limit = this.options.limit;
        return [
            new Plugin({
                key: new PluginKey('commentCharLimit'),
                filterTransaction(tr, state) {
                    if (!tr.docChanged) return true;
                    // Apply steps to current doc only (do not use state.apply(tr) - it can cause stack overflow)
                    let doc: typeof state.doc = state.doc;
                    for (let i = 0; i < tr.steps.length; i++) {
                        const result = tr.steps[i].apply(doc);
                        if (result.failed) return true;
                        const next = result.doc;
                        if (!next) return true;
                        doc = next;
                    }
                    const len = getDocPlainTextLength(doc);
                    return len <= limit;
                },
            }),
        ];
    },
});

type SuggestionCommentEditorProps = {
    initialContent?: string;
    onUpdate?: (html: string) => void;
    placeholder?: string;
    className?: string;
};

/**
 * TipTap editor for suggestion comments: bold, italic, underline only; character limit; emoji picker.
 */
export function SuggestionCommentEditor({
    initialContent = '',
    onUpdate,
    placeholder = 'Add an optional comment (e.g. why you suggest this book)…',
    className = '',
}: SuggestionCommentEditorProps) {
    const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
    const emojiContainerRef = useRef<HTMLDivElement>(null);
    const pickerLoadedRef = useRef(false);

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
                Underline,
                Placeholder.configure({ placeholder }),
                CommentCharLimit.configure({ limit: MAX_COMMENT_CHARS }),
            ],
            content:
                initialContent && initialContent.trim() !== ''
                    ? initialContent
                    : undefined,
            editorProps: {
                attributes: {
                    class: 'suggestion-comment-editor-content focus:outline-none min-h-[60px] text-sm',
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

    const charCount = editor
        ? countCommentChars(editor.getHTML())
        : countCommentChars(initialContent);

    // Lazy-load full emoji picker when opening; mount in portal to body so it's not clipped
    useEffect(() => {
        if (!emojiPickerOpen) {
            emojiContainerRef.current?.replaceChildren();
            pickerLoadedRef.current = false;
            return;
        }
        if (pickerLoadedRef.current) return;

        const containerRef = emojiContainerRef;
        let cancelled = false;
        pickerLoadedRef.current = true;

        Promise.resolve()
            .then(() => import('emoji-picker-element/picker'))
            .catch(() => import('emoji-picker-element'))
            .then((mod) => {
                if (cancelled || !containerRef.current) return;
                const modExports = mod as { default?: unknown; Picker?: unknown };
                const PickerClass = modExports.default ?? modExports.Picker;
                const picker =
                    typeof PickerClass === 'function'
                        ? new (PickerClass as new () => HTMLElement)()
                        : document.createElement('emoji-picker');
                if (!(picker instanceof HTMLElement)) return;
                picker.setAttribute('class', 'light');
                (picker as HTMLElement).style.width = '100%';
                (picker as HTMLElement).style.height = '100%';
                containerRef.current.appendChild(picker);
                const onEmojiClick = (e: Event) => {
                    const ev = e as CustomEvent<{ unicode: string }>;
                    const unicode = ev.detail?.unicode;
                    if (unicode && editor) {
                        editor.chain().focus().insertContent(unicode).run();
                    }
                    setEmojiPickerOpen(false);
                };
                picker.addEventListener('emoji-click', onEmojiClick);
            })
            .catch(() => {
                pickerLoadedRef.current = false;
            });

        return () => {
            cancelled = true;
            containerRef.current?.replaceChildren();
            pickerLoadedRef.current = false;
        };
    }, [emojiPickerOpen, editor]);

    const insertEmoji = useCallback(
        (emoji: string) => {
            if (editor) editor.chain().focus().insertContent(emoji).run();
        },
        [editor],
    );

    const toggleEmoji = useCallback(() => {
        setEmojiPickerOpen((open) => !open);
    }, []);

    if (editor === null) {
        return (
            <div
                className={`rounded-lg border border-border bg-surface px-3 py-2 text-sm ${className}`}
                style={{ minHeight: 60 }}
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
                <ToolbarButtons editor={editor} />
                <button
                    type="button"
                    onClick={toggleEmoji}
                    className="p-1.5 rounded text-muted-foreground hover:bg-[var(--surface-hover)] hover:text-foreground"
                    title="More emojis…"
                    aria-label="Open full emoji picker"
                >
                    <EmojiIcon />
                </button>
                <span className="w-px h-5 bg-border mx-0.5" aria-hidden />
                <div className="flex items-center gap-0.5">
                    {QUICK_EMOJIS.map((emoji) => (
                        <button
                            key={emoji}
                            type="button"
                            onClick={() => insertEmoji(emoji)}
                            className="p-1 rounded text-lg leading-none hover:bg-[var(--surface-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-1"
                            title={`Insert ${emoji}`}
                            aria-label={`Insert emoji ${emoji}`}
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
                <span className="ml-auto text-xs text-muted-foreground">
                    {charCount} / {MAX_COMMENT_CHARS} characters
                </span>
            </div>
            <div className="px-3 py-2 relative">
                <EditorContent editor={editor} />
            </div>
            {emojiPickerOpen &&
                typeof document !== 'undefined' &&
                createPortal(
                    <>
                        <div
                            className="fixed inset-0 z-[9998] bg-black/30"
                            aria-hidden
                            onClick={() => setEmojiPickerOpen(false)}
                        />
                        <div
                            ref={emojiContainerRef}
                            className="fixed z-[9999] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg overflow-hidden border border-border shadow-xl bg-surface"
                            style={{ width: 320, height: 280 }}
                        />
                    </>,
                    document.body,
                )}
        </div>
    );
}

function ToolbarButtons({
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
function EmojiIcon() {
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
            <circle cx="12" cy="12" r="10" />
            <path d="M8 14s1.5 2 4 2 4-2 4-2" />
            <line x1="9" y1="9" x2="9.01" y2="9" />
            <line x1="15" y1="9" x2="15.01" y2="9" />
        </svg>
    );
}
