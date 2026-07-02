'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { ApiClient } from '@/lib/ApiClient';
import 'leaflet/dist/leaflet.css';
import ToastContainer, { showToast } from '@/components/ui/Toast';
import { MapPin, Upload, Trash2, Compass, AlertTriangle, ListFilter, ClipboardList, CheckCircle2, Clock, XCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import { IncidentReportResponse } from '@/lib/Model';

const BatXatBoundaryMap = dynamic(() => import('@/components/ui/BatXatBoundaryMap'), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false });

// Helper component to listen to clicks on map and update coordinates
const MapEventsHandler = dynamic(
    () => import('react-leaflet').then((mod) => {
        return function EventsHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
            const map = mod.useMapEvents({
                click(e) {
                    onClick(e.latlng.lat, e.latlng.lng);
                }
            });
            return null;
        };
    }),
    { ssr: false }
);

const MapAutoCenter = dynamic(
    () => import('react-leaflet').then((mod) => {
        return function MapUpdater({ lat, lng }: { lat: number, lng: number }) {
            const map = mod.useMap();
            useEffect(() => {
                if (lat && lng) {
                    map.flyTo([lat, lng], 15, { animate: true, duration: 1.2 });
                }
            }, [lat, lng, map]);
            return null;
        };
    }),
    { ssr: false }
);

export default function CitizenIncidentReportPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [detectingGps, setDetectingGps] = useState(false);
    const [markerIcon, setMarkerIcon] = useState<any>(null);

    // Tab & Step states
    const [activeTab, setActiveTab] = useState<'report' | 'history'>('report');
    const [step, setStep] = useState<1 | 2>(1);

    // History states
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [myReports, setMyReports] = useState<IncidentReportResponse[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    // Form inputs state
    const [form, setForm] = useState({
        reporterName: '',
        reporterPhone: '',
        incidentType: 'Sạt lở đất',
        impactLevel: 'MEDIUM',
        description: '',
        gpsLat: 22.6105,
        gpsLng: 103.8012
    });

    const [images, setImages] = useState<string[]>([]);

    useEffect(() => {
        // Load custom red warning icon
        import('leaflet').then((L) => {
            const customIcon = L.divIcon({
                className: 'bg-transparent border-none',
                html: `
                <div class="relative flex h-8 w-8 items-center justify-center">
                    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span class="relative inline-flex rounded-full h-5 w-5 bg-red-600 border-2 border-white shadow-lg flex items-center justify-center text-white font-bold text-[10px]">!</span>
                </div>
            `,
                iconSize: [32, 32],
                iconAnchor: [16, 16],
                popupAnchor: [0, -16]
            });
            setMarkerIcon(customIcon);
        });

        // Check login status & prefill profile
        const checkAuthAndPrefill = async () => {
            const token = localStorage.getItem("jwt_token");
            if (token) {
                setIsLoggedIn(true);
                try {
                    const basicRes = await ApiClient.getMyProfile();
                    if (basicRes.data) {
                        setForm(f => ({
                            ...f,
                            reporterName: basicRes.data.fullName || '',
                            reporterPhone: basicRes.data.phoneNumber || ''
                        }));
                    }
                } catch (e) {
                    console.warn("Lỗi tải thông tin đăng nhập:", e);
                }
            }
        };
        checkAuthAndPrefill();
        detectGps();
    }, []);

    // Fetch reports history when tab changes
    useEffect(() => {
        if (activeTab === 'history' && isLoggedIn) {
            fetchMyReports();
        }
    }, [activeTab, isLoggedIn]);

    const fetchMyReports = async () => {
        setHistoryLoading(true);
        try {
            const res = await ApiClient.getMyIncidentReports();
            if (res.code === 200) {
                setMyReports(res.data);
            }
        } catch (e) {
            console.error("Lỗi lấy lịch sử báo cáo:", e);
        } finally {
            setHistoryLoading(false);
        }
    };

    const detectGps = () => {
        if (typeof navigator !== 'undefined' && "geolocation" in navigator) {
            setDetectingGps(true);
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setForm(f => ({
                        ...f,
                        gpsLat: position.coords.latitude,
                        gpsLng: position.coords.longitude
                    }));
                    setDetectingGps(false);
                    showToast('info', 'ĐỊNH VỊ GPS THÀNH CÔNG', 'Đã lấy tọa độ vị trí hiện tại của bạn.');
                },
                (error) => {
                    console.warn("Lỗi lấy GPS:", error.message);
                    setDetectingGps(false);
                },
                { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
            );
        }
    };

    const handleMapClick = (lat: number, lng: number) => {
        if (activeTab === 'report') {
            setForm(f => ({ ...f, gpsLat: lat, gpsLng: lng }));
        }
    };

    const handleSelectReportFromHistory = (report: IncidentReportResponse) => {
        setForm(f => ({ ...f, gpsLat: report.gpsLat, gpsLng: report.gpsLng }));
        showToast('info', 'ĐỊNH VỊ SỰ CỐ', `Đang định vị sự cố ${report.incidentType} trên bản đồ.`);
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        Array.from(files).forEach(file => {
            if (file.size > 5 * 1024 * 1024) {
                showToast('warning', 'FILE QUÁ LỚN', `File ${file.name} vượt quá dung lượng tối đa 5MB.`);
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setImages(prev => [...prev, reader.result as string]);
            };
            reader.readAsDataURL(file);
        });
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.reporterName.trim() || !form.reporterPhone.trim() || !form.description.trim()) {
            showToast('warning', 'THIẾU THÔNG TIN', 'Vui lòng điền đầy đủ các thông tin bắt buộc.');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                ...form,
                images: images
            };
            const response = await ApiClient.createIncidentReport(payload);
            if (response.code === 200) {
                showToast('info', 'GỬI BÁO CÁO THÀNH CÔNG', 'Báo cáo sự cố đã được gửi đi và đang chờ kiểm duyệt.');
                setForm(f => ({ ...f, description: '' }));
                setImages([]);
                setStep(1);
                setActiveTab('history');
            } else {
                showToast('danger', 'CÓ LỖI XẢY RA', 'Gửi báo cáo thất bại.');
            }
        } catch (err: any) {
            showToast('danger', 'LỖI HỆ THỐNG', err.message || 'Không thể kết nối đến máy chủ.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col md:flex-row h-full w-full bg-slate-950 text-slate-100 relative">
            <ToastContainer />

            {/* Cột trái: Form & Lịch sử */}
            <div className="w-full md:w-[500px] h-[60%] md:h-full p-4 md:p-6 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 z-10 overflow-y-auto flex flex-col shrink-0 shadow-2xl">
                <div className="mb-4">
                    <h1 className="text-xl md:text-2xl font-black text-amber-500 mb-1 flex items-center gap-2">
                        <AlertTriangle className="w-6 h-6 text-amber-500 animate-pulse" />
                        Báo Cáo Sự Cố Cộng Đồng
                    </h1>
                    <p className="text-xs text-slate-400">
                        Báo cáo lũ lụt, sạt lở hoặc cản trở giao thông giúp ban chỉ huy có phương án cứu trợ kịp thời.
                    </p>
                </div>

                {/* Tab Navigation */}
                <div className="flex border-b border-slate-800 mb-4 bg-slate-950/40 rounded-lg p-1">
                    <button
                        onClick={() => setActiveTab('report')}
                        className={`flex-1 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                            activeTab === 'report'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'text-slate-450 hover:text-slate-200'
                        }`}
                    >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Gửi báo cáo mới
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex-1 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                            activeTab === 'history'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'text-slate-450 hover:text-slate-200'
                        }`}
                    >
                        <ClipboardList className="w-3.5 h-3.5" />
                        Lịch sử của tôi
                    </button>
                </div>

                {activeTab === 'report' ? (
                    /* TAB 1: FORM GỬI BÁO CÁO 2 BƯỚC */
                    <div className="flex-1 flex flex-col justify-between">
                        {/* Step indicator */}
                        <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-xl border border-slate-850 mb-4">
                            <div className="flex items-center gap-2">
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                                    step === 1 ? 'bg-amber-500 text-slate-950' : 'bg-emerald-500 text-white'
                                }`}>
                                    1
                                </span>
                                <span className={`text-[11px] font-bold ${step === 1 ? 'text-amber-400' : 'text-slate-400'}`}>Phân loại & Vị trí</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-600" />
                            <div className="flex items-center gap-2">
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                                    step === 2 ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                                }`}>
                                    2
                                </span>
                                <span className={`text-[11px] font-bold ${step === 2 ? 'text-amber-400' : 'text-slate-500'}`}>Mô tả & Thông tin</span>
                            </div>
                        </div>

                        {step === 1 ? (
                            /* STEP 1: PHÂN LOẠI & ĐỊNH VỊ */
                            <div className="space-y-4 flex-1">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-300 mb-1.5">Loại sự cố</label>
                                        <select
                                            value={form.incidentType}
                                            onChange={e => setForm(f => ({ ...f, incidentType: e.target.value }))}
                                            className="w-full p-2.5 bg-slate-950 border border-slate-700 text-slate-100 text-sm font-semibold rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                                        >
                                            <option value="Sạt lở đất">Sạt lở đất</option>
                                            <option value="Ngập lụt">Ngập lụt</option>
                                            <option value="Tắc nghẽn giao thông">Tắc nghẽn giao thông</option>
                                            <option value="Hỏng cầu/cống">Hỏng cầu/cống</option>
                                            <option value="Khác">Khác</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-300 mb-1.5">Mức độ ảnh hưởng</label>
                                        <select
                                            value={form.impactLevel}
                                            onChange={e => setForm(f => ({ ...f, impactLevel: e.target.value }))}
                                            className="w-full p-2.5 bg-slate-950 border border-slate-700 text-slate-100 text-sm font-semibold rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                                        >
                                            <option value="LOW">Thấp (Tắc nghẽn nhẹ)</option>
                                            <option value="MEDIUM">Trung bình (Khó qua lại)</option>
                                            <option value="HIGH">Cao (Không thể đi qua)</option>
                                            <option value="CRITICAL">Nghiêm trọng (Cực kỳ nguy hiểm)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="font-bold text-slate-300 flex items-center gap-1.5">
                                            <MapPin className="w-4 h-4 text-amber-500" /> Vị trí sự cố
                                        </span>
                                        <button
                                            type="button"
                                            onClick={detectGps}
                                            disabled={detectingGps}
                                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-[10px] flex items-center gap-1 active:scale-95 transition-all"
                                        >
                                            <Compass className={`w-3.5 h-3.5 ${detectingGps ? 'animate-spin' : ''}`} /> Lấy định vị GPS
                                        </button>
                                    </div>

                                    <div className="py-2.5 px-3 bg-slate-900 border border-slate-850 rounded-lg text-center">
                                        <span className="text-xs font-black text-emerald-400">
                                            ✓ Đã xác định vị trí trên bản đồ
                                        </span>
                                        <p className="text-[10px] text-slate-500 mt-1 font-mono">
                                            [{form.gpsLat.toFixed(5)}, {form.gpsLng.toFixed(5)}]
                                        </p>
                                    </div>
                                    <p className="text-[10px] text-slate-500 text-center italic">
                                        Mẹo: Nhấp chuột trực tiếp lên bản đồ bên phải để điều chỉnh vị trí chính xác.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setStep(2)}
                                    className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm rounded-xl shadow-lg flex items-center justify-center gap-1.5 transition-all"
                                >
                                    Tiếp tục bước tiếp theo
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            /* STEP 2: MÔ TẢ CHI TIẾT & ẢNH ĐÍNH KÈM */
                            <form onSubmit={handleSubmit} className="space-y-4 flex-1">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-300 mb-1.5">Họ & tên người báo *</label>
                                        <input
                                            type="text"
                                            value={form.reporterName}
                                            onChange={e => setForm(f => ({ ...f, reporterName: e.target.value }))}
                                            placeholder="Họ tên"
                                            className="w-full p-2.5 bg-slate-950 border border-slate-700 text-slate-100 text-sm font-semibold rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-300 mb-1.5">Số điện thoại *</label>
                                        <input
                                            type="tel"
                                            value={form.reporterPhone}
                                            onChange={e => setForm(f => ({ ...f, reporterPhone: e.target.value }))}
                                            placeholder="SĐT liên hệ"
                                            className="w-full p-2.5 bg-slate-950 border border-slate-700 text-slate-100 text-sm font-semibold rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Mô tả tình trạng sự cố *</label>
                                    <textarea
                                        value={form.description}
                                        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                        placeholder="Ví dụ: Vết sạt rộng khoảng 5m cản trở hoàn toàn lối đi, ngập úng cao quá đầu gối..."
                                        rows={3}
                                        className="w-full p-2.5 bg-slate-950 border border-slate-700 text-slate-100 text-sm font-semibold rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Ảnh hiện trường đính kèm (Tối đa 5MB)</label>
                                    <label className="flex flex-col items-center justify-center p-3 bg-slate-950 border border-dashed border-slate-700 rounded-xl cursor-pointer hover:bg-slate-900 transition-all hover:border-amber-500 group">
                                        <Upload className="w-5 h-5 text-slate-400 group-hover:text-amber-400" />
                                        <span className="text-xs text-slate-450 mt-1.5 font-bold">Tải ảnh hiện trường</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            onChange={handleImageChange}
                                            className="hidden"
                                        />
                                    </label>

                                    {images.length > 0 && (
                                        <div className="grid grid-cols-3 gap-2 mt-3 bg-slate-950/40 p-2 rounded-xl border border-slate-850">
                                            {images.map((img, idx) => (
                                                <div key={idx} className="relative aspect-video rounded-lg overflow-hidden border border-slate-800 group">
                                                    <img src={img} alt="preview" className="w-full h-full object-cover" />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeImage(idx)}
                                                        className="absolute top-1 right-1 p-1 bg-red-600/80 hover:bg-red-700 text-white rounded-full transition-all"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setStep(1)}
                                        className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                        Quay lại
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-[2] py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-black text-sm rounded-xl shadow-lg transition-all"
                                    >
                                        {loading ? 'Đang gửi báo cáo...' : 'GỬI BÁO CÁO SỰ CỐ'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                ) : (
                    /* TAB 2: LỊCH SỬ BÁO CÁO SỰ CỐ CỦA TÔI */
                    <div className="flex-1 flex flex-col">
                        {!isLoggedIn ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-800 rounded-2xl bg-slate-950/20">
                                <AlertTriangle className="w-8 h-8 text-slate-500 mb-2" />
                                <h3 className="font-bold text-slate-350 text-sm">Chưa đăng nhập</h3>
                                <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                                    Vui lòng đăng nhập hệ thống để xem và theo dõi tiến độ giải quyết sự cố của bạn.
                                </p>
                            </div>
                        ) : historyLoading ? (
                            <div className="flex-1 flex items-center justify-center text-xs text-amber-400 font-bold animate-pulse">
                                Đang tải danh sách sự cố của bạn...
                            </div>
                        ) : myReports.length > 0 ? (
                            <div className="flex-1 space-y-3 overflow-y-auto max-h-[70vh]">
                                {myReports.map((report) => (
                                    <div
                                        key={report.id}
                                        onClick={() => handleSelectReportFromHistory(report)}
                                        className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/45 hover:border-slate-700 transition-all cursor-pointer space-y-2 group"
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-[9px] font-mono text-slate-300">
                                                ID: #{report.id}
                                            </span>
                                            {/* Trạng thái duyệt */}
                                            {report.status === 'PENDING' && (
                                                <span className="flex items-center gap-1 text-[10px] text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                                                    <Clock className="w-3 h-3" />
                                                    Đang chờ duyệt
                                                </span>
                                            )}
                                            {report.status === 'APPROVED' && (
                                                <span className="flex items-center gap-1 text-[10px] text-sky-400 font-bold bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-full">
                                                    <CheckCircle2 className="w-3 h-3 animate-pulse" />
                                                    Đang giải quyết
                                                </span>
                                            )}
                                            {report.status === 'RESOLVED' && (
                                                <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    Đã khắc phục xong
                                                </span>
                                            )}
                                            {report.status === 'REJECTED' && (
                                                <span className="flex items-center gap-1 text-[10px] text-red-400 font-bold bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
                                                    <XCircle className="w-3 h-3" />
                                                    Từ chối
                                                </span>
                                            )}
                                        </div>

                                        <div>
                                            <h4 className="font-extrabold text-slate-200 text-sm group-hover:text-amber-400 transition-colors">
                                                {report.incidentType}
                                            </h4>
                                            <p className="text-slate-400 text-xs line-clamp-2 mt-1 leading-relaxed">
                                                {report.description}
                                            </p>
                                        </div>

                                        <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1 border-t border-slate-900/60 font-medium">
                                            <span>Mức độ: {report.impactLevel === 'CRITICAL' ? '⚠️ Nguy kịch' : report.impactLevel === 'HIGH' ? '🔴 Cao' : report.impactLevel === 'MEDIUM' ? '🟡 Vừa' : '🟢 Nhẹ'}</span>
                                            <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-800 rounded-2xl bg-slate-950/20">
                                <ClipboardList className="w-8 h-8 text-slate-650 mb-2" />
                                <h3 className="font-bold text-slate-400 text-sm">Chưa có báo cáo nào</h3>
                                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                                    Lịch sử gửi thông báo sự cố của bạn sẽ xuất hiện ở đây khi bạn thực hiện gửi báo cáo.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Map cột phải */}
            <div className="flex-1 h-[40%] md:h-full z-0 relative bg-slate-950">
                <BatXatBoundaryMap>
                    {/* Auto center camera to coordinate */}
                    {form.gpsLat && form.gpsLng && (
                        <MapAutoCenter lat={form.gpsLat} lng={form.gpsLng} />
                    )}

                    {/* Listen to clicks to reposition the incident marker */}
                    <MapEventsHandler onClick={handleMapClick} />

                    {/* Render incident marker */}
                    {form.gpsLat && form.gpsLng && markerIcon && (
                        <Marker position={[form.gpsLat, form.gpsLng]} icon={markerIcon}>
                            <Popup>
                                <div className="text-center font-bold text-slate-900 text-xs">
                                    Vị trí sự cố đã chọn <br />
                                    <span className="text-[10px] text-gray-500 font-mono">[{form.gpsLat.toFixed(5)}, {form.gpsLng.toFixed(5)}]</span>
                                </div>
                            </Popup>
                        </Marker>
                    )}
                </BatXatBoundaryMap>
            </div>
        </div>
    );
}
