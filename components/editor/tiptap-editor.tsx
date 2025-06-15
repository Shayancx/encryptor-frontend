"use client"

import { useEditor, EditorContent, Editor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import TextAlign from "@tiptap/extension-text-align"
import Highlight from "@tiptap/extension-highlight"
import Typography from "@tiptap/extension-typography"
import Color from "@tiptap/extension-color"
import TextStyle from "@tiptap/extension-text-style"
import Placeholder from "@tiptap/extension-placeholder"
import Table from "@tiptap/extension-table"
import TableRow from "@tiptap/extension-table-row"
import TableCell from "@tiptap/extension-table-cell"
import TableHeader from "@tiptap/extension-table-header"
import TaskList from "@tiptap/extension-task-list"
import TaskItem from "@tiptap/extension-task-item"
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight"
import { common, createLowlight } from "lowlight"
import Subscript from "@tiptap/extension-subscript"
import Superscript from "@tiptap/extension-superscript"

import { cn } from "@/lib/utils"
import { EditorToolbar } from "./editor-toolbar"

const lowlight = createLowlight(common)

interface TiptapEditorProps {
  content?: string
  onChange?: (content: string) => void
  readOnly?: boolean
  placeholder?: string
  className?: string
}

export function TiptapEditor({
  content = "",
  onChange,
  readOnly = false,
  placeholder = "Start typing...",
  className
}: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // We'll use CodeBlockLowlight instead
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline underline-offset-2 cursor-pointer",
        },
      }),
      Image.configure({
        inline: true,
        HTMLAttributes: {
          class: "rounded-md max-w-full",
        },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Highlight.configure({
        multicolor: true,
        HTMLAttributes: {
          class: "bg-yellow-300 dark:bg-yellow-700",
        },
      }),
      Typography,
      Color,
      TextStyle,
      Placeholder.configure({
        placeholder,
        emptyEditorClass: "is-editor-empty",
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: "border-collapse table-fixed m-0 overflow-hidden",
        },
      }),
      TableRow.configure({
        HTMLAttributes: {
          class: "border border-gray-300 dark:border-gray-700",
        },
      }),
      TableHeader.configure({
        HTMLAttributes: {
          class: "border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 font-bold p-2",
        },
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: "border border-gray-300 dark:border-gray-700 p-2",
        },
      }),
      TaskList.configure({
        HTMLAttributes: {
          class: "not-prose pl-2",
        },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: "flex items-start",
        },
      }),
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: "rounded-md bg-gray-900 text-gray-100 p-4 font-mono text-sm",
        },
      }),
      Subscript,
      Superscript,
    ],
    content,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm dark:prose-invert max-w-none focus:outline-none",
          "min-h-[200px] px-3 py-2",
          "[&_ol]:list-decimal [&_ul]:list-disc",
          "[&_.is-editor-empty:first-child::before]:text-muted-foreground [&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.is-editor-empty:first-child::before]:float-left [&_.is-editor-empty:first-child::before]:h-0 [&_.is-editor-empty:first-child::before]:pointer-events-none",
          className
        ),
      },
    },
  })

  return (
    <div className="w-full">
      {!readOnly && editor && <EditorToolbar editor={editor} />}
      <div className={cn(
        "rounded-md border bg-background",
        !readOnly && "mt-2"
      )}>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
