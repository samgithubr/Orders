import React from 'react';
import {
  FileText,
  FileCode,
  FileImage,
  FileAudio,
  FileVideo,
  FileSpreadsheet,
  FileArchive,
  FileJson,
  File as FileGeneric,
} from 'lucide-react';
import { getFileExtension } from './formatters';

export function getFileCategory(filename: string, mimeType?: string): {
  icon: React.ReactElement;
  category: 'image' | 'video' | 'audio' | 'code' | 'document' | 'sheet' | 'archive' | 'data' | 'other';
  color: string;
  badgeBg: string;
} {
  const ext = getFileExtension(filename);
  const mime = mimeType?.toLowerCase() || '';

  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext) || mime.startsWith('image/')) {
    return {
      icon: <FileImage className="w-5 h-5 text-emerald-500" />,
      category: 'image',
      color: 'text-emerald-600 dark:text-emerald-400',
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
  }

  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext) || mime.startsWith('video/')) {
    return {
      icon: <FileVideo className="w-5 h-5 text-purple-500" />,
      category: 'video',
      color: 'text-purple-600 dark:text-purple-400',
      badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
    };
  }

  if (['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(ext) || mime.startsWith('audio/')) {
    return {
      icon: <FileAudio className="w-5 h-5 text-amber-500" />,
      category: 'audio',
      color: 'text-amber-600 dark:text-amber-400',
      badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
    };
  }

  if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'html', 'css', 'go', 'rs', 'php', 'sh'].includes(ext)) {
    return {
      icon: <FileCode className="w-5 h-5 text-sky-500" />,
      category: 'code',
      color: 'text-sky-600 dark:text-sky-400',
      badgeBg: 'bg-sky-50 text-sky-700 border-sky-200',
    };
  }

  if (['json', 'yaml', 'yml', 'xml', 'toml', 'env'].includes(ext)) {
    return {
      icon: <FileJson className="w-5 h-5 text-cyan-500" />,
      category: 'data',
      color: 'text-cyan-600 dark:text-cyan-400',
      badgeBg: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    };
  }

  if (['csv', 'xlsx', 'xls', 'tsv'].includes(ext)) {
    return {
      icon: <FileSpreadsheet className="w-5 h-5 text-green-600" />,
      category: 'sheet',
      color: 'text-green-700 dark:text-green-400',
      badgeBg: 'bg-green-50 text-green-700 border-green-200',
    };
  }

  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return {
      icon: <FileArchive className="w-5 h-5 text-orange-500" />,
      category: 'archive',
      color: 'text-orange-600 dark:text-orange-400',
      badgeBg: 'bg-orange-50 text-orange-700 border-orange-200',
    };
  }

  if (['txt', 'md', 'pdf', 'doc', 'docx', 'rtf', 'log'].includes(ext) || mime.startsWith('text/')) {
    return {
      icon: <FileText className="w-5 h-5 text-indigo-500" />,
      category: 'document',
      color: 'text-indigo-600 dark:text-indigo-400',
      badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    };
  }

  return {
    icon: <FileGeneric className="w-5 h-5 text-slate-400" />,
    category: 'other',
    color: 'text-slate-600 dark:text-slate-400',
    badgeBg: 'bg-slate-100 text-slate-700 border-slate-200',
  };
}
