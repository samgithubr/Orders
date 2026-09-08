import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  FileText,
  Play,
  Trash2,
  Tag,
  Plus,
  Calendar,
  IndianRupee,
  Sparkles,
  TrendingUp,
  Volume2,
  RefreshCw,
  CheckCircle,
} from 'lucide-react';
import { ExpenseRecord, ProductItem } from '../types';
import { exportExpensesToExcel, exportExpensesToCSV } from '../utils/expenseService';

interface ExcelExpenseSheetProps {
  expenses: ExpenseRecord[];
  products: ProductItem[];
  onOpenProductModal: () => void;
  onDeleteExpense: (id: string) => void;
  onAddSampleExpenseCall: () => void;
  onAddDeduplicationTestCall?: () => void;
  onAddHindiDeduplicationTestCall?: () => void;
  onPlayAudio?: (url: string, name: string) => void;
}

export const ExcelExpenseSheet: React.FC<ExcelExpenseSheetProps> = ({
  expenses,
  products,
  onOpenProductModal,
  onDeleteExpense,
  onAddSampleExpenseCall,
  onAddDeduplicationTestCall,
  onAddHindiDeduplicationTestCall,
  onPlayAudio,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Extract unique months from expenses
  const availableMonths = Array.from(
    new Set(expenses.map((e) => e.monthYear || new Date(e.timestamp).toISOString().slice(0, 7)))
  ).sort().reverse();

  // Filter expenses
  const filteredExpenses = expenses.filter((e) => {
    const month = e.monthYear || new Date(e.timestamp).toISOString().slice(0, 7);
    const matchesMonth = selectedMonth === 'all' || month === selectedMonth;
    const matchesSearch =
      searchQuery === '' ||
      e.transcript.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.sourceFileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.items.some((i) => i.productName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesMonth && matchesSearch;
  });

  const totalMonthlySpend = filteredExpenses.reduce((sum, e) => sum + e.totalAmount, 0);
  const totalItemsCount = filteredExpenses.reduce(
    (sum, e) => sum + e.items.reduce((acc, i) => acc + i.quantity, 0),
    0
  );

  // Stats by product
  const productStats: Record<string, { qty: number; cost: number }> = {};
  filteredExpenses.forEach((e) => {
    e.items.forEach((item) => {
      if (!productStats[item.productName]) {
        productStats[item.productName] = { qty: 0, cost: 0 };
      }
      productStats[item.productName].qty += item.quantity;
      productStats[item.productName].cost += item.totalPrice;
    });
  });

  const handleExportXLSX = () => {
    exportExpensesToExcel(filteredExpenses, products, selectedMonth);
  };

  const handleExportCSV = () => {
    exportExpensesToCSV(filteredExpenses, selectedMonth);
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Control Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Monthly Expense Excel Sheet
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Auto Formulated
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Call recordings and audio files translated to text & parsed into spreadsheet expenses
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="btn-manage-products"
              onClick={onOpenProductModal}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            >
              <Tag className="w-3.5 h-3.5 text-indigo-500" />
              <span>Products & Prices</span>
            </button>

            <button
              id="btn-export-excel"
              onClick={handleExportXLSX}
              disabled={filteredExpenses.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              title="Download formatted Excel Spreadsheet (.xlsx)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export .XLSX</span>
            </button>

            <button
              id="btn-export-csv"
              onClick={handleExportCSV}
              disabled={filteredExpenses.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* Quick Product Rates Bar */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Active Rates:
          </span>
          {products.slice(0, 5).map((p) => (
            <span
              key={p.id}
              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1 text-[11px]"
            >
              <span>{p.name}:</span>
              <strong className="text-emerald-600 dark:text-emerald-400">₹{p.price}</strong>
            </span>
          ))}
          {products.length > 5 && (
            <span className="text-[11px] text-slate-400">+{products.length - 5} more</span>
          )}
          <button
            onClick={onOpenProductModal}
            className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold ml-auto cursor-pointer"
          >
            + Add New Product (e.g. Water Bottle)
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">
            Total Monthly Spend
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              ₹{totalMonthlySpend}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {filteredExpenses.length} order recordings
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">
            Total Items Ordered
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-800 dark:text-slate-100">
              {totalItemsCount}
            </span>
            <span className="text-xs text-slate-400">items</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Across all categories
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">
            Coffee Ordered
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {productStats['Coffee']?.qty || 0}
            </span>
            <span className="text-xs text-slate-400">cups</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Total: ₹{productStats['Coffee']?.cost || 0}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">
            Tea Ordered
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
              {productStats['Tea']?.qty || 0}
            </span>
            <span className="text-xs text-slate-400">cups</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Total: ₹{productStats['Tea']?.cost || 0}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Month:</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-2.5 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-hidden"
          >
            <option value="all">All Months</option>
            {availableMonths.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <input
            type="text"
            placeholder="Search transcript or product..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-60 px-3 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-hidden"
          />
          {onAddDeduplicationTestCall && (
            <button
              onClick={onAddDeduplicationTestCall}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-semibold shrink-0 cursor-pointer"
              title="Test 2-way English call with order + merchant confirmation echo"
            >
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>+ Test 2-Way Call (Eng)</span>
            </button>
          )}
          {onAddHindiDeduplicationTestCall && (
            <button
              onClick={onAddHindiDeduplicationTestCall}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-xs font-semibold shrink-0 cursor-pointer"
              title="Test 2-way Hindi call: भैया २ कॉफी और ३ चाय भेज देना... हाँ ठीक है मैं २ कॉफी और ३ चाय भेजता हूँ"
            >
              <CheckCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>+ Test Hindi Call (हिन्दी)</span>
            </button>
          )}
          <button
            onClick={onAddSampleExpenseCall}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold shrink-0 cursor-pointer"
            title="Simulate a call recording with 2 coffee and 3 tea"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>+ Test Standard Call</span>
          </button>
        </div>
      </div>

      {/* Spreadsheet Table Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        {/* Excel Header Bar */}
        <div className="bg-emerald-700 text-white px-4 py-2 flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            <span>Monthly_Expense_Ledger.xlsx - Sheet1</span>
          </div>
          <span className="text-[11px] font-mono opacity-90">
            {filteredExpenses.length} Records Formulated
          </span>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
              <FileSpreadsheet className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">
              No Expense Records Formulated Yet
            </h4>
            <p className="text-xs text-slate-500 max-w-md mt-1 mb-4">
              When audio call recordings are detected in the watched directory, they are translated to text and checked against your product catalog. Only recordings containing catalog products (e.g. Coffee, Tea, Water Bottle) are formulated into this Excel sheet. Hindi, English, Hinglish, and regional languages are fully supported with intelligent two-way confirmation deduplication.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              {onAddDeduplicationTestCall && (
                <button
                  onClick={onAddDeduplicationTestCall}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  title="Simulate English 2-way call"
                >
                  <CheckCircle className="w-4 h-4" />
                  Test 2-Way Call ("...ok i send 2 coffee 3 tea")
                </button>
              )}
              {onAddHindiDeduplicationTestCall && (
                <button
                  onClick={onAddHindiDeduplicationTestCall}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  title="Simulate Hindi 2-way call: भैया २ कॉफी और ३ चाय भेज देना... हाँ ठीक है मैं २ कॉफी और ३ चाय भेजता हूँ"
                >
                  <CheckCircle className="w-4 h-4" />
                  Test Hindi Call (भैया २ कॉफी ३ चाय... हाँ ठीक है)
                </button>
              )}
              <button
                onClick={onAddSampleExpenseCall}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                Simulate Standard Call (2 Coffee & 3 Tea @ ₹15)
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <th className="py-2.5 px-3 w-10 text-center text-slate-400 font-mono">#</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Date & Time</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Audio / Call Recording</th>
                  <th className="py-2.5 px-4 min-w-[220px]">Transcribed Audio Text</th>
                  <th className="py-2.5 px-4 min-w-[200px]">Extracted Products & Rates</th>
                  <th className="py-2.5 px-3 text-center">Items</th>
                  <th className="py-2.5 px-4 text-right">Amount (₹)</th>
                  <th className="py-2.5 px-2 w-12 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                {filteredExpenses.map((rec, index) => {
                  const qty = rec.items.reduce((s, i) => s + i.quantity, 0);

                  return (
                    <tr
                      key={rec.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                    >
                      <td className="py-3 px-3 text-center font-mono text-[11px] text-slate-400">
                        {index + 1}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap text-[11px] text-slate-500 dark:text-slate-400">
                        {new Date(rec.timestamp).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Volume2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span className="font-semibold text-slate-800 dark:text-slate-200 max-w-[140px] truncate block" title={rec.sourceFileName}>
                            {rec.sourceFileName}
                          </span>
                        </div>
                        {rec.detectedLanguage && (
                          <div className="mt-1">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                              rec.detectedLanguage.toLowerCase().includes('hindi') || rec.detectedLanguage.toLowerCase().includes('हिन्दी')
                                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
                                : rec.detectedLanguage.toLowerCase().includes('marathi')
                                ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800/60'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}>
                              {rec.detectedLanguage}
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 font-mono text-[11px] text-slate-800 dark:text-slate-200 leading-relaxed">
                          "{rec.transcript}"
                        </div>
                        {rec.translatedTranscript && rec.translatedTranscript !== rec.transcript && (
                          <div className="mt-1.5 p-1.5 rounded-md bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-blue-900 dark:text-blue-200 text-[10.5px]">
                            <span className="font-bold text-blue-950 dark:text-blue-100 uppercase text-[9.5px] tracking-wider block mb-0.5">
                              English Translation:
                            </span>
                            "{rec.translatedTranscript}"
                          </div>
                        )}
                        {rec.callDeduplicated && (
                          <div className="mt-1.5 flex items-start gap-1.5 px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-medium">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            <span>
                              <strong className="font-semibold text-emerald-900 dark:text-emerald-200">2-Way Call Deduplicated:</strong>{' '}
                              {rec.deduplicationNotes || 'Merchant confirmation repetition ignored to prevent double-counting in Excel.'}
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          {rec.items.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between gap-2 text-[11px] bg-indigo-50/50 dark:bg-indigo-950/30 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/50"
                            >
                              <span className="font-semibold text-indigo-950 dark:text-indigo-200">
                                {item.quantity}x {item.productName}
                              </span>
                              <span className="font-mono text-indigo-700 dark:text-indigo-300">
                                @₹{item.unitPrice} = ₹{item.totalPrice}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center font-bold text-slate-700 dark:text-slate-300">
                        {qty}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                          ₹{rec.totalAmount}
                        </span>
                      </td>

                      <td className="py-3 px-2 text-center">
                        <button
                          onClick={() => onDeleteExpense(rec.id)}
                          className="p-1 text-slate-300 group-hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
                          title="Delete entry from sheet"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Grand Total Row */}
              <tfoot>
                <tr className="bg-emerald-50/80 dark:bg-emerald-950/40 font-bold border-t-2 border-emerald-500/40 text-slate-900 dark:text-slate-100">
                  <td colSpan={5} className="py-3 px-4 uppercase text-xs tracking-wider text-emerald-800 dark:text-emerald-300">
                    Grand Total Monthly Expenses:
                  </td>
                  <td className="py-3 px-3 text-center font-black text-slate-900 dark:text-slate-100">
                    {totalItemsCount}
                  </td>
                  <td className="py-3 px-4 text-right text-base font-black text-emerald-700 dark:text-emerald-300 font-mono">
                    ₹{totalMonthlySpend}
                  </td>
                  <td className="py-3 px-2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
