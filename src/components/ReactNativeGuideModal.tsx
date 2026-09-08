import React, { useState } from 'react';
import { X, Smartphone, Copy, Check, Terminal, ExternalLink } from 'lucide-react';

interface ReactNativeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReactNativeGuideModal: React.FC<ReactNativeGuideModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const reactNativeCode = `// React Native Implementation (Expo & Bare RN with Scoped Storage / FileSystem)
import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
// Or in Bare React Native:
// import DocumentPicker from 'react-native-document-picker';
// import * as ScopedStorage from 'react-native-scoped-storage';

export default function DirectoryWatcherApp() {
  const [folderUri, setFolderUri] = useState<string | null>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [latestFile, setLatestFile] = useState<any | null>(null);
  const knownFilesRef = useRef<Set<string>>(new Set());

  // 1. Choose directory via Storage Access Framework (SAF)
  const chooseDirectory = async () => {
    try {
      const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (permissions.granted) {
        setFolderUri(permissions.directoryUri);
        knownFilesRef.current.clear();
        await scanDirectory(permissions.directoryUri);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  // 2. Read directory and detect newly added files
  const scanDirectory = async (uri: string) => {
    try {
      const fileList = await FileSystem.StorageAccessFramework.readDirectoryAsync(uri);
      
      const newItems = [];
      for (const itemUri of fileList) {
        const decodedName = decodeURIComponent(itemUri.split('%2F').pop() || '');
        if (!knownFilesRef.current.has(itemUri)) {
          knownFilesRef.current.add(itemUri);
          const fileInfo = {
            uri: itemUri,
            name: decodedName,
            detectedAt: Date.now(),
          };
          newItems.push(fileInfo);
        }
      }

      if (newItems.length > 0) {
        setLatestFile(newItems[newItems.length - 1]);
        setFiles((prev) => [...newItems, ...prev]);
      }
    } catch (e) {
      console.warn('Scan error:', e);
    }
  };

  // 3. Open, read or play detected file
  const openFile = async (item: any) => {
    try {
      const ext = item.name.split('.').pop()?.toLowerCase();
      if (['txt', 'json', 'md', 'csv', 'log'].includes(ext)) {
        // Read text content
        const text = await FileSystem.readAsStringAsync(item.uri);
        Alert.alert(item.name, text.slice(0, 500) + (text.length > 500 ? '...' : ''));
      } else {
        // Use IntentLauncher (Android) or react-native-file-viewer
        // Or with Expo:
        Alert.alert('Open Media', \`Opening \${item.name} in native media viewer/player.\`);
      }
    } catch (err: any) {
      Alert.alert('Error opening file', err.message);
    }
  };

  // 4. Auto-watcher interval: polls directory every 2 seconds
  useEffect(() => {
    if (!folderUri) return;
    const interval = setInterval(() => {
      scanDirectory(folderUri);
    }, 2000);
    return () => clearInterval(interval);
  }, [folderUri]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>File Directory Watcher</Text>
      
      {!folderUri ? (
        <TouchableOpacity style={styles.button} onPress={chooseDirectory}>
          <Text style={styles.buttonText}>Choose File Directory</Text>
        </TouchableOpacity>
      ) : (
        <View style={{ flex: 1, width: '100%' }}>
          <Text style={styles.folderText}>Watching: {decodeURIComponent(folderUri)}</Text>
          {latestFile && (
            <TouchableOpacity style={styles.newAlert} onPress={() => openFile(latestFile)}>
              <Text style={styles.newAlertText}>Latest Added: {latestFile.name} (Tap to Open)</Text>
            </TouchableOpacity>
          )}
          <FlatList
            data={files}
            keyExtractor={(item) => item.uri}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.itemRow} onPress={() => openFile(item)}>
                <Text style={styles.itemText}>{item.name}</Text>
                <Text style={styles.itemHint}>Tap to view/play</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50, paddingHorizontal: 20, backgroundColor: '#f8fafc', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 24 },
  button: { backgroundColor: '#4f46e5', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  folderText: { fontSize: 12, color: '#64748b', marginBottom: 12 },
  newAlert: { backgroundColor: '#e0e7ff', padding: 10, borderRadius: 8, marginBottom: 10 },
  newAlertText: { color: '#4338ca', fontWeight: '600', fontSize: 12 },
  itemRow: { padding: 14, backgroundColor: '#fff', borderRadius: 8, marginVertical: 4, elevation: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemText: { fontSize: 14, color: '#1e293b', flex: 1 },
  itemHint: { fontSize: 11, color: '#6366f1', fontWeight: '600' }
});`;

  const copyCode = () => {
    navigator.clipboard.writeText(reactNativeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="p-4 sm:px-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <Smartphone className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                React Native Architecture & Code Guide
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                How Android SAF & Scoped Storage directory watchers work natively
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700 dark:text-slate-300">
          <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60 rounded-xl leading-relaxed">
            <p className="font-semibold text-indigo-900 dark:text-indigo-200 mb-1">
              Mobile Storage Architecture Explanation:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300">
              <li>
                <strong>Android:</strong> Modern Android (API 30+) requires the <strong>Storage Access Framework (SAF)</strong> via <code>ACTION_OPEN_DOCUMENT_TREE</code> (or <code>expo-file-system</code> / <code>react-native-scoped-storage</code>) to select and persist directory tree permissions.
              </li>
              <li>
                <strong>Auto-Fetch Watcher:</strong> On mobile, apps watch directory changes using an active polling interval or an Android native <code>FileObserver</code> service in the background.
              </li>
              <li>
                <strong>This Web Application:</strong> Employs the W3C <strong>File System Access API</strong> (<code>window.showDirectoryPicker</code>) which delivers this exact native directory watching capability right in the browser!
              </li>
            </ul>
          </div>

          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-indigo-600" />
                Complete React Native Implementation:
              </span>
              <button
                onClick={copyCode}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-medium cursor-pointer transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy Code'}</span>
              </button>
            </div>
            <pre className="p-4 bg-slate-950 text-slate-100 rounded-xl font-mono text-[11px] overflow-x-auto max-h-72 leading-relaxed">
              {reactNativeCode}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 px-6 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
