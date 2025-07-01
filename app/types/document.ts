export interface Document {
  id: string;
  title: string;
  content: string;
  userId: string;
  tags: string[];
  wordCount: number;
  characterCount: number;
  readingTime: number;
  lastEditPosition: number;
  version: number;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentMetadata {
  wordCount: number;
  characterCount: number;
  readingTime: number;
  lastEditPosition: number;
  version: number;
}

export interface CreateDocumentRequest {
  title: string;
  content?: string;
  tags?: string[];
  template?: string;
}

export interface UpdateDocumentRequest {
  title?: string;
  content?: string;
  tags?: string[];
  metadata?: Partial<DocumentMetadata>;
}

export interface DocumentSearchOptions {
  query?: string;
  tags?: string[];
  sortBy?: 'created' | 'updated' | 'title';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
} 