import React from 'react';
import { Volume2, VolumeX, RefreshCw, Zap, Clock } from 'lucide-react';
import { FileEntryItem } from '../types';
import { formatBytes, formatTimeAgo } from '../utils/formatters';
import { getFileCategory } from '../utils/fileIcons';

interface NewFileBannerProps {
  latestFile: FileEntryItem | null;
  isWatching: boolean;
  lastPolledAt: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onForceScan: () => void;
  onSelectFile: (file: FileEntryItem) => void;
  isScanning: boolean;
}

export const NewFileBanner: React.FC<NewFileBannerProps> = ({
  latestFile,
  isWatching,
  lastPolledAt,
  soundEnabled,
  onToggleSound,
  onForceScan,
  onSelectFile,
  isScanning,
}) => {
  return (
    <div className="space-y-3 mb-5">
      {/* Live Watch Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            {isWatching && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            )}
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isWatching ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
          </span>
          <span className="font-medium text-slate-800 dark:text-slate-200">
            {isWatching ? 'Live Directory Watcher Active' : 'Directory Paused'}
          </span>
          <span className="hidden sm:inline-block text-slate-400">|</span>
          <span className="hidden sm:inline-flex items-center gap-1 text-slate-500">
            <Clock className="w-3 h-3" />
            Polled {formatTimeAgo(lastPolledAt)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-sound-toggle"
            onClick={onToggleSound}
            title={soundEnabled ? 'Chime sound enabled' : 'Chime sound muted'}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          <button
            id="btn-force-scan"
            onClick={onForceScan}
            disabled={isScanning}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 text-xs font-medium transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isScanning ? 'animate-spin text-indigo-600' : ''}`} />
            <span>Scan Now</span>
          </button>
        </div>
      </div>

      {/* Latest File Highlight Card */}
      {latestFile && (
        <div
          id="latest-file-alert"
          onClick={() => onSelectFile(latestFile)}
          className="group relative overflow-hidden rounded-xl border border-indigo-200 dark:border-indigo-800/80 bg-gradient-to-r from-indigo-50/80 via-white to-sky-50/40 dark:from-indigo-950/40 dark:via-slate-900 dark:to-sky-950/20 p-3.5 shadow-xs hover:shadow-sm hover:border-indigo-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0 w-10 h-10 rounded-lg bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-900/60 shadow-2xs flex items-center justify-center">
                {getFileCategory(latestFile.name, latestFile.type).icon}
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-600"></span>
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-600 text-white tracking-wide uppercase">
                    <Zap className="w-2.5 h-2.5" /> Latest Added
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Auto-fetched {latestFile.detectedAt ? formatTimeAgo(latestFile.detectedAt) : 'just now'}
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {latestFile.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {formatBytes(latestFile.size)} • {latestFile.relativePath || 'root'}
                </p>
              </div>
            </div>

            <button className="shrink-0 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-2xs group-hover:border-indigo-300">
              View
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
