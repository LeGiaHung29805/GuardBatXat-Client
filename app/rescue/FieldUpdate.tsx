'use client';

import { useState, useRef } from 'react';
import { Camera, ImageIcon, Send, Loader2, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface FieldUpdateData {
  missionId: string;
  status: 'en_route' | 'arrived' | 'rescuing' | 'completed';
  message: string;
  images?: string[];
  location?: { lat: number; lng: number };
  timestamp: Date;
}

interface FieldUpdateProps {
  missionId: string;
  onUpdateSent?: (update: FieldUpdateData) => void;
}

const statusOptions = [
  { value: 'en_route',  label: 'Đang di chuyển',    dot: 'bg-blue-500',    chip: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'arrived',   label: 'Đã đến hiện trường', dot: 'bg-green-500',   chip: 'bg-green-50 text-green-700 border-green-200' },
  { value: 'rescuing',  label: 'Đang cứu hộ',        dot: 'bg-orange-500',  chip: 'bg-orange-50 text-orange-700 border-orange-200' },
  { value: 'completed', label: 'Hoàn thành',         dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
];

const MAX_IMAGES = 5;
const MAX_FILE_SIZE_MB = 5;

export default function FieldUpdate({ missionId, onUpdateSent }: FieldUpdateProps) {
  const [selectedStatus, setSelectedStatus] = useState<'en_route' | 'arrived' | 'rescuing' | 'completed'>('en_route');
  const [message, setMessage] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentStatus = statusOptions.find((o) => o.value === selectedStatus)!;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > MAX_IMAGES) {
      alert(`Chỉ được tối đa ${MAX_IMAGES} ảnh.`);
      return;
    }
    files.forEach((file) => {
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        alert(`Ảnh "${file.name}" vượt quá ${MAX_FILE_SIZE_MB}MB.`);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setImages((prev) => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => setImages((prev) => prev.filter((_, i) => i !== index));

  const getCurrentLocation = (): Promise<{ lat: number; lng: number }> =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) { reject(new Error('Không hỗ trợ định vị')); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });

  const sendUpdate = async () => {
    if (!message.trim()) { alert('Vui lòng nhập nội dung cập nhật'); return; }
    setSending(true);
    try {
      let location = undefined;
      try { location = await getCurrentLocation(); }
      catch (err) { console.warn('Không thể lấy vị trí:', err); }

      const updateData: FieldUpdateData = {
        missionId, status: selectedStatus, message,
        images: images.length > 0 ? images : undefined,
        location, timestamp: new Date(),
      };

      await new Promise((resolve) => setTimeout(resolve, 800));
      onUpdateSent?.(updateData);
      setMessage(''); setImages([]); setShowForm(false);
    } catch (error) {
      console.error('Lỗi gửi cập nhật:', error);
      alert('Không thể gửi cập nhật. Vui lòng thử lại.');
    } finally {
      setSending(false);
    }
  };

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all text-sm font-medium"
      >
        <Camera className="h-4 w-4" />
        Cập nhật hiện trường
      </button>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Form header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
        <span className="text-sm font-semibold text-slate-900">Cập nhật hiện trường</span>
        <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Status selector */}
        <div>
          <p className="text-xs font-medium text-slate-500 mb-2">Trạng thái</p>
          <div className="grid grid-cols-2 gap-2">
            {statusOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSelectedStatus(opt.value as any)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                  selectedStatus === opt.value
                    ? `${opt.chip} border`
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${selectedStatus === opt.value ? opt.dot : 'bg-slate-300'}`} />
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Message */}
        <div>
          <p className="text-xs font-medium text-slate-500 mb-2">Nội dung cập nhật</p>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Mô tả tình hình hiện tại..."
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
            rows={3}
          />
        </div>

        {/* Image preview */}
        {images.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {images.map((img, idx) => (
              <div key={idx} className="relative flex-shrink-0">
                <img src={img} alt="Hiện trường" className="w-18 h-18 w-[72px] h-[72px] object-cover rounded-lg border border-slate-200" />
                <button
                  onClick={() => removeImage(idx)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={images.length >= MAX_IMAGES}
            className="flex items-center gap-1.5 px-3 py-2.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <ImageIcon className="h-4 w-4" />
            <span>{images.length}/{MAX_IMAGES}</span>
          </button>
          <Button
            onClick={sendUpdate}
            disabled={sending || !message.trim()}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-10 rounded-lg text-sm font-medium"
          >
            {sending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Đang gửi...</>
            ) : (
              <><Send className="h-4 w-4 mr-2" />Gửi cập nhật</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
