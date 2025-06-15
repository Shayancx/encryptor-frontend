"use client"

import { Editor } from "@tiptap/editor"
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Minus,
  Undo,
  Redo,
  Link,
  Unlink,
  Image,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Highlighter,
  Table,
  Superscript,
  Subscript,
  Palette,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Toggle } from "@/components/ui/toggle"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useState } from "react"

interface EditorToolbarProps {
  editor: Editor
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  const [linkUrl, setLinkUrl] = useState("")
  const [imageUrl, setImageUrl] = useState("")

  const addLink = () => {
    if (linkUrl) {
      editor.chain().focus().setLink({ href: linkUrl }).run()
      setLinkUrl("")
    }
  }

  const addImage = () => {
    if (imageUrl) {
      editor.chain().focus().setImage({ src: imageUrl }).run()
      setImageUrl("")
    }
  }

  const addTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const base64 = e.target?.result as string
        editor.chain().focus().setImage({ src: base64 }).run()
      }
      reader.readAsDataURL(file)
    }
  }

  const textColors = [
    { name: "Default", color: "" },
    { name: "Red", color: "#ef4444" },
    { name: "Blue", color: "#3b82f6" },
    { name: "Green", color: "#22c55e" },
    { name: "Yellow", color: "#eab308" },
    { name: "Purple", color: "#a855f7" },
    { name: "Pink", color: "#ec4899" },
    { name: "Orange", color: "#f97316" },
  ]

  const highlightColors = [
    { name: "Yellow", color: "#fef3c7" },
    { name: "Green", color: "#d1fae5" },
    { name: "Blue", color: "#dbeafe" },
    { name: "Purple", color: "#e9d5ff" },
    { name: "Pink", color: "#fce7f3" },
  ]

  return (
    <div className="border border-input bg-transparent rounded-md p-1 flex flex-wrap gap-1">
      {/* Text formatting */}
      <Toggle
        size="sm"
        pressed={editor.isActive("bold")}
        onPressedChange={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("italic")}
        onPressedChange={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("underline")}
        onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
      >
        <Underline className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("strike")}
        onPressedChange={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("code")}
        onPressedChange={() => editor.chain().focus().toggleCode().run()}
      >
        <Code className="h-4 w-4" />
      </Toggle>

      <Separator orientation="vertical" className="mx-1 h-8" />

      {/* Headings */}
      <Toggle
        size="sm"
        pressed={editor.isActive("heading", { level: 1 })}
        onPressedChange={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        <Heading1 className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("heading", { level: 2 })}
        onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("heading", { level: 3 })}
        onPressedChange={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 className="h-4 w-4" />
      </Toggle>

      <Separator orientation="vertical" className="mx-1 h-8" />

      {/* Lists */}
      <Toggle
        size="sm"
        pressed={editor.isActive("bulletList")}
        onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("orderedList")}
        onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("taskList")}
        onPressedChange={() => editor.chain().focus().toggleTaskList().run()}
      >
        <ListTodo className="h-4 w-4" />
      </Toggle>

      <Separator orientation="vertical" className="mx-1 h-8" />

      {/* Block formatting */}
      <Toggle
        size="sm"
        pressed={editor.isActive("blockquote")}
        onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("codeBlock")}
        onPressedChange={() => editor.chain().focus().toggleCodeBlock().run()}
      >
        <Code className="h-4 w-4" />
      </Toggle>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      >
        <Minus className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="mx-1 h-8" />

      {/* Alignment */}
      <Toggle
        size="sm"
        pressed={editor.isActive({ textAlign: "left" })}
        onPressedChange={() => editor.chain().focus().setTextAlign("left").run()}
      >
        <AlignLeft className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive({ textAlign: "center" })}
        onPressedChange={() => editor.chain().focus().setTextAlign("center").run()}
      >
        <AlignCenter className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive({ textAlign: "right" })}
        onPressedChange={() => editor.chain().focus().setTextAlign("right").run()}
      >
        <AlignRight className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive({ textAlign: "justify" })}
        onPressedChange={() => editor.chain().focus().setTextAlign("justify").run()}
      >
        <AlignJustify className="h-4 w-4" />
      </Toggle>

      <Separator orientation="vertical" className="mx-1 h-8" />

      {/* Colors */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <Palette className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {textColors.map((color) => (
            <DropdownMenuItem
              key={color.name}
              onClick={() => {
                if (color.color) {
                  editor.chain().focus().setColor(color.color).run()
                } else {
                  editor.chain().focus().unsetColor().run()
                }
              }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded border"
                  style={{ backgroundColor: color.color || "transparent" }}
                />
                {color.name}
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <Highlighter className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => editor.chain().focus().unsetHighlight().run()}>
            No highlight
          </DropdownMenuItem>
          {highlightColors.map((color) => (
            <DropdownMenuItem
              key={color.name}
              onClick={() => editor.chain().focus().setHighlight({ color: color.color }).run()}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded border"
                  style={{ backgroundColor: color.color }}
                />
                {color.name}
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator orientation="vertical" className="mx-1 h-8" />

      {/* Super/subscript */}
      <Toggle
        size="sm"
        pressed={editor.isActive("superscript")}
        onPressedChange={() => editor.chain().focus().toggleSuperscript().run()}
      >
        <Superscript className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("subscript")}
        onPressedChange={() => editor.chain().focus().toggleSubscript().run()}
      >
        <Subscript className="h-4 w-4" />
      </Toggle>

      <Separator orientation="vertical" className="mx-1 h-8" />

      {/* Links and images */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm">
            <Link className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="grid gap-4">
            <h4 className="font-medium leading-none">Add Link</h4>
            <div className="grid gap-2">
              <Label htmlFor="link-url">URL</Label>
              <Input
                id="link-url"
                placeholder="https://example.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    addLink()
                  }
                }}
              />
              <Button onClick={addLink}>Add Link</Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {editor.isActive("link") && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().unsetLink().run()}
        >
          <Unlink className="h-4 w-4" />
        </Button>
      )}

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm">
            <Image className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="grid gap-4">
            <h4 className="font-medium leading-none">Add Image</h4>
            <div className="grid gap-2">
              <Label htmlFor="image-upload">Upload Image</Label>
              <Input
                id="image-upload"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
              />
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or</span>
                </div>
              </div>
              <Label htmlFor="image-url">Image URL</Label>
              <Input
                id="image-url"
                placeholder="https://example.com/image.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
              <Button onClick={addImage}>Add Image</Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Table */}
      <Button variant="ghost" size="sm" onClick={addTable}>
        <Table className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="mx-1 h-8" />

      {/* Undo/Redo */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
      >
        <Undo className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
      >
        <Redo className="h-4 w-4" />
      </Button>
    </div>
  )
}
