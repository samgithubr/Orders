import React, { useRef, useState } from 'react';
import { FolderOpen, UploadCloud, Sparkles, AlertCircle, RefreshCw, FolderSearch } from 'lucide-react';

interface DirectoryPickerProps {
  onDirectorySelected: (handle: FileSystemDirectoryHandle, name: string) => Promise<void>;
  onFallbackFilesSelected: (files: FileList, folderName: string) => void;
  onUseSampleDirectory: () => void;
  isLoading: boolean;
}

export const DirectoryPicker: React.FC<DirectoryPickerProps> = ({
  onDirectorySelected,
  onFallbackFilesSelected,
  onUseSampleDirectory,
  isLoading,
}) => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fallbackInputRef = useRef<HTMLInputElement>(null);

  const hasNativePicker = typeof window !== 'undefined' && 'showDirectoryPicker' in window;

  const handlePickDirectory = async () => {
    setErrorMsg(null);

    if (hasNativePicker) {
      try {
        // Request read/write if possible, or read
        const handle = await (window as unknown as { showDirectoryPicker: (opts?: unknown) => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker({
          mode: 'read',
        });
        await onDirectorySelected(handle, handle.name);
        return;
      } catch (err: unknown) {
        const error = err as Error;
        if (error.name === 'AbortError') {
          // User canceled the picker dialog
          return;
        }

        // If cross-origin iframe or browser security blocked showDirectoryPicker
        if (error.name === 'SecurityError' || error.message?.includes('Cross-origin') || error.message?.includes('subframe')) {
          setErrorMsg(
            'Browser Security: Direct folder access is restricted inside sandboxed iframes. You can use the "Select Folder (Standard Input)" option below or test with the Live Sample Folder.'
          );
          // Trigger fallback picker prompt after showing message
          fallbackInputRef.current?.click();
          return;
        }

        setErrorMsg(`Notice: ${error.message || 'Could not access directory.'}`);
      }
    } else {
      // Fallback directly
      fallbackInputRef.current?.click();
    }
  };

  const handleFallbackChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = e.target.files;
      // Get folder name from first file relative path
      const firstPath = files[0].webkitRelativePath || '';
      const folderName = firstPath.split('/')[0] || 'Selected Folder';
      onFallbackFilesSelected(files, folderName);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 sm:p-10 max-w-xl mx-auto w-full text-center">
      {/* Hidden fallback directory input */}
      <input
        ref={fallbackInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFallbackChange}
        {...({ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
      />

      {/* Main Action Card */}
      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm hover:shadow-md transition-all duration-300">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-5 ring-8 ring-indigo-50/50 dark:ring-indigo-950/30">
          <FolderOpen className="w-8 h-8" />
        </div>

        <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
          Choose File Directory
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 leading-relaxed max-w-md mx-auto">
          Select any folder on your device. All files inside appear instantly, audio call recordings are automatically translated to text, and matched products formulate into an Excel sheet.
        </p>

        {/* 3-Step Flow Indicator */}
        <div className="mb-6 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-left">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                1
              </span>
              <span>Select folder & list all files</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                2
              </span>
              <span>Audio translates to text</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                3
              </span>
              <span>Formulates Excel sheet</span>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-6 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-xs text-left flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="flex-1">{errorMsg}</div>
          </div>
        )}

        <div className="space-y-3">
          <button
            id="btn-choose-directory"
            onClick={handlePickDirectory}
            disabled={isLoading}
            className="w-full py-3.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-medium shadow-sm hover:shadow transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer text-base"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Scanning Directory...</span>
              </>
            ) : (
              <>
                <FolderSearch className="w-5 h-5" />
                <span>Choose File Directory</span>
              </>
            )}
          </button>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
            <span className="flex-shrink mx-3 text-xs uppercase tracking-wider text-slate-400 font-medium">Or</span>
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              id="btn-fallback-input"
              onClick={() => fallbackInputRef.current?.click()}
              className="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <UploadCloud className="w-4 h-4 text-slate-500" />
              <span>Standard Folder Input</span>
            </button>

            <button
              id="btn-sample-directory"
              onClick={onUseSampleDirectory}
              className="py-2.5 px-4 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/30 hover:bg-indigo-50 text-indigo-700 dark:text-indigo-300 text-xs font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span>Load Interactive Demo</span>
            </button>
          </div>
        </div>

        {/* Informative footer */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${hasNativePicker ? 'bg-emerald-500' : 'bg-amber-400'}`} />
            {hasNativePicker ? 'Native File System Access API Ready' : 'HTML5 Directory Mode'}
          </span>
          <span>Live Auto-Watcher</span>
        </div>
      </div>
    </div>
  );
};
