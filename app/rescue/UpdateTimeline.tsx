'use client';

import { FieldUpdateData } from './FieldUpdate';
import { MapPin, Clock, CheckCircle2, Truck, Users2 } from 'lucide-react';

interface UpdateTimelineProps {
  updates: FieldUpdateData[];
}

const statusConfig = {
  en_route: {
    icon: Truck,
    iconClass: 'text-blue-600',
    dotClass: 'bg-blue-500',
    ringClass: 'ring-blue-100',
    badge: 'bg-blue-50 text-blue-700',
    label: 'Đang di chuyển',
  },
  arrived: {
    icon: MapPin,
    iconClass: 'text-green-600',
    dotClass: 'bg-green-500',
    ringClass: 'ring-green-100',
    badge: 'bg-green-50 text-green-700',
    label: 'Đã đến hiện trường',
  },
  rescuing: {
    icon: Users2,
    iconClass: 'text-orange-600',
    dotClass: 'bg-orange-500',
    ringClass: 'ring-orange-100',
    badge: 'bg-orange-50 text-orange-700',
    label: 'Đang cứu hộ',
  },
  completed: {
    icon: CheckCircle2,
    iconClass: 'text-emerald-600',
    dotClass: 'bg-emerald-500',
    ringClass: 'ring-emerald-100',
    badge: 'bg-emerald-50 text-emerald-700',
    label: 'Hoàn thành',
  },
};

export default function UpdateTimeline({ updates }: UpdateTimelineProps) {
  if (updates.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 text-slate-400">
        <Clock className="h-6 w-6 mb-2 opacity-40" />
        <p className="text-sm">Chưa có cập nhật nào</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5" />
        Lịch sử cập nhật
      </h3>

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[15px] top-3 bottom-3 w-px bg-slate-200" />

        <div className="space-y-4">
          {updates.map((update, idx) => {
            const cfg = statusConfig[update.status];
            const Icon = cfg.icon;
            const isFirst = idx === 0;

            return (
              <div key={idx} className="relative flex gap-4">
                {/* Dot */}
                <div className={`relative z-10 flex-shrink-0 w-[30px] h-[30px] rounded-full bg-white border-2 border-slate-200 flex items-center justify-center ring-4 ${cfg.ringClass} ${isFirst ? 'border-slate-300' : ''}`}>
                  <Icon className={`h-3.5 w-3.5 ${cfg.iconClass}`} />
                </div>

                {/* Content */}
                <div className={`flex-1 pb-1 ${isFirst ? '' : 'opacity-75'}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.badge}`}>
                      {cfg.label}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(update.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-sm text-slate-700 leading-relaxed">{update.message}</p>

                    {update.location && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-slate-400">
                        <MapPin className="h-3 w-3" />
                        <span>{update.location.lat.toFixed(5)}, {update.location.lng.toFixed(5)}</span>
                      </div>
                    )}

                    {update.images && update.images.length > 0 && (
                      <div className="mt-2.5 flex gap-1.5 overflow-x-auto">
                        {update.images.map((img, imgIdx) => (
                          <img
                            key={imgIdx}
                            src={img}
                            alt="Hiện trường"
                            className="w-14 h-14 object-cover rounded-lg border border-slate-200 flex-shrink-0"
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
