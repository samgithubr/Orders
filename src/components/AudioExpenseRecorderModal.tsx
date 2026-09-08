import React, { useState, useRef } from 'react';
import { X, Mic, Square, Play, Pause, Sparkles, Volume2, CheckCircle2, AlertCircle } from 'lucide-react';
import { ProductItem, FileEntryItem } from '../types';
import { generateSampleAudioWav } from '../utils/sampleMedia';

interface AudioExpenseRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: ProductItem[];
  onProcessAudioRecording: (file: FileEntryItem, customHint?: string) => Promise<void>;
}

export const AudioExpenseRecorderModal: React.FC<AudioExpenseRecorderModalProps> = ({
  isOpen,
  onClose,
  products,
  onProcessAudioRecording,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [spokenTextHint, setSpokenTextHint] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  if (!isOpen) return null;

  const startRecording = async () => {
    setErrorMessage(null);
    setAudioBlob(null);
    setAudioUrl(null);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordDuration(0);

      timerRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      setErrorMessage(
        'Microphone access was denied or not available. You can use preset samples or type a speech transcript below.'
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const handleProcessRecording = async () => {
    if (!audioBlob && !spokenTextHint) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const fileName = `call_recording_${Date.now()}.webm`;
      const file = new File([audioBlob || new Blob()], fileName, { type: audioBlob?.type || 'audio/webm' });

      const fileItem: FileEntryItem = {
        id: `rec-${Date.now()}`,
        name: fileName,
        relativePath: fileName,
        size: file.size || 50000,
        lastModified: Date.now(),
        type: file.type || 'audio/webm',
        fileObj: file,
        url: audioUrl || generateSampleAudioWav(),
        isNewlyAdded: true,
      };

      await onProcessAudioRecording(fileItem, spokenTextHint || undefined);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Processing failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUsePreset = async (presetText: string) => {
    setIsProcessing(true);
    try {
      const fileName = `call_order_${presetText.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 20)}.wav`;
      const sampleAudioUrl = generateSampleAudioWav();
      const res = await fetch(sampleAudioUrl);
      const blob = await res.blob();
      const file = new File([blob], fileName, { type: 'audio/wav' });

      const fileItem: FileEntryItem = {
        id: `preset-${Date.now()}`,
        name: fileName,
        relativePath: fileName,
        size: file.size,
        lastModified: Date.now(),
        type: 'audio/wav',
        fileObj: file,
        url: sampleAudioUrl,
        isNewlyAdded: true,
      };

      await onProcessAudioRecording(fileItem, presetText);
      onClose();
    } catch (e: any) {
      setErrorMessage(e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="p-4 px-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40">
          <div className="flex items-center gap-2">
            <Mic className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Record / Test Voice Order Call
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Microphone Recording Section */}
          <div className="flex flex-col items-center justify-center py-4 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            {isRecording ? (
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <span className="w-16 h-16 rounded-full bg-rose-500/20 animate-ping absolute inset-0" />
                  <button
                    onClick={stopRecording}
                    className="relative w-16 h-16 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg hover:bg-rose-700 transition-transform active:scale-95 cursor-pointer"
                  >
                    <Square className="w-6 h-6 fill-current" />
                  </button>
                </div>
                <div className="text-center">
                  <span className="text-rose-600 font-bold text-sm animate-pulse">
                    ● Recording Call... ({recordDuration}s)
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Speak e.g., "2 coffee and 3 tea for office"
                  </p>
                </div>
              </div>
            ) : audioUrl ? (
              <div className="flex flex-col items-center gap-3 w-full px-6">
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Recording Ready ({recordDuration}s)
                </span>
                <audio controls src={audioUrl} className="w-full h-10" />
                <button
                  onClick={startRecording}
                  className="text-xs text-slate-500 hover:text-indigo-600 underline cursor-pointer"
                >
                  Record again
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={startRecording}
                  className="w-16 h-16 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md hover:bg-indigo-700 transition-all active:scale-95 cursor-pointer"
                >
                  <Mic className="w-7 h-7" />
                </button>
                <div className="text-center">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Tap to Record Audio Call
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Order coffee, tea, water bottles via speech
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Quick Presets for Instant Testing */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
              Or Select Instant Call Simulation Preset:
            </label>
            <div className="space-y-1.5">
              <button
                onClick={() =>
                  handleUsePreset(
                    'I call the coffee shop ask for 2 coffee 3 tea and from other end he confirms order by saying ok i send 2 coffee 3 tea'
                  )
                }
                disabled={isProcessing}
                className="w-full text-left p-2.5 rounded-xl border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/50 dark:bg-emerald-950/20 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-all text-xs flex items-center justify-between cursor-pointer group"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-emerald-950 dark:text-emerald-200 block">
                      "I ask 2 coffee 3 tea... other end says ok i send 2 coffee 3 tea"
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200">
                      Deduplication Test
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                    Resolved Net Order: 2 Coffee + 3 Tea = ₹75 (Echo Repetition Ignored)
                  </span>
                </div>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              </button>

              <button
                onClick={() =>
                  handleUsePreset('Call recording: Send 2 coffee and 3 tea to conference room 2')
                }
                disabled={isProcessing}
                className="w-full text-left p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-slate-800 transition-all text-xs flex items-center justify-between cursor-pointer group"
              >
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block group-hover:text-indigo-600">
                    "2 coffee and 3 tea"
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Total: ₹75 (2x ₹15 + 3x ₹15)
                  </span>
                </div>
                <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
              </button>

              <button
                onClick={() =>
                  handleUsePreset('Call recording: Ordered 1 coffee, 2 tea, and 2 water bottles')
                }
                disabled={isProcessing}
                className="w-full text-left p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-slate-800 transition-all text-xs flex items-center justify-between cursor-pointer group"
              >
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block group-hover:text-indigo-600">
                    "1 coffee, 2 tea, and 2 water bottles"
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Total: ₹85 (1x ₹15 + 2x ₹15 + 2x ₹20)
                  </span>
                </div>
                <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
              </button>

              <button
                onClick={() =>
                  handleUsePreset('Call recording: Please deliver 4 tea and 2 samosas')
                }
                disabled={isProcessing}
                className="w-full text-left p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-slate-800 transition-all text-xs flex items-center justify-between cursor-pointer group"
              >
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block group-hover:text-indigo-600">
                    "4 tea and 2 samosas"
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Total: ₹100 (4x ₹15 + 2x ₹20)
                  </span>
                </div>
                <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
              </button>
            </div>
          </div>

          {/* Custom Call Recording Text input */}
          <div className="pt-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Or Type / Paste Call Transcript Directly:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder='e.g., "ordered 2 coffee, 3 tea. shop says ok confirmed 2 coffee 3 tea"'
                value={spokenTextHint}
                onChange={(e) => setSpokenTextHint(e.target.value)}
                className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={() => spokenTextHint.trim() && handleUsePreset(spokenTextHint.trim())}
                disabled={!spokenTextHint.trim() || isProcessing}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl cursor-pointer"
              >
                Test
              </button>
            </div>
          </div>

          {/* Action button if microphone was recorded */}
          {audioUrl && (
            <button
              onClick={handleProcessRecording}
              disabled={isProcessing}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Transcribing & Formulating Excel...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Translate to Text & Add to Excel Sheet</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
