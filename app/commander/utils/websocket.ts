import { Client, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

type MessageHandler = (data: any) => void;

class WebSocketService {
  private client: Client | null = null;
  // Giữ lại cơ chế on() cũ
  private handlers: Map<string, MessageHandler[]> = new Map();

  // Cơ chế mới: Quản lý các topic STOMP động
  private activeSubscriptions: Map<string, StompSubscription> = new Map();
  private subscriptionHandlers: Map<string, MessageHandler> = new Map();

  connect(token: string) {
    // GlobalUI và các trang nghiệp vụ dùng chung service này. Không thay client
    // khi một kết nối đang active vì callback onConnect của client cũ có thể
    // chạy sau đó và subscribe nhầm trên client mới chưa kết nối.
    if (this.client?.active) return;

    const client = new Client({
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
    this.client = client;

    client.onConnect = () => {
      if (this.client !== client) return;

      console.log("✅ Đã kết nối WebSocket (STOMP) thành công!");
      // Subscription của kết nối cũ không còn hợp lệ sau reconnect.
      this.activeSubscriptions.clear();

      // Đăng ký cứng kênh cũ để tương thích ngược
      client.subscribe('/topic/alerts', (message) => {
        if (message.body) {
          try {
            const data = JSON.parse(message.body);
            this.handleMessage(data);
          } catch (e) { }
        }
      });

      // Khôi phục toàn bộ topic mong muốn, gồm cả topic được đăng ký trước
      // khi kết nối xong và topic của kết nối trước khi reconnect.
      this.subscriptionHandlers.forEach((handler, destination) => {
        this.doSubscribe(destination, handler, client);
      });
    };

    client.onStompError = (frame) => {
      console.error('❌ Lỗi kết nối STOMP: ' + frame.headers['message']);
    };

    client.onWebSocketClose = () => {
      if (this.client === client) {
        this.activeSubscriptions.clear();
      }
    };

    client.activate();
  }

  // --- CƠ CHẾ MỚI: DÀNH CHO CÁC TOPIC BẤT KỲ (NHƯ /topic/emergency) ---
  subscribe(destination: string, handler: MessageHandler) {
    this.subscriptionHandlers.set(destination, handler);
    if (this.client && this.client.connected) {
      this.doSubscribe(destination, handler);
    }
  }

  unsubscribe(destination: string) {
    if (this.activeSubscriptions.has(destination)) {
      this.activeSubscriptions.get(destination)?.unsubscribe();
      this.activeSubscriptions.delete(destination);
    }
    this.subscriptionHandlers.delete(destination);
  }

  private doSubscribe(
    destination: string,
    handler: MessageHandler,
    client: Client | null = this.client,
  ) {
    if (
      !client?.connected
      || this.client !== client
      || this.activeSubscriptions.has(destination)
    ) return;

    const subscription = client.subscribe(destination, (message) => {
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
      void this.client.deactivate();
      this.client = null;
    }
    this.handlers.clear();
    this.activeSubscriptions.clear();
    this.subscriptionHandlers.clear();
    console.log("🔌 Đã ngắt kết nối WebSocket");
  }
}

export const websocket = new WebSocketService();
export default websocket;
