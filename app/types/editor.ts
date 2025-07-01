export type ViewMode = 'edit' | 'preview' | 'split';
export type Theme = 'light' | 'dark' | 'auto';

export interface EditorConfig {
  theme: Theme;
  fontSize: number;
  fontFamily: string;
  lineNumbers: boolean;
  wordWrap: boolean;
  minimap: boolean;
  autoSave: boolean;
  autoSaveDelay: number;
  splitRatio: number;
}

export interface EditorState {
  content: string;
  viewMode: ViewMode;
  config: EditorConfig;
  isDirty: boolean;
  isLoading: boolean;
  error: string | null;
  cursorPosition: {
    line: number;
    column: number;
  };
}

export interface PreviewOptions {
  enableMath: boolean;
  enableMermaid: boolean;
  enableToc: boolean;
  sanitizeHtml: boolean;
}

export interface ToolbarAction {
  id: string;
  label: string;
  icon: string;
  shortcut?: string;
  action: () => void;
  separator?: boolean;
}

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description: string;
} 