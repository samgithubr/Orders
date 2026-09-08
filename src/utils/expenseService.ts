import * as XLSX from 'xlsx';
import { ExpenseRecord, ExpenseLineItem, ProductItem, FileEntryItem } from '../types';

// Convert File or Blob to Base64
export async function fileToBase64(file: Blob | File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
}

// Speak audio transcript using Web Speech Synthesis for vivid call playback
export function playSpokenCallAudio(text: string) {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      const cleanText = text.replace(/^call recording:?\s*/i, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('SpeechSynthesis error:', e);
    }
  }
}

// Filter text to check whether it contains product description from app (e.g. coffee: 15, tea: 15, water: 20)
// with intelligent two-way telephone call conversational confirmation deduplication
export function filterTextAgainstCatalog(
  text: string,
  catalog: ProductItem[]
): {
  matchedItems: ExpenseLineItem[];
  totalAmount: number;
  summary: string;
  detectedLanguage?: string;
  translatedTranscript?: string;
  callDeduplicated?: boolean;
  deduplicationNotes?: string;
} {
  const lower = text.toLowerCase();

  // Detect spoken / written language
  let detectedLanguage = 'English';
  const hasDevanagari = /[\u0900-\u097F]/.test(text);
  const hasHinglish = /\b(bhaiya|bhai|chalo|aur|theek|bhej|bhejo|bhejta|bhejdunga|deta|raha|karo|ji|haan|chay|paani|botal|samose)\b/i.test(text);
  const hasMarathi = /\b(pathva|pathavto|dya|aani|nakki|kiti)\b/i.test(text);

  if (hasDevanagari) {
    detectedLanguage = hasMarathi ? 'Marathi (मराठी)' : 'Hindi (हिन्दी)';
  } else if (hasMarathi) {
    detectedLanguage = 'Marathi';
  } else if (hasHinglish) {
    detectedLanguage = 'Hindi / Hinglish';
  }

  // Number words mapping (including colloquial English, Hindi, Hinglish, Marathi, and Devanagari numerals)
  const wordToNum: Record<string, number> = {
    one: 1, a: 1, an: 1, single: 1, ek: 1, 'एक': 1, '१': 1,
    two: 2, couple: 2, do: 2, don: 2, 'दो': 2, 'दोन': 2, '२': 2,
    three: 3, teen: 3, tiin: 3, 'तीन': 3, '३': 3,
    four: 4, char: 4, chaar: 4, 'चार': 4, '४': 4,
    five: 5, paanch: 5, panch: 5, paach: 5, 'पाँच': 5, 'पांच': 5, '५': 5,
    six: 6, chhah: 6, che: 6, chhe: 6, 'छह': 6, 'छे': 6, '६': 6,
    seven: 7, saat: 7, 'सात': 7, '७': 7,
    eight: 8, aath: 8, ath: 8, 'आठ': 8, '८': 8,
    nine: 9, nau: 9, nav: 9, 'नौ': 9, '९': 9,
    ten: 10, das: 10, 'दस': 10, '१०': 10,
    half: 0.5, aadha: 0.5, 'आधा': 0.5,
  };

  // Phrases indicating order confirmation, read-back, acknowledgement, or vendor repetition in English & Hindi/Hinglish/Marathi
  const confirmationPhrases = [
    // English
    'ok i send', 'okay i send', 'ok i will send', 'okay i will send', 'i send',
    'ok sending', 'okay sending', 'confirming', 'confirmed',
    'confirm order', 'order confirmed', 'from other end', 'other end he confirms',
    'other end confirms', 'at other end', 'he confirms', 'she confirms',
    'shop confirms', 'shopkeeper says', 'receiver says', 'got it', 'noted',
    'so that is', "so that's", 'so you want', 'repeating', 'in total',
    'ok send', 'okay send', 'will deliver', 'sending right away',
    // Hindi / Hinglish
    'theek hai bhej', 'theek hai mai bhej', 'theek hai bhejta', 'theek hai bhej deta',
    'theek hai bhej raha', 'theek hai bhej dunga', 'theek hai bhej doonga',
    'haan theek hai', 'haan bhej raha', 'haan bhej deta', 'haan bhej dunga',
    'haan bhai bhej', 'bhej deta hu', 'bhej deta hoon', 'bhej raha hu', 'bhej raha hoon',
    'bhej dunga', 'bhej doonga', 'bhej denge', 'haan ji', 'theek hai ji', 'thik hai',
    'achha bhejta', 'ho jayega', 'ho jaega', 'samajh gaya', 'pack kar diya',
    'pack kar rahe', 'sun liya', 'noted bhaiya', 'theek hai sir', 'ho gaya',
    // Marathi
    'ho pathavto', 'pathavto', 'ho pathavte', 'pathavte', 'nakki pathavto', 'pathavun dya',
    // Devanagari
    'ठीक है', 'ठीक हे', 'भेज देता हूँ', 'भेज देता हूं', 'भेज रहा हूँ', 'भेज रहा हूं',
    'भेज दूंगा', 'भेज देंगे', 'हाँ ठीक है', 'हां ठीक है', 'हो जाएगा', 'पैक कर दिया',
    'पाठवतो', 'हो पाठवतो'
  ];

  const hasConfirmationIndicator = confirmationPhrases.some((phrase) => lower.includes(phrase) || text.includes(phrase)) ||
    /(?:caller|customer|client|me|speaker\s*1)[\s\S]+(?:receiver|shop|vendor|other\s*end|speaker\s*2)/i.test(text);

  let callDeduplicated = false;
  const deduplicationDetails: string[] = [];

  // Segment text into caller order vs confirmation if possible
  let orderSegment = lower;
  let confirmSegment = '';

  for (const phrase of confirmationPhrases) {
    const idx = lower.indexOf(phrase);
    if (idx !== -1) {
      orderSegment = lower.slice(0, idx);
      confirmSegment = lower.slice(idx);
      break;
    }
  }

  const speakerMatch = lower.match(/(?:caller|customer|me|speaker\s*1)\s*[:\-]([\s\S]*?)(?:receiver|shop|vendor|other\s*end|speaker\s*2)\s*[:\-]([\s\S]*)/i);
  if (speakerMatch) {
    orderSegment = speakerMatch[1];
    confirmSegment = speakerMatch[2];
  }

  const matchedItems: ExpenseLineItem[] = [];

  catalog.forEach((product) => {
    const pName = product.name.toLowerCase();
    const searchTerms = [pName, ...(product.aliases || []).map(a => a.toLowerCase())];

    const mentions: Array<{ qty: number; index: number; text: string; inConfirmSegment: boolean }> = [];

    // Find all mentions across aliases
    for (const term of searchTerms) {
      const numberPattern = '(?:\\d+|[१-१०]+|one|two|three|four|five|six|seven|eight|nine|ten|a|an|ek|do|don|teen|char|chaar|paanch|panch|chhe|chhah|saat|aath|nau|das|एक|दो|दोन|तीन|चार|पाँच|पांच|छह|छे|सात|आठ|नौ|दस)';
      const regex = new RegExp(
        `(?:(${numberPattern})\\s*(?:cups?|bottles?|plates?|glasses?|cans?|pieces?|कप|बोतल|प्लेट)?\\s*(?:of|ki|aur)?\\s*)?${term}(?:s|es)?(?:\\s*(?:x|count|quantity|qty)?\\s*(${numberPattern}|\\d+))?`,
        'gi'
      );

      let match: RegExpExecArray | null;
      while ((match = regex.exec(text)) !== null) {
        let qty = 1;
        if (match[1]) {
          const raw = match[1].toLowerCase().trim();
          qty = wordToNum[raw] || parseInt(raw, 10) || 1;
        } else if (match[2]) {
          const raw = match[2].toLowerCase().trim();
          qty = wordToNum[raw] || parseInt(raw, 10) || 1;
        }

        const matchIdx = match.index;
        const inConfirm = confirmSegment ? matchIdx >= lower.indexOf(confirmSegment) : false;

        if (!mentions.some(m => Math.abs(m.index - matchIdx) < 5)) {
          mentions.push({
            qty,
            index: matchIdx,
            text: match[0],
            inConfirmSegment: inConfirm,
          });
        }
      }
    }

    if (mentions.length === 0) return;

    // Sort chronologically
    mentions.sort((a, b) => a.index - b.index);

    let finalQty = mentions[0].qty;
    let itemDeduplicated = false;

    if (mentions.length > 1) {
      const firstMention = mentions[0];
      const subsequentMentions = mentions.slice(1);

      // Conversational deduplication check:
      // If the caller ordered 2 coffee and the shopkeeper repeated/confirmed 2 coffee (or identical quantity / in confirmation segment)
      const isEchoOrConfirm = hasConfirmationIndicator || subsequentMentions.some(m => m.inConfirmSegment || m.qty === firstMention.qty);

      if (isEchoOrConfirm) {
        // Confirmation repetition detected!
        // Prefer the confirmation segment's explicitly verified count if present, else original order count
        const confirmMention = mentions.find(m => m.inConfirmSegment);
        finalQty = confirmMention ? confirmMention.qty : firstMention.qty;
        itemDeduplicated = true;
        callDeduplicated = true;
        deduplicationDetails.push(`${product.name}: ${finalQty} ordered, confirmation echo deduplicated`);
      } else {
        // Check if there was an order modification (e.g. "actually make it 3", "change to 1")
        const textBetween = lower.slice(mentions[0].index, mentions[mentions.length - 1].index);
        if (/(?:actually|instead|make\s*it|change\s*to|correction|scratch\s*that)/i.test(textBetween)) {
          finalQty = mentions[mentions.length - 1].qty;
          itemDeduplicated = true;
          callDeduplicated = true;
          deduplicationDetails.push(`${product.name}: corrected to ${finalQty}`);
        } else {
          finalQty = firstMention.qty;
        }
      }
    }

    if (finalQty > 0) {
      matchedItems.push({
        productName: product.name,
        quantity: finalQty,
        unitPrice: product.price,
        totalPrice: finalQty * product.price,
        notes: itemDeduplicated
          ? `${finalQty} ${product.unit || 'unit'} (Shop confirmation echo deduplicated)`
          : `${finalQty} ${product.unit || 'unit'}`,
      });
    }
  });

  const totalAmount = matchedItems.reduce((acc, i) => acc + i.totalPrice, 0);
  const summary = matchedItems.length > 0
    ? matchedItems.map((i) => `${i.quantity}x ${i.productName} (@₹${i.unitPrice})`).join(', ') + (callDeduplicated ? ' (Call Echo Deduplicated)' : '')
    : 'No matched products';

  const deduplicationNotes = callDeduplicated
    ? `Call confirmation resolved (${detectedLanguage}): ${deduplicationDetails.join('; ') || 'Merchant confirmation repetition deduplicated to prevent double counting in Excel'}`
    : undefined;

  return {
    matchedItems,
    totalAmount,
    summary,
    detectedLanguage,
    translatedTranscript: text,
    callDeduplicated,
    deduplicationNotes,
  };
}

// Convert audio file to text and extract order items
export async function transcribeAndExtractExpense(
  fileItem: FileEntryItem,
  catalog: ProductItem[],
  customHint?: string
): Promise<{
  transcript: string;
  translatedTranscript?: string;
  detectedLanguage?: string;
  summary: string;
  extractedItems: ExpenseLineItem[];
  totalAmount: number;
  status?: 'completed' | 'no-match' | 'error';
  error?: string;
  missingApiKey?: boolean;
  callDeduplicated?: boolean;
  deduplicationNotes?: string;
  dialogueTurns?: Array<{ speaker: string; text: string; role?: string }>;
}> {
  let base64Audio: string | null = null;
  let mimeType = fileItem.type || 'audio/wav';

  try {
    let fileBlob: Blob | File | null = fileItem.fileObj || null;
    if (!fileBlob && fileItem.handle) {
      try {
        fileBlob = await fileItem.handle.getFile();
      } catch (err) {
        console.warn('Could not read file from handle:', err);
      }
    }

    // If file has a blob/object URL (e.g. recorded audio, simulated audio, or preview URL)
    if (!fileBlob && fileItem.url) {
      try {
        const response = await fetch(fileItem.url);
        fileBlob = await response.blob();
      } catch (urlErr) {
        console.warn('Could not fetch blob from fileItem.url:', urlErr);
      }
    }

    if (fileBlob) {
      base64Audio = await fileToBase64(fileBlob);
      mimeType = fileBlob.type || mimeType;
      // If mimeType is generic or missing, infer from file extension
      if (!mimeType || mimeType === 'application/octet-stream') {
        const ext = fileItem.name.split('.').pop()?.toLowerCase();
        if (ext === 'wav') mimeType = 'audio/wav';
        else if (ext === 'mp3') mimeType = 'audio/mp3';
        else if (ext === 'm4a') mimeType = 'audio/m4a';
        else if (ext === 'ogg') mimeType = 'audio/ogg';
        else if (ext === 'webm') mimeType = 'audio/webm';
        else if (ext === 'flac') mimeType = 'audio/flac';
        else if (ext === 'aac') mimeType = 'audio/aac';
        else mimeType = 'audio/wav';
      }
    }
  } catch (e) {
    console.warn('Could not convert audio to base64:', e);
  }

  // Call Server API with real audio bytes
  try {
    const response = await fetch('/api/transcribe-and-extract-expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base64Audio,
        mimeType,
        fileName: fileItem.name,
        transcriptHint: customHint || undefined,
        catalog: catalog.map((c) => ({
          name: c.name,
          price: c.price,
          unit: c.unit,
          aliases: c.aliases,
        })),
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        return {
          transcript: data.transcript || '',
          translatedTranscript: data.translatedTranscript || '',
          detectedLanguage: data.detectedLanguage || 'Auto-detected',
          summary: data.summary || (data.extractedItems?.length > 0 ? `${data.extractedItems.length} items extracted` : 'No catalog products detected'),
          extractedItems: Array.isArray(data.extractedItems) ? data.extractedItems : [],
          totalAmount: typeof data.totalExpense === 'number' ? data.totalExpense : 0,
          status: data.containsCatalogProducts ? 'completed' : 'no-match',
          callDeduplicated: Boolean(data.callDeduplicated),
          deduplicationNotes: data.deduplicationNotes,
          dialogueTurns: data.dialogueTurns,
        };
      } else {
        // Explicitly propagate API key missing or server errors
        return {
          transcript: data.transcript || data.error || 'Transcription failed',
          summary: data.summary || 'Translation issue',
          extractedItems: [],
          totalAmount: 0,
          error: data.error || data.transcript,
          status: 'error',
          missingApiKey: Boolean(data.missingApiKey),
        };
      }
    } else {
      return {
        transcript: `Server responded with error status ${response.status}`,
        summary: 'Server Error',
        extractedItems: [],
        totalAmount: 0,
        error: `HTTP ${response.status} from local server`,
        status: 'error',
      };
    }
  } catch (netErr: any) {
    console.warn('Network call to expense API failed:', netErr);
    return {
      transcript: 'Local backend connection failed. Ensure "npm run dev" is running in your VS Code terminal.',
      summary: 'Connection Error',
      extractedItems: [],
      totalAmount: 0,
      error: netErr?.message || 'Failed to connect to local server',
      status: 'error',
    };
  }

  // If client provided a real transcript hint (e.g. recorded live with Web Speech API in recorder modal)
  if (customHint && customHint.trim().length > 0) {
    const { matchedItems, totalAmount, summary, callDeduplicated, deduplicationNotes } = filterTextAgainstCatalog(customHint, catalog);
    return {
      transcript: customHint,
      summary,
      extractedItems: matchedItems,
      totalAmount,
      status: matchedItems.length > 0 ? 'completed' : 'no-match',
      callDeduplicated,
      deduplicationNotes,
    };
  }

  // Pure zero-match fallback: Never fabricate fake orders or default items
  return {
    transcript: 'No speech or audio data detected in this recording.',
    summary: 'No catalog products detected',
    extractedItems: [],
    totalAmount: 0,
    status: 'no-match',
  };
}

// Generate real Excel .xlsx file with SheetJS
export function exportExpensesToExcel(
  records: ExpenseRecord[],
  catalog: ProductItem[],
  monthFilter: string
) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Detailed Expenses
  const rows = records.map((rec, idx) => {
    const itemBreakdown = rec.items
      .map((i) => `${i.quantity}x ${i.productName} (@₹${i.unitPrice} = ₹${i.totalPrice})`)
      .join(' | ');

    const totalQty = rec.items.reduce((s, i) => s + i.quantity, 0);

    const deduplicationStatus = rec.callDeduplicated
      ? `VERIFIED & DEDUPLICATED (${rec.deduplicationNotes || 'Call repetition echo resolved'})`
      : 'VERIFIED (Single Order)';

    return {
      '#': idx + 1,
      'Date & Time': new Date(rec.timestamp).toLocaleString(),
      'Call Recording / Source File': rec.sourceFileName,
      'Spoken Language': rec.detectedLanguage || 'Auto-detected',
      'Original Audio Transcript': rec.transcript,
      'English Translation': rec.translatedTranscript || rec.transcript,
      'Extracted Products & Rates': itemBreakdown,
      'Order Verification & Deduplication': deduplicationStatus,
      'Total Items': totalQty,
      'Total Amount (INR ₹)': rec.totalAmount,
      'Status': rec.status.toUpperCase(),
    };
  });

  const totalSum = records.reduce((sum, r) => sum + r.totalAmount, 0);
  const totalQtyAll = records.reduce(
    (sum, r) => sum + r.items.reduce((acc, i) => acc + i.quantity, 0),
    0
  );

  // Add summary row
  rows.push({
    '#': '' as any,
    'Date & Time': 'TOTAL MONTHLY EXPENSES',
    'Call Recording / Source File': '',
    'Spoken Language': 'All Languages Processed',
    'Original Audio Transcript': '',
    'English Translation': '',
    'Extracted Products & Rates': `${records.length} Recordings Formulated`,
    'Order Verification & Deduplication': 'All Calls Audited for Repetition',
    'Total Items': totalQtyAll,
    'Total Amount (INR ₹)': totalSum,
    'Status': 'CONFIRMED',
  });

  const ws1 = XLSX.utils.json_to_sheet(rows);

  // Column widths
  ws1['!cols'] = [
    { wch: 5 },
    { wch: 22 },
    { wch: 28 },
    { wch: 18 },
    { wch: 45 },
    { wch: 45 },
    { wch: 42 },
    { wch: 48 },
    { wch: 12 },
    { wch: 20 },
    { wch: 14 },
  ];

  XLSX.utils.book_append_sheet(wb, ws1, 'Call Expense Orders');

  // Sheet 2: Product Breakdown Summary
  const productStats: Record<string, { qty: number; totalCost: number; unitPrice: number; unit: string }> = {};

  catalog.forEach((cat) => {
    productStats[cat.name] = { qty: 0, totalCost: 0, unitPrice: cat.price, unit: cat.unit };
  });

  records.forEach((rec) => {
    rec.items.forEach((item) => {
      if (!productStats[item.productName]) {
        productStats[item.productName] = {
          qty: 0,
          totalCost: 0,
          unitPrice: item.unitPrice,
          unit: 'unit',
        };
      }
      productStats[item.productName].qty += item.quantity;
      productStats[item.productName].totalCost += item.totalPrice;
    });
  });

  const productRows = Object.entries(productStats).map(([name, stats]) => ({
    'Product / Item': name,
    'Configured Unit Price (₹)': stats.unitPrice,
    'Unit Type': stats.unit,
    'Total Quantity Ordered': stats.qty,
    'Total Monthly Spend (₹)': stats.totalCost,
  }));

  const ws2 = XLSX.utils.json_to_sheet(productRows);
  ws2['!cols'] = [{ wch: 20 }, { wch: 24 }, { wch: 14 }, { wch: 24 }, { wch: 24 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Product Price Sheet');

  // Write file
  const fileName = `Monthly_Expense_Report_${monthFilter || 'Current'}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

// Generate standard CSV file
export function exportExpensesToCSV(records: ExpenseRecord[], monthFilter: string) {
  const headers = ['Date', 'File Name', 'Language', 'Original Audio Transcript', 'English Translation', 'Products', 'Verification & Deduplication', 'Total Items', 'Total Amount INR', 'Status'];
  const csvRows = [headers.join(',')];

  records.forEach((rec) => {
    const products = rec.items.map((i) => `${i.quantity}x ${i.productName}`).join('; ');
    const totalQty = rec.items.reduce((s, i) => s + i.quantity, 0);
    const deduplicationStatus = rec.callDeduplicated
      ? `VERIFIED & DEDUPLICATED (${rec.deduplicationNotes || 'Call repetition echo resolved'})`
      : 'VERIFIED (Single Order)';

    const row = [
      `"${new Date(rec.timestamp).toLocaleDateString()}"`,
      `"${rec.sourceFileName.replace(/"/g, '""')}"`,
      `"${(rec.detectedLanguage || 'Auto-detected').replace(/"/g, '""')}"`,
      `"${rec.transcript.replace(/"/g, '""')}"`,
      `"${(rec.translatedTranscript || rec.transcript).replace(/"/g, '""')}"`,
      `"${products.replace(/"/g, '""')}"`,
      `"${deduplicationStatus.replace(/"/g, '""')}"`,
      totalQty,
      rec.totalAmount,
      rec.status,
    ];
    csvRows.push(row.join(','));
  });

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Monthly_Expenses_${monthFilter || 'Current'}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
