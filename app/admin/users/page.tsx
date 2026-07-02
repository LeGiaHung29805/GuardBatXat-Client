"use client";
import { useState, useEffect, useMemo } from "react";
import { ApiClient } from "@/lib/ApiClient";
import {
  Plus,
  Edit,
  Trash2,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export default function AdminUserPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // --- STATE MODAL & FORM ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // NẾU BIẾN NÀY CÓ SỐ => ĐANG SỬA. NẾU NULL => ĐANG THÊM MỚI
  const [editingUserId, setEditingUserId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    fullName: "",
    email: "",
    phoneNumber: "",
    roleName: "RESCUE_TEAM",
    assignedStation: "",
  });

  const fetchUsers = async (isMounted = true) => {
    try {
      const res = await ApiClient.getAdminUsers();
      if (isMounted && res.code === 200) {
        setUsers(res.data || []);
      }
    } catch (err) {
      console.error("Lỗi lấy danh sách:", err);
    } finally {
      if (isMounted) setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    fetchUsers(isMounted);
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredUsers = useMemo(() => {
    if (!searchTerm || !searchTerm.trim()) return users;
    const term = searchTerm.toLowerCase().trim();
    return users.filter(
      (u: any) =>
        (u.fullName ?? "").toLowerCase().includes(term) ||
        (u.username ?? "").toLowerCase().includes(term) ||
        (u.email ?? "").toLowerCase().includes(term),
    );
  }, [users, searchTerm]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);

  const handleSearch = (e: any) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleDelete = async (id: number) => {
    if (confirm("Bạn có chắc chắn muốn xóa người dùng này?")) {
      try {
        await ApiClient.deleteUser(id);
        alert("Xóa thành công!");
        fetchUsers();
      } catch (err) {
        alert("Xóa thất bại!");
      }
    }
  };

  // --- HÀM MỞ FORM THÊM MỚI ---
  const handleOpenAdd = () => {
    setEditingUserId(null); // Đặt về null
    setFormData({
      username: "",
      password: "",
      fullName: "",
      email: "",
      phoneNumber: "",
      roleName: "RESCUE_TEAM",
      assignedStation: "",
    });
    setIsModalOpen(true);
  };

  // --- HÀM MỞ FORM SỬA ---
  const handleEdit = (user: any) => {
    const id = user.userId ?? user.id;
    setEditingUserId(id); // Gắn ID để biết là đang sửa
    setFormData({
      username: user.username || "",
      password: "", // Mật khẩu để trống (chỉ nhập khi muốn đổi)
      fullName: user.fullName || "",
      email: user.email || "",
      phoneNumber: user.phoneNumber || "",
      roleName: user.roleName || user.role || "RESCUE_TEAM",
      assignedStation: user.assignedStation || "",
    });
    setIsModalOpen(true);
  };

  const handleInputChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // --- HÀM SUBMIT GỘP CẢ THÊM LẪN SỬA ---
  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload: any = {
        ...formData,
        assignedStation:
          formData.assignedStation === "" ? null : formData.assignedStation,
      };

      if (editingUserId) {
        // LUỒNG SỬA (UPDATE)
        if (!payload.password) delete payload.password; // Nếu không nhập mk mới thì ko gửi lên

        // Bạn nhớ tạo hàm updateUser(id, payload) trong ApiClient nhé!
        const res = await ApiClient.updateUser(editingUserId, payload);
        if (res.code === 200) {
          alert("Cập nhật thông tin thành công!");
          setIsModalOpen(false);
          fetchUsers();
        } else {
          alert(res.message || "Cập nhật thất bại.");
        }
      } else {
        // LUỒNG THÊM MỚI (CREATE)
        const res = await ApiClient.createUser(payload);
        if (res.code === 200) {
          alert("Thêm người dùng thành công!");
          setIsModalOpen(false);
          fetchUsers();
        } else {
          alert(res.message || "Có lỗi xảy ra khi thêm mới.");
        }
      }
    } catch (error) {
      alert("Lỗi kết nối đến máy chủ!");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-500 max-w-6xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-800">
            Quản lý Người dùng
          </h2>
          <p className="text-slate-500">
            Quản trị phân quyền hệ thống ({users.length} tài khoản)
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-100 w-full md:w-auto justify-center"
        >
          <Plus size={20} /> Thêm người dùng
        </button>
      </div>

      {/* THANH TÌM KIẾM */}
      <div className="mb-6 relative max-w-md">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          size={18}
        />
        <input
          type="text"
          placeholder="Tìm theo Tên, Username hoặc Email..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          value={searchTerm}
          onChange={handleSearch}
        />
      </div>

      {/* TABLE/CARDS CONTAINER */}
      <div className="bg-white border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm flex flex-col">
        {/* DESKTOP TABLE VIEW */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-100">
              <tr>
                <th className="p-6">Họ tên</th>
                <th className="p-6">Email / Username</th>
                <th className="p-6">Vai trò</th>
                <th className="p-6 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="p-20 text-center text-slate-400 animate-pulse font-medium"
                  >
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : currentItems.length > 0 ? (
                currentItems.map((user: any, index: number) => {
                  const roleDisplay = user.roleName ?? user.role ?? "N/A";
                  const userId = user.userId ?? user.id ?? index;

                  return (
                    <tr
                      key={`user-${userId}-${index}`}
                      className="hover:bg-slate-50 transition"
                    >
                      <td className="p-6 font-bold text-slate-700">
                        {user.fullName || "Chưa cập nhật"}
                      </td>
                      <td className="p-6 text-slate-500 font-mono text-sm">
                        <div className="font-bold text-slate-700">
                          {user.username}
                        </div>
                        <div className="text-xs">{user.email}</div>
                      </td>
                      <td className="p-6">
                        <span
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black tracking-wide uppercase ${
                            roleDisplay === "ADMIN"
                              ? "bg-red-100 text-red-600"
                              : roleDisplay === "RESCUE_TEAM"
                                ? "bg-blue-100 text-blue-600"
                                : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {roleDisplay}
                        </span>
                      </td>
                      <td className="p-6 text-center space-x-2">
                        <button
                          onClick={() => handleEdit(user)}
                          className="p-2 text-slate-300 hover:text-blue-600 transition"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(userId)}
                          className="p-2 text-slate-300 hover:text-red-600 transition"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="p-20 text-center text-slate-400 font-medium"
                  >
                    Không tìm thấy tài khoản nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARD VIEW */}
        <div className="block md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="p-10 text-center text-slate-400 animate-pulse font-medium">
              Đang tải dữ liệu...
            </div>
          ) : currentItems.length > 0 ? (
            currentItems.map((user: any, index: number) => {
              const roleDisplay = user.roleName ?? user.role ?? "N/A";
              const userId = user.userId ?? user.id ?? index;

              return (
                <div key={`user-card-${userId}-${index}`} className="p-5 flex flex-col gap-3">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">
                        {user.fullName || "Chưa cập nhật"}
                      </h4>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        {user.username}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-[8px] font-black tracking-wide uppercase ${
                        roleDisplay === "ADMIN"
                          ? "bg-red-100 text-red-600"
                          : roleDisplay === "RESCUE_TEAM"
                            ? "bg-blue-100 text-blue-600"
                            : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {roleDisplay}
                    </span>
                  </div>

                  {(user.email || user.phoneNumber) && (
                    <div className="space-y-1 text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      {user.email && (
                        <div>
                          <span className="font-bold text-slate-400 uppercase text-[9px] tracking-wider mr-1">Email:</span>
                          <span className="font-medium text-slate-600">{user.email}</span>
                        </div>
                      )}
                      {user.phoneNumber && (
                        <div>
                          <span className="font-bold text-slate-400 uppercase text-[9px] tracking-wider mr-1">SĐT:</span>
                          <span className="font-mono text-slate-600">{user.phoneNumber}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2">
                    <span className="text-[10px] text-slate-400 font-bold">
                      ID: #{userId}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(user)}
                        className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-bold transition flex items-center gap-1"
                      >
                        <Edit size={14} /> Sửa
                      </button>
                      <button
                        onClick={() => handleDelete(userId)}
                        className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs font-bold transition flex items-center gap-1"
                      >
                        <Trash2 size={14} /> Xóa
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-10 text-center text-slate-400 font-medium">
              Không tìm thấy tài khoản nào.
            </div>
          )}
        </div>

        {/* --- KHỐI ĐIỀU KHIỂN PHÂN TRANG --- */}
        {!loading && filteredUsers.length > 0 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-col md:flex-row items-center justify-between gap-4">
            <span className="text-xs font-bold text-slate-500">
              Hiển thị {indexOfFirstItem + 1} -{" "}
              {Math.min(indexOfLastItem, filteredUsers.length)} trong số{" "}
              {filteredUsers.length} tài khoản
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs font-bold text-slate-700 px-3">
                Trang {currentPage} / {totalPages || 1}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL THÊM/SỬA NGƯỜI DÙNG */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 mx-4">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-black text-slate-800">
                {editingUserId
                  ? "Sửa thông tin tài khoản"
                  : "Thêm tài khoản mới"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-red-500 transition rounded-full hover:bg-red-50"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">
                    Tên đăng nhập
                  </label>
                  <input
                    required
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    disabled={!!editingUserId} // KHÔNG CHO SỬA USERNAME
                    type="text"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">
                    {editingUserId ? "Mật khẩu mới (Tùy chọn)" : "Mật khẩu"}
                  </label>
                  <input
                    required={!editingUserId} // Đang sửa thì ko bắt buộc nhập MK
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    type="password"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium placeholder:text-xs"
                    placeholder={editingUserId ? "Bỏ trống để giữ nguyên" : ""}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">
                  Họ và tên
                </label>
                <input
                  required
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  type="text"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">
                    Email
                  </label>
                  <input
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    type="email"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">
                    Số điện thoại
                  </label>
                  <input
                    required
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    type="text"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">
                    Vai trò (Role)
                  </label>
                  <select
                    name="roleName"
                    value={formData.roleName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    <option value="ADMIN">ADMIN (Quản trị viên)</option>
                    <option value="RESCUE_TEAM">
                      RESCUE_TEAM (Đội cứu hộ)
                    </option>
                    <option value="VIEWER">VIEWER (Người xem)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">
                    Trạm phân công
                  </label>
                  <select
                    name="assignedStation"
                    value={formData.assignedStation}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm"
                  >
                    <option value="">-- Không phân công --</option>
                    <option value="Y_TY">Trạm Y Tý</option>
                    <option value="SANG_MA_SAO">Trạm Sáng Ma Sáo</option>
                    <option value="TRINH_TUONG">Trạm Trịnh Tường</option>
                    <option value="BAT_XAT">Trạm Bát Xát</option>
                  </select>
                </div>
              </div>

              <div className="pt-6 mt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200 disabled:opacity-70"
                >
                  {isSubmitting
                    ? "Đang lưu..."
                    : editingUserId
                      ? "Cập nhật"
                      : "Xác nhận Thêm"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
