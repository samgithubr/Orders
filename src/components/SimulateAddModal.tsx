import React, { useState } from 'react';
import { X, Plus, UploadCloud, Sparkles, FileText, FileImage, FileCode, FileAudio, FileVideo, CheckCircle2 } from 'lucide-react';
import { FileEntryItem } from '../types';
import { generateSampleAudioWav, generateSampleImage, generateSampleVideo } from '../utils/sampleMedia';

interface SimulateAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSimulatedFile: (file: FileEntryItem) => void;
}

export const SimulateAddModal: React.FC<SimulateAddModalProps> = ({
  isOpen,
  onClose,
  onAddSimulatedFile,
}) => {
  const [customName, setCustomName] = useState('');
  const [customContent, setCustomContent] = useState('');
  const [successPing, setSuccessPing] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddPreset = (preset: {
    name: string;
    size: number;
    type: string;
    content?: string;
    url?: string;
  }) => {
    const newFile: FileEntryItem = {
      id: `sim-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: preset.name,
      relativePath: preset.name,
      size: preset.size,
      lastModified: Date.now(),
      type: preset.type,
      textContent: preset.content,
      url: preset.url,
      isNewlyAdded: true,
      detectedAt: Date.now(),
      isSimulated: true,
    };

    onAddSimulatedFile(newFile);
    setSuccessPing(`Added "${preset.name}"! Watcher detected new file.`);
    setTimeout(() => {
      setSuccessPing(null);
      onClose();
    }, 900);
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const trimmedName = customName.trim();
    const content = customContent || `File content generated at ${new Date().toISOString()}`;
    const newFile: FileEntryItem = {
      id: `sim-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: trimmedName,
      relativePath: trimmedName,
      size: new Blob([content]).size || 1024,
      lastModified: Date.now(),
      type: 'text/plain',
      textContent: content,
      isNewlyAdded: true,
      detectedAt: Date.now(),
      isSimulated: true,
    };

    onAddSimulatedFile(newFile);
    setSuccessPing(`Added "${trimmedName}"!`);
    setTimeout(() => {
      setSuccessPing(null);
      onClose();
    }, 900);
  };

  const handleDropFiles = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      Array.from(e.dataTransfer.files).forEach((file: File) => {
        const item: FileEntryItem = {
          id: `dropped-${Date.now()}-${file.name}`,
          name: file.name,
          relativePath: file.name,
          size: file.size,
          lastModified: file.lastModified,
          type: file.type,
          fileObj: file,
          isNewlyAdded: true,
          detectedAt: Date.now(),
          isSimulated: true,
        };
        onAddSimulatedFile(item);
      });
      setSuccessPing('Files added into directory! Watcher detected new items.');
      setTimeout(() => {
        setSuccessPing(null);
        onClose();
      }, 900);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:px-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-950/40">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Add / Simulate New File in Folder
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {successPing ? (
          <div className="p-8 text-center flex flex-col items-center justify-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-2 animate-bounce" />
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{successPing}</p>
            <p className="text-xs text-slate-500 mt-1">Directory watcher fetched latest item!</p>
          </div>
        ) : (
          <div className="p-6 space-y-5">
            {/* Quick Presets for Audio, Video, Image, Text */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                Simulate Media Added by Another App
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Audio Preset */}
                <button
                  type="button"
                  onClick={() =>
                    handleAddPreset({
                      name: `voice_memo_${Date.now().toString().slice(-4)}.wav`,
                      size: 96400,
                      type: 'audio/wav',
                      url: generateSampleAudioWav(),
                    })
                  }
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-amber-400 hover:bg-amber-50/40 dark:hover:bg-slate-800 text-left transition-all flex items-center gap-2.5 cursor-pointer"
                >
                  <FileAudio className="w-4 h-4 text-amber-500 shrink-0" />
                  <div className="truncate text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">Audio Recording</span>
                    <span className="text-slate-400 text-[10px]">Playable voice_memo.wav</span>
                  </div>
                </button>

                {/* Video Preset */}
                <button
                  type="button"
                  onClick={() =>
                    handleAddPreset({
                      name: `camera_clip_${Date.now().toString().slice(-4)}.mp4`,
                      size: 1450000,
                      type: 'video/mp4',
                      url: generateSampleVideo(),
                    })
                  }
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-purple-400 hover:bg-purple-50/40 dark:hover:bg-slate-800 text-left transition-all flex items-center gap-2.5 cursor-pointer"
                >
                  <FileVideo className="w-4 h-4 text-purple-500 shrink-0" />
                  <div className="truncate text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">Video Capture</span>
                    <span className="text-slate-400 text-[10px]">Playable camera_clip.mp4</span>
                  </div>
                </button>

                {/* Image Preset */}
                <button
                  type="button"
                  onClick={() =>
                    handleAddPreset({
                      name: `IMG_${new Date().getFullYear()}_${Math.floor(1000 + Math.random() * 9000)}.png`,
                      size: 64000,
                      type: 'image/png',
                      url: generateSampleImage(),
                    })
                  }
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-400 hover:bg-emerald-50/40 dark:hover:bg-slate-800 text-left transition-all flex items-center gap-2.5 cursor-pointer"
                >
                  <FileImage className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div className="truncate text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">Photo Graphic</span>
                    <span className="text-slate-400 text-[10px]">Viewable IMG_*.png</span>
                  </div>
                </button>

                {/* Document / Markdown Preset */}
                <button
                  type="button"
                  onClick={() =>
                    handleAddPreset({
                      name: `meeting_notes_${new Date().toISOString().slice(0, 10)}.md`,
                      size: 2400,
                      type: 'text/markdown',
                      content: `# Meeting Notes & Action Items\n\n- Date: ${new Date().toLocaleDateString()}\n- Auto-Watcher Status: Synced\n- Actions:\n  1. File playback verified\n  2. Audio stream verified\n  3. Video stream verified`,
                    })
                  }
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 hover:bg-indigo-50/40 dark:hover:bg-slate-800 text-left transition-all flex items-center gap-2.5 cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                  <div className="truncate text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">Readable Note</span>
                    <span className="text-slate-400 text-[10px]">Readable meeting_notes.md</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Drag & Drop Real Files from Computer */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDropFiles}
              className="p-5 border-2 border-dashed border-indigo-200 dark:border-indigo-900/60 hover:border-indigo-500 rounded-xl text-center bg-indigo-50/30 dark:bg-indigo-950/20 transition-colors"
            >
              <UploadCloud className="w-6 h-6 text-indigo-500 mx-auto mb-1.5" />
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Drag & drop any real audio, video, image, or text file here
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Automatically indexed and ready for instant playback and viewing!
              </p>
            </div>

            {/* Custom File Form */}
            <form onSubmit={handleAddCustom} className="space-y-3 pt-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                Or Create Custom Text / Code File
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="e.g. thoughts.txt or script.py"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-indigo-500"
                />
                <textarea
                  placeholder="Optional text or code content..."
                  value={customContent}
                  onChange={(e) => setCustomContent(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-indigo-500 font-mono resize-none"
                />
                <button
                  type="submit"
                  disabled={!customName.trim()}
                  className="w-full py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add File to Directory
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
