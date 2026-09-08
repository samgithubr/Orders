import React, { useState, useMemo } from 'react';
import {
  Search,
  ArrowUpDown,
  Clock,
  Calendar,
  HardDrive,
  FileQuestion,
  Eye,
  Sparkles,
  Volume2,
  Play,
  CheckCircle,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Tag,
  Info,
  AlertCircle,
} from 'lucide-react';
import { FileEntryItem, SortMode, ProductItem } from '../types';
import { formatBytes, formatDateTime, getFileExtension } from '../utils/formatters';
import { getFileCategory } from '../utils/fileIcons';
import { playSpokenCallAudio } from '../utils/expenseService';

interface FileListProps {
  files: FileEntryItem[];
  folderName: string;
  onSelectFile: (file: FileEntryItem) => void;
  onClearDirectory: () => void;
  onSimulateAddFile?: () => void;
  products?: ProductItem[];
  onTranscribeAudio?: (file: FileEntryItem) => void;
}

export const FileList: React.FC<FileListProps> = ({
  files,
  folderName,
  onSelectFile,
  onClearDirectory,
  onSimulateAddFile,
  products = [],
  onTranscribeAudio,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('detected-desc');
  const [playingId, setPlayingId] = useState<string | null>(null);

  const filteredFiles = useMemo(() => {
    let result = [...files];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.relativePath.toLowerCase().includes(q) ||
          getFileExtension(f.name).includes(q) ||
          (f.audioTranscription?.transcript &&
            f.audioTranscription.transcript.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      if (sortMode === 'detected-desc') {
        const timeA = a.detectedAt || a.lastModified || 0;
        const timeB = b.detectedAt || b.lastModified || 0;
        return timeB - timeA;
      }
      if (sortMode === 'modified-desc') {
        return (b.lastModified || 0) - (a.lastModified || 0);
      }
      if (sortMode === 'name-asc') {
        return a.name.localeCompare(b.name);
      }
      if (sortMode === 'size-desc') {
        return b.size - a.size;
      }
      return 0;
    });

    return result;
  }, [files, searchQuery, sortMode]);

  const totalBytes = useMemo(() => {
    return files.reduce((acc, f) => acc + f.size, 0);
  }, [files]);

  const handlePlayVoice = (file: FileEntryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setPlayingId(file.id);

    const speechText =
      file.audioTranscription?.transcript ||
      `Audio recording: ${file.name.replace(/_/g, ' ')}`;

    if (file.url) {
      try {
        const audio = new Audio(file.url);
        audio.play().catch(() => {
          playSpokenCallAudio(speechText);
        });
        audio.onended = () => setPlayingId(null);
      } catch {
        playSpokenCallAudio(speechText);
        setTimeout(() => setPlayingId(null), 3000);
      }
    } else {
      playSpokenCallAudio(speechText);
      setTimeout(() => setPlayingId(null), 3000);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col">
      {/* Directory Header */}
      <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-950/40">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Selected Directory
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
              {files.length} {files.length === 1 ? 'file' : 'files'}
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mt-0.5">
            <span className="truncate max-w-[240px] sm:max-w-md">{folderName}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
            <HardDrive className="w-3 h-3" />
            Total: {formatBytes(totalBytes)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onSimulateAddFile && (
            <button
              id="btn-simulate-add"
              onClick={onSimulateAddFile}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-900/80 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-semibold hover:bg-indigo-100 transition-colors shadow-2xs cursor-pointer"
              title="Add or simulate an audio call recording or document"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>+ Add / Drop Audio Call</span>
            </button>
          )}

          <button
            id="btn-change-directory"
            onClick={onClearDirectory}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            Change Directory
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 border-b border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between bg-white dark:bg-slate-900">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search files, audio transcripts, or products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-hidden cursor-pointer"
          >
            <option value="detected-desc">Latest Detected First</option>
            <option value="modified-desc">Last Modified Date</option>
            <option value="name-asc">File Name (A - Z)</option>
            <option value="size-desc">File Size (Largest)</option>
          </select>
        </div>
      </div>

      {/* Files List Content */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800/80 overflow-y-auto max-h-[600px]">
        {filteredFiles.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <FileQuestion className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              {searchQuery ? 'No files match your search filter' : 'No files found in this directory'}
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? 'Try clearing the search query to view all items.'
                : 'Whenever a new file is added to this folder, the watcher will automatically catch and display it here.'}
            </p>
            {onSimulateAddFile && !searchQuery && (
              <button
                onClick={onSimulateAddFile}
                className="mt-4 inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-semibold hover:bg-indigo-100 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Add / Simulate Call Recording File
              </button>
            )}
          </div>
        ) : (
          filteredFiles.map((file) => {
            const { icon, category } = getFileCategory(file.name, file.type);
            const ext = getFileExtension(file.name);
            const isAudio =
              category === 'audio' ||
              file.type.startsWith('audio/') ||
              ['wav', 'mp3', 'm4a', 'ogg', 'webm'].includes(ext);

            const isTranscribing = file.audioTranscription?.status === 'transcribing';
            const hasTranscription =
              file.audioTranscription?.status === 'completed' ||
              Boolean(file.audioTranscription?.transcript);
            const hasMatchedProducts =
              Array.isArray(file.audioTranscription?.matchedItems) &&
              file.audioTranscription.matchedItems.length > 0;
            const isNoMatch =
              file.audioTranscription?.status === 'no-match' ||
              (hasTranscription && !hasMatchedProducts && !isTranscribing);

            return (
              <div
                key={file.id}
                id={`file-item-${file.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`}
                onClick={() => onSelectFile(file)}
                className={`group p-3.5 sm:px-5 hover:bg-slate-50/90 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${
                  file.isNewlyAdded
                    ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-l-3 border-l-indigo-500'
                    : ''
                }`}
              >
                {/* Main File Line */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      {icon}
                    </div>

                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {file.name}
                        </p>

                        {file.isNewlyAdded && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-600 text-white animate-pulse uppercase tracking-wider">
                            NEW
                          </span>
                        )}

                        {isAudio && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <Volume2 className="w-3 h-3" />
                            CALL RECORDING
                          </span>
                        )}

                        {ext && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase">
                            {ext}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                        <span>{formatBytes(file.size)}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {formatDateTime(file.lastModified)}
                        </span>
                        {file.detectedAt && (
                          <span className="hidden md:inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                            <Clock className="w-3 h-3" />
                            Caught {formatDateTime(file.detectedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isAudio && (
                      <button
                        onClick={(e) => handlePlayVoice(file, e)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                          playingId === file.id
                            ? 'bg-amber-500 text-white border-amber-600 animate-pulse'
                            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100'
                        }`}
                        title="Listen to call audio recording"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>{playingId === file.id ? 'Playing...' : 'Play Audio'}</span>
                      </button>
                    )}

                    <button
                      className="p-1.5 rounded-lg text-slate-400 group-hover:text-indigo-600 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors"
                      title="Open in Viewer"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* AUTOMATED SPEECH-TO-TEXT & PRODUCT FILTERING CARD FOR AUDIO FILES */}
                {isAudio && (
                  <div className="mt-3 ml-13 mr-1 p-3 rounded-xl bg-slate-50/90 dark:bg-slate-800/70 border border-slate-200/90 dark:border-slate-700/60 space-y-2">
                    {/* Status header */}
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        {isTranscribing ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
                            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                              Translating audio speech to text & filtering against catalog...
                            </span>
                          </>
                        ) : hasMatchedProducts ? (
                          <>
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                              Translated & Added to Excel (+₹{file.audioTranscription?.totalAmount})
                            </span>
                          </>
                        ) : isNoMatch ? (
                          <>
                            <Info className="w-3.5 h-3.5 text-slate-500" />
                            <span className="font-semibold text-slate-600 dark:text-slate-400">
                              Transcribed • No catalog products found (Skipped Excel)
                            </span>
                          </>
                        ) : file.audioTranscription?.status === 'error' ? (
                          <>
                            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                            <span className="font-semibold text-rose-600 dark:text-rose-400">
                              Translation issue: {file.audioTranscription.error || 'Retry below'}
                            </span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3.5 h-3.5 text-amber-500" />
                            <span className="font-medium text-slate-500">
                              Audio call detected
                            </span>
                          </>
                        )}
                      </div>

                      {onTranscribeAudio && !isTranscribing && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onTranscribeAudio(file);
                          }}
                          className="text-[11px] text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 cursor-pointer bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 shadow-2xs"
                          title="Re-run transcription & filter"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Re-translate</span>
                        </button>
                      )}
                    </div>

                    {/* Translated Text Block */}
                    {file.audioTranscription?.status === 'error' ? (
                      <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-200 space-y-1.5">
                        <div className="font-semibold flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                          <span>Translation Notice</span>
                        </div>
                        <p className="text-[11px] leading-relaxed font-mono">
                          {file.audioTranscription.error || file.audioTranscription.transcript}
                        </p>
                        {(file.audioTranscription.error?.includes('GEMINI_API_KEY') ||
                          file.audioTranscription.transcript?.includes('GEMINI_API_KEY')) && (
                          <div className="mt-2 pt-2 border-t border-rose-200/80 dark:border-rose-800/60 text-[11px] text-rose-900 dark:text-rose-300">
                            <span className="font-semibold">
                              {typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')
                                ? 'Vercel Setup:'
                                : 'API Key Setup:'}
                            </span>{' '}
                            {typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')
                              ? 'In your Vercel Dashboard, go to Project Settings → Environment Variables and add:'
                              : 'In your project folder, create or edit .env:'}
                            <div className="bg-white dark:bg-slate-900 p-2 rounded mt-1 font-mono text-[11px] text-slate-800 dark:text-slate-200 border border-rose-200 dark:border-rose-800/80 select-all">
                              GEMINI_API_KEY="your_api_key_here"
                            </div>
                            <span className="text-[10px] text-rose-700 dark:text-rose-400 block mt-1">
                              {typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')
                                ? 'Then go to Vercel Deployments → Redeploy.'
                                : 'Then restart npm run dev in your terminal and click Re-translate.'}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : file.audioTranscription?.transcript ? (
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                          <span>Translated Audio Text:</span>
                        </div>
                        <p className="text-xs font-mono text-slate-800 dark:text-slate-200 leading-relaxed italic">
                          "{file.audioTranscription.transcript}"
                        </p>
                      </div>
                    ) : (
                      <div className="p-2 rounded bg-amber-50/60 dark:bg-amber-950/20 text-[11px] text-amber-800 dark:text-amber-300">
                        Translating audio file to text instantly...
                      </div>
                    )}

                    {/* Matched Products against Catalog */}
                    {hasMatchedProducts ? (
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/40">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                            Extracted Products:
                          </span>
                          {file.audioTranscription!.matchedItems!.map((item, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold"
                            >
                              <span>
                                {item.quantity}x {item.productName}
                              </span>
                              <span className="opacity-75 font-mono">
                                (@₹{item.unitPrice} = ₹{item.totalPrice})
                              </span>
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                            Order Total:
                          </span>
                          <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-mono font-bold text-xs shadow-2xs">
                            ₹{file.audioTranscription!.totalAmount || 0}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                            <FileSpreadsheet className="w-3 h-3" />
                            Added to Excel
                          </span>
                        </div>
                      </div>
                    ) : isNoMatch && !isTranscribing ? (
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/40">
                        <span className="flex items-center gap-1.5 text-slate-500">
                          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          No catalog products mentioned in this recording. Excluded from Excel sheet.
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-semibold border border-slate-200 dark:border-slate-700 shrink-0">
                          Skipped Excel
                        </span>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Directory Footer Info */}
      <div className="p-3 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500 flex items-center justify-between">
        <span>
          Showing {filteredFiles.length} of {files.length} items
        </span>
        <span className="flex items-center gap-1 text-slate-400">
          Audio recordings automatically translate & populate the Excel sheet
        </span>
      </div>
    </div>
  );
};
