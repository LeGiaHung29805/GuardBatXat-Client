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
  { value: 'en_route',  label: 'Đang di chuyển',    dot: 'bg-cyan-500 shadow-[0_0_8px_cyan]',    chip: 'bg-cyan-950/40 text-cyan-400 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.2)]' },
  { value: 'arrived',   label: 'Đã đến hiện trường', dot: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,1)]',   chip: 'bg-emerald-950/40 text-emerald-400 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]' },
  { value: 'rescuing',  label: 'Đang cứu hộ',        dot: 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,1)]',  chip: 'bg-orange-950/40 text-orange-400 border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.2)]' },
  { value: 'completed', label: 'Hoàn thành',         dot: 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,1)]', chip: 'bg-indigo-950/40 text-indigo-400 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.2)]' },
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
        className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl border border-cyan-900/50 bg-slate-900/60 text-cyan-400 hover:bg-cyan-950/30 hover:border-cyan-500/50 transition-all text-sm font-bold uppercase tracking-widest shadow-[0_0_10px_rgba(8,145,178,0.1)] hover:shadow-[0_0_20px_rgba(6,182,212,0.2)] group"
      >
        <Camera className="h-5 w-5 group-hover:scale-110 transition-transform drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]" />
        CẬP NHẬT HIỆN TRƯỜNG
      </button>
    );
  }

  return (
    <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-xl overflow-hidden shadow-lg relative">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-emerald-500 to-cyan-500"></div>
      {/* Form header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/90">
        <span className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
          <Camera className="h-4 w-4 text-cyan-400" />
          Báo cáo tình hình
        </span>
        <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-red-400 transition-colors bg-slate-800/50 p-1.5 rounded-md">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-5 space-y-5">
        {/* Status selector */}
        <div>
          <p className="text-[10px] font-bold text-slate-400 mb-2.5 uppercase tracking-widest">Trạng thái hiện tại</p>
          <div className="grid grid-cols-2 gap-2.5">
            {statusOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSelectedStatus(opt.value as any)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-bold tracking-wide transition-all ${
                  selectedStatus === opt.value
                    ? `${opt.chip} ring-1 ring-white/10`
                    : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:bg-slate-800 hover:border-slate-600 hover:text-slate-300'
                }`}
              >
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${selectedStatus === opt.value ? opt.dot : 'bg-slate-600'}`} />
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Message */}
        <div>
          <p className="text-[10px] font-bold text-slate-400 mb-2.5 uppercase tracking-widest">Nội dung báo cáo</p>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Mô tả chi tiết tình hình hiện trường..."
            className="w-full px-4 py-3 text-sm bg-slate-950/50 border border-slate-700/80 rounded-xl resize-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all placeholder:text-slate-600 text-slate-200 font-medium"
            rows={3}
          />
        </div>

        {/* Image preview */}
        {images.length > 0 && (
          <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
            {images.map((img, idx) => (
              <div key={idx} className="relative flex-shrink-0 group">
                <img src={img} alt="Hiện trường" className="w-20 h-20 object-cover rounded-xl border-2 border-slate-700 group-hover:border-cyan-500/50 transition-colors" />
                <button
                  onClick={() => removeImage(idx)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors shadow-[0_0_10px_rgba(239,68,68,0.5)] z-10"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={images.length >= MAX_IMAGES}
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-cyan-400 uppercase tracking-widest border border-cyan-900/50 bg-cyan-950/20 rounded-xl hover:bg-cyan-900/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <ImageIcon className="h-4 w-4" />
            <span>{images.length}/{MAX_IMAGES}</span>
          </button>
          <Button
            onClick={sendUpdate}
            disabled={sending || !message.trim()}
            className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white h-11 rounded-xl text-xs font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(8,145,178,0.3)] hover:shadow-[0_0_20px_rgba(8,145,178,0.5)] transition-all border border-cyan-400/50 disabled:shadow-none"
          >
            {sending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />ĐANG XỬ LÝ...</>
            ) : (
              <><Send className="h-4 w-4 mr-2" />GỬI BÁO CÁO</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
