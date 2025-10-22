import { NextApiRequest, NextApiResponse } from "next";
import { Server as NetServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { initializeApp } from "../../lib/app-init";
import { prisma } from "../../prisma/prisma";
// 内存缓存
const conversations = new Map();
const messages = new Map();

class UserManager {
  private userSocketMap = new Map<string, string>(); // user.id -> socket.id
  private socketUserMap = new Map<string, any>(); // socket.id -> user
  private io: SocketIOServer;

  constructor(io: SocketIOServer) {
    this.io = io;
  }

  // User login
  userLogin(socketId: string, user: any) {
    this.userSocketMap.set(user.id, socketId);
    this.socketUserMap.set(socketId, user);

    // Join user-specific room for reliable message delivery
    const socket = this.io.sockets.sockets.get(socketId);
    if (socket) {
      socket.join(`user:${user.id}`);

      // If admin, join admin monitoring room
      if (user.role === "admin") {
        socket.join("room:admin-monitor");
      }
    }
  }

  // User logout
  userLogout(socketId: string) {
    const user = this.socketUserMap.get(socketId);
    if (user) {
      this.userSocketMap.delete(user.id);
    }
    this.socketUserMap.delete(socketId);
  }

  // Send message to user by room (most reliable)
  sendToUser(userId: string, event: string, data: any) {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  // Get user info by socket ID
  getUserBySocketId(socketId: string) {
    return this.socketUserMap.get(socketId);
  }

  // Check if user is online
  isUserOnline(userId: string) {
    return this.userSocketMap.has(userId);
  }
}

// 从数据库获取客服列表
async function getAgentsFromDatabase() {
  try {
    const agents = await prisma.agent.findMany({
      select: {
        id: true,
        agentId: true,
        name: true,
        avatar: true,
        isOnline: true,
      },
    });
    return agents;
  } catch (error) {
    console.error("从数据库获取客服列表失败:", error);
    // 返回空数组作为降级
    return [];
  }
}

export type NextApiResponseServerIO = NextApiResponse & {
  socket: {
    server: NetServer & {
      io: SocketIOServer;
    };
  };
};

export const config = {
  api: {
    bodyParser: false,
  },
};

// 全局初始化标志
let isServerInitialized = false;

export default async function SocketHandler(
  req: NextApiRequest,
  res: NextApiResponseServerIO
) {
  // 确保每次访问都尝试初始化（如果还没初始化的话）
  if (!isServerInitialized) {
    try {
      console.log("🚀 开始服务器端初始化...");
      await initializeApp();
      isServerInitialized = true;
      console.log("✅ 服务器端初始化完成");
    } catch (error) {
      console.warn("⚠️ 服务器端初始化失败，继续使用内存模式:", error);
      isServerInitialized = true; // 标记为已初始化，避免重复尝试
    }
  } else {
    console.log("ℹ️ 服务器端已初始化，跳过初始化步骤");
  }

  if (res.socket.server.io) {
    console.log("Socket is already running");
    res.end();
    return;
  }

  const io = new SocketIOServer(res.socket.server, {
    path: "/api/socket",
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
    allowEIO3: true,
    pingTimeout: 30000, // 减少ping超时时间
    pingInterval: 10000, // 减少ping间隔，更频繁检测
    connectTimeout: 20000, // 连接超时时间
    upgradeTimeout: 10000, // 升级超时时间
  });

  res.socket.server.io = io;

  const userManager = new UserManager(io);

  io.on("connection", (socket) => {
    console.log("用户连接:", socket.id);

    // 用户登录
    socket.on("user:login", async (user) => {
      console.log("用户登录:" + new Date().toISOString(), user);
      userManager.userLogin(socket.id, user);

      try {
        // 如果是客服，更新数据库中的在线状态
        if (user.role === "agent") {
          // 只处理已存在的客服，不创建新的
          try {
            await prisma.agent.upsert({
              where: { agentId: user.id },
              update: { isOnline: true },
              create: {
                agentId: user.id,
                password: "123456",
                name: user.name,
                isOnline: true,
              },
            });
            console.log(`客服 ${user.name} 上线`);
          } catch (error: any) {
            console.warn(
              `客服 ${user.id} 不存在，跳过数据库更新:`,
              error.message
            );
            // 继续执行，不中断流程
          }
        } else if (user.role === "client") {
          // 创建或更新客户
          await prisma.client.upsert({
            where: { clientId: user.id },
            update: { isOnline: true, name: user.name },
            create: {
              clientId: user.id,
              name: user.name,
              isOnline: true,
            },
          });
          console.log(`客户 ${user.name} 上线`);
        }

        // 从数据库获取客服列表
        const agents = await getAgentsFromDatabase();

        // 如果是客服登录，广播给所有客户端更新客服列表
        if (user.role === "agent") {
          io.emit("agents:list", agents);
        }

        if (user.role === "client") {
          // 如果是客户登录，广播给所有客服更新客户列表
          const onlineClients = await prisma.client.findMany({
            where: { isOnline: true },
            select: {
              id: true,
              clientId: true,
              name: true,
              isOnline: true,
            },
          });
          io.emit("clients:list", onlineClients);
        }
      } catch (error: any) {
        console.error("用户登录处理失败:", error);
        console.error("错误详情:", {
          message: error.message,
          code: error.code,
          meta: error.meta,
        });
        socket.emit("error", { message: "登录失败", details: error.message });
      }
    });

    // 获取会话历史消息
    socket.on("messages:get", async (conversationId: string) => {
      console.log("获取会话历史消息:", conversationId);
      try {
        const messages = await prisma.message.findMany({
          where: { conversationId },
          orderBy: { createdAt: "desc" }, // 按时间倒序，获取最新消息
          take: 100, // 限制返回最近100条消息
          select: {
            id: true,
            conversationId: true,
            senderId: true,
            content: true,
            type: true,
            status: true,
            createdAt: true,
          },
        });

        // 转换时间格式以匹配前端期望，并按时间正序排列
        const formattedMessages = messages
          .map((msg) => ({
            ...msg,
            timestamp: msg.createdAt.toISOString(),
          }))
          .reverse(); // 反转数组，使消息按时间正序显示

        socket.emit("messages:list", formattedMessages);
        console.log(
          `会话 ${conversationId} 的历史消息数量:`,
          formattedMessages.length
        );
      } catch (error) {
        console.error("获取历史消息失败:", error);
        socket.emit("error", { message: "获取历史消息失败" });
      }
    });
    // 发送消息
    socket.on("message:send", async (messageData: any) => {
      console.log("发送消息:", JSON.stringify(messageData));

      try {
        // 校验会话是否存在
        const conv = await prisma.conversation.findUnique({
          where: { id: messageData.conversationId },
          select: { id: true, agentId: true, clientId: true },
        });
        if (!conv) {
          console.warn("目标会话不存在:", messageData.conversationId);
          socket.emit("error", {
            message: "目标会话不存在",
            conversationId: messageData.conversationId,
          });
          return;
        }

        // 在数据库中创建消息
        const created = await prisma.message.create({
          data: {
            conversationId: messageData.conversationId,
            senderId: messageData.senderId,
            content: messageData.content,
            type: messageData.type || "text",
            status: "sent",
          },
        });

        console.log("消息已保存到数据库:", created.id);

        // 也在内存中保存一份（用于快速访问）
        messages.set(created.id, created);

        // 准备发送给客户端的消息对象
        const outgoing = {
          id: created.id,
          conversationId: created.conversationId,
          senderId: created.senderId,
          content: created.content,
          type: created.type,
          status: created.status,
          timestamp: created.createdAt
            ? created.createdAt.toISOString()
            : new Date().toISOString(),
        };

        // 更新会话的最后消息
        await prisma.conversation.update({
          where: { id: messageData.conversationId },
          data: {
            lastMessage: created.content,
            lastMessageTime: created.updatedAt,
          },
        });

        // 发送消息到用户房间
        if (conv.agentId) {
          userManager.sendToUser(conv.agentId, "message:receive", outgoing);
        }
        if (conv.clientId) {
          userManager.sendToUser(conv.clientId, "message:receive", outgoing);
        }

        // 广播到管理员监控房间
        io.to("room:admin-monitor").emit("admin:message", {
          ...outgoing,
          conversation: {
            id: conv.id,
            agentId: conv.agentId,
            clientId: conv.clientId,
          },
        });
        // 更新消息状态为已送达
        setTimeout(async () => {
          try {
            // Check if message is already read before updating to delivered
            const currentMessage = await prisma.message.findUnique({
              where: { id: created.id },
              select: { status: true },
            });

            // Only update to delivered if not already read
            if (currentMessage && currentMessage.status !== "read") {
              await prisma.message.update({
                where: { id: created.id },
                data: { status: "delivered" },
              });

              created.status = "delivered";
              messages.set(created.id, created);

              // Send status update to both users in the conversation
              if (conv.agentId) {
                userManager.sendToUser(conv.agentId, "message:status", [
                  created.id,
                  "delivered",
                ]);
              }
              if (conv.clientId) {
                userManager.sendToUser(conv.clientId, "message:status", [
                  created.id,
                  "delivered",
                ]);
              }
            } else {
              console.log(
                `消息 ${created.id} 已被标记为已读，跳过delivered状态更新`
              );
            }
          } catch (error) {
            console.error("更新消息状态失败:", error);
          }
        }, 1000);
      } catch (error: any) {
        console.error("保存消息失败:", error);
        socket.emit("error", {
          message: "发送消息失败",
          details: error.message,
        });
      }
    });
    socket.on("messages:read", async (conversationId: string) => {
      console.log(
        `messages:read from socket ${socket.id} for conversation ${conversationId}`
      );
      const user = userManager.getUserBySocketId(socket.id);
      try {
        // 更新数据库：把属于该会话且不是当前 reader 发送的、且 status != 'read' 的消息标记为 read
        await prisma.message.updateMany({
          where: {
            conversationId: conversationId,
            senderId: { not: user?.id ?? "" },
            status: { not: "read" },
          },
          data: { status: "read" },
        });

        // 将会话的未读计数置为 0
        try {
          await prisma.conversation.update({
            where: { id: conversationId },
            data: { unreadCount: 0 },
          });
        } catch (err) {
          console.warn("更新会话 unreadCount 失败（可忽略）:", err);
        }

        // 同步内存缓存 messages 与 conversations
        for (const [mid, msg] of messages) {
          if (
            msg.conversationId === conversationId &&
            msg.senderId !== user?.id
          ) {
            msg.status = "read";
            messages.set(mid, msg);
          }
        }
        const conv = conversations.get(conversationId);
        if (conv) {
          conv.unreadCount = 0;
          conversations.set(conversationId, conv);
        }

        // 获取会话信息以通知双方
        const conversation = await prisma.conversation.findUnique({
          where: { id: conversationId },
          select: { agentId: true, clientId: true },
        });

        const readData = {
          conversationId,
          readerId: user?.id ?? null,
          timestamp: new Date().toISOString(),
        };

        // 通知会话的双方用户（通过用户房间）
        if (conversation) {
          if (conversation.agentId) {
            userManager.sendToUser(
              conversation.agentId,
              "messages:read",
              readData
            );
          }
          if (conversation.clientId) {
            userManager.sendToUser(
              conversation.clientId,
              "messages:read",
              readData
            );
          }
        }

        // 向请求方确认
        socket.emit("messages:read:ack", { conversationId });
      } catch (error: any) {
        console.error("处理 messages:read 失败:", error);
        socket.emit("error", {
          message: "标记消息为已读失败",
          details: error?.message ?? String(error),
        });
      }
    });

    // 创建会话
    socket.on("conversation:create", async (conversationData) => {
      console.log("创建会话:", conversationData);

      try {
        const existingConversation = await prisma.conversation.findFirst({
          where: {
            agentId: conversationData.agentId,
            clientId: conversationData.clientId,
          },
        });

        if (existingConversation) {
          // 通知请求者
          socket.emit("conversation:created", existingConversation);
          // 通知会话的双方用户
          userManager.sendToUser(
            conversationData.agentId,
            "conversation:created",
            existingConversation
          );
          userManager.sendToUser(
            conversationData.clientId,
            "conversation:created",
            existingConversation
          );

          console.log("会话已存在，返回已有会话:", existingConversation.id);
          return;
        }
        // 在数据库中创建会话
        const conversation = await prisma.conversation.create({
          data: {
            type: conversationData.type || "agent",
            title: conversationData.title,
            agentId: conversationData.agentId,
            clientId: conversationData.clientId,
            isActive: true,
            lastMessage: "",
            unreadCount: 0,
          },
          include: {
            agent: {
              select: {
                id: true,
                agentId: true,
                name: true,
                avatar: true,
                isOnline: true,
              },
            },
            client: {
              select: {
                id: true,
                clientId: true,
                name: true,
                isOnline: true,
              },
            },
          },
        });

        // 也在内存中保存一份（用于快速访问）
        conversations.set(conversation.id, conversation);

        // 通知请求者
        socket.emit("conversation:created", conversation);

        // 获取请求者的用户信息
        const requester = userManager.getUserBySocketId(socket.id);

        // 通知会话的另一方（排除请求者，避免重复）
        if (conversation.agentId && conversation.agentId !== requester?.id) {
          userManager.sendToUser(
            conversation.agentId,
            "conversation:created",
            conversation
          );
        }
        if (conversation.clientId && conversation.clientId !== requester?.id) {
          userManager.sendToUser(
            conversation.clientId,
            "conversation:created",
            conversation
          );
        }

        console.log("会话创建成功:", conversation.id);
      } catch (error: any) {
        console.error("创建会话失败:", error);
        socket.emit("error", {
          message: "创建会话失败",
          details: error.message,
        });
      }
    });

    // 获取客服列表
    socket.on("agents:list", async () => {
      console.log("获取客服列表");
      try {
        const agents = await getAgentsFromDatabase();
        socket.emit("agents:list", agents);
      } catch (error) {
        console.error("获取客服列表失败:", error);
        socket.emit("error", { message: "获取客服列表失败" });
      }
    });
    // 搜索客服
    socket.on("agent:search", async (query) => {
      console.log("搜索客服:", query);
      try {
        const agent = await prisma.agent.findFirst({
          where: {
            OR: [
              { agentId: { contains: query } },
              { name: { contains: query } },
            ],
          },
          select: {
            id: true,
            agentId: true,
            name: true,
            avatar: true,
            isOnline: true,
          },
        });

        if (agent && agent.isOnline) {
          socket.emit("agent:found", { success: true, agent });
        } else {
          socket.emit("agent:found", {
            success: false,
            message: agent ? "该客服当前离线" : "未找到该客服",
          });
        }
      } catch (error) {
        console.error("搜索客服失败:", error);
        socket.emit("error", { message: "搜索客服失败" });
      }
    });
    // 获取客户列表
    socket.on("clients:list", async () => {
      console.log("获取客户列表");
      try {
        const clients = await prisma.client.findMany({
          where: { isOnline: true },
          select: {
            id: true,
            clientId: true,
            name: true,
            isOnline: true,
          },
        });
        socket.emit("clients:list", clients);
      } catch (error) {
        console.error("获取客户列表失败:", error);
        socket.emit("error", { message: "获取客户列表失败" });
      }
    });

    // 管理员加入监控
    socket.on("admin:join-monitoring", async (user) => {
      console.log("管理员加入监控:", user);
      const socketInstance = io.sockets.sockets.get(socket.id);
      if (socketInstance) {
        socketInstance.join("room:admin-monitor");
      }
    });

    // 获取所有会话列表（管理员用）
    socket.on("admin:get-all-conversations", async () => {
      console.log("管理员获取所有会话");
      try {
        const conversations = await prisma.conversation.findMany({
          where: { isActive: true },
          include: {
            agent: {
              select: {
                id: true,
                agentId: true,
                name: true,
                isOnline: true,
              },
            },
            client: {
              select: {
                id: true,
                clientId: true,
                name: true,
                isOnline: true,
              },
            },
          },
          orderBy: { updatedAt: "desc" },
        });
        socket.emit("admin:conversations", conversations);
      } catch (error) {
        console.error("获取所有会话失败:", error);
        socket.emit("error", { message: "获取会话列表失败" });
      }
    });

    // 获取指定会话的消息（管理员用）
    socket.on("admin:get-room-messages", async (conversationId: string) => {
      console.log("管理员获取会话消息:", conversationId);
      try {
        const messages = await prisma.message.findMany({
          where: { conversationId },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            conversationId: true,
            senderId: true,
            content: true,
            type: true,
            status: true,
            createdAt: true,
          },
        });

        const formattedMessages = messages.map((msg) => ({
          ...msg,
          timestamp: msg.createdAt.toISOString(),
        }));

        socket.emit("admin:messages", {
          conversationId,
          messages: formattedMessages,
        });
      } catch (error) {
        console.error("获取会话消息失败:", error);
        socket.emit("error", { message: "获取消息失败" });
      }
    });
    // 用户断开连接
    socket.on("disconnect", async () => {
      console.log("用户断开连接:", socket.id);
      const user = userManager.getUserBySocketId(socket.id);

      if (user) {
        try {
          // 如果是客服，更新数据库中的离线状态
          if (user.role === "agent") {
            try {
              await prisma.agent.update({
                where: { agentId: user.id },
                data: { isOnline: false },
              });
              console.log(`客服 ${user.name} 离线`);
            } catch (error) {
              console.warn(`客服 ${user.name} 离线状态更新失败:`, error);
            }

            // 从数据库获取最新的客服列表并广播
            const agents = await getAgentsFromDatabase();
            io.emit("agents:list", agents);
          } else if (user.role === "client") {
            // 更新客户离线状态
            await prisma.client.update({
              where: { clientId: user.id },
              data: { isOnline: false },
            });
            console.log(`客户 ${user.name} 离线`);

            // 广播给所有客服更新客户列表
            const onlineClients = await prisma.client.findMany({
              where: { isOnline: true },
              select: {
                id: true,
                clientId: true,
                name: true,
                isOnline: true,
              },
            });
            io.emit("clients:list", onlineClients);
          }
        } catch (error) {
          console.error("用户断开连接处理失败:", error);
        }

        userManager.userLogout(socket.id);
      }
    });
  });

  console.log("Socket server started (fixed version)");
  res.end();
}
