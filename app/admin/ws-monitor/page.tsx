'use client';

import { useEffect, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

// Định nghĩa cấu trúc 1 dòng log
interface LogEvent {
    id: number;
    type: 'SUBSCRIBED' | 'MESSAGE' | 'CONNECTED' | 'ERROR';
    channel: string;
    details: string;
    time: string;
}

export default function WebSocketMonitor() {
    const [logs, setLogs] = useState<LogEvent[]>([]);

    // Hàm thêm log mới vào danh sách
    const addLog = (type: LogEvent['type'], channel: string, details: string) => {
        const newLog: LogEvent = {
            id: Date.now(),
            type,
            channel,
            details,
            time: new Date().toLocaleTimeString('vi-VN', { hour12: false }),
        };
        // Đưa log mới lên đầu bảng
        setLogs((prev) => [newLog, ...prev]);
    };

    useEffect(() => {
        // 1. Cấu hình kết nối thẳng vào Spring Boot
        const socket = new SockJS('http://localhost:8080/ws-guardbatxat');
        const stompClient = new Client({
            webSocketFactory: () => socket as any,
            debug: (str) => console.log(str), // In ra console của trình duyệt
            reconnectDelay: 5000,
        });

        stompClient.onConnect = (frame) => {
            addLog('CONNECTED', 'System', 'Đã kết nối thành công tới GuardBatXat Server');

            // 2. Lắng nghe kênh Cảnh báo (Topic)
            stompClient.subscribe('/topic/alerts', (message) => {
                addLog('MESSAGE', '/topic/alerts', message.body);
            });

            // 3. Lắng nghe kênh Cá nhân (Queue)
            stompClient.subscribe('/user/queue/messages', (message) => {
                addLog('MESSAGE', '/user/queue/messages', message.body);
            });

            addLog('SUBSCRIBED', '/topic/alerts', 'Đang lắng nghe loa phường');
        };

        stompClient.onStompError = (frame) => {
            addLog('ERROR', 'System', 'Lỗi Broker: ' + frame.headers['message']);
        };

        // Bắt đầu kết nối
        stompClient.activate();

        // Dọn dẹp khi tắt trang
        return () => {
            stompClient.deactivate();
        };
    }, []);

    // Giao diện (Mô phỏng Dark Mode của Pusher)
    return (
        <div className="min-h-screen bg-[#1a1b26] text-white p-8 font-sans">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold mb-2">GuardBátXát WebSocket Console</h1>
                <p className="text-gray-400 mb-8 flex items-center gap-2">
                    <span className="text-xl"></span> Admin <span className="text-xl ml-4"></span> Nội bộ (Localhost:8080)
                </p>

                {/* Bảng Log */}
                <div className="bg-[#24283b] rounded-lg overflow-hidden border border-gray-700 shadow-xl">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[#1f2335] text-gray-400 uppercase text-xs font-semibold">
                            <tr>
                                <th className="px-6 py-4">Event</th>
                                <th className="px-6 py-4">Details</th>
                                <th className="px-6 py-4 text-right">Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700/50">
                            {logs.map((log) => (
                                <tr key={log.id} className="hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4">
                                        <span
                                            className={`px-3 py-1 text-xs font-bold rounded-full ${log.type === 'MESSAGE'
                                                ? 'bg-purple-900/50 text-purple-400'
                                                : log.type === 'SUBSCRIBED'
                                                    ? 'bg-emerald-900/50 text-emerald-400'
                                                    : log.type === 'CONNECTED'
                                                        ? 'bg-blue-900/50 text-blue-400'
                                                        : 'bg-red-900/50 text-red-400'
                                                }`}
                                        >
                                            {log.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-300">
                                        <span className="font-semibold text-gray-100">Channel:</span> {log.channel}
                                        <br />
                                        <span className="text-gray-400">{log.details}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-gray-400 font-mono">
                                        {log.time}
                                    </td>
                                </tr>
                            ))}
                            {logs.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-6 py-8 text-center text-gray-500 italic">
                                        Đang chờ sự kiện...
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}