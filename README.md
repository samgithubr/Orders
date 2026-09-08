# Audio Call Order Extractor & Excel Formulation App

A full-stack application that scans a selected directory for audio call recordings (`.mp3`, `.wav`, `.m4a`, etc.), automatically transcribes speech into text using Gemini AI, filters the text against your custom product catalog (e.g., Coffee ₹15, Tea ₹15, Water ₹20), and automatically compiles matched orders into a downloadable Excel (`.xlsx`) sheet.

---

## 🚀 Quick Start in VS Code

### 1. Install Dependencies
Open your terminal in the project directory and run:
```bash
npm install
```

### 2. Configure Your Gemini API Key
Audio transcription uses Google's Gemini Multimodal AI. Create a `.env` file in the root folder (or copy `.env.example`):
```env
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
```
> **Tip:** You can obtain a free Gemini API key at [Google AI Studio](https://aistudio.google.com/app/apikey).

### 3. Start the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser (Google Chrome or Microsoft Edge recommended for directory access).

---

## 📋 How It Works

1. **Choose a Directory**: Click **"Select Directory"** and pick the folder where your call recordings or audio files are saved.
2. **Automatic Audio Translation**: When an audio file (`.mp3`, `.wav`, etc.) is detected or added to the directory, it is automatically converted to verbatim text.
3. **Product Catalog Filtering**: The transcribed text is checked against your configured product rates:
   - **Coffee**: ₹15 / cup
   - **Tea**: ₹15 / cup
   - **Water Bottle**: ₹20 / bottle
   - **Samosa**: ₹20 / piece
   *(You can add more products or edit prices anytime using the "Add Product / Edit Prices" button).*
4. **Excel Sheet Formulation**:
   - **If catalog products are ordered** (e.g., *"Send 2 coffee and 3 tea to conference room"*): Quantities, unit rates, and totals are computed and automatically formulated into your live Excel expense records.
   - **If no catalog products are mentioned** (e.g., general chit-chat, personal calls, or silence): The transcription is shown, but it is cleanly marked as **"Skipped Excel"** to prevent any fabricated orders.
5. **Download Excel**: Click **"Download .XLSX"** to export your formatted spreadsheet anytime.
