"use client";

import { useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TiptapImage from "@tiptap/extension-image";
import TiptapLink from "@tiptap/extension-link";
import { Bold, Heading2, ImageIcon, Italic, Link2, List, ListOrdered, Quote, Redo, Undo } from "lucide-react";
import { uploadNewsletterImage } from "@/app/actions/newsletter-images";
import { compressImage } from "@/lib/image-compression";
import { cn } from "@/lib/utils";

// Matches the same descendant styling the admin preview on the [id] page
// applies to sent content (src/app/(app)/newsletters/[id]/page.tsx) — the
// point of a WYSIWYG editor is that what you see here already resembles
// what actually goes out.
const CONTENT_CLASSES = cn(
  "min-h-[280px] px-3 py-2.5 text-sm leading-relaxed text-slate-900 focus:outline-none dark:text-slate-100",
  "[&_p]:mb-3 [&_a]:text-indigo-600 [&_a]:underline dark:[&_a]:text-indigo-400",
  "[&_h1]:mt-4 [&_h1]:mb-2 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold",
  "[&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1",
  "[&_img]:max-w-full [&_img]:rounded",
  "[&_blockquote]:border-l-2 [&_blockquote]:border-slate-300 [&_blockquote]:pl-3 [&_blockquote]:text-slate-500 dark:[&_blockquote]:border-neutral-700 dark:[&_blockquote]:text-slate-400",
);

function ToolbarButton({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-40 dark:text-slate-300 dark:hover:bg-neutral-800",
        active && "bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400",
      )}
    >
      {children}
    </button>
  );
}

export function NewsletterEditor({
  name,
  defaultValue,
  newsletterId,
}: {
  name: string;
  defaultValue?: string;
  newsletterId?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [html, setHtml] = useState(defaultValue || "");
  const [imageError, setImageError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TiptapImage,
      TiptapLink.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer" } }),
    ],
    content: defaultValue || "",
    // Next.js renders this component's initial pass on the server, where
    // TipTap has no DOM to attach to — this defers the editor's first
    // render to the client only, avoiding a hydration mismatch rather than
    // fighting one.
    immediatelyRender: false,
    onUpdate: ({ editor }) => setHtml(editor.getHTML()),
    editorProps: {
      attributes: { class: CONTENT_CLASSES },
    },
  });

  async function handleImageSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !editor) return;

    setImageError(null);
    setUploading(true);
    const compressed = await compressImage(file);
    const formData = new FormData();
    formData.set("image", compressed);
    if (newsletterId) formData.set("newsletterId", newsletterId);
    const result = await uploadNewsletterImage(formData);
    setUploading(false);

    if (result.status === "ok") {
      editor.chain().focus().setImage({ src: result.url }).run();
    } else {
      setImageError(result.message);
    }
  }

  function setLink() {
    if (!editor) return;
    const previousUrl = (editor.getAttributes("link").href as string | undefined) || "";
    const url = window.prompt("Link URL", previousUrl || "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  return (
    <div>
      <div className="rounded-md ring-1 ring-inset ring-slate-300 focus-within:ring-2 focus-within:ring-indigo-500 dark:ring-neutral-700">
        <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 p-1.5 dark:border-neutral-800">
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleBold().run()}
            active={editor?.isActive("bold")}
            label="Bold"
          >
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            active={editor?.isActive("italic")}
            label="Italic"
          >
            <Italic className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor?.isActive("heading", { level: 2 })}
            label="Heading"
          >
            <Heading2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            active={editor?.isActive("bulletList")}
            label="Bullet list"
          >
            <List className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            active={editor?.isActive("orderedList")}
            label="Numbered list"
          >
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            active={editor?.isActive("blockquote")}
            label="Quote"
          >
            <Quote className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={setLink} active={editor?.isActive("link")} label="Link">
            <Link2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => fileInputRef.current?.click()} disabled={uploading} label="Insert image">
            <ImageIcon className="h-4 w-4" />
          </ToolbarButton>
          <div className="mx-1 h-5 w-px bg-slate-200 dark:bg-neutral-700" />
          <ToolbarButton
            onClick={() => editor?.chain().focus().undo().run()}
            disabled={!editor?.can().undo()}
            label="Undo"
          >
            <Undo className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().redo().run()}
            disabled={!editor?.can().redo()}
            label="Redo"
          >
            <Redo className="h-4 w-4" />
          </ToolbarButton>
          {uploading && <span className="ml-2 text-xs text-slate-400">Uploading…</span>}
        </div>
        <EditorContent editor={editor} />
      </div>
      {imageError && <p className="mt-1 text-sm text-rose-600 dark:text-rose-400">{imageError}</p>}
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelected} className="hidden" />
      <input type="hidden" name={name} value={html} readOnly />
    </div>
  );
}
