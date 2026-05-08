import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

type MessageHandler = (data: any) => void;

class WebSocketService {
  private client: Client | null = null;
  private handlers: Map<string, MessageHandler[]> = new Map();

  connect(token: string) {
    // Lưu ý: SockJS dùng link http/https thay vì ws/wss như websocket thuần
    const wsUrl = process.env.NEXT_PUBLIC_API_URL 
        ? process.env.NEXT_PUBLIC_API_URL.replace('/api', '/ws-guardbatxat') 
        : "http://localhost:8080/ws-guardbatxat";

    this.client = new Client({
      // Dùng SockJS làm lớp bọc an toàn
      webSocketFactory: () => new SockJS(wsUrl),
      connectHeaders: {
        Authorization: `Bearer ${token}`
      },
      debug: (str) => {
        // Log ẩn: bạn có thể mở ra để xem dữ liệu chạy ngầm nếu cần
        // console.log('📡 [STOMP]: ' + str);
      },
      reconnectDelay: 5000, // Tự động gọi lại sau 5s nếu mất mạng
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    // Khi kết nối thành công tới Spring Boot
    this.client.onConnect = (frame) => {
      console.log("✅ Đã kết nối WebSocket (STOMP) thành công!");
      
      // Đăng ký lắng nghe kênh /topic/alerts (Nơi Ban chỉ huy phát loa)
      this.client?.subscribe('/topic/alerts', (message) => {
        if (message.body) {
          const data = JSON.parse(message.body);
          this.handleMessage(data); 
        }
      });
    };

    // Khi rớt mạng hoặc lỗi giao thức
    this.client.onStompError = (frame) => {
      console.error('❌ Lỗi kết nối STOMP: ' + frame.headers['message']);
    };

    // Kích hoạt kết nối
    this.client.activate();
  }

  // Điều phối tin nhắn tới các màn hình
  private handleMessage(message: { type: string; [key: string]: any }) {
    const handlers = this.handlers.get(message.type);
    if (handlers) {
      handlers.forEach((handler) => handler(message));
    }
  }

  // Màn hình đăng ký lắng nghe sự kiện
  on(eventType: string, handler: MessageHandler) {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  // Hủy lắng nghe
  off(eventType: string, handler: MessageHandler) {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  // Hàm gửi (nếu Frontend cần đẩy data ngược lại qua WS)
  send(destination: string, body: any) {
    if (this.client && this.client.connected) {
      this.client.publish({ destination, body: JSON.stringify(body) });
    } else {
      console.warn("⚠️ WebSocket chưa kết nối, không thể gửi tin nhắn");
    }
  }

  // Ngắt kết nối khi chuyển trang hoặc đóng trình duyệt
  disconnect() {
    if (this.client) {
      this.client.deactivate();
      this.client = null;
    }
    this.handlers.clear();
    console.log("🔌 Đã ngắt kết nối WebSocket");
  }
}

export const websocket = new WebSocketService();
export default websocket;