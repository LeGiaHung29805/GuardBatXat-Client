"use client";
import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  Phone,
  MessageSquare,
  Calendar,
  MapPin,
  Clock,
  Sparkles,
  Inbox,
  User,
  Loader2,
  ExternalLink,
  ChevronRight
} from "lucide-react";
import { showToast } from "@/components/ui/Toast";
import api from "../utils/api";
import type { IncidentReportResponse } from "@/lib/Model";

// Import MiniMap dynamically to bypass SSR errors
const IncidentMiniMap = dynamic(() => import("./IncidentMiniMap"), { ssr: false });

interface StatsState {
  pending: number;
  approved: number;
  resolved: number;
  total: number;
}

interface Props {
  onIncidentApproved: () => void;
}

export default function ModerateTab({ onIncidentApproved }: Props) {
  const [reports, setReports] = useState<IncidentReportResponse[]>([]);
  const [stats, setStats] = useState<StatsState>({ pending: 0, approved: 0, resolved: 0, total: 0 });
  const [selectedReport, setSelectedReport] = useState<IncidentReportResponse | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeImageModal, setActiveImageModal] = useState<string | null>(null);
  
  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [impactFilter, setImpactFilter] = useState<string>("ALL");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [reportsData, statsData] = await Promise.all([
        api.getIncidentReports(),
        api.getIncidentStats()
      ]);
      
      const reportsList = reportsData as IncidentReportResponse[];
      // Sort reports by created date descending
      const sortedReports = [...reportsList].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      setReports(sortedReports);
      
      if (statsData) {
        setStats({
          pending: (statsData as any).pending || 0,
          approved: (statsData as any).approved || 0,
          resolved: (statsData as any).resolved || 0,
          total: (statsData as any).total || 0,
        });
      }
      
      // Keep selected report synchronized if it exists
      if (selectedReport) {
        const updated = sortedReports.find(r => r.id === selectedReport.id);
        if (updated) setSelectedReport(updated);
      }
    } catch (e: any) {
      console.error(e);
      showToast("danger", "Lỗi", e.message || "Không thể tải danh sách sự cố.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      setActionLoading(true);
      await api.updateIncidentStatus(id, status);
      
      let msg = "Cập nhật trạng thái thành công";
      if (status === "APPROVED") {
        msg = "Phê duyệt và xác nhận sự cố thành công! Trọng số cản trở đường bộ đã được kích hoạt.";
        showToast("info", "Đã duyệt sự cố", msg);
        onIncidentApproved(); // Notify parent to refresh main map
      } else if (status === "RESOLVED") {
        msg = "Đánh dấu sự cố đã xử lý xong thành công!";
        showToast("info", "Đã xử lý sự cố", msg);
        onIncidentApproved(); // Notify parent
      } else if (status === "REJECTED") {
        msg = "Đã từ chối báo cáo sự cố thành công.";
        showToast("warning", "Đã từ chối sự cố", msg);
      }
      
      await fetchData();
    } catch (e: any) {
      console.error(e);
      showToast("danger", "Thất bại", e.message || "Không thể cập nhật trạng thái.");
    } finally {
      setActionLoading(false);
    }
  };

  // Filtering Logic
  const filteredReports = reports.filter(r => {
    const matchesSearch = 
      r.reporterName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.incidentType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.reporterPhone?.includes(searchQuery);

    const matchesStatus = statusFilter === "ALL" || r.status?.toUpperCase() === statusFilter.toUpperCase();
    const matchesImpact = impactFilter === "ALL" || r.impactLevel?.toUpperCase() === impactFilter.toUpperCase();

    return matchesSearch && matchesStatus && matchesImpact;
  });

  const getImpactBadge = (level: string) => {
    switch (level?.toUpperCase()) {
      case "CRITICAL":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-950/80 text-red-400 border border-red-500/40 flex items-center gap-1.5 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
            Nghiêm trọng
          </span>
        );
      case "HIGH":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-950/80 text-orange-400 border border-orange-500/40 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
            Cao
          </span>
        );
      case "MEDIUM":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-950/80 text-yellow-400 border border-yellow-500/40 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
            Trung bình
          </span>
        );
      case "LOW":
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-950/80 text-blue-400 border border-blue-500/40 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            Thấp
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case "PENDING":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 flex items-center gap-1">
            <Clock size={12} /> Chờ duyệt
          </span>
        );
      case "APPROVED":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
            <CheckCircle2 size={12} /> Đang hoạt động
          </span>
        );
      case "RESOLVED":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
            <CheckCircle2 size={12} /> Đã khắc phục
          </span>
        );
      case "REJECTED":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1">
            <XCircle size={12} /> Đã từ chối
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-500/10 text-gray-400 border border-gray-500/20">
            {status}
          </span>
        );
    }
  };

  const formatTime = (timeStr: string) => {
    try {
      const date = new Date(timeStr);
      return date.toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      });
    } catch {
      return timeStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* TIÊU ĐỀ CHÍNH */}
      <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
        <ShieldAlert size={32} className="text-yellow-500" />
        Không gian Kiểm duyệt Sự cố & Thiên tai
      </h2>

      {/* THÔNG KÊ NHANH (KPI CARDS) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Pending Card */}
        <div className="bg-gradient-to-br from-amber-600/15 via-yellow-600/5 to-transparent p-5 rounded-2xl border border-amber-500/20 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-amber-400">Chờ duyệt</div>
            <div className="text-3xl font-extrabold mt-1 text-white">{stats.pending}</div>
            <div className="text-xs text-gray-400 mt-2">Cần xác minh thực địa</div>
          </div>
          <div className="bg-amber-500/10 p-3.5 rounded-xl border border-amber-500/20">
            <Clock size={28} className="text-amber-400" />
          </div>
        </div>

        {/* Approved/Active Card */}
        <div className="bg-gradient-to-br from-emerald-600/15 via-teal-600/5 to-transparent p-5 rounded-2xl border border-emerald-500/20 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-emerald-400">Đang hoạt động</div>
            <div className="text-3xl font-extrabold mt-1 text-white">{stats.approved}</div>
            <div className="text-xs text-gray-400 mt-2">Đang gây cản trở định tuyến</div>
          </div>
          <div className="bg-emerald-500/10 p-3.5 rounded-xl border border-emerald-500/20">
            <AlertTriangle size={28} className="text-emerald-400" />
          </div>
        </div>

        {/* Resolved Card */}
        <div className="bg-gradient-to-br from-blue-600/15 via-indigo-600/5 to-transparent p-5 rounded-2xl border border-blue-500/20 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-blue-400">Đã khắc phục</div>
            <div className="text-3xl font-extrabold mt-1 text-white">{stats.resolved}</div>
            <div className="text-xs text-gray-400 mt-2">Đã giải phóng lưu thông</div>
          </div>
          <div className="bg-blue-500/10 p-3.5 rounded-xl border border-blue-500/20">
            <CheckCircle2 size={28} className="text-blue-400" />
          </div>
        </div>

        {/* Total Card */}
        <div className="bg-gradient-to-br from-slate-700/15 via-slate-800/5 to-transparent p-5 rounded-2xl border border-slate-600/20 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-400">Tổng báo cáo</div>
            <div className="text-3xl font-extrabold mt-1 text-white">{stats.total}</div>
            <div className="text-xs text-gray-400 mt-2">Ghi nhận từ người dân & cứu hộ</div>
          </div>
          <div className="bg-slate-500/10 p-3.5 rounded-xl border border-slate-500/20">
            <Sparkles size={28} className="text-slate-400" />
          </div>
        </div>
      </div>

      {/* GIAO DIỆN CHIA ĐÔI INTERACTIVE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* CỘT TRÁI: DANH SÁCH & BỘ LỌC */}
        <div className="lg:col-span-1 bg-gray-800/50 backdrop-blur-md rounded-2xl border border-gray-700/80 p-5 space-y-4 shadow-xl flex flex-col h-[700px]">
          <h3 className="text-lg font-bold flex items-center gap-2 border-b border-gray-700/50 pb-2 text-gray-200">
            Danh sách Sự cố
            <span className="text-xs font-semibold px-2 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full ml-auto">
              {filteredReports.length} kết quả
            </span>
          </h3>

          {/* Ô Tìm kiếm */}
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm theo loại, người báo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-700/30 text-sm text-white rounded-xl pl-10 pr-4 py-2.5 border border-gray-600 focus:border-blue-500 focus:outline-none transition-all placeholder-gray-500"
            />
          </div>

          {/* Bộ lọc Dropdowns */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="space-y-1">
              <span className="text-gray-400 flex items-center gap-1"><Filter size={10} /> Trạng thái:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-gray-700/50 text-white rounded-lg px-2.5 py-1.5 border border-gray-600 focus:outline-none"
              >
                <option value="ALL">Tất cả</option>
                <option value="PENDING">Chờ duyệt</option>
                <option value="APPROVED">Đang hoạt động</option>
                <option value="RESOLVED">Đã khắc phục</option>
                <option value="REJECTED">Đã từ chối</option>
              </select>
            </div>
            <div className="space-y-1">
              <span className="text-gray-400 flex items-center gap-1"><Filter size={10} /> Mức độ:</span>
              <select
                value={impactFilter}
                onChange={(e) => setImpactFilter(e.target.value)}
                className="w-full bg-gray-700/50 text-white rounded-lg px-2.5 py-1.5 border border-gray-600 focus:outline-none"
              >
                <option value="ALL">Tất cả</option>
                <option value="CRITICAL">Nghiêm trọng</option>
                <option value="HIGH">Cao</option>
                <option value="MEDIUM">Trung bình</option>
                <option value="LOW">Thấp</option>
              </select>
            </div>
          </div>

          {/* Thẻ Sự cố (Cuộn) */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center py-20 text-gray-400">
                <Loader2 size={36} className="animate-spin text-blue-500 mb-2" />
                <span>Đang đồng bộ dữ liệu...</span>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-20 text-gray-400 border border-dashed border-gray-700 rounded-xl">
                <Inbox size={40} className="mb-2 opacity-50" />
                <span className="text-sm">Không tìm thấy báo cáo nào</span>
              </div>
            ) : (
              filteredReports.map((report) => {
                const isSelected = selectedReport?.id === report.id;
                return (
                  <div
                    key={report.id}
                    onClick={() => setSelectedReport(report)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 relative ${
                      isSelected
                        ? "bg-blue-600/10 border-blue-500 shadow-md scale-[1.01]"
                        : "bg-gray-700/20 border-gray-600/60 hover:bg-gray-700/35 hover:border-gray-500"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="font-semibold text-gray-100 flex items-center gap-1.5 text-sm md:text-base">
                        {report.incidentType}
                      </div>
                      <ChevronRight size={16} className={`text-gray-400 transition-transform ${isSelected ? "text-blue-400 rotate-90" : ""}`} />
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {getImpactBadge(report.impactLevel)}
                      {getStatusBadge(report.status)}
                    </div>

                    <p className="text-xs text-gray-400 line-clamp-2 mt-1 leading-relaxed">
                      {report.description || "Không có mô tả chi tiết."}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-gray-500 mt-2 border-t border-gray-700/40 pt-2">
                      <span className="flex items-center gap-1">
                        <User size={10} />
                        {report.reporterName || "Ẩn danh"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={10} />
                        {formatTime(report.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* CỘT PHẢI: CHI TIẾT SỰ CỐ & DUYỆT */}
        <div className="lg:col-span-2 bg-gray-800/50 backdrop-blur-md rounded-2xl border border-gray-700/80 p-6 shadow-xl min-h-[700px] flex flex-col relative">
          {actionLoading && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center rounded-2xl">
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 flex items-center gap-3">
                <Loader2 size={24} className="text-blue-500 animate-spin" />
                <span className="font-semibold">Đang ghi nhận vào hệ thống...</span>
              </div>
            </div>
          )}

          {!selectedReport ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 py-32">
              <ShieldAlert size={64} className="mb-4 opacity-40 text-yellow-500/80 animate-bounce" />
              <h4 className="text-lg font-bold text-gray-300">Trung tâm xử lý sự cố</h4>
              <p className="text-sm text-gray-500 max-w-sm text-center mt-1">
                Vui lòng chọn một sự cố từ danh sách bên trái để kiểm tra định vị, xem ảnh chụp thực tế và phê duyệt.
              </p>
            </div>
          ) : (
            <div className="flex flex-col h-full space-y-6">
              {/* Header chi tiết */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-700/50 pb-4">
                <div>
                  <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                    {selectedReport.incidentType}
                  </h3>
                  <div className="text-sm text-gray-400 flex items-center gap-2 mt-1">
                    <Clock size={14} className="text-gray-400" />
                    Báo cáo lúc: <span className="text-gray-200 font-semibold">{formatTime(selectedReport.createdAt)}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {getImpactBadge(selectedReport.impactLevel)}
                  {getStatusBadge(selectedReport.status)}
                </div>
              </div>

              {/* Thông tin Người báo & Mô tả */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-gray-700/20 rounded-xl p-4 border border-gray-700/60">
                    <h4 className="text-sm font-bold text-blue-400 mb-3 flex items-center gap-1.5">
                      <User size={16} /> Thông tin Người báo cáo
                    </h4>
                    <div className="space-y-2.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Người báo:</span>
                        <span className="font-semibold text-white">{selectedReport.reporterName || "Ẩn danh"}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Số điện thoại:</span>
                        <span className="font-semibold text-white flex items-center gap-1.5">
                          {selectedReport.reporterPhone ? (
                            <>
                              {selectedReport.reporterPhone}
                              <div className="flex gap-1 ml-1">
                                <a
                                  href={`tel:${selectedReport.reporterPhone}`}
                                  title="Gọi điện trực tiếp"
                                  className="p-1 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30"
                                >
                                  <Phone size={12} />
                                </a>
                                <a
                                  href={`sms:${selectedReport.reporterPhone}`}
                                  title="Gửi SMS khẩn cấp"
                                  className="p-1 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30"
                                >
                                  <MessageSquare size={12} />
                                </a>
                              </div>
                            </>
                          ) : (
                            "Không cung cấp"
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-700/20 rounded-xl p-4 border border-gray-700/60 flex-1">
                    <h4 className="text-sm font-bold text-blue-400 mb-2.5">Mô tả sự cố chi tiết</h4>
                    <p className="text-sm text-gray-200 leading-relaxed bg-gray-900/30 rounded-lg p-3 border border-gray-800 min-h-[100px] whitespace-pre-line">
                      {selectedReport.description || "Người dân không cung cấp mô tả thêm."}
                    </p>
                  </div>
                </div>

                {/* Bản đồ mini */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-blue-400 flex items-center gap-1.5">
                      <MapPin size={16} /> Định vị GPS hiện trường
                    </h4>
                    <span className="text-xs text-gray-500 font-mono">
                      {selectedReport.gpsLat.toFixed(6)}, {selectedReport.gpsLng.toFixed(6)}
                    </span>
                  </div>
                  <IncidentMiniMap
                    lat={selectedReport.gpsLat}
                    lng={selectedReport.gpsLng}
                    incidentType={selectedReport.incidentType}
                    impactLevel={selectedReport.impactLevel}
                  />
                </div>
              </div>

              {/* Thư viện hình ảnh */}
              {selectedReport.images && selectedReport.images.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-blue-400">Hình ảnh hiện trường do người dân đính kèm (Nhấp để xem/tải về)</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {selectedReport.images.map((img, idx) => (
                      <div
                        key={idx}
                        onClick={() => setActiveImageModal(img)}
                        className="relative rounded-xl overflow-hidden border border-gray-700 h-[100px] hover:border-gray-500 transition-all cursor-pointer group"
                      >
                        <img
                          src={img}
                          alt={`Hiện trường ${idx + 1}`}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                        <div
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1.5 text-xs font-semibold"
                        >
                          <ExternalLink size={14} />
                          <span>Xem ảnh</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* HỘP HÀNH ĐỘNG DUYỆT */}
              <div className="border-t border-gray-700/50 pt-5 mt-auto flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-900/20 p-4 rounded-xl border border-gray-700/30">
                <div className="text-xs text-gray-400 flex items-center gap-1">
                  <ShieldAlert size={14} className="text-yellow-500" />
                  <span>
                    Duyệt sự cố mức <strong>{selectedReport.impactLevel}</strong> sẽ cộng thêm 
                    <strong>
                      {selectedReport.impactLevel?.toUpperCase() === "CRITICAL" ? " +5 " :
                       selectedReport.impactLevel?.toUpperCase() === "HIGH" ? " +3 " :
                       selectedReport.impactLevel?.toUpperCase() === "MEDIUM" ? " +2 " : " +1 "}
                    </strong> vào trọng số của các đoạn đường trong phạm vi 20m.
                  </span>
                </div>

                <div className="flex gap-2.5 self-end">
                  {/* Nếu trạng thái là CHỜ DUYỆT (PENDING) hoặc ĐÃ TỪ CHỐI (REJECTED) */}
                  {(selectedReport.status?.toUpperCase() === "PENDING" ||
                    selectedReport.status?.toUpperCase() === "REJECTED") && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(selectedReport.id, "REJECTED")}
                        disabled={selectedReport.status?.toUpperCase() === "REJECTED"}
                        className="px-5 py-2.5 rounded-xl border border-red-500/40 bg-red-950/20 text-red-400 text-sm font-semibold hover:bg-red-950/40 hover:border-red-500/80 transition-all flex items-center gap-1.5"
                      >
                        <XCircle size={16} /> Từ chối
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(selectedReport.id, "APPROVED")}
                        className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-900/30 hover:scale-[1.02] transition-all flex items-center gap-1.5"
                      >
                        <CheckCircle2 size={16} /> Duyệt & Xác nhận
                      </button>
                    </>
                  )}

                  {/* Nếu trạng thái là ĐANG HOẠT ĐỘNG (APPROVED) */}
                  {selectedReport.status?.toUpperCase() === "APPROVED" && (
                    <button
                      onClick={() => handleUpdateStatus(selectedReport.id, "RESOLVED")}
                      className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-900/30 hover:scale-[1.02] transition-all flex items-center gap-1.5"
                    >
                      <CheckCircle2 size={16} /> Đã khắc phục xong
                    </button>
                  )}

                  {/* Nếu trạng thái là ĐÃ KHẮC PHỤC (RESOLVED) */}
                  {selectedReport.status?.toUpperCase() === "RESOLVED" && (
                    <span className="text-sm font-semibold text-emerald-400 flex items-center gap-1.5 px-4 py-2 border border-emerald-500/30 bg-emerald-950/20 rounded-lg">
                      <CheckCircle2 size={16} /> Sự cố này đã được giải quyết triệt để.
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* LIGHTBOX PHÓNG TO HÌNH ẢNH HỆN TRƯỜNG & TẢI VỀ */}
      {activeImageModal && (
        <div
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-[9999] flex flex-col items-center justify-center p-4 cursor-pointer"
          onClick={() => setActiveImageModal(null)}
        >
          <div
            className="relative max-w-4xl max-h-[85vh] bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden p-3.5 shadow-2xl cursor-default flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative overflow-hidden rounded-xl border border-gray-800 bg-black flex items-center justify-center max-h-[68vh]">
              <img
                src={activeImageModal}
                alt="Hiện trường phóng to"
                className="max-w-full max-h-[65vh] object-contain"
              />
            </div>
            
            <div className="flex justify-between items-center px-1">
              <div className="text-xs text-gray-400">
                Báo cáo sự cố #{selectedReport?.id} &bull; Mức độ: {selectedReport?.impactLevel}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    try {
                      const link = document.createElement("a");
                      link.href = activeImageModal;
                      link.download = `su_co_${selectedReport?.id || "image"}_${Date.now()}.png`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      showToast("info", "Đang tải xuống", "Đang bắt đầu tải hình ảnh hiện trường về thiết bị.");
                    } catch (e: any) {
                      showToast("danger", "Không tải được ảnh", "Trình duyệt không hỗ trợ tải trực tiếp Base64.");
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 shadow-md shadow-blue-900/20"
                >
                  Tải ảnh về máy
                </button>
                <button
                  onClick={() => setActiveImageModal(null)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-semibold transition-all"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
