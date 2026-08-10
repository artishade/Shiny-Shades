/* ===================================================
   Shiny Shades - Admin Categories Management
   Fixed: uploads image to Supabase Storage, saves
   public URL to category.image field in DB
   =================================================== */

import React, { useState, useRef } from 'react';
import { Plus, Edit2, Trash2, Upload, X } from 'lucide-react';
import { Button, Input, Modal } from '@/components/ui';
import { useCategoryStore } from '@/store';
import type { Category } from '@/types';
import { uploadToCloudinary } from '@/lib/cloudinary';

// ── Upload a single image to Supabase Storage ──────────────────────────────
const uploadCategoryImage = async (file: File): Promise<string> => {
  return uploadToCloudinary(file);
};
// ── Image picker (single image, uploads to Supabase) ──────────────────────
const ImagePicker: React.FC<{
  currentUrl: string;
  onUploaded: (url: string) => void;
}> = ({ currentUrl, onUploaded }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(currentUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setError('');
    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);

    setUploading(true);
    try {
      const publicUrl = await uploadCategoryImage(file);
      onUploaded(publicUrl);   // send real URL up to parent
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setPreview(currentUrl);  // revert preview on error
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-[#6B5B55] mb-1.5">
        Category Image
      </label>

      {/* Preview */}
      {preview && (
        <div className="relative w-full h-32 rounded-xl overflow-hidden border border-blush/30 mb-2">
          <img src={preview} alt="preview" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => { setPreview(''); onUploaded(''); }}
            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors"
          >
            <X size={12} className="text-white" />
          </button>
          {uploading && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <p className="text-white text-sm font-medium">Uploading...</p>
            </div>
          )}
        </div>
      )}

      {/* Drop zone */}
      {!preview && (
        <div
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-2 h-24 rounded-2xl border-2 border-dashed border-blush/50 bg-white/50 cursor-pointer hover:bg-rose-50/50 hover:border-rose-gold/50 transition-all"
        >
          <Upload size={20} className="text-[#6B5B55]/60" />
          <p className="text-xs text-[#6B5B55]/60 text-center px-4">
            Click to upload a category image
          </p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => handleFile(e.target.files?.[0] ?? null)}
      />

      {error && (
        <p className="text-xs text-red-500 mt-1">⚠️ {error} — check Supabase bucket permissions.</p>
      )}

      {!preview && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full py-2 rounded-xl border border-blush/30 bg-white/60 text-sm text-[#6B5B55] hover:bg-white/80 transition-colors"
        >
          Browse image
        </button>
      )}
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────
export const AdminCategories: React.FC = () => {
  const { categories, addCategory, updateCategory, deleteCategory } = useCategoryStore();

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [form, setForm] = useState<{
    name: string;
    description: string;
    gradient: string;
    image: string;   // ← single Supabase public URL
  }>({
    name: '',
    description: '',
    gradient: 'linear-gradient(135deg, #F4C2C2, #E6E6FA)',
    image: '',
  });

  const gradients = [
    'linear-gradient(135deg, #F4C2C2, #E6E6FA)',
    'linear-gradient(135deg, #F7E7CE, #F4C2C2)',
    'linear-gradient(135deg, #E3BCA4, #FADBD8)',
    'linear-gradient(135deg, #B76E79, #F4C2C2)',
    'linear-gradient(135deg, #D4949E, #E6E6FA)',
    'linear-gradient(135deg, #FADBD8, #F7E7CE)',
    'linear-gradient(135deg, #C8C8E0, #E3BCA4)',
  ];

  const openAdd = () => {
    setEditingId(null);
    setForm({ name: '', description: '', gradient: gradients[0], image: '' });
    setSaveError('');
    setShowModal(true);
  };

  const openEdit = (cat: Category) => {
    setEditingId(cat.id);
    setForm({
      name: cat.name,
      description: cat.description,
      gradient: cat.gradient,
      image: cat.image ?? '',
    });
    setSaveError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    setSaveError('');

    const slug = form.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    try {
      if (editingId) {
        await updateCategory(editingId, {
          name: form.name,
          slug,
          description: form.description,
          gradient: form.gradient,
          image: form.image,
        });
      } else {
        await addCategory({
          id: crypto.randomUUID(),
          name: form.name,
          slug,
          description: form.description,
          image: form.image,
          productCount: 0,
          gradient: form.gradient,
        });
      }
      setShowModal(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed — check Supabase permissions.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this category?')) deleteCategory(id);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="heading-serif text-2xl md:text-3xl font-bold text-charcoal">
            Categories
          </h1>
          <p className="text-[#6B5B55] text-sm">{categories.length} categories</p>
        </div>
        <Button onClick={openAdd}>
          <Plus size={16} /> Add Category
        </Button>
      </div>

      {/* Category cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => (
          <div key={cat.id} className="glass-card rounded-2xl overflow-hidden">
            {/* Image or gradient header */}
            <div
              className="h-32 w-full relative"
              style={
                cat.image
                  ? { backgroundImage: `url(${cat.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                  : { background: cat.gradient }
              }
            />

            <div className="p-4">
              <h3 className="font-semibold text-charcoal">{cat.name}</h3>
              <p className="text-sm text-[#6B5B55] mt-1 line-clamp-2">{cat.description}</p>
              <p className="text-xs text-[#6B5B55] mt-2">{cat.productCount} products</p>
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="ghost" onClick={() => openEdit(cat)}>
                  <Edit2 size={14} /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="!text-red-500 hover:!bg-red-50"
                  onClick={() => handleDelete(cat.id)}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? 'Edit Category' : 'Add Category'}
      >
        <div className="space-y-4">
          <Input
            label="Category Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Dresses"
          />

          <div>
            <label className="block text-sm font-medium text-[#6B5B55] mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-blush/30 bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-rose-gold/30 resize-none"
              rows={3}
            />
          </div>

          {/* Image upload — uploads to Supabase on selection */}
          <ImagePicker
            currentUrl={form.image}
            onUploaded={(url) => setForm({ ...form, image: url })}
          />

          {/* Gradient picker */}
          <div>
            <label className="block text-sm font-medium text-[#6B5B55] mb-1.5">
              Fallback Gradient{' '}
              <span className="text-[#6B5B55]/60 font-normal">(used when no image uploaded)</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {gradients.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setForm({ ...form, gradient: g })}
                  className={`h-12 rounded-xl border-2 transition-all ${form.gradient === g ? 'border-rose-gold scale-105' : 'border-transparent'}`}
                  style={{ background: g }}
                />
              ))}
            </div>
          </div>

          {saveError && (
            <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2">⚠️ {saveError}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Category'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};