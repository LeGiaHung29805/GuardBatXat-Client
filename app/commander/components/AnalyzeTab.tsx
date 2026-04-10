import React, { useState, useEffect } from "react";
import StatCard from "./StatCard";
import api from "../utils/api";
import type { DamageStats } from "../types";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { 
  TrendingUp, 
  Home, 
  Users, 
  Map as MapIcon, 
  Construction, 
  AlertTriangle, 
  Activity, 
  Building2,
  CheckCircle2,
  AlertCircle,
  Siren,
  Info,
  PieChart as PieChartIcon
} from "lucide-react"; // Import thư viện Icon

interface Props {
  damageStats: DamageStats;
  selectedScenario?: string;
}

export default function AnalyzeTab({ damageStats, selectedScenario = "82m" }: Props) {
  const [exporting, setExporting] = useState(false);
  
  // Các state lưu dữ liệu thật từ Backend
  const [damageByType, setDamageByType] = useState<any[]>([]);
  const [severityData, setSeverityData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [topAreas, setTopAreas] = useState<any[]>([]);

  // State kiểm soát độ trễ (delay) để tránh bug của thư viện Recharts
  const [isChartReady, setIsChartReady] = useState(false);

  useEffect(() => {
    // 👇 TUYỆT CHIÊU KHÓA MÕM RECHARTS (Chặn cảnh báo in ra Terminal) 👇
    const originalConsoleWarn = console.warn;
    console.warn = (...args) => {
      if (typeof args[0] === 'string' && args[0].includes('The width(-1) and height(-1)')) {
        return; // Bỏ qua, không in ra Terminal
      }
      originalConsoleWarn(...args); // Các cảnh báo khác vẫn in bình thường
    };

    // Đợi 0.1 giây sau khi component render xong mới cho phép biểu đồ vẽ
    const timer = setTimeout(() => setIsChartReady(true), 100);
    
    return () => {
      clearTimeout(timer);
      console.warn = originalConsoleWarn; // Trả lại console.warn như cũ khi thoát tab
    };
  }, []);

  // Gọi API mỗi khi đổi kịch bản
  useEffect(() => {
    const levelNumber = selectedScenario.replace('m', '');
    fetchAnalysisData(levelNumber);
  }, [selectedScenario]);

  const fetchAnalysisData = async (level: string) => {
    try {
      const [typeRes, severityRes, trendRes, topRes] = await Promise.all([
        api.getDamageByType(level),
        api.getSeverityChart(level),
        api.getDamageTrend(),
        api.getTopAreas(level)
      ]);

      // 1. Xử lý dữ liệu Thiệt hại theo loại (Tính %)
      const totalDamage = (typeRes as any[]).reduce((sum, item) => sum + Number(item.so_luong), 0);
      const mappedType = (typeRes as any[]).map(item => {
        let color = "bg-gray-600";
        if (item.loai_thiet_hai === "Nhà ngập") color = "bg-blue-600";
        if (item.loai_thiet_hai === "Đường chặn") color = "bg-orange-600";
        if (item.loai_thiet_hai === "Sạt lở") color = "bg-red-600";
        if (item.loai_thiet_hai === "Hạ tầng hư hỏng") color = "bg-yellow-600";
        
        return {
          type: item.loai_thiet_hai,
          count: item.so_luong,
          percentage: totalDamage ? Math.round((item.so_luong / totalDamage) * 100) : 0,
          color
        };
      });
      setDamageByType(mappedType);

      // 2. Xử lý Mức độ nghiêm trọng (Tính %) - Đổi text icon thành Component Icon
      const totalSeverity = (severityRes as any[]).reduce((sum, item) => sum + Number(item.so_luong), 0);
      const mappedSeverity = (severityRes as any[]).map(item => {
        let color = "bg-gray-600", icon = <Info size={16} />;
        if (item.muc_do === "Nhẹ") { color = "bg-green-600"; icon = <CheckCircle2 size={16} />; }
        if (item.muc_do === "Trung bình") { color = "bg-yellow-600"; icon = <AlertTriangle size={16} />; }
        if (item.muc_do === "Nghiêm trọng") { color = "bg-orange-600"; icon = <AlertCircle size={16} />; }
        if (item.muc_do === "Cực kỳ nghiêm trọng") { color = "bg-red-600"; icon = <Siren size={16} className="animate-pulse" />; }
        
        return {
          severity: item.muc_do,
          count: item.so_luong,
          percentage: totalSeverity ? Math.round((item.so_luong / totalSeverity) * 100) : 0,
          color, icon
        };
      });
      setSeverityData(mappedSeverity);

      // 3. Dữ liệu Biểu đồ đường
      setTrendData(trendRes as any[]);

      // 4. Xử lý Top 5 Khu vực
      const mappedTopAreas = (topRes as any[]).map(item => {
        let severity = "medium";
        if (item.so_nha_ngap > 100) severity = "critical";
        else if (item.so_nha_ngap > 50) severity = "high";
        
        return {
          area: item.ten_khu_vuc || item.ten_thon,
          houses: item.so_nha_ngap,
          people: item.so_nguoi,
          severity
        };
      });
      setTopAreas(mappedTopAreas);

    } catch (error) {
      console.error("Lỗi khi tải dữ liệu phân tích:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tiêu đề chính */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold flex items-center gap-3">
          <TrendingUp size={32} className="text-blue-500" />
          Phân tích Hậu Thiên tai
        </h2>
        <div className="bg-blue-600/20 border border-blue-500 px-4 py-2 rounded-xl flex items-center gap-2">
          <span className="text-sm text-gray-400">Kịch bản:</span>
          <span className="font-bold text-xl">{selectedScenario}</span>
        </div>
      </div>

      {/* 4 Ô Thống Kê */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Nhà bị ngập"
          value={damageStats.housesFlooded}
          icon={<Home size={24} />} 
          color="blue"
          trend={{ value: 12, isPositive: false }}
          subtitle="So với dự báo trước"
        />
        <StatCard
          label="Dân số ảnh hưởng"
          value={damageStats.populationEvacuated}
          icon={<Users size={24} />} 
          color="purple"
          subtitle={`${Math.round((damageStats.populationEvacuated / 3241) * 100)}% dân số`}
        />
        <StatCard
          label="Diện tích (m²)"
          value={damageStats.areaAffected}
          icon={<MapIcon size={24} />} 
          color="green"
        />
        <StatCard
          label="Đường bị chặn"
          value={damageStats.roadsBlocked}
          icon={<Construction size={24} />} 
          color="red"
          subtitle="Đoạn đường cần thông tuyến"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* BẢNG 1: THIỆT HẠI THEO LOẠI (Chuyển thành dạng Grid Mini-cards) */}
        <div className="bg-gray-800/60 backdrop-blur-md rounded-2xl p-6 border border-gray-700 shadow-xl">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
            <PieChartIcon size={24} className="text-blue-400" />
            Thiệt hại Theo Loại
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {damageByType.map((item, idx) => {
              // Quy đổi đơn vị thông minh hiển thị cho đẹp
              let displayValue = item.count.toLocaleString();
              let unit = "điểm";
              if (item.type === "Nhà ngập") unit = "căn";
              if (item.type === "Hạ tầng hư hỏng") unit = "công trình";
              if (item.type === "Đường chặn") {
                displayValue = item.count.toLocaleString(); 
                unit = "đoạn"; 
              }

              const isDanger = item.count > 0 && (item.type === "Sạt lở" || item.type === "Đường chặn");

              return (
                <div 
                  key={idx} 
                  className={`relative p-4 rounded-xl border ${
                    isDanger ? "bg-red-900/20 border-red-500/50" : "bg-gray-700/50 border-gray-600"
                  } hover:bg-gray-700 transition-all`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-3 h-3 rounded-full ${item.color} ${isDanger ? 'animate-pulse shadow-[0_0_8px_currentColor]' : ''}`}></div>
                    <span className="text-sm font-medium text-gray-300">{item.type}</span>
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className={`text-2xl font-bold ${isDanger ? "text-red-400" : "text-white"}`}>
                      {displayValue}
                    </span>
                    <span className="text-xs text-gray-400 font-medium">{unit}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* BẢNG 2: MỨC ĐỘ NGHIÊM TRỌNG (Chuyển thành biểu đồ Donut Chart) */}
        <div className="bg-gray-800/60 backdrop-blur-md rounded-2xl p-6 border border-gray-700 shadow-xl flex flex-col">
          <h3 className="text-xl font-bold mb-2 flex items-center gap-3">
            <AlertTriangle size={24} className="text-orange-400" />
            Mức độ Nghiêm trọng
          </h3>
          
          <div className="flex items-center justify-between flex-1">
            {/* Cột chữ (Legend) */}
            <div className="space-y-4 w-1/2">
              {severityData.map((item, idx) => (
                <div key={idx} className="flex flex-col">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={item.color.replace('bg-', 'text-')}>{item.icon}</span>
                    <span className="text-sm text-gray-300">{item.severity}</span>
                  </div>
                  <div className="flex items-baseline gap-2 pl-6">
                    <span className="font-bold text-lg">{item.count.toLocaleString()}</span>
                    <span className="text-xs text-gray-500">({item.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Cột Biểu đồ Donut (Recharts) */}
            <div className="w-1/2 h-48 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severityData}
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="count"
                    stroke="none"
                  >
                    {severityData.map((entry, index) => {
                      // Map Tailwind class sang mã màu HEX cho SVG
                      let hexColor = "#6b7280"; // gray
                      if(entry.color.includes('green')) hexColor = "#16a34a";
                      if(entry.color.includes('yellow')) hexColor = "#ca8a04";
                      if(entry.color.includes('orange')) hexColor = "#ea580c";
                      if(entry.color.includes('red')) hexColor = "#dc2626";
                      return <Cell key={`cell-${index}`} fill={hexColor} />;
                    })}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Chữ ở giữa vòng tròn */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-white">
                  {severityData.reduce((sum, item) => sum + item.count, 0).toLocaleString()}
                </span>
                <span className="text-xs text-gray-400">Tổng điểm</span>
              </div>
            </div>
          </div>
        </div>
        
      </div>

      {/* Biểu đồ Line Chart Thực tế */}
      <div className="bg-gray-800/60 backdrop-blur-md rounded-2xl p-6 border border-gray-700">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-3">
          <Activity size={24} className="text-green-400" />
          Biểu đồ Diễn biến Rủi ro (7 ngày qua)
        </h3>
        <div className="h-72 w-full mt-4">
          {/* ĐÂY CHÍNH LÀ ĐIỀU KIỆN TRỊ LỖI CỦA RECHARTS */}
          {isChartReady && trendData && trendData.length > 0 ? (
            <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
              <LineChart data={trendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="ngay" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" unit="%" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend />
                <Line type="monotone" dataKey="rui_ro_ngap" name="Nguy cơ Ngập (%)" stroke="#3b82f6" strokeWidth={3} activeDot={{ r: 8 }} />
                <Line type="monotone" dataKey="rui_ro_sat_lo" name="Nguy cơ Sạt lở (%)" stroke="#ef4444" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-gray-500 italic">
              Đang tải dữ liệu biểu đồ...
            </div>
          )}
        </div>
      </div>

      {/* Top 5 Khu vực */}
      <div className="bg-gray-800/60 backdrop-blur-md rounded-2xl p-6 border border-gray-700">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-3">
          <Building2 size={24} className="text-purple-400" />
          Top 5 Khu Vực Chịu Ảnh Hưởng Nặng Nhất
        </h3>
        <div className="space-y-3">
          {topAreas.map((item, idx) => (
            <div key={idx} className="bg-gray-700/50 p-4 rounded-xl border border-gray-600 flex items-center justify-between hover:bg-gray-700 transition-all">
              <div className="flex items-center space-x-4">
                <div className="bg-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold">
                  {idx + 1}
                </div>
                <div>
                  <div className="font-semibold text-lg">{item.area}</div>
                  <div className="text-sm text-gray-400 flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1"><Home size={14}/> {item.houses.toLocaleString()}</span>
                    <span className="flex items-center gap-1"><Users size={14}/> {item.people.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <div className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                item.severity === "critical" ? "bg-red-600 text-white" : item.severity === "high" ? "bg-orange-600 text-white" : "bg-yellow-600 text-white"
              }`}>
                {item.severity === "critical" && <><Siren size={14} className="animate-pulse" /> Cực kỳ nghiêm trọng</>}
                {item.severity === "high" && <><AlertCircle size={14} /> Nghiêm trọng</>}
                {item.severity === "medium" && <><AlertTriangle size={14} /> Trung bình</>}
              </div>
            </div>
          ))}
        </div>
      </div>
      
    </div>
  );
}