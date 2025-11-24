import { useEffect, useRef } from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import {
  ClassicEditor,
  Bold,
  Essentials,
  Italic,
  Paragraph,
  Undo,
  Heading,
  Font,
  Alignment,
  List,
  Image,
  ImageCaption,
  ImageStyle,
  ImageToolbar,
  ImageUpload,
  ImageResize,
  Table,
  TableToolbar,
  TableProperties,
  TableCellProperties,
  Link,
  Underline,
  Strikethrough,
  BlockQuote,
  Indent,
  IndentBlock,
  HorizontalLine,
  RemoveFormat,
  SourceEditing,
  Base64UploadAdapter
} from 'ckeditor5';
import 'ckeditor5/ckeditor5.css';

interface CKEditorComponentProps {
  value: string;
  onChange: (data: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export default function CKEditorComponent({
  value,
  onChange,
  placeholder = 'Digite o conteúdo aqui...',
  minHeight = '400px'
}: CKEditorComponentProps) {
  const editorRef = useRef<any>(null);

  const editorConfiguration = {
    plugins: [
      Essentials,
      Bold,
      Italic,
      Underline,
      Strikethrough,
      Paragraph,
      Heading,
      Font,
      Alignment,
      List,
      Image,
      ImageCaption,
      ImageStyle,
      ImageToolbar,
      ImageUpload,
      ImageResize,
      Base64UploadAdapter,
      Table,
      TableToolbar,
      TableProperties,
      TableCellProperties,
      Link,
      Undo,
      BlockQuote,
      Indent,
      IndentBlock,
      HorizontalLine,
      RemoveFormat,
      SourceEditing
    ],
    toolbar: {
      items: [
        'undo', 'redo',
        '|',
        'heading',
        '|',
        'fontSize', 'fontFamily', 'fontColor', 'fontBackgroundColor',
        '|',
        'bold', 'italic', 'underline', 'strikethrough',
        '|',
        'alignment',
        '|',
        'bulletedList', 'numberedList',
        '|',
        'outdent', 'indent',
        '|',
        'link', 'insertImage', 'insertTable', 'blockQuote', 'horizontalLine',
        '|',
        'removeFormat', 'sourceEditing'
      ],
      shouldNotGroupWhenFull: true
    },
    heading: {
      options: [
        { model: 'paragraph' as const, title: 'Parágrafo', class: 'ck-paragraph' },
        { model: 'heading1' as const, view: 'h1', title: 'Título 1', class: 'ck-heading1' },
        { model: 'heading2' as const, view: 'h2', title: 'Título 2', class: 'ck-heading2' },
        { model: 'heading3' as const, view: 'h3', title: 'Título 3', class: 'ck-heading3' },
        { model: 'heading4' as const, view: 'h4', title: 'Título 4', class: 'ck-heading4' }
      ]
    },
    fontSize: {
      options: [
        9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72
      ],
      supportAllValues: true
    },
    fontFamily: {
      options: [
        'default',
        'Arial, Helvetica, sans-serif',
        'Courier New, Courier, monospace',
        'Georgia, serif',
        'Lucida Sans Unicode, Lucida Grande, sans-serif',
        'Tahoma, Geneva, sans-serif',
        'Times New Roman, Times, serif',
        'Trebuchet MS, Helvetica, sans-serif',
        'Verdana, Geneva, sans-serif'
      ],
      supportAllValues: true
    },
    image: {
      toolbar: [
        'imageStyle:inline',
        'imageStyle:block',
        'imageStyle:side',
        '|',
        'toggleImageCaption',
        'imageTextAlternative',
        '|',
        'resizeImage'
      ],
      resizeOptions: [
        {
          name: 'resizeImage:original',
          label: 'Original',
          value: null
        },
        {
          name: 'resizeImage:50',
          label: '50%',
          value: '50'
        },
        {
          name: 'resizeImage:75',
          label: '75%',
          value: '75'
        }
      ]
    },
    table: {
      contentToolbar: [
        'tableColumn',
        'tableRow',
        'mergeTableCells',
        'tableProperties',
        'tableCellProperties'
      ]
    },
    placeholder,
    initialData: value
  };

  return (
    <div className="ckeditor-container" style={{ minHeight }}>
      <CKEditor
        editor={ClassicEditor}
        config={editorConfiguration}
        data={value}
        onChange={(event, editor) => {
          const data = editor.getData();
          onChange(data);
        }}
        onReady={(editor) => {
          editorRef.current = editor;
        }}
      />
    </div>
  );
}
