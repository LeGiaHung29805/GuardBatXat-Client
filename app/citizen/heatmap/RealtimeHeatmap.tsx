"use client";

import React, { useState, useEffect, useRef } from 'react';
// Import dynamic để chống lỗi "window is not defined" của Next.js
import dynamic from 'next/dynamic';
import HeatmapLayer from '@/components/HeatmapLayer';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import 'leaflet/dist/leaflet.css';

// Import từ tầng kiến trúc lib
import { HeatmapPoint } from '@/lib/Model';
import { ApiClient } from '@/lib/ApiClient';

// Tắt SSR cho MapContainer và TileLayer để Leaflet chỉ chạy trên trình duyệt
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });

const RealtimeHeatmap = () => {
    const [points, setPoints] = useState<HeatmapPoint[]>([]);
    const [lastUpdated, setLastUpdated] = useState<string>("Chưa có dữ liệu");
    const [connectionStatus, setConnectionStatus] = useState<"Đang tải" | "Trực tuyến" | "Mất kết nối">("Đang tải");
    const [isMounted, setIsMounted] = useState(false); // Lá bùa chống crash Next.js

    const stompClientRef = useRef<Client | null>(null);

    // Xử lý SSR
    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (!isMounted) return;

        // 1. LẤY DỮ LIỆU BAN ĐẦU QUA APICLIENT
        const initData = async () => {
            try {
                const data = await ApiClient.getInitialLandslideData();
                setPoints(data);
                setLastUpdated(new Date().toLocaleTimeString('vi-VN'));
                setConnectionStatus("Trực tuyến");
            } catch (error) {
                setConnectionStatus("Mất kết nối");
            }
        };

        initData();

        // 2. THIẾT LẬP KẾT NỐI WEBSOCKET
        const socket = new SockJS('http://localhost:8080/ws-guardbatxat');
        const client = new Client({
            webSocketFactory: () => socket,
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
            onConnect: () => {
                setConnectionStatus("Trực tuyến");
                console.log("🟢 WebSocket Connected");

                client.subscribe('/topic/heatmap-updates', (message) => {
                    const newData: HeatmapPoint[] = JSON.parse(message.body);
                    setPoints(newData);
                    setLastUpdated(new Date().toLocaleTimeString('vi-VN'));
                });
            },
            onStompError: (frame) => {
                console.error('Broker reported error: ' + frame.headers['message']);
                setConnectionStatus("Mất kết nối");
            },
            onWebSocketClose: () => {
                setConnectionStatus("Mất kết nối");
            }
        });

        client.activate();
        stompClientRef.current = client;

        return () => {
            if (stompClientRef.current) {
                stompClientRef.current.deactivate();
                console.log("🔴 WebSocket Deactivated");
            }
        };
    }, [isMounted]);

    // Ép kiểu dữ liệu từ Object sang mảng Array [lat, lng, weight] cho đúng chuẩn thư viện mới
    const heatmapData: [number, number, number][] = points.map(p => [p.lat, p.lng, p.weight]);

    if (!isMounted) return null; // Render trắng trong tích tắc trên Server

    return (
        <div className="relative h-screen w-full">
            {/* 📊 Bảng điều khiển nổi */}
            <div className="absolute left-6 top-6 z-[1000] flex flex-col gap-3 rounded-2xl bg-white/90 p-6 shadow-2xl backdrop-blur-md border border-white/20 min-w-[320px]">
                <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
                    <h1 className="text-xl font-extrabold text-slate-800 uppercase tracking-tighter">
                        Hệ thống Cảnh báo AI
                    </h1>
                </div>

                <hr className="border-slate-200" />

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-500">Trạng thái:</span>
                        <span className={`text-xs font-bold px-3 py-1 rounded-lg ${connectionStatus === "Trực tuyến" ? "bg-emerald-100 text-emerald-700" :
                            connectionStatus === "Đang tải" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
                            }`}>
                            {connectionStatus.toUpperCase()}
                        </span>
                    </div>

                    <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-500">Dữ liệu mới nhất:</span>
                        <span className="text-lg font-mono font-bold text-indigo-600">{lastUpdated}</span>
                    </div>
                </div>

                <div className="mt-2 space-y-2 border-t pt-4">
                    <div className="flex items-center justify-between text-xs font-medium">
                        <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-[#dc2626]" /> <span>Rất cao</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-[#f97316]" /> <span>Cao</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-[#facc15]" /> <span>Trung bình</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 🗺️ Khung Bản đồ Leaflet */}
            <MapContainer
                center={[22.615, 103.718]}
                zoom={12}
                className="h-full w-full z-0"
                zoomControl={false}
            >
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; OpenStreetMap contributors &copy; CARTO'
                />

                {heatmapData.length > 0 ? (
                    // Cú pháp mới siêu gọn gàng cho Component nhà làm
                    <HeatmapLayer
                        points={heatmapData}
                        options={{
                            radius: 25,
                            blur: 15,
                            maxZoom: 18,
                            gradient: {
                                0.3: '#3b82f6', // Xanh dương
                                0.5: '#facc15', // Vàng
                                0.7: '#f97316', // Cam
                                1.0: '#dc2626'  // Đỏ
                            }
                        }}
                    />
                ) : (
                    connectionStatus === "Đang tải" && (
                        <div className="absolute inset-0 z-[2000] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
                            <div className="text-white font-bold animate-bounce">Đang khởi tạo bản đồ AI...</div>
                        </div>
                    )
                )}
            </MapContainer>
        </div>
    );
};

export default RealtimeHeatmap;