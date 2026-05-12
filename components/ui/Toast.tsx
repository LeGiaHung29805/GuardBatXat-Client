import React, { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'info' | 'warning' | 'danger';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message: string;
}

export const toastEventTarget = new EventTarget();

export const showToast = (type: ToastType, title: string, message: string) => {
  const event = new CustomEvent('show-toast', {
    detail: { id: Date.now().toString(), type, title, message }
  });
  toastEventTarget.dispatchEvent(event);
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handleToast = (e: Event) => {
      const customEvent = e as CustomEvent<ToastMessage>;
      setToasts(prev => [...prev, customEvent.detail]);
      
      // Tự động xóa sau 5s (nếu không phải DANGER)
      if (customEvent.detail.type !== 'danger') {
        setTimeout(() => {
          removeToast(customEvent.detail.id);
        }, 5000);
      }
    };

    toastEventTarget.addEventListener('show-toast', handleToast);
    return () => toastEventTarget.removeEventListener('show-toast', handleToast);
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 max-w-sm w-full">
      {toasts.map(toast => {
        const isDanger = toast.type === 'danger';
        const isWarning = toast.type === 'warning';
        
        return (
          <div 
            key={toast.id} 
            className={`flex items-start gap-3 p-4 rounded-xl shadow-2xl border-l-4 animate-in slide-in-from-right-8 fade-in duration-300 ${
              isDanger ? 'bg-red-900/90 border-red-500 text-white backdrop-blur-md' :
              isWarning ? 'bg-amber-900/90 border-amber-500 text-white backdrop-blur-md' :
              'bg-blue-900/90 border-blue-500 text-white backdrop-blur-md'
            }`}
          >
            <div className={`p-2 rounded-full ${isDanger ? 'bg-red-500/20' : isWarning ? 'bg-amber-500/20' : 'bg-blue-500/20'}`}>
              {isDanger ? <ShieldAlert size={24} className="text-red-400" /> :
               isWarning ? <AlertTriangle size={24} className="text-amber-400" /> :
               <Info size={24} className="text-blue-400" />}
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-lg mb-1">{toast.title}</h4>
              <p className="text-sm opacity-90 line-clamp-3 leading-relaxed">{toast.message}</p>
            </div>
            
            <button 
              onClick={() => removeToast(toast.id)}
              className="p-1 hover:bg-white/10 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
