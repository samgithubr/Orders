import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Lazy Google GenAI initialization
let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!aiClient && apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.length > 5) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Fallback rule-based audio / speech parser for catalog items with conversational two-party deduplication
interface CatalogItem {
  id?: string;
  name: string;
  price: number;
  unit?: string;
  aliases?: string[];
}

function parseTextWithCatalog(text: string, catalog: CatalogItem[]) {
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

  const extractedItems: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    notes?: string;
  }> = [];

  catalog.forEach((product) => {
    const pName = product.name.toLowerCase();
    const aliases = [pName, ...(product.aliases || []).map(a => a.toLowerCase())];

    // Find all mentions of this product with quantities in the entire text
    const mentions: Array<{ qty: number; index: number; text: string; inConfirmSegment: boolean }> = [];

    for (const alias of aliases) {
      // Look for patterns like "2 coffee", "two coffees", "२ कॉफी", "do chai", "3 cups of tea", "samosa 2"
      const numberPattern = '(?:\\d+|[१-१०]+|one|two|three|four|five|six|seven|eight|nine|ten|a|an|ek|do|don|teen|char|chaar|paanch|panch|chhe|chhah|saat|aath|nau|das|एक|दो|दोन|तीन|चार|पाँच|पांच|छह|छे|सात|आठ|नौ|दस)';
      const regex = new RegExp(
        `(?:(${numberPattern})\\s*(?:cups?|bottles?|plates?|glasses?|cans?|pieces?|कप|बोतल|प्लेट)?\\s*(?:of|ki|aur)?\\s*)?${alias}(?:s|es)?(?:\\s*(?:x|count|quantity|qty)?\\s*(${numberPattern}|\\d+))?`,
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

        // Avoid adding duplicate mention at essentially the same character position
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

    // Sort mentions chronologically
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
      extractedItems.push({
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

  const totalExpense = extractedItems.reduce((sum, item) => sum + item.totalPrice, 0);

  let translatedTranscript = text;
  if (detectedLanguage.includes('Hindi') || detectedLanguage.includes('Marathi') || detectedLanguage.includes('Hinglish')) {
    if (extractedItems.length > 0) {
      translatedTranscript = `Please send ${extractedItems.map(i => `${i.quantity} ${i.productName}`).join(' and ')} (Vendor confirmed order)`;
    }
  }

  const deduplicationNotes = callDeduplicated
    ? `Call confirmation resolved (${detectedLanguage}): ${deduplicationDetails.join('; ') || 'Merchant confirmation repetition deduplicated to prevent double counting in Excel'}`
    : undefined;

  return {
    transcript: text,
    translatedTranscript,
    detectedLanguage,
    summary: extractedItems.length > 0
      ? `Ordered ${extractedItems.map(i => `${i.quantity}x ${i.productName}`).join(', ')}${callDeduplicated ? ' (Call Echo Deduplicated)' : ''}`
      : 'No known products detected in audio text.',
    extractedItems,
    totalExpense,
    currency: '₹',
    callDeduplicated,
    deduplicationNotes,
  };
}

// API Routes
app.get(['/api/health', '/health'], (req, res) => {
  const key = process.env.GEMINI_API_KEY?.trim();
  const hasValidKey = Boolean(key && key !== 'MY_GEMINI_API_KEY' && key.length > 5);
  res.json({
    status: 'ok',
    hasGeminiKey: hasValidKey,
    time: new Date().toISOString(),
  });
});

// Transcribe Audio and Extract Product Expenses
app.post(['/api/transcribe-and-extract-expenses', '/transcribe-and-extract-expenses'], async (req, res) => {
  try {
    const {
      base64Audio,
      mimeType,
      fileName,
      transcriptHint,
      catalog = [
        { name: 'Coffee', price: 15, unit: 'cup' },
        { name: 'Tea', price: 15, unit: 'cup' },
        { name: 'Water Bottle', price: 20, unit: 'bottle' },
        { name: 'Samosa', price: 20, unit: 'piece' },
      ],
    } = req.body;

    const ai = getAIClient();

    // If no Gemini client is initialized and audio was provided,
    // explicitly notify the client about the missing key in .env
    if (!ai && base64Audio) {
      console.warn('[Audio Transcription] GEMINI_API_KEY is not configured in .env file.');
      return res.json({
        success: false,
        missingApiKey: true,
        transcript: 'GEMINI_API_KEY is missing in your local .env file. Please add GEMINI_API_KEY=your_key in project root and restart "npm run dev".',
        error: 'GEMINI_API_KEY is not configured in .env file. Add GEMINI_API_KEY=your_key in your project folder and restart "npm run dev".',
        containsCatalogProducts: false,
        summary: 'Missing GEMINI_API_KEY in .env',
        extractedItems: [],
        totalExpense: 0,
        currency: '₹',
      });
    }

    // If we have Gemini API Key and AI client
    if (ai && (base64Audio || transcriptHint)) {
      const catalogPrompt = catalog
        .map((c: CatalogItem) => `- ${c.name}: ₹${c.price} per ${c.unit || 'unit'}${c.aliases ? ` (aliases: ${c.aliases.join(', ')})` : ''}`)
        .join('\n');

      const systemPrompt = `You are an expert multilingual audio transcriber and conversational telephone call order analyzer for a business expense management system.
You are given the user's exact Product Price Catalog:
${catalogPrompt}

TASK & MULTILINGUAL AUDIO UNDERSTANDING:
1. SPOKEN LANGUAGE RECOGNITION (HINDI & ANY OTHER LANGUAGE):
   - Call recordings are often in Hindi (हिन्दी), Hinglish, Marathi, Tamil, Telugu, Gujarati, Bengali, Urdu, Punjabi, or other regional / world languages, or mixed code-switching.
   - Accurately transcribe the spoken audio into "transcript" in the original spoken language/script.
   - Detect the language and return "detectedLanguage" (e.g. "Hindi (हिन्दी)", "Hindi / Hinglish", "English", "Marathi", "Tamil", "Gujarati", etc.).
   - Provide a clear, natural English translation in "translatedTranscript" so non-speakers can review the call in the Excel ledger.
   - Map regional words and numbers to the catalog:
     * "चाय", "chai", "chay", "tea" -> map to "Tea"
     * "कॉफ़ी", "काफी", "coffee", "kapi" -> map to "Coffee"
     * "पानी", "पानी की बोतल", "paani", "botal", "water" -> map to "Water Bottle"
     * "समोसा", "समोसे", "samosa" -> map to "Samosa"
     * Numbers: "एक" (1), "दो" (2), "तीन" (3), "चार" (4), "पाँच" (5), "छह" (6), "सात" (7), "आठ" (8), "नौ" (9), "दस" (10), etc.

2. CRITICAL TWO-WAY CALL DEDUPLICATION ACROSS ALL LANGUAGES:
   - Call recordings frequently contain a two-party conversation between a Customer/Caller and a Shopkeeper/Receiver.
   - In Hindi / Hinglish / English, a typical order sequence is:
     * Customer orders (e.g. "Bhaiya 2 coffee aur 3 chai bhej dena" or "२ कॉफी और ३ चाय भेज दो").
     * Shopkeeper repeats/confirms the order (e.g. "Haan theek hai 2 coffee 3 chai bhej deta hu" or "हाँ ठीक है मैं २ कॉफी और ३ चाय भेजता हूँ" or "Ok sending 2 coffee 3 tea").
   - NEVER DOUBLE-COUNT CONFIRMED/REPEATED ITEMS!
     * The shopkeeper's echo/confirmation repeats the same items. Extract the NET ORDER (strictly 2 Coffee & 3 Tea, NOT 4 Coffee & 6 Tea!).
     * Set "callDeduplicated": true whenever a confirmation repeat, echo, or read-back was detected and deduplicated.
     * Provide "deduplicationNotes": Explanation in English (e.g. "Caller ordered 2 Coffee & 3 Tea in Hindi; Shopkeeper confirmed 'theek hai 2 coffee 3 chai bhej deta hu'. Confirmation echo deduplicated.").

3. NON-CATALOG OR GENERAL CONVERSATION:
   - If the audio does NOT order items from the catalog:
     * set "containsCatalogProducts": false
     * set "extractedItems": []
     * set "totalExpense": 0
     * set "summary": "No catalog products detected in audio"
   - ONLY include an item in "extractedItems" if it was genuinely ordered or confirmed from the catalog.
   - NEVER make up or fabricate orders.
   - For every genuinely matched item:
     * productName: exact catalog name
     * quantity: final agreed deduplicated count (e.g. 2, 3)
     * unitPrice: catalog price
     * totalPrice = quantity * unitPrice
     * notes: concise note (e.g. "2 cups (Hindi confirmation echo deduplicated)")
   - totalExpense = sum of all totalPrice.

4. Output valid JSON ONLY matching:
{
  "transcript": "Exact transcription of the audio in spoken language",
  "translatedTranscript": "English translation of the entire call conversation",
  "detectedLanguage": "e.g. 'Hindi / Hinglish', 'Hindi (हिन्दी)', 'English', 'Marathi'",
  "containsCatalogProducts": boolean,
  "callDeduplicated": boolean,
  "deduplicationNotes": "e.g. 'Caller ordered 2 Coffee & 3 Tea; Shopkeeper confirmed in Hindi. Echo repetition deduplicated.'",
  "summary": "e.g. '2x Coffee, 3x Tea (Hindi Call Echo Deduplicated)'",
  "extractedItems": [
    {
      "productName": "Coffee",
      "quantity": 2,
      "unitPrice": 15,
      "totalPrice": 30,
      "notes": "2 cups (Shop confirmation echo deduplicated)"
    }
  ],
  "dialogueTurns": [
    { "speaker": "Caller", "text": "...", "role": "order" },
    { "speaker": "Shopkeeper", "text": "...", "role": "confirmation" }
  ],
  "totalExpense": 30,
  "currency": "₹"
}`;

      // Clean and normalize MIME type for Gemini audio input
      let cleanMime = (mimeType || 'audio/wav').toLowerCase();
      if (cleanMime.includes('mp3') || cleanMime.includes('mpeg')) {
        cleanMime = 'audio/mp3';
      } else if (cleanMime.includes('wav')) {
        cleanMime = 'audio/wav';
      } else if (cleanMime.includes('m4a') || cleanMime.includes('aac')) {
        cleanMime = 'audio/aac';
      } else if (cleanMime.includes('ogg')) {
        cleanMime = 'audio/ogg';
      } else if (cleanMime.includes('webm')) {
        cleanMime = 'audio/webm';
      } else if (cleanMime.includes('flac')) {
        cleanMime = 'audio/flac';
      }

      const contents: any[] = [];
      if (base64Audio) {
        contents.push({
          inlineData: {
            mimeType: cleanMime,
            data: base64Audio,
          },
        });
      }

      contents.push({
        text: `${systemPrompt}\n\nFile Name: ${fileName || 'recording.wav'}\nTranscript Hint: ${transcriptHint || 'None'}\nPlease transcribe the actual audio, resolve any two-way call order confirmations, and extract net catalog items without duplication.`,
      });

      // Priority models that support audio with responseMimeType: 'application/json'
      const MODELS_TO_TRY = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
      let lastError: any = null;

      for (const modelName of MODELS_TO_TRY) {
        try {
          console.log(`[Audio Transcription] Running model: ${modelName} for file: ${fileName} (mime: ${cleanMime})`);
          const response = await ai.models.generateContent({
            model: modelName,
            contents: contents,
            config: {
              responseMimeType: 'application/json',
            },
          });

          const rawText = response.text || '';
          if (rawText) {
            const parsed = JSON.parse(rawText.replace(/```json/g, '').replace(/```/g, '').trim());
            const hasCatalogProducts = parsed.containsCatalogProducts ?? (Array.isArray(parsed.extractedItems) && parsed.extractedItems.length > 0);

            return res.json({
              success: true,
              source: `gemini-${modelName}`,
              transcript: parsed.transcript || '',
              translatedTranscript: parsed.translatedTranscript || '',
              detectedLanguage: parsed.detectedLanguage || 'Auto-detected',
              containsCatalogProducts: !!hasCatalogProducts,
              callDeduplicated: Boolean(parsed.callDeduplicated),
              deduplicationNotes: parsed.deduplicationNotes || (parsed.callDeduplicated ? 'Call confirmation repetition deduplicated to prevent double counting in Excel.' : ''),
              dialogueTurns: Array.isArray(parsed.dialogueTurns) ? parsed.dialogueTurns : [],
              summary: parsed.summary || (hasCatalogProducts ? 'Items extracted' : 'No catalog products detected in audio'),
              extractedItems: Array.isArray(parsed.extractedItems) ? parsed.extractedItems : [],
              totalExpense: typeof parsed.totalExpense === 'number' ? parsed.totalExpense : 0,
              currency: parsed.currency || '₹',
            });
          }
        } catch (modelErr: any) {
          lastError = modelErr;
          console.warn(`[Audio Transcription] Model ${modelName} failed (${modelErr?.status || modelErr?.code || modelErr?.message}). Trying next model...`);
          await new Promise((resolve) => setTimeout(resolve, 400));
        }
      }

      console.warn('All Gemini models encountered errors:', lastError?.message);

      // If Gemini models threw an error (e.g. quota, network, or format)
      if (lastError && !transcriptHint) {
        return res.json({
          success: false,
          error: lastError?.message || 'Could not process audio with Gemini API',
          transcript: `Audio transcription error: ${lastError?.message || 'Temporary service issue'}. Check your GEMINI_API_KEY in .env.`,
          containsCatalogProducts: false,
          summary: 'Transcription error',
          extractedItems: [],
          totalExpense: 0,
          currency: '₹',
        });
      }
    }

    // Fallback: If transcriptHint was provided (e.g. from browser speech-to-text), parse it against catalog
    if (transcriptHint && transcriptHint.trim().length > 0) {
      const fallbackResult = parseTextWithCatalog(transcriptHint, catalog);
      const hasCatalogProducts = fallbackResult.extractedItems.length > 0;
      return res.json({
        success: true,
        source: 'browser-speech-hint',
        transcript: transcriptHint,
        translatedTranscript: fallbackResult.translatedTranscript || transcriptHint,
        detectedLanguage: fallbackResult.detectedLanguage || 'Auto-detected',
        containsCatalogProducts: hasCatalogProducts,
        callDeduplicated: Boolean(fallbackResult.callDeduplicated),
        deduplicationNotes: fallbackResult.deduplicationNotes,
        summary: fallbackResult.summary,
        extractedItems: fallbackResult.extractedItems,
        totalExpense: fallbackResult.totalExpense,
        currency: '₹',
      });
    }

    // Never hallucinate or default to coffee/tea if no speech/products were detected
    return res.json({
      success: true,
      source: 'no-match',
      transcript: 'No speech or audio data detected in this recording.',
      containsCatalogProducts: false,
      summary: 'No catalog products detected in audio',
      extractedItems: [],
      totalExpense: 0,
      currency: '₹',
    });
  } catch (error: any) {
    console.error('Server error in /api/transcribe-and-extract-expenses:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Only start standalone HTTP server if not running as serverless function (like on Vercel)
if (!process.env.VERCEL) {
  startServer();
}

export default app;
