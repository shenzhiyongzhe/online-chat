"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { MessageBubble } from "../../components/chat/MessageBubble";
import { ConversationList } from "../../components/chat/ConversationList";
import { MessageInput } from "../../components/chat/MessageInput";
import { socketService } from "../../lib/socket";
import { generateId } from "../../lib/utils";
import { Message, Conversation, Agent, CurrentUser } from "../../types";
import { MessageNotification } from "../../components/ui/MessageNotification";

export default function AgentChatPage() {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketInitializedRef = useRef(false);

  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  // 移动端侧边栏状态
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // 本地状态管理
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesCountRef = useRef(0);

  const [notifications, setNotifications] = useState<
    Array<{
      id: string;
      message: Message;
      senderName: string;
    }>
  >([]);

  // 自定义昵称模态框相关状态
  const [showDisplayNameModal, setShowDisplayNameModal] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [isSavingDisplayName, setIsSavingDisplayName] = useState(false);

  // 表单查看器模态框相关状态
  const [showFormViewerModal, setShowFormViewerModal] = useState(false);
  const [formData, setFormData] = useState<any>(null);
  const [isLoadingFormData, setIsLoadingFormData] = useState(false);

  // Memoized sorted conversations (unread first, then by time)
  const sortedConversations = useMemo(() => {
    return [...conversations].sort((a, b) => {
      // First sort by unread count (descending)
      if (b.unreadCount !== a.unreadCount) {
        return (b.unreadCount || 0) - (a.unreadCount || 0);
      }
      // Then by last update time (descending)
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [conversations]);

  const updateConversation = (
    conversationId: string,
    updates: Partial<Conversation>
  ) => {
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === conversationId ? { ...conv, ...updates } : conv
      )
    );
  };
  const clearChat = () => {
    // 不要重置 currentUser，只清理聊天相关状态
    setConversations([]);
    setCurrentConversation(null);
    setMessages([]);
    setIsConnected(false);
  };
  // 新增：处理通知点击
  const handleNotificationClick = (notification: {
    message: Message;
    senderName: string;
  }) => {
    // 找到对应的会话
    const targetConversation = conversations.find(
      (c) => c.id === notification.message.conversationId
    );
    if (targetConversation) {
      // Agent 页面使用 handleSelectConversation
      // Client 页面需要切换到该会话
      setCurrentConversation(targetConversation);
      setMessages([]);

      const socket = socketService.getSocket();
      if (socket) {
        socket.emit("messages:get", targetConversation.id);
        socket.emit("messages:read", targetConversation.id);
      }

      // 更新未读数为0
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === targetConversation.id ? { ...conv, unreadCount: 0 } : conv
        )
      );
    }

    // 移除通知
    removeNotification(notification.message.id);
  };

  // 新增：移除通知
  const removeNotification = (notificationId: string) => {
    setNotifications((prev) =>
      prev.filter((n) => n.message.id !== notificationId)
    );
  };

  // 处理打开自定义昵称模态框
  const handleOpenDisplayName = async () => {
    if (!currentConversation) return;

    try {
      const response = await fetch(
        `/api/conversations/${currentConversation.id}/notes`
      );
      const data = await response.json();

      if (data.success) {
        setDisplayName(data.clientDisplayName || "");
        setShowDisplayNameModal(true);
      } else {
        console.error("获取自定义昵称失败:", data.message);
      }
    } catch (error) {
      console.error("获取自定义昵称失败:", error);
    }
  };

  // 处理保存自定义昵称
  const handleSaveDisplayName = async () => {
    if (!currentConversation || !currentUser) return;

    setIsSavingDisplayName(true);
    try {
      const response = await fetch(
        `/api/conversations/${currentConversation.id}/notes`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            clientDisplayName: displayName,
            agentId: currentUser.id,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setShowDisplayNameModal(false);
        // 更新当前会话的自定义昵称
        setCurrentConversation((prev) =>
          prev ? { ...prev, clientDisplayName: displayName } : null
        );
      } else {
        console.error("保存自定义昵称失败:", data.message);
        alert("保存自定义昵称失败: " + data.message);
      }
    } catch (error) {
      console.error("保存自定义昵称失败:", error);
      alert("保存自定义昵称失败");
    } finally {
      setIsSavingDisplayName(false);
    }
  };

  // 处理打开表单查看器
  const handleOpenFormViewer = async () => {
    if (!currentConversation) return;

    setIsLoadingFormData(true);
    setShowFormViewerModal(true);

    try {
      const response = await fetch(
        `/api/client-forms/${currentConversation.id}`
      );
      const data = await response.json();

      if (data.success && data.form) {
        setFormData(data.form);
      } else {
        setFormData(null);
      }
    } catch (error) {
      console.error("获取表单数据失败:", error);
      setFormData(null);
    } finally {
      setIsLoadingFormData(false);
    }
  };

  // 检查用户是否已登录
  useEffect(() => {
    const agentInfo = localStorage.getItem("agentInfo");
    console.log("检查 localStorage agentInfo:", agentInfo);

    if (agentInfo) {
      try {
        const currentUser: CurrentUser = JSON.parse(agentInfo);
        setCurrentUser(currentUser);
        setIsLoading(false);
      } catch (error) {
        console.error("解析用户信息失败:", error);
        // 清除无效的存储数据
        localStorage.removeItem("agentInfo");
        // 跳转到登录页面
        router.push("/admin");
        return;
      }
    } else {
      console.log("没有找到用户信息，跳转到登录页面");
      // 没有找到用户信息，跳转到登录页面
      router.push("/admin");
      return;
    }
  }, [router]);

  // 自动滚动到底部 - 只有当消息数量增加时才滚动
  useEffect(() => {
    if (messages.length > messagesCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      messagesCountRef.current = messages.length;
    }
  }, [messages]);
  // Socket连接逻辑
  useEffect(() => {
    if (!currentUser) return;

    // 防止重复初始化
    if (socketInitializedRef.current) {
      console.log("WebSocket已初始化，跳过重复初始化");
      return;
    }

    console.log("开始建立WebSocket连接，用户ID:", currentUser.id);
    socketInitializedRef.current = true;
    const socket = socketService.connect();

    socket.on("connect", () => {
      console.log("Agent connected to server");
      setIsConnected(true);
      console.log("currentUser", JSON.stringify(currentUser));
      socket.emit("user:login", currentUser);
      socket.emit("agents:list");

      // Fetch conversations from API
      fetch(`/api/conversations?agentId=${currentUser.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            console.log("Loaded conversations:", data.conversations.length);
            setConversations(data.conversations);
          }
        })
        .catch((error) => {
          console.error("Failed to fetch conversations:", error);
        });
    });

    socket.on("disconnect", () => {
      console.log("Agent disconnected from server");
      setIsConnected(false);
    });

    socket.on("message:receive", (message: Message & { tempId?: string }) => {
      console.log("收到新消息:", message);
      // 检查消息是否是当前用户自己发送的
      const isSentByMe = message.senderId === currentUser.id;

      // 使用函数式更新来访问最新的 currentConversation 状态
      setCurrentConversation((currentConv) => {
        const isCurrentConversation =
          currentConv && message.conversationId === currentConv.id;

        // 仅当消息属于当前会话时追加到 messages
        if (isCurrentConversation) {
          setMessages((prev) => {
            // 如果已有相同服务端 id 的消息，直接替换（防止重复）
            const byIdIndex = prev.findIndex((m) => m.id === message.id);
            if (byIdIndex !== -1) {
              const copy = [...prev];
              copy[byIdIndex] = message;
              return copy;
            }

            // 如果服务端带回 tempId，尝试找到本地临时消息并用服务端消息替换
            if (message.tempId) {
              const tempIndex = prev.findIndex((m) => m.id === message.tempId);
              if (tempIndex !== -1) {
                const copy = [...prev];
                copy[tempIndex] = { ...message };
                return copy;
              }
            }

            // 否则追加新消息（对方发来的消息）
            return [...prev, message];
          });

          // 当前会话：更新最后消息，未读数为0
          setConversations((prev) =>
            prev.map((conv) =>
              conv.id === message.conversationId
                ? {
                    ...conv,
                    unreadCount: 0,
                    lastMessage: message.content,
                    lastMessageTime: message.timestamp,
                  }
                : conv
            )
          );

          if (!isSentByMe) {
            try {
              // Use setTimeout to ensure message is fully processed before marking as read
              setTimeout(() => {
                socketService.emit("messages:read", message.conversationId);
              }, 100);
            } catch {}
          }
        }
        // 非当前会话：只有不是自己发的消息才增加未读数
        console.log(
          `isCurrentConversation: ${isCurrentConversation}, isSentByMe: ${isSentByMe}`
        );
        // 显示页面内气泡通知（仅当不是自己发送的消息）
        if (!isCurrentConversation && !isSentByMe) {
          // 不在这里增加unreadCount，因为后端已经会自动增加
          setConversations((prev) =>
            prev.map((conv) =>
              conv.id === message.conversationId
                ? {
                    ...conv,
                    lastMessage: message.content,
                    lastMessageTime: message.timestamp,
                    // unreadCount 由后端自动管理，不需要在这里手动增加
                  }
                : conv
            )
          );
          // Get client name from conversation
          const senderClient = conversations.find(
            (c) => c.clientId === message.senderId
          );
          const senderName =
            senderClient?.clientDisplayName ||
            senderClient?.client?.name ||
            `客户 ${message.senderId}`;

          setNotifications((prev) => {
            if (prev.find((n) => n.message.id === message.id)) {
              return prev;
            }
            return [
              ...prev,
              {
                id: message.id,
                message,
                senderName,
              },
            ];
          });
        }

        return currentConv;
      });
    });

    socket.on(
      "message:status",
      (data: { messageId: string; status: string }) => {
        const { messageId, status } = data;
        console.log("收到消息状态更新:", JSON.stringify(data));
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id === data.messageId) {
              // Don't override read status with delivered status
              if (msg.status === "read" && status === "delivered") {
                console.log(
                  `消息 ${messageId} 已为已读状态，跳过delivered状态更新`
                );
                return msg;
              }
              console.log(
                `更新消息 ${messageId} 状态: ${msg.status} -> ${status}`
              );
              return { ...msg, status: status as any };
            }
            return msg;
          })
        );
      }
    );
    // 监听已读状态更新
    socket.on(
      "messages:read",
      (data: {
        conversationId: string;
        readerId: string;
        timestamp: string;
      }) => {
        console.log("收到已读事件:", data);
        // 更新当前会话中的消息状态
        setMessages((prev) =>
          prev.map((msg) =>
            msg.conversationId === data.conversationId &&
            msg.senderId === currentUser.id &&
            msg.status !== "read"
              ? { ...msg, status: "read" }
              : msg
          )
        );
      }
    );

    // 监听会话未读数更新
    socket.on(
      "conversation:unread",
      (data: { conversationId: string; unreadCount: number }) => {
        console.log("收到会话未读数更新:", data);
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === data.conversationId
              ? { ...conv, unreadCount: data.unreadCount }
              : conv
          )
        );
      }
    );

    // 修改 conversation:created 事件处理
    socket.on("conversation:created", (conversation: Conversation) => {
      console.log("收到新会话:", conversation);

      // 检查conversation是否为null或undefined
      if (!conversation) {
        console.warn("收到空的conversation对象，跳过处理");
        return;
      }

      // 将返回的真实会话插入/替换到会话列表
      setConversations((prev) => {
        const matchedIndex = prev.findIndex(
          (c) =>
            c.agentId === conversation.agentId &&
            c.clientId === conversation.clientId
        );

        if (matchedIndex !== -1) {
          // 用服务器返回的会话替换匹配的临时会话
          return prev.map((c) =>
            c.agentId === conversation.agentId &&
            c.clientId === conversation.clientId
              ? conversation
              : c
          );
        }

        // 否则插入到顶部（去重）
        return [conversation, ...prev.filter((c) => c.id !== conversation.id)];
      });
      setCurrentConversation((cur) => {
        if (
          cur &&
          cur.agentId === conversation.agentId &&
          cur.clientId === conversation.clientId &&
          cur.id !== conversation.id
        ) {
          socketService.emit("messages:get", conversation.id);

          return conversation;
        }
        return cur;
      });
    });

    socket.on("messages:list", (messagesList: Message[]) => {
      console.log("收到历史消息:", messagesList);
      setMessages(messagesList || []);
      // 将对应会话的未读数清零（如果当前正在查看该会话）
      if (messagesList && messagesList.length > 0) {
        const convId = messagesList[0].conversationId;
        updateConversation(convId, { unreadCount: 0 });
      }
    });

    return () => {
      console.log("清理WebSocket连接和事件监听器");
      socket.removeAllListeners(); // Remove all listeners before disconnect
      // 不要在这里断开连接，让Socket.io自己管理连接
      // socket.disconnect();
      socketInitializedRef.current = false; // 重置初始化标志
      clearChat();
    };
  }, [currentUser?.id]); // 只依赖用户ID，避免重复连接

  const handleSendMessage = (content: string) => {
    if (!currentConversation || !currentUser) return;

    // 生成临时 id，用于乐观渲染
    const tempId = generateId();

    const optimistic: Message = {
      id: tempId,
      conversationId: currentConversation.id,
      senderId: currentUser.id,
      content,
      type: "text",
      status: "sending" as any,
      timestamp: new Date().toISOString(),
    } as any;

    // 先乐观渲染
    setMessages((prev) => [...prev, optimistic]);

    // 发送到服务端，携带 tempId
    const payload: any = {
      conversationId: currentConversation.id,
      senderId: currentUser.id,
      content,
      type: "text",
      tempId,
    };

    // 如果 socket 没连上，则直接标记为 failed
    if (!socketService.isConnected()) {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: "failed" } : m))
      );
      return;
    }

    // 使用 socket.io ack 替代本地超时检测
    socketService
      .emitWithAck("message:send", payload, 8000)
      .then((res) => {
        if (res && res.success && res.message) {
          const srvMsg: Message = res.message;
          setMessages((prev) => {
            const idx = prev.findIndex((m) => m.id === tempId);
            if (idx !== -1) {
              const copy = [...prev];
              copy[idx] = srvMsg;
              return copy;
            }
            return [...prev];
          });
        } else {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempId ? { ...m, status: "failed" as any } : m
            )
          );
        }
      })
      .catch((err) => {
        console.error("发送消息 ack 失败:", err);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId ? { ...m, status: "failed" as any } : m
          )
        );
      });

    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === currentConversation.id
          ? {
              ...conv,
              lastMessage: content,
              lastMessageTime: new Date().toISOString(),
              unreadCount: 0, // 发送消息后，当前会话未读数为0
            }
          : conv
      )
    );
  };

  // 重试发送（使用相同 tempId）
  const handleRetryMessage = async (msg: Message) => {
    if (!currentConversation || !currentUser) return;
    const tempId = msg.id;
    // update status to sending
    setMessages((prev) =>
      prev.map((m) =>
        m.id === tempId ? { ...m, status: "sending" as any } : m
      )
    );

    // resend payload with same tempId
    const payload: any = {
      conversationId: msg.conversationId,
      senderId: msg.senderId,
      content: msg.content,
      type: msg.type || "text",
      tempId,
    };

    if (!socketService.isConnected()) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...m, status: "failed" as any } : m
        )
      );
      return;
    }

    try {
      // use ack-based emit; server will return { success, message, tempId }
      const ack: any = await socketService.emitWithAck(
        "message:send",
        payload,
        8000
      );

      if (ack && ack.success && ack.message) {
        const srvMsg = ack.message as Message;
        setMessages((prev) => prev.map((m) => (m.id === tempId ? srvMsg : m)));
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId ? { ...m, status: "failed" as any } : m
          )
        );
      }
    } catch (err) {
      console.error("重试发送失败:", err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...m, status: "failed" as any } : m
        )
      );
    }
  };

  const handleSelectConversation = (conversation: Conversation) => {
    console.log("选择会话:", conversation.id);
    setCurrentConversation(conversation);
    setMessages([]); // 清空当前消息，准备加载历史消息

    // 请求历史消息
    console.log("请求会话历史消息:", conversation.id);
    const socket = socketService.getSocket();
    if (socket) {
      socket.emit("messages:get", conversation.id);
      socket.emit("messages:read", conversation.id);
    }

    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === conversation.id ? { ...conv, unreadCount: 0 } : conv
      )
    );

    // 移动端自动关闭侧边栏
    setIsSidebarOpen(false);
  };

  const getCurrentChatPartner = () => {
    if (!currentConversation || !currentUser) return null;

    // 如果有自定义显示名称，使用自定义名称，否则使用原始名称
    const displayName =
      currentConversation.clientDisplayName ||
      `客户 ${currentConversation.clientId}`;

    return {
      id: currentConversation.clientId,
      name: displayName,
      originalName: `客户 ${currentConversation.clientId}`,
      isOnline: true,
    };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    console.log("currentUser is null");
    return null;
  }

  const chatPartner = getCurrentChatPartner();

  return (
    <div className="h-screen flex bg-gray-100 relative overflow-hidden">
      {/* 左侧会话列表 */}
      <div
        className={`
          w-60 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col
          fixed md:relative h-full z-30
          transition-transform duration-300 ease-in-out
          ${
            isSidebarOpen
              ? "translate-x-0"
              : "-translate-x-full md:translate-x-0"
          }
        `}
      >
        {/* 头部 */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden text-gray-500 hover:text-gray-700 ml-auto"
              aria-label="关闭客户列表"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div className="text-sm text-gray-600 hidden md:block">
            {currentUser.name}
            <div className="hidden md:flex items-center space-x-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  isConnected ? "bg-green-500" : "bg-gray-400"
                }`}
              />
              <span className="text-xs text-gray-500">
                {isConnected ? "已连接" : "连接中..."}
              </span>
            </div>
          </div>
        </div>

        {/* 会话列表 */}
        <div className="flex-1 overflow-y-auto">
          {sortedConversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <p className="text-sm">暂无会话</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {sortedConversations.map((conversation) => {
                const displayName =
                  conversation.clientDisplayName ||
                  conversation.client?.name ||
                  `客户 ${conversation.clientId}`;

                // Format timestamp
                const formatTime = (timestamp: string) => {
                  const date = new Date(timestamp);
                  const now = new Date();
                  const diff = now.getTime() - date.getTime();
                  const minutes = Math.floor(diff / 60000);
                  const hours = Math.floor(diff / 3600000);
                  const days = Math.floor(diff / 86400000);

                  if (minutes < 1) return "刚刚";
                  if (minutes < 60) return `${minutes}分钟前`;
                  if (hours < 24) return `${hours}小时前`;
                  if (days < 7) return `${days}天前`;
                  return date.toLocaleDateString("zh-CN", {
                    month: "short",
                    day: "numeric",
                  });
                };

                return (
                  <div
                    key={conversation.id}
                    onClick={() => handleSelectConversation(conversation)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      currentConversation?.id === conversation.id
                        ? "bg-blue-50 border-l-4 border-blue-500"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-sm font-medium">
                          {displayName.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {displayName}
                          </p>
                          {conversation.unreadCount > 0 && (
                            <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium leading-none text-white bg-red-500 rounded-full flex-shrink-0">
                              {conversation.unreadCount > 99
                                ? "99+"
                                : conversation.unreadCount}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate mt-1">
                          {conversation.lastMessage || "暂无消息"}
                        </p>
                        {conversation.lastMessageTime && (
                          <p className="text-xs text-gray-400 mt-1">
                            {formatTime(conversation.lastMessageTime)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 退出登录按钮 */}
        <div className="border-t border-gray-200 p-4">
          <button
            onClick={() => {
              localStorage.removeItem("agentInfo");
              // 断开 websocket 连接
              const socket = socketService.getSocket();
              if (socket) {
                socket.disconnect();
              }
              router.push("/admin");
            }}
            className="w-full px-4 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
          >
            退出登录
          </button>
        </div>
      </div>

      {/* 移动端遮罩层 */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-500/50  backdrop-blur-sm bg-opacity-50 z-20 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* 移动端展开按钮 */}
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="fixed left-0 top-1/2 -translate-y-1/2 z-10 bg-blue-500 text-white p-2 rounded-r-lg shadow-lg md:hidden hover:bg-blue-600 transition-colors"
          aria-label="展开客户列表"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      )}

      {/* 右侧聊天区域 */}
      <div className="flex-1 flex flex-col w-full md:w-auto min-h-0">
        {currentConversation && chatPartner ? (
          <>
            {/* 聊天头部 */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {chatPartner.name}
                  </h3>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-sm text-gray-500">在线</span>
                    {currentConversation && (
                      <span
                        className="text-xs text-blue-600 ml-2 cursor-pointer"
                        onClick={handleOpenDisplayName}
                      >
                        ✏️ 自定义昵称
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleOpenFormViewer}
                    className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors border border-blue-600"
                    title="查看客户表单"
                  >
                    📋 查看表单
                  </button>
                </div>
              </div>
            </div>

            {/* 消息区域 */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 min-h-0">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <p>开始对话吧...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      isOwn={message.senderId === currentUser.id}
                      senderName={
                        message.senderId === currentUser.id
                          ? currentUser.name
                          : chatPartner.name
                      }
                      onRetry={handleRetryMessage}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* 输入区域 */}
            <div className="flex-shrink-0">
              <MessageInput
                onSendMessage={handleSendMessage}
                disabled={!isConnected}
                placeholder={isConnected ? "输入消息..." : "连接中..."}
                agentId={currentUser?.id}
              />
            </div>
          </>
        ) : (
          /* 欢迎页面 */
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center p-4">
              <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                暂无会话，等待客户发起对话
              </h3>
            </div>
          </div>
        )}
      </div>

      {/* 消息通知 - 堆叠显示 */}
      <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
        {notifications.map((notification, index) => (
          <div
            key={notification.message.id}
            className="pointer-events-auto"
            style={{ marginTop: index > 0 ? "8px" : 0 }}
          >
            <MessageNotification
              message={{
                id: notification.message.id,
                content: notification.message.content,
                senderName: notification.senderName,
                conversationId: notification.message.conversationId,
                timestamp: notification.message.timestamp,
              }}
              onClose={() => removeNotification(notification.message.id)}
              onClick={() => handleNotificationClick(notification)}
            />
          </div>
        ))}
      </div>

      {/* 自定义昵称模态框 */}
      {showDisplayNameModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  设置客户自定义昵称
                </h3>
                <button
                  onClick={() => setShowDisplayNameModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  原始名称: {chatPartner?.originalName}
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="请输入自定义昵称..."
                />
                <p className="text-xs text-gray-500 mt-1">留空则使用原始名称</p>
              </div>

              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setShowDisplayNameModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveDisplayName}
                  disabled={isSavingDisplayName}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingDisplayName ? "保存中..." : "保存"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 表单查看器模态框 */}
      {showFormViewerModal && (
        <div className="fixed inset-0 bg-gray-500/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">客户申请表</h3>
                <button
                  onClick={() => setShowFormViewerModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              {isLoadingFormData ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600">加载中...</span>
                </div>
              ) : !formData || !formData.isCompleted ? (
                <div className="text-center py-12 text-gray-500">
                  <p>客户尚未填写表单</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {formData.name && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <label className="text-xs text-gray-500">姓名</label>
                        <p className="text-sm font-medium text-gray-900">
                          {formData.name}
                        </p>
                      </div>
                    )}
                    {formData.city && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <label className="text-xs text-gray-500">
                          城市区镇
                        </label>
                        <p className="text-sm font-medium text-gray-900">
                          {formData.city}
                        </p>
                      </div>
                    )}
                    {formData.phone && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <label className="text-xs text-gray-500">
                          手机号码
                        </label>
                        <p className="text-sm font-medium text-gray-900">
                          {formData.phone}
                        </p>
                      </div>
                    )}
                    {formData.loanAmount && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <label className="text-xs text-gray-500">
                          要借多少
                        </label>
                        <p className="text-sm font-medium text-gray-900">
                          {formData.loanAmount}
                        </p>
                      </div>
                    )}
                    {formData.ageGender && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <label className="text-xs text-gray-500">
                          性别几岁
                        </label>
                        <p className="text-sm font-medium text-gray-900">
                          {formData.ageGender}
                        </p>
                      </div>
                    )}
                    {formData.jobPosition && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <label className="text-xs text-gray-500">
                          工作岗位
                        </label>
                        <p className="text-sm font-medium text-gray-900">
                          {formData.jobPosition}
                        </p>
                      </div>
                    )}
                    {formData.jobDuration && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <label className="text-xs text-gray-500">
                          做了多久
                        </label>
                        <p className="text-sm font-medium text-gray-900">
                          {formData.jobDuration}
                        </p>
                      </div>
                    )}
                    {formData.monthlyIncome && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <label className="text-xs text-gray-500">
                          月入多少
                        </label>
                        <p className="text-sm font-medium text-gray-900">
                          {formData.monthlyIncome}
                        </p>
                      </div>
                    )}
                    {formData.payday && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <label className="text-xs text-gray-500">
                          发工资日
                        </label>
                        <p className="text-sm font-medium text-gray-900">
                          {formData.payday}
                        </p>
                      </div>
                    )}
                    {formData.housingDuration && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <label className="text-xs text-gray-500">
                          住房多久
                        </label>
                        <p className="text-sm font-medium text-gray-900">
                          {formData.housingDuration}
                        </p>
                      </div>
                    )}
                    {formData.rent && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <label className="text-xs text-gray-500">
                          租金多少
                        </label>
                        <p className="text-sm font-medium text-gray-900">
                          {formData.rent}
                        </p>
                      </div>
                    )}
                    {formData.livingWith && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <label className="text-xs text-gray-500">
                          跟谁同住
                        </label>
                        <p className="text-sm font-medium text-gray-900">
                          {formData.livingWith}
                        </p>
                      </div>
                    )}
                    {formData.maritalStatus && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <label className="text-xs text-gray-500">
                          婚姻状况
                        </label>
                        <p className="text-sm font-medium text-gray-900">
                          {formData.maritalStatus}
                        </p>
                      </div>
                    )}
                    {formData.hasChildren && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <label className="text-xs text-gray-500">
                          有无子女
                        </label>
                        <p className="text-sm font-medium text-gray-900">
                          {formData.hasChildren}
                        </p>
                      </div>
                    )}
                    {formData.creditStatus && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <label className="text-xs text-gray-500">
                          征信情况
                        </label>
                        <p className="text-sm font-medium text-gray-900">
                          {formData.creditStatus}
                        </p>
                      </div>
                    )}
                    {formData.loanPurpose && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <label className="text-xs text-gray-500">
                          借款用途
                        </label>
                        <p className="text-sm font-medium text-gray-900">
                          {formData.loanPurpose}
                        </p>
                      </div>
                    )}
                    {formData.hasProperty && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <label className="text-xs text-gray-500">
                          有无房车
                        </label>
                        <p className="text-sm font-medium text-gray-900">
                          {formData.hasProperty}
                        </p>
                      </div>
                    )}
                    {formData.emptyLoan && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <label className="text-xs text-gray-500">
                          借空放没
                        </label>
                        <p className="text-sm font-medium text-gray-900">
                          {formData.emptyLoan}
                        </p>
                      </div>
                    )}
                    {formData.sesameCredit && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <label className="text-xs text-gray-500">
                          芝麻信用
                        </label>
                        <p className="text-sm font-medium text-gray-900">
                          {formData.sesameCredit}
                        </p>
                      </div>
                    )}
                    {formData.phoneModel && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <label className="text-xs text-gray-500">
                          手机型号
                        </label>
                        <p className="text-sm font-medium text-gray-900">
                          {formData.phoneModel}
                        </p>
                      </div>
                    )}
                  </div>
                  {formData.description && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <label className="text-xs text-gray-500">描述情况</label>
                      <p className="text-sm font-medium text-gray-900 whitespace-pre-wrap">
                        {formData.description}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
