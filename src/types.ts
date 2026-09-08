export interface FileEntryItem {
  id: string;
  name: string;
  relativePath: string;
  size: number;
  lastModified: number;
  type: string;
  isNewlyAdded?: boolean;
  detectedAt?: number;
  handle?: FileSystemFileHandle;
  fileObj?: File;
  url?: string;
  mediaType?: 'text' | 'image' | 'audio' | 'video' | 'json' | 'pdf' | 'other';
  textContent?: string;
  isSimulated?: boolean;
  audioTranscription?: {
    status: 'idle' | 'transcribing' | 'completed' | 'no-match' | 'error';
    transcript?: string;
    translatedTranscript?: string;
    detectedLanguage?: string;
    matchedItems?: ExpenseLineItem[];
    totalAmount?: number;
    error?: string;
    callDeduplicated?: boolean;
    deduplicationNotes?: string;
    dialogueTurns?: Array<{ speaker: string; text: string; role?: string }>;
  };
}

export type DirectorySource = 'file-system-api' | 'directory-input' | 'mock-directory';

export interface DirectoryMetadata {
  name: string;
  source: DirectorySource;
  handle?: FileSystemDirectoryHandle;
  totalFiles: number;
  totalSize: number;
  selectedAt: number;
  lastPolledAt: number;
  pollingIntervalMs: number;
}

export type SortMode = 'detected-desc' | 'modified-desc' | 'name-asc' | 'size-desc';

export interface WatchActivityLog {
  id: string;
  timestamp: number;
  type: 'added' | 'scanned' | 'removed' | 'opened';
  fileName: string;
  details?: string;
}

export interface ProductItem {
  id: string;
  name: string;
  price: number;
  unit: string;
  category?: string;
  aliases?: string[];
}

export interface ExpenseLineItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
}

export interface ExpenseRecord {
  id: string;
  timestamp: number;
  dateStr: string;
  monthYear: string;
  sourceFileName: string;
  fileSignature?: string;
  transcript: string;
  translatedTranscript?: string;
  detectedLanguage?: string;
  summary: string;
  items: ExpenseLineItem[];
  totalAmount: number;
  status: 'processed' | 'pending' | 'manual';
  audioUrl?: string;
  callDeduplicated?: boolean;
  deduplicationNotes?: string;
  dialogueTurns?: Array<{ speaker: string; text: string; role?: string }>;
}

export interface ProcessedAudioCacheItem {
  id: string;
  fileName: string;
  fileSize?: number;
  lastModified?: number;
  transcript: string;
  translatedTranscript?: string;
  detectedLanguage?: string;
  summary: string;
  matchedItems: ExpenseLineItem[];
  totalAmount: number;
  status: 'completed' | 'no-match' | 'error';
  processedAt: number;
  callDeduplicated?: boolean;
  deduplicationNotes?: string;
  dialogueTurns?: Array<{ speaker: string; text: string; role?: string }>;
}
