import React, { useEffect, useState } from 'react';
import {
  X,
  Copy,
  Check,
  Play,
  Pause,
  Volume2,
  Download,
  AlertTriangle,
  FileText,
  FileCode,
  FileImage,
  FileAudio,
  FileVideo,
  FileCheck,
  Maximize2,
  Sparkles
} from 'lucide-react';
import { FileEntryItem } from '../types';
import { formatBytes, formatDateTime, getFileExtension } from '../utils/formatters';
import { getFileCategory } from '../utils/fileIcons';

interface FilePreviewModalProps {
  file: FileEntryItem | null;
  onClose: () => void;
  onTranscribeToExpenses?: (file: FileEntryItem) => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ file, onClose, onTranscribeToExpenses }) => {
  const [content, setContent] = useState<string | null>(null);
  const [mediaBlobUrl, setMediaBlobUrl] = useState<string | null>(null);
  const [resolvedType, setResolvedType] = useState<'text' | 'image' | 'audio' | 'video' | 'json' | 'other'>('other');
  const [isLoading, setIsLoading] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!file) {
      setContent(null);
      setMediaBlobUrl(null);
      setErrorNotice(null);
      return;
    }

    let active = true;
    let createdUrl: string | null = null;

    const determineType = (filename: string, mime: string): 'text' | 'image' | 'audio' | 'video' | 'json' | 'other' => {
      const ext = getFileExtension(filename);
      const m = mime.toLowerCase();

      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext) || m.startsWith('image/')) {
        return 'image';
      }
      if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext) || m.startsWith('audio/')) {
        return 'audio';
      }
      if (['mp4', 'webm', 'mov', 'mkv', 'avi', 'ogv'].includes(ext) || m.startsWith('video/')) {
        return 'video';
      }
      if (['json', 'geojson', 'topojson'].includes(ext) || m.includes('json')) {
        return 'json';
      }
      if (
        ['txt', 'md', 'js', 'jsx', 'ts', 'tsx', 'html', 'css', 'scss', 'py', 'java', 'c', 'cpp', 'cs', 'go', 'rs', 'sh', 'sql', 'csv', 'tsv', 'xml', 'yaml', 'yml', 'env', 'log', 'ini', 'toml'].includes(ext) ||
        m.startsWith('text/')
      ) {
        return 'text';
      }
      return 'other';
    };

    const type = determineType(file.name, file.type);
    setResolvedType(type);

    const loadContent = async () => {
      setIsLoading(true);
      setErrorNotice(null);

      try {
        let fileBlob: Blob | File | null = file.fileObj || null;

        // If from FileSystemFileHandle
        if (!fileBlob && file.handle) {
          try {
            fileBlob = await file.handle.getFile();
          } catch (handleErr) {
            console.warn('Could not acquire File from handle:', handleErr);
          }
        }

        // Handle text & JSON
        if (type === 'text' || type === 'json') {
          if (file.textContent) {
            setContent(file.textContent);
          } else if (fileBlob) {
            const text = await (fileBlob as Blob).text();
            if (active) setContent(text);
          } else {
            setErrorNotice('File content is empty or could not be read directly from system.');
          }
        } else if (type === 'image' || type === 'audio' || type === 'video') {
          if (fileBlob) {
            createdUrl = URL.createObjectURL(fileBlob);
            if (active) setMediaBlobUrl(createdUrl);
          } else if (file.url) {
            if (active) setMediaBlobUrl(file.url);
          } else {
            setErrorNotice(
              `This file was detected via filename metadata. To play/view binary media like audio or video directly, drag & drop the actual file or select it using the standard folder picker.`
            );
          }
        } else {
          // Other binary files
          if (fileBlob) {
            createdUrl = URL.createObjectURL(fileBlob);
            if (active) setMediaBlobUrl(createdUrl);
          }
        }
      } catch (err: unknown) {
        if (active) {
          setErrorNotice(`Could not load preview: ${(err as Error).message || 'File access error'}`);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    loadContent();

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [file]);

  if (!file) return null;

  const { icon, category } = getFileCategory(file.name, file.type);
  const ext = getFileExtension(file.name);

  const handleCopy = () => {
    if (content) {
      navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (mediaBlobUrl) {
      const a = document.createElement('a');
      a.href = mediaBlobUrl;
      a.download = file.name;
      a.click();
    } else if (content) {
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Top Header */}
        <div className="p-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 shadow-2xs">
              {icon}
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                {file.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {file.relativePath || file.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(content || mediaBlobUrl) && (
              <button
                id="btn-download-preview"
                onClick={handleDownload}
                title="Download / Save File"
                className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
            <button
              id="btn-close-preview"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Metadata Strip */}
        <div className="px-6 py-2.5 bg-slate-100/70 dark:bg-slate-800/40 text-xs text-slate-600 dark:text-slate-300 grid grid-cols-2 sm:grid-cols-4 gap-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Size</span>
            <span className="font-semibold">{formatBytes(file.size)}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Type</span>
            <span className="font-semibold capitalize">{resolvedType} ({ext ? `.${ext}` : 'file'})</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Modified</span>
            <span className="font-semibold">{formatDateTime(file.lastModified)}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Status</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {file.isNewlyAdded ? 'Newly Added' : 'Indexed'}
            </span>
          </div>
        </div>

        {/* Content Viewer Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-[220px] bg-slate-50/30 dark:bg-slate-900/60 flex flex-col justify-center">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-2">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-medium">Loading file content & media streams...</p>
            </div>
          ) : errorNotice ? (
            <div className="p-5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-xs space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Media Information</span>
              </div>
              <p className="leading-relaxed">{errorNotice}</p>
            </div>
          ) : resolvedType === 'image' && mediaBlobUrl ? (
            /* IMAGE VIEWER */
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="relative max-h-[460px] overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-950/10 flex items-center justify-center p-2 shadow-inner">
                <img
                  src={mediaBlobUrl}
                  alt={file.name}
                  className="max-h-[420px] w-auto max-w-full object-contain rounded-lg shadow-sm"
                />
              </div>
              <span className="text-[11px] text-slate-400">Image loaded directly from selected directory</span>
            </div>
          ) : resolvedType === 'audio' && mediaBlobUrl ? (
            /* AUDIO PLAYER */
            <div className="w-full max-w-lg mx-auto bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs">
                <FileAudio className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-base">{file.name}</h4>
                <p className="text-xs text-slate-400 mt-0.5">Audio Track • {formatBytes(file.size)}</p>
              </div>

              {/* Native HTML5 Audio Element with custom wrapper */}
              <div className="w-full pt-2">
                <audio
                  controls
                  autoPlay
                  src={mediaBlobUrl}
                  className="w-full focus:outline-hidden"
                >
                  Your browser does not support audio playback.
                </audio>
              </div>

              {onTranscribeToExpenses && (
                <button
                  onClick={() => {
                    onTranscribeToExpenses(file);
                    onClose();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Translate Audio to Text & Add to Excel Sheet</span>
                </button>
              )}
            </div>
          ) : resolvedType === 'video' && mediaBlobUrl ? (
            /* VIDEO PLAYER */
            <div className="flex flex-col items-center justify-center gap-3 w-full">
              <div className="w-full rounded-2xl overflow-hidden bg-black shadow-lg border border-slate-800">
                <video
                  controls
                  autoPlay
                  src={mediaBlobUrl}
                  className="w-full max-h-[420px] mx-auto rounded-2xl"
                >
                  Your browser does not support video playback.
                </video>
              </div>
              <span className="text-[11px] text-slate-400">Video playback active</span>
            </div>
          ) : (resolvedType === 'text' || resolvedType === 'json') && content !== null ? (
            /* TEXT & CODE VIEWER */
            <div className="w-full flex-1 flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-indigo-500" />
                  Text / Code Inspector ({content.split('\n').length} lines)
                </span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-200/70 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy All'}</span>
                </button>
              </div>
              <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-inner flex-1 max-h-[460px] flex">
                <div className="select-none py-3 px-2 text-[11px] font-mono text-slate-600 bg-slate-900/60 border-r border-slate-800/80 text-right leading-relaxed hidden sm:block">
                  {content.split('\n').slice(0, 150).map((_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>
                <pre className="p-3 text-slate-100 font-mono text-xs overflow-auto flex-1 leading-relaxed whitespace-pre-wrap break-all select-text">
                  {content}
                </pre>
              </div>
            </div>
          ) : (
            /* GENERIC / UNRENDERABLE FALLBACK */
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                {icon}
              </div>
              <h4 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                Binary File ({ext.toUpperCase() || 'RAW'})
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
                This file type cannot be previewed directly in text mode. You can download and open it in your system's default viewer.
              </p>
              {mediaBlobUrl && (
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-sm transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Save / Open in System App
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 px-6 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Path: {file.relativePath || file.name}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
