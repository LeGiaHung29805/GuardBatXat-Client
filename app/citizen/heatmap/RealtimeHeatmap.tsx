"use client";

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import 'leaflet/dist/leaflet.css';

import { HeatmapPoint, toHeatmapArray } from '@/lib/Model';
import { ApiClient } from '@/lib/ApiClient';

// Tắt SSR cho Leaflet components
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const HeatmapLayer = dynamic(() => import('@/components/ui/HeatmapLayer'), { ssr: false });

const RealtimeHeatmap = () => {
    const [points, setPoints] = useState<[number, number, number][]>([]);
    const [lastUpdated, setLastUpdated] = useState<string>("Chưa có dữ liệu");
    const [connectionStatus, setConnectionStatus] = useState<"Đang tải" | "Trực tuyến" | "Mất kết nối">("Đang tải");
    const [isDemoData, setIsDemoData] = useState<boolean>(false);
    const [isMounted, setIsMounted] = useState(false);
    const stompClientRef = useRef<Client | null>(null);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (!isMounted) return;

        // 1. LẤY DỮ LIỆU BAN ĐẦU QUA APICLIENT
        const initData = async () => {
            try {
                const data = await ApiClient.getInitialLandslideData();
                
                // Chuyển đổi dữ liệu về dạng mảng [lat, lng, weight]
                let formattedData: [number, number, number][] = [];
                
                if (Array.isArray(data) && data.length > 0) {
                    formattedData = data.map(point => {
                        if (Array.isArray(point)) {
                            // Nếu là mảng [lat, lng, weight]
                            return [point[0], point[1], point[2] || 0.5];
                        } else if (point && typeof point === 'object') {
                            // Nếu là object { lat, lng, weight }
                            return [point.lat, point.lng, point.weight || 0.5];
                        }
                        return [22.6105, 103.8012, 0.5];
                    });
                    setIsDemoData(false);
                } else {
                    // Dữ liệu mặc định
                    formattedData = [
                        [22.6105, 103.8012, 0.5],
                        [22.615, 103.805, 0.3],
                        [22.608, 103.798, 0.7],
                    ];
                    setIsDemoData(true);
                }
                
                setPoints(formattedData);
                setLastUpdated(new Date().toLocaleTimeString('vi-VN'));
                setConnectionStatus("Trực tuyến");
            } catch (error) {
                console.error("Error loading heatmap data:", error);
                setConnectionStatus("Mất kết nối");
                // Set default data
                setPoints([
                    [22.6105, 103.8012, 0.5],
                    [22.615, 103.805, 0.3],
                    [22.608, 103.798, 0.7],
                ]);
                setIsDemoData(true);
            }
        };

        initData();

        // 2. THIẾT LẬP KẾT NỐI WEBSOCKET
        const socketUrl = typeof window !== 'undefined' ? `${window.location.origin}/ws` : 'http://localhost:8080/ws-guardbatxat';
        const socket = new SockJS(socketUrl);
        const client = new Client({
            webSocketFactory: () => socket,
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
            onConnect: () => {
                setConnectionStatus("Trực tuyến");
                console.log("🟢 WebSocket Connected");

                // Đăng ký kênh cập nhật sạt lở kết hợp
                client.subscribe('/topic/heatmap-updates', (message) => {
                    try {
                        const newData: any = JSON.parse(message.body);
                        let formattedData: [number, number, number][] = [];
                        
                        if (Array.isArray(newData)) {
                            formattedData = newData.map(point => {
                                if (Array.isArray(point)) {
                                    return [point[0], point[1], point[2] || 0.5];
                                } else if (point && typeof point === 'object') {
                                    return [point.lat, point.lng, point.weight || 0.5];
                                }
                                return [22.6105, 103.8012, 0.5];
                            });
                        }
                        
                        if (formattedData.length > 0) {
                            setPoints(formattedData);
                            setIsDemoData(false);
                            setLastUpdated(new Date().toLocaleTimeString('vi-VN'));
                        }
                    } catch (err) {
                        console.error("Error parsing WebSocket message:", err);
                    }
                });

                // Đăng ký kênh cập nhật ngập lụt (tải lại bản đồ kép kết hợp mới nhất từ API)
                client.subscribe('/topic/flood-updates', async () => {
                    try {
                        const data = await ApiClient.getInitialLandslideData();
                        let formattedData: [number, number, number][] = [];
                        if (Array.isArray(data) && data.length > 0) {
                            formattedData = data.map(point => {
                                if (Array.isArray(point)) {
                                    return [point[0], point[1], point[2] || 0.5];
                                } else if (point && typeof point === 'object') {
                                    return [point.lat, point.lng, point.weight || 0.5];
                                }
                                return [22.6105, 103.8012, 0.5];
                            });
                            setPoints(formattedData);
                            setIsDemoData(false);
                            setLastUpdated(new Date().toLocaleTimeString('vi-VN'));
                        }
                    } catch (err) {
                        console.error("Error refetching combined data on flood update:", err);
                    }
                });
            },
            onStompError: (frame) => {
                console.error('Broker reported error: ' + frame.headers['message']);
                setConnectionStatus("Mất kết nối");
            },
            onWebSocketClose: () => {
                console.log("🔴 WebSocket Disconnected");
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

    if (!isMounted) return null;

    return (
        <div className="relative h-full min-h-0 w-full">
            {/* Bảng điều khiển nổi */}
            <div className="absolute left-6 top-6 z-[1000] flex flex-col gap-3 rounded-2xl bg-white/90 p-6 shadow-2xl backdrop-blur-md border border-white/20 min-w-[320px]">
                <div className="flex items-center gap-3">
                    <div className={`h-3 w-3 rounded-full ${connectionStatus === "Trực tuyến" ? "bg-green-500 animate-pulse" : connectionStatus === "Đang tải" ? "bg-yellow-500" : "bg-red-500"}`} />
                    <h1 className="text-xl font-extrabold text-slate-800 uppercase tracking-tighter">
                        Hệ thống Cảnh báo AI
                    </h1>
                </div>

                <hr className="border-slate-200" />

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-500">Trạng thái:</span>
                        <span className={`text-xs font-bold px-3 py-1 rounded-lg ${
                            connectionStatus === "Trực tuyến" ? "bg-emerald-100 text-emerald-700" :
                            connectionStatus === "Đang tải" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
                        }`}>
                            {connectionStatus.toUpperCase()}
                        </span>
                    </div>

                    <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-500">Dữ liệu mới nhất:</span>
                        <span className="text-lg font-mono font-bold text-indigo-600">{lastUpdated}</span>
                    </div>
                    {isDemoData && (
                        <div className="bg-amber-100 border border-amber-200 text-amber-800 text-[11px] rounded-lg p-2 font-medium mt-1 leading-relaxed">
                            ⚠️ Đang hiển thị dữ liệu mô phỏng/demo (chưa kết nối CSDL GIS thực tế).
                        </div>
                    )}
                </div>

                <div className="mt-2 space-y-2 border-t pt-4">
                    {/* Thêm class text-slate-700 vào đây để đổi màu chữ thành xám đậm */}
                    <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                        <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-[#dc2626]" /> <span>Rất cao (&gt;0.8)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-[#f97316]" /> <span>Cao (0.6-0.8)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-[#facc15]" /> <span>TB (0.4-0.6)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-[#3b82f6]" /> <span>Thấp (&lt;0.4)</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bản đồ Leaflet */}
            <MapContainer
                center={[22.615, 103.718]}
                zoom={12}
                className="h-full w-full z-0"
                zoomControl={false}
            >
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; CARTO'
                />

                {points.length > 0 && (
                    <HeatmapLayer
                        points={points}
                        options={{
                            radius: 25,
                            blur: 15,
                            maxZoom: 18,
                            minOpacity: 0.3,
                            gradient: {
                                0.3: '#3b82f6',
                                0.5: '#facc15',
                                0.7: '#f97316',
                                0.9: '#dc2626'
                            }
                        }}
                    />
                )}
            </MapContainer>

            {/* Loading overlay */}
            {connectionStatus === "Đang tải" && points.length === 0 && (
                <div className="absolute inset-0 z-[2000] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
                    <div className="text-white font-bold animate-bounce">Đang khởi tạo bản đồ AI...</div>
                </div>
            )}
        </div>
    );
};

export default RealtimeHeatmap;
