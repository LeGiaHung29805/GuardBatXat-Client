import React, { useState } from "react";
import type { NotificationLog } from "../types";
import {
  Megaphone,
  PenLine,
  Send,
  ClipboardList,
  Target,
  History,
  Inbox,
  CheckCircle2,
  XCircle,
  Globe
} from "lucide-react"; // Import thư viện Icon

interface Props {
  notifications: NotificationLog[];
  onSendAlert: (message: string, level: string) => void;
}

const ALERT_LEVELS = [
  { value: "INFO", label: "Thông tin", color: "blue" },
  { value: "WARNING", label: "Cảnh báo", color: "orange" },
  { value: "EMERGENCY", label: "Khẩn cấp", color: "red" },
];

export default function AlertTab({ notifications, onSendAlert }: Props) {
  const [alertMessage, setAlertMessage] = useState("");
  const [alertLevel, setAlertLevel] = useState("WARNING");

  const quickTemplates = [
    "CẢNH BÁO: Mưa lớn dự kiến trong 2 giờ tới. Người dân cần đề phòng ngập úng.",
    "KHẨN CẤP: Mực nước sông đang lên nhanh. Vùng trũng thấp cần di chuyển ngay!",
    "NGUY HIỂM: Nguy cơ sạt lở cao tại khu vực dốc. Tránh xa ngay!",
    "AN TOÀN: Mưa đã ngớt, mực nước đang xuống. Người dân có thể trở về nhà.",
  ];

  const handleSend = () => {
    if (!alertMessage.trim()) {
      alert("Vui lòng nhập nội dung cảnh báo!");
      return;
    }
    onSendAlert(alertMessage, alertLevel);
    setAlertMessage("");
  };

  return (
    <div className="space-y-6">
      {/* TIÊU ĐỀ CHÍNH */}
      <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
        <Megaphone size={32} className="text-orange-500" />
        Phát tin Báo động Khu vực
      </h2>

      {/* Alert Composer */}
      <div className="bg-gray-800/60 backdrop-blur-md rounded-2xl p-6 border border-gray-700 shadow-xl">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-3">
          <PenLine size={24} className="text-blue-400" />
          Soạn Cảnh báo Mới
        </h3>

        {/* Chọn cấp độ cảnh báo */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-sm text-gray-400">Cấp độ:</span>
          <div className="flex gap-2">
            {ALERT_LEVELS.map((lvl) => {
              const isActive = alertLevel === lvl.value;
              const activeColor =
                lvl.color === "red" ? "bg-red-600 border-red-400" :
                lvl.color === "orange" ? "bg-orange-600 border-orange-400" :
                "bg-blue-600 border-blue-400";
              return (
                <button
                  key={lvl.value}
                  onClick={() => setAlertLevel(lvl.value)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-semibold border-2 transition-all ${
                    isActive ? `${activeColor} text-white shadow-md` : "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  {lvl.label}
                </button>
              );
            })}
          </div>
        </div>
        <textarea
          value={alertMessage}
          onChange={(e) => setAlertMessage(e.target.value)}
          className="w-full h-32 bg-gray-700/50 text-white rounded-xl p-4 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none resize-none transition-all placeholder-gray-400"
          placeholder="Nhập nội dung cảnh báo khẩn cấp để gửi SMS/Push Notification..."
          maxLength={500}
        />
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-400 flex items-center gap-4">
            <span className="bg-gray-700 px-3 py-1 rounded-lg">{alertMessage.length}/500 ký tự</span>
            <span className="flex items-center gap-2">
              <Globe size={16} className="text-blue-400" />
              Gửi đến: <span className="font-bold text-white bg-blue-900/30 px-2 py-0.5 rounded border border-blue-800">Tất cả người dân</span> trong khu vực
            </span>
          </div>
          <button
            onClick={handleSend}
            disabled={!alertMessage.trim()}
            className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg hover:shadow-orange-900/50 hover:scale-[1.02] flex items-center gap-2"
          >
            <Send size={18} className={!alertMessage.trim() ? "opacity-50" : ""} />
            Gửi Cảnh báo
          </button>
        </div>
      </div>

      {/* Quick Templates */}
      <div className="bg-gray-800/60 backdrop-blur-md rounded-2xl p-6 border border-gray-700 shadow-xl">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-3">
          <ClipboardList size={24} className="text-green-400" />
          Mẫu Cảnh báo Nhanh
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickTemplates.map((template, idx) => (
            <button
              key={idx}
              onClick={() => setAlertMessage(template)}
              className="bg-gray-700/50 hover:bg-gray-600 text-left p-4 rounded-xl transition-all border border-gray-600 hover:border-blue-400 hover:shadow-md"
            >
              {template}
            </button>
          ))}
        </div>
      </div>

      {/* Notification History - Full width */}
      <div className="bg-gray-800/60 backdrop-blur-md rounded-2xl p-6 border border-gray-700 shadow-xl flex flex-col">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-3">
          <History size={24} className="text-yellow-400" />
          Lịch sử Cảnh báo
        </h3>

        <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {notifications.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 py-12">
              <Inbox size={48} className="mb-4 opacity-50" />
              <div className="text-lg">Chưa có cảnh báo nào được gửi</div>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                className="bg-gray-700/30 p-4 rounded-xl border border-gray-600 hover:border-gray-500 transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 pr-4">
                    <div className="text-xs text-gray-400 mb-1.5 flex items-center gap-2">
                      <History size={12} />
                      {notif.timestamp}
                    </div>
                    <div className="font-medium text-gray-200 leading-snug">{notif.message}</div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 flex-shrink-0 shadow-sm ${notif.status === "sent"
                        ? "bg-green-900/50 text-green-400 border border-green-800"
                        : "bg-red-900/50 text-red-400 border border-red-800"
                      }`}
                  >
                    {notif.status === "sent" ? (
                      <><CheckCircle2 size={14} /> Đã gửi</>
                    ) : (
                      <><XCircle size={14} /> Thất bại</>
                    )}
                  </span>
                </div>
                <div className="text-sm text-gray-400 mt-2 border-t border-gray-600/50 pt-2 flex items-center gap-2">
                  <Target size={14} />
                  Đã phát tới: <span className="font-bold text-white">{notif.sentTo.toLocaleString()}</span> người dân (toàn khu vực)
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}