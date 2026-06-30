import { Client, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

type MessageHandler = (data: any) => void;

class WebSocketService {
  private client: Client | null = null;
  // Giữ lại cơ chế on() cũ
  private handlers: Map<string, MessageHandler[]> = new Map();

  // Cơ chế mới: Quản lý các topic STOMP động
  private activeSubscriptions: Map<string, StompSubscription> = new Map();
  private pendingSubscriptions: Map<string, MessageHandler> = new Map();

  connect(token: string) {
    const wsUrl = process.env.NEXT_PUBLIC_API_URL
      ? process.env.NEXT_PUBLIC_API_URL.replace('/api', '/ws-guardbatxat')
      : "http://localhost:8080/ws-guardbatxat";

    this.client = new Client({
      webSocketFactory: () => new SockJS(`${window.location.origin}/ws`),
      connectHeaders: {
        Authorization: `Bearer ${token}`
      },
      debug: (str) => {
        // console.log('📡 [STOMP]: ' + str);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    this.client.onConnect = (frame) => {
      console.log("✅ Đã kết nối WebSocket (STOMP) thành công!");

      // Đăng ký cứng kênh cũ để tương thích ngược
      this.client?.subscribe('/topic/alerts', (message) => {
        if (message.body) {
          try {
            const data = JSON.parse(message.body);
            this.handleMessage(data);
          } catch (e) { }
        }
      });

      // Đăng ký các topic đang chờ (do component gọi subscribe trước khi kết nối xong)
      this.pendingSubscriptions.forEach((handler, destination) => {
        this.doSubscribe(destination, handler);
      });
      this.pendingSubscriptions.clear();
    };

    this.client.onStompError = (frame) => {
      console.error('❌ Lỗi kết nối STOMP: ' + frame.headers['message']);
    };

    this.client.activate();
  }

  // --- CƠ CHẾ MỚI: DÀNH CHO CÁC TOPIC BẤT KỲ (NHƯ /topic/emergency) ---
  subscribe(destination: string, handler: MessageHandler) {
    if (this.client && this.client.connected) {
      this.doSubscribe(destination, handler);
    } else {
      // Lưu lại chờ kết nối xong sẽ subscribe
      this.pendingSubscriptions.set(destination, handler);
    }
  }

  unsubscribe(destination: string) {
    if (this.activeSubscriptions.has(destination)) {
      this.activeSubscriptions.get(destination)?.unsubscribe();
      this.activeSubscriptions.delete(destination);
    }
    this.pendingSubscriptions.delete(destination);
  }

  private doSubscribe(destination: string, handler: MessageHandler) {
    if (!this.client || this.activeSubscriptions.has(destination)) return;

    const subscription = this.client.subscribe(destination, (message) => {
      if (message.body) {
        try {
          const data = JSON.parse(message.body);
          handler(data);
        } catch (e) {
          console.error(`Lỗi parse JSON từ ${destination}:`, e);
          handler(message.body); // Trả về text thô nếu không phải JSON
        }
      }
    });

    this.activeSubscriptions.set(destination, subscription);
  }

  // --- CƠ CHẾ CŨ (Tương thích với mã nguồn hiện tại) ---
  private handleMessage(message: { type: string;[key: string]: any }) {
    const handlers = this.handlers.get(message.type);
    if (handlers) {
      handlers.forEach((handler) => handler(message));
    }
  }

  on(eventType: string, handler: MessageHandler) {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  off(eventType: string, handler: MessageHandler) {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  send(destination: string, body: any) {
    if (this.client && this.client.connected) {
      this.client.publish({ destination, body: JSON.stringify(body) });
    } else {
      console.warn("⚠️ WebSocket chưa kết nối, không thể gửi tin nhắn");
    }
  }

  disconnect() {
    if (this.client) {
      this.client.deactivate();
      this.client = null;
    }
    this.handlers.clear();
    this.activeSubscriptions.clear();
    this.pendingSubscriptions.clear();
    console.log("🔌 Đã ngắt kết nối WebSocket");
  }
}

export const websocket = new WebSocketService();
export default websocket;