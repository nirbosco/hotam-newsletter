import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import { useEffect, useRef, useState } from 'react';
import { Bold, Italic, Highlighter, Heading2, Quote, List, ListOrdered, AlignRight, AlignCenter, ImagePlus, Undo2, Redo2, Loader2 } from 'lucide-react';
import { upload, errText } from '../lib/api.js';

export default function RichEditor({ value, onChange, placeholder = 'כתבו כאן…', onError }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      TextAlign.configure({ types: ['heading', 'paragraph'], defaultAlignment: 'right' }),
      Image.configure({ inline: false }),
      Placeholder.configure({ placeholder }),
      Highlight,
    ],
    content: value || '',
    editorProps: { attributes: { class: 'rich-content', dir: 'rtl' } },
    onUpdate: ({ editor: ed }) => onChange(ed.isEmpty ? '' : ed.getHTML()),
  });

  // עדכון מבחוץ (למשל אחרי שיפור ניסוח ב-AI)
  useEffect(() => {
    if (editor && value !== undefined && value !== editor.getHTML() && !(value === '' && editor.isEmpty)) {
      editor.commands.setContent(value || '', false);
    }
  }, [value, editor]);

  if (!editor) return <div className="rich-box" />;

  const addImage = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!f.type.startsWith('image/')) { onError?.('אפשר להעלות כאן רק תמונה'); return; }
    setUploading(true);
    try {
      const url = await upload(f);
      editor.chain().focus().setImage({ src: url, alt: '' }).run();
    } catch (err) { onError?.(errText(err)); }
    setUploading(false);
  };

  const B = ({ on, active, title, children }) => (
    <button type="button" className={`tb ${active ? 'on' : ''}`} onClick={on} title={title} aria-label={title} aria-pressed={!!active}>{children}</button>
  );

  return (
    <div className="rich-box">
      <div className="toolbar" role="toolbar">
        <B on={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="מודגש"><Bold size={18} /></B>
        <B on={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="נטוי"><Italic size={18} /></B>
        <B on={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')} title="הדגשה בצבע"><Highlighter size={18} /></B>
        <span className="tb-sep" />
        <B on={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="כותרת ביניים"><Heading2 size={18} /></B>
        <B on={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="ציטוט"><Quote size={18} /></B>
        <B on={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="רשימה"><List size={18} /></B>
        <B on={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="רשימה ממוספרת"><ListOrdered size={18} /></B>
        <span className="tb-sep" />
        <B on={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="יישור לימין"><AlignRight size={18} /></B>
        <B on={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="יישור למרכז"><AlignCenter size={18} /></B>
        <span className="tb-sep" />
        <B on={() => fileRef.current?.click()} title="הוספת תמונה לגוף הכתבה">{uploading ? <Loader2 className="spin" size={18} /> : <ImagePlus size={18} />}</B>
        <span className="tb-grow" />
        <B on={() => editor.chain().focus().undo().run()} title="ביטול"><Undo2 size={18} /></B>
        <B on={() => editor.chain().focus().redo().run()} title="ביצוע מחדש"><Redo2 size={18} /></B>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={addImage} />
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
