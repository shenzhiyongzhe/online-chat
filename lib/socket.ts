import { io, Socket } from "socket.io-client";
import { SocketEvents } from "../types";

class SocketService {
  private socket: Socket | null = null;
  private url: string;

  constructor() {
    this.url =
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      (typeof window !== "undefined"
        ? window.location.origin // 使用当前页面的端口
        : "http://localhost:4000");
  }

  connect(): Socket {
    if (this.socket?.connected) {
      console.log("🔌 WebSocket 已连接，返回现有连接");
      return this.socket;
    }

    if (this.socket && !this.socket.connected) {
      console.log("🔌 WebSocket 存在但未连接，尝试重连");
      this.socket.connect();
      return this.socket;
    }

    // 如果socket存在但已断开，先清理
    if (this.socket) {
      console.log("🔌 清理旧的WebSocket连接");
      this.socket.removeAllListeners();
      this.socket = null;
    }

    // 确保只在客户端环境初始化Socket
    if (typeof window === "undefined") {
      throw new Error("Socket can only be initialized on the client side");
    }

    console.log("🔌 尝试连接到 WebSocket:", this.url);
    console.log("🔌 完整连接 URL:", `${this.url}/api/socket`);
    console.log(
      "🔌 当前页面URL:",
      typeof window !== "undefined" ? window.location.origin : "N/A"
    );

    this.socket = io(this.url, {
      path: "/api/socket",
      transports: ["polling", "websocket"], // 优先使用websocket
      autoConnect: true,
      forceNew: false, // 不强制创建新连接
      timeout: 20000,
      reconnection: true, // 启用自动重连
      reconnectionAttempts: 5, // 最多重连5次
      reconnectionDelay: 1000, // 重连延迟1秒
      reconnectionDelayMax: 5000, // 最大重连延迟5秒
      upgrade: true, // 允许升级到websocket
      rememberUpgrade: true, // 记住升级状态
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

    this.socket.on("reconnect", (attemptNumber) => {
      console.log("🔄 WebSocket 重连成功，尝试次数:", attemptNumber);
    });

    this.socket.on("reconnect_attempt", (attemptNumber) => {
      console.log("🔄 WebSocket 重连尝试:", attemptNumber);
    });

    this.socket.on("reconnect_error", (error) => {
      console.error("❌ WebSocket 重连失败:", error);
    });

    this.socket.on("reconnect_failed", () => {
      console.error("❌ WebSocket 重连彻底失败");
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

  // Emit with socket.io acknowledgement support. Returns a Promise that resolves
  // with the ack response or rejects on timeout/error.
  emitWithAck<K extends keyof SocketEvents>(
    event: K,
    ...args: [...Parameters<SocketEvents[K]>, number?]
  ): Promise<any> {
    if (!this.socket) return Promise.reject(new Error("Socket not connected"));

    // Optional timeout (ms) can be passed as last arg
    let timeoutMs: number | undefined;
    const last = args[args.length - 1];
    if (typeof last === "number") {
      timeoutMs = last as number;
      args = args.slice(0, -1) as [...Parameters<SocketEvents[K]>];
    }

    return new Promise((resolve, reject) => {
      try {
        const sock = this.socket as Socket;
        if (timeoutMs) {
          sock
            .timeout(timeoutMs)
            .emit(event as string, ...(args as any), (err: any, res: any) => {
              if (err) return reject(err);
              resolve(res);
            });
        } else {
          sock.emit(event as string, ...(args as any), (res: any) => {
            resolve(res);
          });
        }
      } catch (err) {
        reject(err);
      }
    });
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
