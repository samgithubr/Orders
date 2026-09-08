import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles,
  Code2,
  Bell,
  CheckCircle2,
  FileSpreadsheet,
  Folder,
  Mic,
  Tag,
  Volume2,
  Zap,
  LayoutGrid,
  ListFilter,
  Download,
  Plus,
  AlertTriangle,
} from 'lucide-react';
import { DirectoryPicker } from './components/DirectoryPicker';
import { FileList } from './components/FileList';
import { NewFileBanner } from './components/NewFileBanner';
import { FilePreviewModal } from './components/FilePreviewModal';
import { SimulateAddModal } from './components/SimulateAddModal';
import { ReactNativeGuideModal } from './components/ReactNativeGuideModal';
import { MobileFrame } from './components/MobileFrame';
import { ExcelExpenseSheet } from './components/ExcelExpenseSheet';
import { ProductCatalogModal } from './components/ProductCatalogModal';
import { AudioExpenseRecorderModal } from './components/AudioExpenseRecorderModal';
import { FileEntryItem, DirectorySource, ProductItem, ExpenseRecord, ProcessedAudioCacheItem } from './types';
import { playNewFileChime } from './utils/sound';
import { generateSampleAudioWav, generateSampleImage, generateSampleVideo } from './utils/sampleMedia';
import { transcribeAndExtractExpense, exportExpensesToExcel } from './utils/expenseService';

const DEFAULT_PRODUCTS: ProductItem[] = [
  { id: 'p1', name: 'Coffee', price: 15, unit: 'cup', aliases: ['coffee', 'coffe', 'café', 'coffees', 'kapi'] },
  { id: 'p2', name: 'Tea', price: 15, unit: 'cup', aliases: ['tea', 'chai', 'teas', 'chay'] },
  { id: 'p3', name: 'Water Bottle', price: 20, unit: 'bottle', aliases: ['water', 'water bottle', 'water bottles', 'bottle', 'bottles', 'paani'] },
  { id: 'p4', name: 'Samosa', price: 20, unit: 'piece', aliases: ['samosa', 'samosas', 'samose'] },
];

const INITIAL_EXPENSES: ExpenseRecord[] = [];

export default function App() {
  // Directory state
  const [folderName, setFolderName] = useState<string | null>(null);
  const [directoryHandle, setDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [directorySource, setDirectorySource] = useState<DirectorySource>('file-system-api');
  const [files, setFiles] = useState<FileEntryItem[]>([]);
  const [latestFile, setLatestFile] = useState<FileEntryItem | null>(null);

  // Watcher state
  const [isWatching, setIsWatching] = useState<boolean>(false);
  const [lastPolledAt, setLastPolledAt] = useState<number>(Date.now());
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [autoTranscribeAudio, setAutoTranscribeAudio] = useState<boolean>(true);

  // View modes: 'unified' (both files and excel sheet), 'files', or 'excel'
  const [viewMode, setViewMode] = useState<'unified' | 'files' | 'excel'>('unified');

  // Expense & Product state
  const [products, setProducts] = useState<ProductItem[]>(() => {
    try {
      const saved = localStorage.getItem('catalog_products');
      return saved ? JSON.parse(saved) : DEFAULT_PRODUCTS;
    } catch {
      return DEFAULT_PRODUCTS;
    }
  });

  const [expenses, setExpenses] = useState<ExpenseRecord[]>(() => {
    try {
      const saved = localStorage.getItem('monthly_expenses');
      if (saved) {
        const parsed: ExpenseRecord[] = JSON.parse(saved);
        // Filter out any legacy hardcoded demo entries
        const clean = parsed.filter(
          (e) =>
            !e.id.startsWith('exp-demo-') &&
            e.transcript !== 'Hey send 2 coffee and 3 tea to conference room.' &&
            e.transcript !== 'Hey, send 2 coffee and 3 tea to pantry'
        );
        // Deduplicate any previously duplicated entries by sourceFileName or fileSignature
        const seen = new Set<string>();
        const deduplicated: ExpenseRecord[] = [];
        for (const item of clean) {
          const key = item.sourceFileName || item.fileSignature || item.id;
          if (!seen.has(key)) {
            seen.add(key);
            deduplicated.push(item);
          }
        }
        return deduplicated;
      }
      return [];
    } catch {
      return [];
    }
  });

  // Audio transcription & processing cache (stores transcripts, extracted items, and status)
  const [audioCache, setAudioCache] = useState<Record<string, ProcessedAudioCacheItem>>(() => {
    try {
      const saved = localStorage.getItem('processed_audio_cache');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Ref tracking for latest cache & expenses to prevent race conditions & stale closures
  const audioCacheRef = useRef<Record<string, ProcessedAudioCacheItem>>(audioCache);
  useEffect(() => {
    audioCacheRef.current = audioCache;
  }, [audioCache]);

  const expensesRef = useRef<ExpenseRecord[]>(expenses);
  useEffect(() => {
    expensesRef.current = expenses;
  }, [expenses]);

  // UI modals state
  const [selectedFileForPreview, setSelectedFileForPreview] = useState<FileEntryItem | null>(null);
  const [isSimulateModalOpen, setIsSimulateModalOpen] = useState<boolean>(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState<boolean>(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState<boolean>(false);
  const [isAudioRecorderOpen, setIsAudioRecorderOpen] = useState<boolean>(false);
  const [isMobileView, setIsMobileView] = useState<boolean>(false);
  const [toast, setToast] = useState<{ id: string; text: string; fileName: string; type?: 'info' | 'expense' } | null>(null);
  const [hasGeminiKey, setHasGeminiKey] = useState<boolean | null>(null);

  // Check backend Gemini API key configuration
  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        setHasGeminiKey(Boolean(data.hasGeminiKey));
      })
      .catch(() => {
        setHasGeminiKey(false);
      });
  }, []);

  // Signatures of known files to detect newly added items
  const knownSignaturesRef = useRef<Set<string>>(new Set());

  // Save products to local storage
  const handleSaveProducts = (updated: ProductItem[]) => {
    setProducts(updated);
    try {
      localStorage.setItem('catalog_products', JSON.stringify(updated));
    } catch (e) {
      console.warn('Could not persist products:', e);
    }
  };

  // Save expenses to local storage
  const handleSaveExpenses = (updated: ExpenseRecord[]) => {
    setExpenses(updated);
    try {
      localStorage.setItem('monthly_expenses', JSON.stringify(updated));
    } catch (e) {
      console.warn('Could not persist expenses:', e);
    }
  };

  // Show notification toast
  const triggerNewFileNotification = useCallback(
    (file: FileEntryItem, customMessage?: string, type: 'info' | 'expense' = 'info') => {
      if (soundEnabled) {
        playNewFileChime();
      }
      setToast({
        id: `${Date.now()}-${file.name}`,
        text: customMessage || 'Auto-fetched new file!',
        fileName: file.name,
        type,
      });
    },
    [soundEnabled]
  );

  // Dismiss toast automatically
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  // Check if a file is an audio or call recording
  const isAudioOrCallRecording = useCallback((file: FileEntryItem): boolean => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const isAudioType = (file.type || '').toLowerCase().startsWith('audio/');
    const isAudioExt = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'webm'].includes(ext);
    const hasAudioKeyword =
      file.name.toLowerCase().includes('call') ||
      file.name.toLowerCase().includes('recording') ||
      file.name.toLowerCase().includes('audio') ||
      file.name.toLowerCase().includes('voice');
    return isAudioType || isAudioExt || hasAudioKeyword;
  }, []);

  // Helper to retrieve cached audio transcription and status across sessions
  const getCachedAudioResult = useCallback(
    (file: FileEntryItem): ProcessedAudioCacheItem | null => {
      // 1. Direct cache lookup by file id / signature
      if (audioCacheRef.current[file.id]) {
        return audioCacheRef.current[file.id];
      }
      // 2. Lookup by file name in cache
      if (audioCacheRef.current[file.name]) {
        return audioCacheRef.current[file.name];
      }
      // 3. Fallback: Lookup in existing expense records
      const existingExp = expensesRef.current.find(
        (e) => e.sourceFileName === file.name || (e.fileSignature && e.fileSignature === file.id)
      );
      if (existingExp) {
        return {
          id: file.id,
          fileName: file.name,
          fileSize: file.size,
          lastModified: file.lastModified,
          transcript: existingExp.transcript,
          summary: existingExp.summary,
          matchedItems: existingExp.items,
          totalAmount: existingExp.totalAmount,
          status: 'completed',
          processedAt: existingExp.timestamp,
        };
      }
      return null;
    },
    []
  );

  // Transcribe audio file to text, filter against product catalog, and formulate into Excel sheet
  const processAudioFileToExpense = useCallback(
    async (file: FileEntryItem, customHint?: string, force: boolean = false) => {
      // If not explicitly forced (e.g. user clicked "Re-translate"), check if already processed
      if (!force) {
        const cached = getCachedAudioResult(file);
        if (cached && cached.status !== 'error') {
          console.log(`[Audio Expense] "${file.name}" was already processed. Skipping duplicate translation.`);
          setFiles((prev) =>
            prev.map((f) =>
              f.id === file.id
                ? {
                    ...f,
                    audioTranscription: {
                      status: cached.status,
                      transcript: cached.transcript,
                      matchedItems: cached.matchedItems,
                      totalAmount: cached.totalAmount,
                    },
                  }
                : f
            )
          );
          return;
        }
      }

      // Update file state to show transcribing in progress
      setFiles((prev) =>
        prev.map((f) =>
          f.id === file.id
            ? {
                ...f,
                audioTranscription: {
                  status: 'transcribing',
                  transcript: 'Translating audio speech to text...',
                },
              }
            : f
        )
      );

      try {
        const result = await transcribeAndExtractExpense(file, products, customHint);

        if (result.status === 'error' || result.error) {
          // File failed to transcribe (e.g. missing API key in local .env or invalid format)
          setFiles((prev) =>
            prev.map((f) =>
              f.id === file.id
                ? {
                    ...f,
                    audioTranscription: {
                      status: 'error',
                      transcript: result.transcript || 'Audio translation failed.',
                      error: result.error || result.transcript,
                      matchedItems: [],
                      totalAmount: 0,
                    },
                  }
                : f
            )
          );

          triggerNewFileNotification(
            file,
            result.missingApiKey
              ? 'Local Setup: Add GEMINI_API_KEY to your .env file to enable transcription.'
              : (result.error || 'Audio transcription error'),
            'info'
          );
          return;
        }

        const hasMatchedProducts = Array.isArray(result.extractedItems) && result.extractedItems.length > 0;
        const transcriptionStatus = hasMatchedProducts ? 'completed' : 'no-match';

        // Update file entry item with the translated text and matched products
        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id
              ? {
                  ...f,
                  audioTranscription: {
                    status: transcriptionStatus,
                    transcript: result.transcript || '(No speech detected)',
                    translatedTranscript: result.translatedTranscript,
                    detectedLanguage: result.detectedLanguage,
                    matchedItems: result.extractedItems,
                    totalAmount: result.totalAmount,
                    callDeduplicated: result.callDeduplicated,
                    deduplicationNotes: result.deduplicationNotes,
                    dialogueTurns: result.dialogueTurns,
                  },
                }
              : f
          )
        );

        // Cache the transcription result so it is never re-calculated on reload/re-scan
        const cacheEntry: ProcessedAudioCacheItem = {
          id: file.id,
          fileName: file.name,
          fileSize: file.size,
          lastModified: file.lastModified,
          transcript: result.transcript,
          translatedTranscript: result.translatedTranscript,
          detectedLanguage: result.detectedLanguage,
          summary: result.summary,
          matchedItems: result.extractedItems,
          totalAmount: result.totalAmount,
          status: transcriptionStatus,
          processedAt: Date.now(),
          callDeduplicated: result.callDeduplicated,
          deduplicationNotes: result.deduplicationNotes,
          dialogueTurns: result.dialogueTurns,
        };

        setAudioCache((prev) => {
          const next = {
            ...prev,
            [file.id]: cacheEntry,
            [file.name]: cacheEntry,
          };
          try {
            localStorage.setItem('processed_audio_cache', JSON.stringify(next));
          } catch {}
          return next;
        });

        // Strict Requirement: If converted text does not contain any catalog product description,
        // it MUST NOT form or add to the Excel sheet!
        if (!hasMatchedProducts) {
          console.log(`[Audio Expense] Audio file "${file.name}" transcribed, but contained no catalog items. Skipped Excel formulation.`);
          if (result.transcript && result.transcript.length > 0) {
            triggerNewFileNotification(
              file,
              `Transcribed: "${result.transcript.slice(0, 45)}" (No catalog products found - Skipped Excel)`,
              'info'
            );
          }
          return;
        }

        // Formulate into the Excel Expense Record ONLY when products are actually found
        const newRecord: ExpenseRecord = {
          id: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          timestamp: Date.now(),
          dateStr: new Date().toISOString().slice(0, 10),
          monthYear: new Date().toISOString().slice(0, 7),
          sourceFileName: file.name,
          fileSignature: file.id,
          transcript: result.transcript,
          translatedTranscript: result.translatedTranscript,
          detectedLanguage: result.detectedLanguage,
          summary: result.summary,
          items: result.extractedItems,
          totalAmount: result.totalAmount,
          status: 'processed',
          audioUrl: file.url,
          callDeduplicated: result.callDeduplicated,
          deduplicationNotes: result.deduplicationNotes,
          dialogueTurns: result.dialogueTurns,
        };

        setExpenses((prev) => {
          const existingIdx = prev.findIndex(
            (e) => e.sourceFileName === file.name || (e.fileSignature && e.fileSignature === file.id)
          );

          let updated: ExpenseRecord[];
          if (existingIdx >= 0) {
            if (force) {
              // User explicitly requested re-translation: update existing row in-place
              updated = [...prev];
              updated[existingIdx] = {
                ...updated[existingIdx],
                transcript: result.transcript,
                translatedTranscript: result.translatedTranscript,
                detectedLanguage: result.detectedLanguage,
                summary: result.summary,
                items: result.extractedItems,
                totalAmount: result.totalAmount,
                timestamp: Date.now(),
                fileSignature: file.id,
                callDeduplicated: result.callDeduplicated,
                deduplicationNotes: result.deduplicationNotes,
                dialogueTurns: result.dialogueTurns,
              };
            } else {
              // Already exists in Excel sheet! Do not duplicate
              return prev;
            }
          } else {
            updated = [newRecord, ...prev];
          }

          try {
            localStorage.setItem('monthly_expenses', JSON.stringify(updated));
          } catch {}
          return updated;
        });

        triggerNewFileNotification(
          file,
          `Translated Audio: "${result.summary}" → Added ₹${result.totalAmount} to Excel Sheet!`,
          'expense'
        );
      } catch (err: any) {
        console.error('Error transcribing audio to expenses:', err);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id
              ? {
                  ...f,
                  audioTranscription: {
                    status: 'error',
                    error: err?.message || 'Translation error',
                  },
                }
              : f
          )
        );
      }
    },
    [products, triggerNewFileNotification, getCachedAudioResult]
  );

  // Scan files from native FileSystemDirectoryHandle
  const scanDirectoryHandle = useCallback(
    async (dirHandle: FileSystemDirectoryHandle, isFirstScan: boolean = false) => {
      setIsScanning(true);
      try {
        const allFoundItems: FileEntryItem[] = [];
        const newlyDetectedFiles: FileEntryItem[] = [];

        for await (const entry of (dirHandle as any).values()) {
          if (entry.kind === 'file') {
            const fileHandle = entry as FileSystemFileHandle;
            try {
              const fileObj = await fileHandle.getFile();
              const signature = `${fileObj.name}_${fileObj.size}_${fileObj.lastModified}`;

              const item: FileEntryItem = {
                id: signature,
                name: fileObj.name,
                relativePath: fileObj.name,
                size: fileObj.size,
                lastModified: fileObj.lastModified,
                type: fileObj.type || '',
                handle: fileHandle,
                fileObj: fileObj,
              };

              // Pre-populate cached transcription if this audio file was previously processed
              if (isAudioOrCallRecording(item)) {
                const cached = getCachedAudioResult(item);
                if (cached) {
                  item.audioTranscription = {
                    status: cached.status,
                    transcript: cached.transcript,
                    matchedItems: cached.matchedItems,
                    totalAmount: cached.totalAmount,
                  };
                }
              }

              allFoundItems.push(item);

              if (!isFirstScan && !knownSignaturesRef.current.has(signature)) {
                item.isNewlyAdded = true;
                item.detectedAt = Date.now();
                newlyDetectedFiles.push(item);
                knownSignaturesRef.current.add(signature);
              } else if (isFirstScan) {
                knownSignaturesRef.current.add(signature);
              }
            } catch (err) {
              console.warn('Error reading file from handle:', entry.name, err);
            }
          }
        }

        if (newlyDetectedFiles.length > 0) {
          const newest = newlyDetectedFiles[newlyDetectedFiles.length - 1];
          setLatestFile(newest);
          triggerNewFileNotification(newest);

          // Add newly detected files to file list
          setFiles((prev) => {
            const existingIds = new Set(prev.map((f) => f.id));
            const freshItems = newlyDetectedFiles.filter((f) => !existingIds.has(f.id));
            return [...freshItems, ...prev];
          });

          // Automatically process newly detected audio files if not yet processed
          if (autoTranscribeAudio) {
            newlyDetectedFiles.forEach((file) => {
              if (isAudioOrCallRecording(file)) {
                const cached = getCachedAudioResult(file);
                if (!cached || cached.status === 'error') {
                  processAudioFileToExpense(file);
                }
              }
            });
          }
        } else if (isFirstScan) {
          setFiles(allFoundItems);
          if (allFoundItems.length > 0) {
            setLatestFile(allFoundItems[0]);
          }

          // On first scan: ONLY transcribe audio files that have NOT been processed before!
          if (autoTranscribeAudio) {
            allFoundItems.forEach((file) => {
              if (isAudioOrCallRecording(file)) {
                const cached = getCachedAudioResult(file);
                if (!cached || cached.status === 'error') {
                  processAudioFileToExpense(file);
                }
              }
            });
          }
        }

        setLastPolledAt(Date.now());
      } catch (error) {
        console.error('Scan error:', error);
      } finally {
        setIsScanning(false);
      }
    },
    [triggerNewFileNotification, autoTranscribeAudio, isAudioOrCallRecording, processAudioFileToExpense, getCachedAudioResult]
  );

  // 1. User picks directory using native File System Access API
  const handleDirectorySelected = async (handle: FileSystemDirectoryHandle) => {
    knownSignaturesRef.current.clear();
    setFolderName(handle.name);
    setDirectoryHandle(handle);
    setDirectorySource('file-system-api');
    setIsWatching(true);
    await scanDirectoryHandle(handle, true);
  };

  // 2. User selects directory using standard folder input (<input webkitdirectory>)
  const handleFallbackFilesSelected = (selectedFiles: FileList, folderLabel: string) => {
    knownSignaturesRef.current.clear();
    const items: FileEntryItem[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const signature = `${file.name}_${file.size}_${file.lastModified}`;
      knownSignaturesRef.current.add(signature);

      const item: FileEntryItem = {
        id: signature,
        name: file.name,
        relativePath: (file as any).webkitRelativePath || file.name,
        size: file.size,
        lastModified: file.lastModified,
        type: file.type,
        fileObj: file,
      };

      if (isAudioOrCallRecording(item)) {
        const cached = getCachedAudioResult(item);
        if (cached) {
          item.audioTranscription = {
            status: cached.status,
            transcript: cached.transcript,
            matchedItems: cached.matchedItems,
            totalAmount: cached.totalAmount,
          };
        }
      }

      items.push(item);
    }

    setFolderName(folderLabel || 'Selected Folder');
    setDirectoryHandle(null);
    setDirectorySource('directory-input');
    setFiles(items);
    if (items.length > 0) {
      setLatestFile(items[0]);
    }
    setIsWatching(true);
    setLastPolledAt(Date.now());

    // AUTOMATICALLY TRANSCRIBE ONLY UNPROCESSED AUDIO FILES
    if (autoTranscribeAudio) {
      items.forEach((file) => {
        if (isAudioOrCallRecording(file)) {
          const cached = getCachedAudioResult(file);
          if (!cached || cached.status === 'error') {
            processAudioFileToExpense(file);
          }
        }
      });
    }
  };

  // 3. User loads sample demo directory
  const handleUseSampleDirectory = () => {
    const audioUrl = generateSampleAudioWav();
    const imageUrl = generateSampleImage();
    const videoUrl = generateSampleVideo();

    const sampleFiles: FileEntryItem[] = [
      {
        id: 'sample-call-1',
        name: 'call_recording_pantry_2coffee_3tea.wav',
        relativePath: 'call_recording_pantry_2coffee_3tea.wav',
        size: 142000,
        lastModified: Date.now() - 3600000 * 1,
        type: 'audio/wav',
        url: audioUrl,
        audioTranscription: {
          status: 'completed',
          transcript: 'Hey, please send 2 coffee and 3 tea for office pantry',
          matchedItems: [
            { productName: 'Coffee', quantity: 2, unitPrice: 15, totalPrice: 30, notes: '2 cups' },
            { productName: 'Tea', quantity: 3, unitPrice: 15, totalPrice: 45, notes: '3 cups' },
          ],
          totalAmount: 75,
        },
      },
      {
        id: 'sample-call-2',
        name: 'call_recording_water_bottles_tea.wav',
        relativePath: 'call_recording_water_bottles_tea.wav',
        size: 118000,
        lastModified: Date.now() - 3600000 * 2,
        type: 'audio/wav',
        url: audioUrl,
        audioTranscription: {
          status: 'completed',
          transcript: 'Hello, please send 2 water bottles and 2 tea immediately',
          matchedItems: [
            { productName: 'Water Bottle', quantity: 2, unitPrice: 20, totalPrice: 40, notes: '2 bottles' },
            { productName: 'Tea', quantity: 2, unitPrice: 15, totalPrice: 30, notes: '2 cups' },
          ],
          totalAmount: 70,
        },
      },
      {
        id: 'sample-doc-1',
        name: 'notes_and_brief.md',
        relativePath: 'notes_and_brief.md',
        size: 3840,
        lastModified: Date.now() - 3600000 * 3,
        type: 'text/markdown',
        textContent: `# Project Notes & Specification\n\n## Automated Audio to Excel Expense Flow\n1. Select file directory\n2. All files in directory appear\n3. Audio call recordings are detected\n4. Automatically translated to text\n5. Filtered for product descriptions (Coffee ₹15, Tea ₹15, Water Bottle ₹20)\n6. Formulated into Excel monthly expense sheet\n\n## Status\n- Auto Watcher: Active`,
      },
      {
        id: 'sample-media-1',
        name: 'project_banner.png',
        relativePath: 'project_banner.png',
        size: 45000,
        lastModified: Date.now() - 3600000 * 4,
        type: 'image/png',
        url: imageUrl,
      },
      {
        id: 'sample-media-2',
        name: 'promo_preview_clip.mp4',
        relativePath: 'promo_preview_clip.mp4',
        size: 1250000,
        lastModified: Date.now() - 3600000 * 5,
        type: 'video/mp4',
        url: videoUrl,
      },
      {
        id: 'sample-config-1',
        name: 'app_catalog.json',
        relativePath: 'app_catalog.json',
        size: 1280,
        lastModified: Date.now() - 3600000 * 6,
        type: 'application/json',
        textContent: JSON.stringify(
          {
            appName: 'File Directory Watcher & Audio Expense Formulator',
            rates: { coffee: 15, tea: 15, waterBottle: 20, samosa: 20 },
            autoExcelExport: true,
          },
          null,
          2
        ),
      },
    ];

    const signatures = new Set<string>();
    sampleFiles.forEach((f) => {
      signatures.add(`${f.name}_${f.size}_${f.lastModified}`);
    });

    knownSignaturesRef.current = signatures;
    setFolderName('Office_Call_Recordings');
    setDirectoryHandle(null);
    setDirectorySource('mock-directory');
    setFiles(sampleFiles);
    setLatestFile(sampleFiles[0]);
    setIsWatching(true);
    setLastPolledAt(Date.now());

    // Populate initial expenses for the two sample audio call recordings
    const demoExpenses: ExpenseRecord[] = [
      {
        id: 'exp-sample-1',
        timestamp: Date.now() - 3600000 * 1,
        dateStr: new Date(Date.now() - 3600000 * 1).toISOString().slice(0, 10),
        monthYear: new Date(Date.now() - 3600000 * 1).toISOString().slice(0, 7),
        sourceFileName: 'call_recording_pantry_2coffee_3tea.wav',
        transcript: 'Hey, please send 2 coffee and 3 tea for office pantry',
        summary: '2x Coffee, 3x Tea',
        items: [
          { productName: 'Coffee', quantity: 2, unitPrice: 15, totalPrice: 30, notes: '2 cups' },
          { productName: 'Tea', quantity: 3, unitPrice: 15, totalPrice: 45, notes: '3 cups' },
        ],
        totalAmount: 75,
        status: 'processed',
        audioUrl: audioUrl,
      },
      {
        id: 'exp-sample-2',
        timestamp: Date.now() - 3600000 * 2,
        dateStr: new Date(Date.now() - 3600000 * 2).toISOString().slice(0, 10),
        monthYear: new Date(Date.now() - 3600000 * 2).toISOString().slice(0, 7),
        sourceFileName: 'call_recording_water_bottles_tea.wav',
        transcript: 'Hello, please send 2 water bottles and 2 tea immediately',
        summary: '2x Water Bottle, 2x Tea',
        items: [
          { productName: 'Water Bottle', quantity: 2, unitPrice: 20, totalPrice: 40, notes: '2 bottles' },
          { productName: 'Tea', quantity: 2, unitPrice: 15, totalPrice: 30, notes: '2 cups' },
        ],
        totalAmount: 70,
        status: 'processed',
        audioUrl: audioUrl,
      },
    ];

    setExpenses(demoExpenses);
    try {
      localStorage.setItem('monthly_expenses', JSON.stringify(demoExpenses));
    } catch {}
  };

  // 4. Handle newly simulated or dropped file
  const handleAddSimulatedFile = (newFile: FileEntryItem) => {
    const signature = `${newFile.name}_${newFile.size}_${newFile.lastModified}`;
    knownSignaturesRef.current.add(signature);

    setLatestFile(newFile);
    triggerNewFileNotification(newFile);

    setFiles((prev) => [newFile, ...prev]);
    setLastPolledAt(Date.now());

    // If audio file and auto-transcribe is enabled, automatically process it!
    if (autoTranscribeAudio && isAudioOrCallRecording(newFile)) {
      processAudioFileToExpense(newFile);
    }
  };

  // Quick test: simulate an audio call recording with 2 coffee and 3 tea
  const handleAddSampleExpenseCall = () => {
    const audioUrl = generateSampleAudioWav();
    const fileName = `call_order_${Date.now().toString().slice(-4)}_2coffee_3tea.wav`;
    const newFile: FileEntryItem = {
      id: `call-sim-${Date.now()}`,
      name: fileName,
      relativePath: fileName,
      size: 96000,
      lastModified: Date.now(),
      type: 'audio/wav',
      url: audioUrl,
      isNewlyAdded: true,
      detectedAt: Date.now(),
    };

    handleAddSimulatedFile(newFile);
    processAudioFileToExpense(newFile, 'Hey, send 2 coffee and 3 tea for office pantry');
  };

  // Quick test: simulate two-way call with order + shop confirmation echo ("I call coffee shop ask for 2 coffee 3 tea and from other end he confirms ok i send 2 coffee 3 tea")
  const handleAddDeduplicationTestCall = () => {
    const audioUrl = generateSampleAudioWav();
    const fileName = `call_order_twoway_dedup_${Date.now().toString().slice(-4)}.wav`;
    const newFile: FileEntryItem = {
      id: `call-dedup-${Date.now()}`,
      name: fileName,
      relativePath: fileName,
      size: 112000,
      lastModified: Date.now(),
      type: 'audio/wav',
      url: audioUrl,
      isNewlyAdded: true,
      detectedAt: Date.now(),
    };

    handleAddSimulatedFile(newFile);
    processAudioFileToExpense(
      newFile,
      'I call the coffee shop ask for 2 coffee 3 tea and from other end he confirms order by saying ok i send 2 coffee 3 tea'
    );
  };

  // Quick test: simulate two-way Hindi call recording with order and vendor confirmation
  const handleAddHindiDeduplicationTestCall = () => {
    const audioUrl = generateSampleAudioWav();
    const fileName = `call_hindi_pantry_order_${Date.now().toString().slice(-4)}.wav`;
    const newFile: FileEntryItem = {
      id: `call-hindi-${Date.now()}`,
      name: fileName,
      relativePath: fileName,
      size: 124000,
      lastModified: Date.now(),
      type: 'audio/wav',
      url: audioUrl,
      isNewlyAdded: true,
      detectedAt: Date.now(),
    };

    handleAddSimulatedFile(newFile);
    processAudioFileToExpense(
      newFile,
      'भैया २ कॉफी और ३ चाय भेज देना... हाँ ठीक है मैं २ कॉफी और ३ चाय भेजता हूँ'
    );
  };

  // Delete an expense record from the Excel sheet
  const handleDeleteExpense = (id: string) => {
    const expenseToDelete = expenses.find((e) => e.id === id);
    const updated = expenses.filter((e) => e.id !== id);
    handleSaveExpenses(updated);

    if (expenseToDelete) {
      // Update cache so deleted expense does not automatically re-add on next reload/scan
      setAudioCache((prev) => {
        const next = { ...prev };
        if (next[expenseToDelete.sourceFileName]) {
          next[expenseToDelete.sourceFileName] = {
            ...next[expenseToDelete.sourceFileName],
            status: 'no-match',
          };
        }
        if (expenseToDelete.fileSignature && next[expenseToDelete.fileSignature]) {
          next[expenseToDelete.fileSignature] = {
            ...next[expenseToDelete.fileSignature],
            status: 'no-match',
          };
        }
        try {
          localStorage.setItem('processed_audio_cache', JSON.stringify(next));
        } catch {}
        return next;
      });

      // Update file entry in UI to reflect that it's no longer added to Excel
      setFiles((prev) =>
        prev.map((f) =>
          f.name === expenseToDelete.sourceFileName || (expenseToDelete.fileSignature && f.id === expenseToDelete.fileSignature)
            ? {
                ...f,
                audioTranscription: f.audioTranscription
                  ? {
                      ...f.audioTranscription,
                      status: 'no-match',
                    }
                  : undefined,
              }
            : f
        )
      );
    }
  };

  // Continuous auto-watcher polling loop for native FileSystemDirectoryHandle
  useEffect(() => {
    if (!isWatching || !directoryHandle) return;

    const interval = setInterval(() => {
      scanDirectoryHandle(directoryHandle, false);
    }, 1500);

    return () => clearInterval(interval);
  }, [isWatching, directoryHandle, scanDirectoryHandle]);

  // Reset / Change Directory
  const handleClearDirectory = () => {
    setFolderName(null);
    setDirectoryHandle(null);
    setFiles([]);
    setLatestFile(null);
    setIsWatching(false);
    knownSignaturesRef.current.clear();
  };

  const handleForceScan = () => {
    if (directoryHandle) {
      scanDirectoryHandle(directoryHandle, false);
    } else {
      setLastPolledAt(Date.now());
    }
  };

  // Calculate total monthly spend
  const totalMonthlySum = expenses.reduce((sum, e) => sum + e.totalAmount, 0);

  return (
    <MobileFrame
      isMobileView={isMobileView}
      onToggleView={() => setIsMobileView(!isMobileView)}
    >
      <div className="w-full flex-1 flex flex-col">
        {/* API Key Setup Alert Banner when running without Gemini API key */}
        {hasGeminiKey === false && (
          <div className="mb-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-2xl p-3.5 text-xs text-amber-900 dark:text-amber-200 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start sm:items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <span className="font-bold">
                  {typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')
                    ? 'Vercel Deployment Setup:'
                    : typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
                    ? 'Cloud Deployment Setup:'
                    : 'Local VS Code Setup:'}
                </span>{' '}
                <span>
                  {typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')
                    ? 'To enable audio transcription on Vercel, open your Vercel Dashboard → Project Settings → Environment Variables and add:'
                    : typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
                    ? 'To enable audio transcription on your live app, configure the environment variable:'
                    : 'To transcribe actual MP3 call recordings on your local machine, open your project folder and add your key in .env:'}
                </span>
                <span className="ml-2 inline-block font-mono bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded text-amber-800 dark:text-amber-200 font-semibold select-all">
                  GEMINI_API_KEY="your_api_key"
                </span>
              </div>
            </div>
            <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium whitespace-nowrap">
              {typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')
                ? 'Then go to Deployments → Redeploy'
                : 'Then restart npm run dev (or redeploy)'}
            </span>
          </div>
        )}

        {/* Top Product Pricing Bar - Always Visible so user sees Coffee: 15, Tea: 15, Water: 20 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 mb-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-amber-500" />
              Active Product Rates:
            </span>
            {products.map((prod) => (
              <span
                key={prod.id}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs"
              >
                <span>{prod.name}:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                  ₹{prod.price}
                </span>
                <span className="text-[10px] text-slate-400">/{prod.unit}</span>
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-edit-rates"
              onClick={() => setIsProductModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-indigo-500" />
              <span>Add Product / Edit Prices</span>
            </button>

            <button
              id="btn-download-excel-direct"
              onClick={() => exportExpensesToExcel(expenses, products, 'Current')}
              disabled={expenses.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              title="Download Excel Spreadsheet (.xlsx)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .XLSX</span>
            </button>
          </div>
        </div>

        {/* Floating Quick Action Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              {folderName ? `Directory: ${folderName}` : 'Select a Directory to Begin'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Auto-Transcribe Toggle */}
            <button
              onClick={() => setAutoTranscribeAudio(!autoTranscribeAudio)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                autoTranscribeAudio
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
              }`}
              title="Automatically translate call recordings to text & add to Excel sheet"
            >
              <Zap
                className={`w-3.5 h-3.5 ${
                  autoTranscribeAudio ? 'text-emerald-600 fill-current' : 'text-slate-400'
                }`}
              />
              <span className="hidden sm:inline">Auto-Translate to Excel:</span>
              <span>{autoTranscribeAudio ? 'ON' : 'OFF'}</span>
            </button>

            {/* Record / Voice Order Modal Button */}
            <button
              id="btn-voice-recorder"
              onClick={() => setIsAudioRecorderOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Mic className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden sm:inline">Record Mic Audio</span>
            </button>

            {/* React Native Code Button */}
            <button
              id="btn-open-rn-guide"
              onClick={() => setIsGuideModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 text-xs font-medium shadow-2xs transition-colors cursor-pointer"
            >
              <Code2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden sm:inline">React Native</span>
            </button>
          </div>
        </div>

        {/* View Mode Switcher: Unified (Files + Excel), Files Only, Excel Only */}
        {folderName && (
          <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800/80 rounded-xl mb-4 border border-slate-300/60 dark:border-slate-700/60">
            <button
              onClick={() => setViewMode('unified')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                viewMode === 'unified'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-indigo-500" />
              <span>Unified View (Files & Formed Excel Sheet)</span>
            </button>

            <button
              onClick={() => setViewMode('files')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                viewMode === 'files'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Folder className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Files Only</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-mono">
                {files.length}
              </span>
            </button>

            <button
              onClick={() => setViewMode('excel')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                viewMode === 'excel'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Excel Sheet Only</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-mono font-bold">
                ₹{totalMonthlySum}
              </span>
            </button>
          </div>
        )}

        {/* Live Floating Notification Toast */}
        {toast && (
          <div
            id="live-toast-notification"
            className="fixed bottom-6 right-6 z-50 max-w-md bg-slate-900 text-white p-3.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-200"
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                toast.type === 'expense' ? 'bg-emerald-600' : 'bg-indigo-600'
              }`}
            >
              {toast.type === 'expense' ? (
                <FileSpreadsheet className="w-5 h-5 text-white" />
              ) : (
                <Sparkles className="w-5 h-5 text-white animate-spin" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                  {toast.type === 'expense' ? 'Audio Transcribed to Excel' : 'New File Detected'}
                </span>
                <span className="text-[10px] text-slate-400">Just now</span>
              </div>
              <p className="text-xs font-semibold text-white truncate">{toast.text}</p>
              <p className="text-[11px] text-slate-400 truncate">{toast.fileName}</p>
            </div>
          </div>
        )}

        {/* MAIN BODY CONTENT */}
        {!folderName ? (
          <div className="my-auto">
            <DirectoryPicker
              onDirectorySelected={handleDirectorySelected}
              onFallbackFilesSelected={handleFallbackFilesSelected}
              onUseSampleDirectory={handleUseSampleDirectory}
              isLoading={isScanning}
            />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Top Watcher Status Bar */}
            <NewFileBanner
              latestFile={latestFile}
              isWatching={isWatching}
              lastPolledAt={lastPolledAt}
              soundEnabled={soundEnabled}
              onToggleSound={() => setSoundEnabled(!soundEnabled)}
              onForceScan={handleForceScan}
              onSelectFile={(f) => setSelectedFileForPreview(f)}
              isScanning={isScanning}
            />

            {/* SECTION 1: DIRECTORY FILES */}
            {(viewMode === 'unified' || viewMode === 'files') && (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Folder className="w-4 h-4 text-indigo-500" />
                    <span>1. Files in Directory ({files.length})</span>
                    <span className="text-xs font-normal text-slate-400">
                      — Audio call recordings auto-translated to text
                    </span>
                  </h3>
                </div>

                <FileList
                  files={files}
                  folderName={folderName}
                  products={products}
                  onSelectFile={(f) => setSelectedFileForPreview(f)}
                  onClearDirectory={handleClearDirectory}
                  onSimulateAddFile={() => setIsSimulateModalOpen(true)}
                  onTranscribeAudio={(file) => processAudioFileToExpense(file, undefined, true)}
                />
              </div>
            )}

            {/* SECTION 2: FORMED EXCEL EXPENSE SHEET */}
            {(viewMode === 'unified' || viewMode === 'excel') && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                    <span>2. Formed Excel Expense Sheet</span>
                    <span className="text-xs font-normal text-slate-400">
                      — Filtered against product catalog (Coffee ₹15, Tea ₹15, Water ₹20)
                    </span>
                  </h3>
                </div>

                <ExcelExpenseSheet
                  expenses={expenses}
                  products={products}
                  onOpenProductModal={() => setIsProductModalOpen(true)}
                  onDeleteExpense={handleDeleteExpense}
                  onAddSampleExpenseCall={handleAddSampleExpenseCall}
                  onAddDeduplicationTestCall={handleAddDeduplicationTestCall}
                  onAddHindiDeduplicationTestCall={handleAddHindiDeduplicationTestCall}
                />
              </div>
            )}
          </div>
        )}

        {/* Modals */}
        <FilePreviewModal
          file={selectedFileForPreview}
          onClose={() => setSelectedFileForPreview(null)}
          onTranscribeToExpenses={(file) => {
            processAudioFileToExpense(file);
          }}
        />

        <SimulateAddModal
          isOpen={isSimulateModalOpen}
          onClose={() => setIsSimulateModalOpen(false)}
          onAddSimulatedFile={handleAddSimulatedFile}
        />

        <ProductCatalogModal
          isOpen={isProductModalOpen}
          onClose={() => setIsProductModalOpen(false)}
          products={products}
          onSaveProducts={handleSaveProducts}
        />

        <AudioExpenseRecorderModal
          isOpen={isAudioRecorderOpen}
          onClose={() => setIsAudioRecorderOpen(false)}
          products={products}
          onProcessAudioRecording={async (file, hint) => {
            handleAddSimulatedFile(file);
            await processAudioFileToExpense(file, hint);
          }}
        />

        <ReactNativeGuideModal
          isOpen={isGuideModalOpen}
          onClose={() => setIsGuideModalOpen(false)}
        />
      </div>
    </MobileFrame>
  );
}
