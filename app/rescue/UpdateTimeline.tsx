'use client';

import { FieldUpdateData } from './FieldUpdate';
import { MapPin, Clock, CheckCircle2, Truck, Users2 } from 'lucide-react';

interface UpdateTimelineProps {
  updates: FieldUpdateData[];
}

const statusConfig = {
  en_route: {
    icon: Truck,
    iconClass: 'text-cyan-400',
    dotClass: 'bg-cyan-950 border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]',
    ringClass: 'ring-cyan-500/20',
    badge: 'bg-cyan-950/40 text-cyan-400 border border-cyan-500/50',
    label: 'Đang di chuyển',
  },
  arrived: {
    icon: MapPin,
    iconClass: 'text-emerald-400',
    dotClass: 'bg-emerald-950 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]',
    ringClass: 'ring-emerald-500/20',
    badge: 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/50',
    label: 'Đã đến hiện trường',
  },
  rescuing: {
    icon: Users2,
    iconClass: 'text-orange-400',
    dotClass: 'bg-orange-950 border-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]',
    ringClass: 'ring-orange-500/20',
    badge: 'bg-orange-950/40 text-orange-400 border border-orange-500/50',
    label: 'Đang cứu hộ',
  },
  completed: {
    icon: CheckCircle2,
    iconClass: 'text-indigo-400',
    dotClass: 'bg-indigo-950 border-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]',
    ringClass: 'ring-indigo-500/20',
    badge: 'bg-indigo-950/40 text-indigo-400 border border-indigo-500/50',
    label: 'Hoàn thành',
  },
};

export default function UpdateTimeline({ updates }: UpdateTimelineProps) {
  if (updates.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 text-slate-500">
        <Clock className="h-6 w-6 mb-2 opacity-40" />
        <p className="text-[10px] uppercase tracking-widest font-bold">Chưa có dữ liệu hiện trường</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest mb-5 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></span>
        Nhật ký Hiện trường
      </h3>

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[15px] top-3 bottom-3 w-px bg-slate-700/50" />

        <div className="space-y-6">
          {updates.map((update, idx) => {
            const cfg = statusConfig[update.status];
            const Icon = cfg.icon;
            const isFirst = idx === 0;

            return (
              <div key={idx} className="relative flex gap-4">
                {/* Dot */}
                <div className={`relative z-10 flex-shrink-0 w-[30px] h-[30px] rounded-full border-2 flex items-center justify-center ring-4 ${cfg.ringClass} ${cfg.dotClass} ${isFirst ? 'scale-110' : 'opacity-80'}`}>
                  <Icon className={`h-3.5 w-3.5 ${cfg.iconClass}`} />
                </div>

                {/* Content */}
                <div className={`flex-1 pb-1 ${isFirst ? '' : 'opacity-75 hover:opacity-100 transition-opacity'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded uppercase tracking-widest font-bold ${cfg.badge}`}>
                      {cfg.label}
                    </span>
                    <span className="text-xs font-mono text-slate-400 bg-slate-800/50 px-2 py-0.5 rounded border border-slate-700">
                      {new Date(update.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3.5 hover:bg-slate-800/60 transition-colors">
                    <p className="text-sm text-slate-300 leading-relaxed font-medium">{update.message}</p>

                    {update.location && (
                      <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900/50 w-fit px-2 py-1 rounded border border-slate-800">
                        <MapPin className="h-3 w-3 text-cyan-500" />
                        <span className="font-mono tracking-wider">{update.location.lat.toFixed(5)}, {update.location.lng.toFixed(5)}</span>
                      </div>
                    )}

                    {update.images && update.images.length > 0 && (
                      <div className="mt-3 flex gap-2 overflow-x-auto custom-scrollbar pb-1">
                        {update.images.map((img, imgIdx) => (
                          <img
                            key={imgIdx}
                            src={img}
                            alt="Hiện trường"
                            className="w-16 h-16 object-cover rounded-lg border border-slate-600 flex-shrink-0 hover:border-cyan-500 transition-colors cursor-pointer"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
