import { CKEditor } from '@ckeditor/ckeditor5-react';
import {
  DecoupledEditor,
  Bold,
  Essentials,
  Italic,
  Paragraph,
  Undo,
  Heading,
  Font,
  Alignment,
  List,
  Underline,
  Indent,
  IndentBlock,
  RemoveFormat,
  Base64UploadAdapter
} from 'ckeditor5';
import 'ckeditor5/ckeditor5.css';
import { useRef } from 'react';

interface SimplifiedCKEditorProps {
  value: string;
  onChange: (data: string) => void;
}

export default function SimplifiedCKEditor({ value, onChange }: SimplifiedCKEditorProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);

  const editorConfiguration = {
    licenseKey: 'GPL',
    plugins: [
      Essentials,
      Bold,
      Italic,
      Underline,
      Paragraph,
      Heading,
      Font,
      Alignment,
      List,
      Undo,
      Indent,
      IndentBlock,
      RemoveFormat,
      Base64UploadAdapter
    ],
    toolbar: {
      items: [
        'undo', 'redo',
        '|',
        'heading',
        '|',
        'fontSize', 'fontFamily',
        '|',
        'bold', 'italic', 'underline',
        '|',
        'alignment',
        '|',
        'bulletedList', 'numberedList',
        '|',
        'outdent', 'indent',
        '|',
        'removeFormat'
      ],
      shouldNotGroupWhenFull: true
    },
    heading: {
      options: [
        { model: 'paragraph' as const, title: 'Parágrafo', class: 'ck-paragraph' },
        { model: 'heading1' as const, view: 'h1', title: 'Título 1', class: 'ck-heading1' },
        { model: 'heading2' as const, view: 'h2', title: 'Título 2', class: 'ck-heading2' },
        { model: 'heading3' as const, view: 'h3', title: 'Título 3', class: 'ck-heading3' }
      ]
    },
    fontSize: {
      options: [10, 11, 12, 14, 16, 18, 20, 24],
      supportAllValues: true
    },
    fontFamily: {
      options: [
        'default',
        'Arial, Helvetica, sans-serif',
        'Times New Roman, Times, serif',
        'Georgia, serif',
        'Verdana, Geneva, sans-serif'
      ],
      supportAllValues: true
    },
    placeholder: 'Digite o conteúdo aqui...',
    initialData: value
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Toolbar - Fixed at top */}
      <div 
        ref={toolbarRef} 
        className="border-b border-border bg-muted sticky top-0 z-10 flex-shrink-0"
        style={{ minHeight: '40px' }}
      />
      
      {/* Editor content area - fills remaining space */}
      <div 
        className="flex-1 overflow-hidden"
        style={{ 
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <CKEditor
          editor={DecoupledEditor}
          config={editorConfiguration}
          data={value}
          onReady={(editor) => {
            if (toolbarRef.current) {
              toolbarRef.current.innerHTML = '';
              toolbarRef.current.appendChild(editor.ui.view.toolbar.element!);
            }
            editorRef.current = editor;
          }}
          onChange={(event, editor) => {
            const data = editor.getData();
            onChange(data);
          }}
        />
      </div>
    </div>
  );
}