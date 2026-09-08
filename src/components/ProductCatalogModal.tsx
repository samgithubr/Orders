import React, { useState } from 'react';
import { X, Plus, Trash2, Edit2, Check, IndianRupee, Tag, Coffee } from 'lucide-react';
import { ProductItem } from '../types';

interface ProductCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: ProductItem[];
  onSaveProducts: (products: ProductItem[]) => void;
}

export const ProductCatalogModal: React.FC<ProductCatalogModalProps> = ({
  isOpen,
  onClose,
  products,
  onSaveProducts,
}) => {
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('15');
  const [newUnit, setNewUnit] = useState('cup');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<string>('');

  if (!isOpen) return null;

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPrice.trim()) return;

    const parsedPrice = parseFloat(newPrice);
    if (isNaN(parsedPrice) || parsedPrice <= 0) return;

    const newItem: ProductItem = {
      id: `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: newName.trim(),
      price: parsedPrice,
      unit: newUnit.trim() || 'unit',
      aliases: [newName.trim().toLowerCase()],
    };

    onSaveProducts([...products, newItem]);
    setNewName('');
    setNewPrice('15');
    setNewUnit('unit');
  };

  const handleDelete = (id: string) => {
    onSaveProducts(products.filter((p) => p.id !== id));
  };

  const startEdit = (prod: ProductItem) => {
    setEditingId(prod.id);
    setEditPrice(prod.price.toString());
  };

  const saveEdit = (id: string) => {
    const parsed = parseFloat(editPrice);
    if (!isNaN(parsed) && parsed > 0) {
      onSaveProducts(
        products.map((p) => (p.id === id ? { ...p, price: parsed } : p))
      );
    }
    setEditingId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Product Price Catalog
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Set prices for items recognized from call recordings
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Current Products List */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
              Active Products & Rates
            </label>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/40">
              {products.map((prod) => (
                <div
                  key={prod.id}
                  className="p-3 px-4 flex items-center justify-between hover:bg-white dark:hover:bg-slate-800/60 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold">
                      ₹
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {prod.name}
                      </h4>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Per {prod.unit || 'unit'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {editingId === prod.id ? (
                      <div className="flex items-center gap-1.5">
                        <div className="relative w-20">
                          <span className="absolute left-2 top-1.5 text-xs text-slate-400">₹</span>
                          <input
                            type="number"
                            value={editPrice}
                            onChange={(e) => setEditPrice(e.target.value)}
                            className="w-full pl-5 pr-2 py-1 text-xs font-bold bg-white dark:bg-slate-800 border border-indigo-500 rounded-md text-slate-900 dark:text-slate-100 focus:outline-hidden"
                            autoFocus
                          />
                        </div>
                        <button
                          onClick={() => saveEdit(prod.id)}
                          className="p-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          ₹{prod.price}
                        </span>
                        <button
                          onClick={() => startEdit(prod)}
                          className="p-1 text-slate-400 hover:text-indigo-600 cursor-pointer transition-colors"
                          title="Edit price"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <button
                      onClick={() => handleDelete(prod.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md transition-colors cursor-pointer"
                      title="Remove product"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add New Product Form */}
          <form onSubmit={handleAddProduct} className="p-4 bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/60 rounded-xl space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              Add New Product / Drink
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="Product Name (e.g. Water Bottle)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="col-span-1 sm:col-span-2 px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-indigo-500"
              />
              <div className="relative">
                <span className="absolute left-2.5 top-1.5 text-xs font-semibold text-slate-400">₹</span>
                <input
                  type="number"
                  placeholder="Price"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className="w-full pl-6 pr-2 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-indigo-500 font-bold"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Unit (e.g. bottle, cup, plate)"
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden"
              />
              <button
                type="submit"
                disabled={!newName.trim() || !newPrice.trim()}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer shrink-0"
              >
                Add Product
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-3.5 px-6 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
