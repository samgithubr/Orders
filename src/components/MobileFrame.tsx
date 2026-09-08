import React from 'react';
import { Smartphone, Monitor, Wifi, Battery, Signal } from 'lucide-react';

interface MobileFrameProps {
  isMobileView: boolean;
  onToggleView: () => void;
  children: React.ReactNode;
}

export const MobileFrame: React.FC<MobileFrameProps> = ({
  isMobileView,
  onToggleView,
  children,
}) => {
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-start transition-colors duration-200">
      {/* Top App Bar with Viewport Switcher */}
      <header className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
            FD
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
              File Directory Watcher
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Live Real-Time Folder Monitoring & Auto-Fetch
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              onClick={onToggleView}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                !isMobileView
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Full View</span>
            </button>
            <button
              onClick={onToggleView}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                isMobileView
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile Shell</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full flex-1 flex flex-col items-center justify-center p-3 sm:p-6 lg:p-8">
        {isMobileView ? (
          /* Mobile Device Mockup Frame */
          <div className="w-full max-w-[420px] my-auto">
            <div className="relative mx-auto rounded-[42px] border-[10px] border-slate-900 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-2xl overflow-hidden min-h-[740px] max-h-[860px] flex flex-col ring-1 ring-slate-900/10">
              {/* Dynamic Island / Notch */}
              <div className="h-9 bg-slate-900 text-white flex items-center justify-between px-7 pt-1 select-none shrink-0">
                <span className="text-[11px] font-semibold tracking-tight">9:41</span>
                <div className="w-20 h-4 bg-black rounded-full mx-auto -mt-1 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-900" />
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Signal className="w-2.5 h-2.5" />
                  <Wifi className="w-2.5 h-2.5" />
                  <Battery className="w-3 h-3" />
                </div>
              </div>

              {/* Mobile Viewport Content */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col">
                {children}
              </div>

              {/* iOS Home Indicator Bar */}
              <div className="h-6 bg-transparent flex items-center justify-center shrink-0">
                <div className="w-32 h-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
              </div>
            </div>
          </div>
        ) : (
          /* Desktop Responsive View */
          <div className="w-full max-w-4xl mx-auto flex-1 flex flex-col">
            {children}
          </div>
        )}
      </main>
    </div>
  );
};
