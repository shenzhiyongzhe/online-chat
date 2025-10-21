import { io, Socket } from "socket.io-client";
import { SocketEvents } from "../types";

class SocketService {
  private socket: Socket | null = null;
  private url: string;

  constructor() {
    this.url =
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      (typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:3000");
  }

  connect(): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    // 确保只在客户端环境初始化Socket
    if (typeof window === "undefined") {
      throw new Error("Socket can only be initialized on the client side");
    }

    console.log("🔌 尝试连接到 WebSocket:", this.url);
    console.log("🔌 完整连接 URL:", `${this.url}/api/socket`);

    this.socket = io(this.url, {
      path: "/api/socket",
      transports: ["polling", "websocket"], // 先尝试轮询
      autoConnect: true,
      forceNew: true,
      timeout: 20000,
    });

    // 添加连接事件监听
    this.socket.on("connect", () => {
      console.log("✅ WebSocket 连接成功");
    });

    this.socket.on("connect_error", (error) => {
      console.error("❌ WebSocket 连接失败:", error);
    });

    this.socket.on("disconnect", (reason) => {
      console.log("🔌 WebSocket 断开连接:", reason);
    });

    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  emit<K extends keyof SocketEvents>(
    event: K,
    ...args: Parameters<SocketEvents[K]>
  ): void {
    if (this.socket) {
      this.socket.emit(event, ...args);
    }
  }

  on<K extends keyof SocketEvents>(event: K, callback: SocketEvents[K]): void {
    if (this.socket) {
      this.socket.on(event as string, callback as any);
    }
  }

  off<K extends keyof SocketEvents>(
    event: K,
    callback?: SocketEvents[K]
  ): void {
    if (this.socket) {
      this.socket.off(event as string, callback as any);
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const socketService = new SocketService();
