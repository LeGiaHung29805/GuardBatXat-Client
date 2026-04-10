"use client";

import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface FloodStat {
  riskStatus: string;
  totalBuildings: number;
  totalArea: number;
  affectedPopulation: number;
}

// Bảng màu chuẩn cảnh báo thiên tai
const COLORS: Record<string, string> = {
  "Nguy cơ Rất cao": "#ef4444", // Đỏ
  "Nguy cơ Cao": "#f97316", // Cam
  "Nguy cơ Trung bình": "#eab308", // Vàng
  "An toàn": "#22c55e", // Xanh lá
};

export default function FloodStatsDashboard({ stats }: { stats: FloodStat[] }) {
  if (!stats || stats.length === 0) return null;

  // Tính tổng số liệu
  const totalBuildings = stats.reduce(
    (sum, item) => sum + item.totalBuildings,
    0,
  );
  const totalArea = stats.reduce((sum, item) => sum + item.totalArea, 0);
  const totalPop = stats.reduce(
    (sum, item) => sum + item.affectedPopulation,
    0,
  );

  return (
    <div className="w-full space-y-6 mt-8 p-6 bg-slate-50 rounded-2xl border border-slate-200">
      <h2 className="text-xl font-black text-slate-800 uppercase tracking-wide">
        📊 Thống kê thiệt hại ước tính
      </h2>

      {/* HÀNG 1: 3 THẺ TỔNG HỢP (CARDS) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border-l-4 border-blue-500 shadow-sm">
          <p className="text-sm text-slate-500 font-bold uppercase">
            Nhà bị ảnh hưởng
          </p>
          <p className="text-3xl font-black text-blue-700">
            {totalBuildings}{" "}
            <span className="text-base font-medium text-slate-400">căn</span>
          </p>
        </div>
        <div className="bg-white p-5 rounded-xl border-l-4 border-red-500 shadow-sm">
          <p className="text-sm text-slate-500 font-bold uppercase">
            Diện tích ngập lụt
          </p>
          <p className="text-3xl font-black text-red-700">
            {(totalArea / 10000).toFixed(2)}{" "}
            <span className="text-base font-medium text-slate-400">hecta</span>
          </p>
        </div>
        <div className="bg-white p-5 rounded-xl border-l-4 border-orange-500 shadow-sm">
          <p className="text-sm text-slate-500 font-bold uppercase">
            Dân số cần sơ tán
          </p>
          <p className="text-3xl font-black text-orange-700">
            {totalPop}{" "}
            <span className="text-base font-medium text-slate-400">người</span>
          </p>
        </div>
      </div>

      {/* HÀNG 2: BIỂU ĐỒ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-80">
        {/* Biểu đồ Tròn: Tỷ lệ theo mức độ rủi ro */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col">
          <h3 className="text-sm font-bold text-center text-slate-600 mb-2">
            Phân bổ Mức độ Rủi ro
          </h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="totalBuildings"
                  nameKey="riskStatus"
                  label={({ name, percent }) =>
                    `${name} ${((percent || 0) * 100).toFixed(0)}%`
                  }
                >
                  {stats.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[entry.riskStatus] || "#94a3b8"}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`${value} căn nhà`, "Số lượng"]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Biểu đồ Cột: Số dân cần sơ tán theo mức độ */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col">
          <h3 className="text-sm font-bold text-center text-slate-600 mb-2">
            Số dân cần sơ tán theo Vùng
          </h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats}
                margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="riskStatus" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip
                  cursor={{ fill: "#f1f5f9" }}
                  formatter={(value) => [`${value} người`, "Dân số"]}
                />
                <Bar dataKey="affectedPopulation" radius={[4, 4, 0, 0]}>
                  {stats.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[entry.riskStatus] || "#94a3b8"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
