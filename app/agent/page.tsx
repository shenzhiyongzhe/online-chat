"use client";

import { useState, useEffect, useRef } from "react";
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
  const [clients, setClients] = useState<any[]>([]);

  const [notifications, setNotifications] = useState<
    Array<{
      id: string;
      message: Message;
      senderName: string;
    }>
  >([]);

  // 本地状态管理函数
  const setConnected = (connected: boolean) => {
    setIsConnected(connected);
  };

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
    setClients([]);
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

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  // Socket连接逻辑
  useEffect(() => {
    if (!currentUser || isLoading) return;

    const socket = socketService.connect();

    socket.on("connect", () => {
      console.log("Agent connected to server");
      setIsConnected(true);
      setConnected(true);
      console.log("currentUser", JSON.stringify(currentUser));
      socket.emit("user:login", currentUser);
      socket.emit("agents:list");
      socket.emit("clients:list");
    });

    socket.on("disconnect", () => {
      console.log("Agent disconnected from server");
      setIsConnected(false);
      setConnected(false);
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
              socketService.emit("messages:read", message.conversationId);
            } catch {}
          }
        }
        // 非当前会话：只有不是自己发的消息才增加未读数
        console.log(
          `isCurrentConversation: ${isCurrentConversation}, isSentByMe: ${isSentByMe}`
        );
        // 显示页面内气泡通知（仅当不是自己发送的消息）
        if (!isCurrentConversation && !isSentByMe) {
          setConversations((prev) =>
            prev.map((conv) =>
              conv.id === message.conversationId
                ? {
                    ...conv,
                    lastMessage: message.content,
                    lastMessageTime: message.timestamp,
                    unreadCount: (conv.unreadCount || 0) + 1,
                  }
                : conv
            )
          );
          setClients((currentClients) => {
            const senderClient = currentClients.find(
              (c) => c.clientId === message.senderId
            );
            const senderName = senderClient?.name || "未知客户";

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

            return currentClients;
          });
        }

        return currentConv;
      });
    });

    socket.on("message:status", (messageId: string, status: string) => {
      console.log("收到消息状态更新:", messageId, status);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, status: status as any } : msg
        )
      );
    });
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

    socket.on("clients:list", (clientsList: any[]) => {
      console.log("收到客户列表:", clientsList);
      setClients(clientsList);
    });

    socket.on("conversation:created", (conversation: Conversation) => {
      console.log("收到新会话:", conversation);

      // 检查conversation是否为null或undefined
      if (!conversation) {
        console.warn("收到空的conversation对象，跳过处理");
        return;
      }

      // 将返回的真实会话插入/替换到会话列表：优先按 agentId+clientId 匹配临时会话替换
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
      socket.removeAllListeners(); // Remove all listeners before disconnect
      socket.disconnect();
      clearChat();
    };
  }, [currentUser, isLoading]);

  const handleSendMessage = (content: string) => {
    if (!currentConversation || !currentUser) return;

    // 生成临时 ID
    const tempId = generateId();

    const payload: Omit<Message, "id" | "timestamp" | "status"> & {
      tempId: string;
    } = {
      conversationId: currentConversation.id,
      senderId: currentUser.id,
      content,
      type: "text",
      tempId, // 发送 tempId 给服务端
    };

    socketService.emit("message:send", payload);

    // 乐观添加本地消息
    const newMessage: Message = {
      ...payload,
      id: tempId,
      timestamp: new Date().toISOString(),
      status: "sending",
    };
    setMessages((prev) => [...prev, newMessage]);

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

  const handleSelectConversation = (conversation: Conversation) => {
    setCurrentConversation(conversation);
    setMessages([]); // 清空当前消息，准备加载历史消息

    // 请求历史消息
    console.log("请求会话历史消息:", conversation.id);
    socketService.emit("messages:get", conversation.id);
    socketService.emit("messages:read", conversation.id);

    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === conversation.id ? { ...conv, unreadCount: 0 } : conv
      )
    );

    // 移动端自动关闭侧边栏
    setIsSidebarOpen(false);
  };

  const handleCreateConversationWithClient = (client: any) => {
    if (!currentUser) return;

    const conversationData = {
      type: "agent" as const,
      title: `与 ${client.name} 的对话`,
      agentId: currentUser.id,
      clientId: client.clientId,
    };

    console.log("创建与客户的会话:", conversationData);

    // 检查是否已经存在该会话（包括临时会话）
    const existingConv = conversations.find(
      (c) =>
        c.agentId === conversationData.agentId &&
        c.clientId === conversationData.clientId
    );

    if (existingConv) {
      // 如果会话已存在，直接切换到该会话
      console.log("会话已存在，直接切换:", existingConv.id);
      setCurrentConversation(existingConv);
      setMessages([]);

      const socket = socketService.getSocket();
      if (socket) {
        socket.emit("messages:get", existingConv.id);
        socket.emit("messages:read", existingConv.id);
      }

      // 更新未读数为0
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === existingConv.id ? { ...conv, unreadCount: 0 } : conv
        )
      );
      // 移动端自动关闭侧边栏
      setIsSidebarOpen(false);
      return;
    }

    // 乐观创建：生成临时会话并立即切换到它，改善 UX
    const tempId = generateId();
    const tempConversation: Conversation = {
      id: tempId,
      type: conversationData.type,
      title: conversationData.title,
      agentId: conversationData.agentId,
      clientId: conversationData.clientId,
      lastMessage: "",
      lastMessageTime: new Date().toISOString(),
      unreadCount: 0,
      updatedAt: new Date().toISOString(),
    };
    setConversations((prev) => [
      tempConversation,
      ...prev.filter((c) => c.id !== tempId),
    ]);
    setCurrentConversation(tempConversation);
    setMessages([]);

    socketService.emit("conversation:create", conversationData);

    // 移动端自动关闭侧边栏
    setIsSidebarOpen(false);
  };

  const getCurrentChatPartner = () => {
    if (!currentConversation || !currentUser) return null;
    return {
      id: currentConversation.clientId,
      name: `客户 ${currentConversation.clientId}`,
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
    <div className="h-screen flex bg-gray-100 relative">
      {/* 左侧客户列表 */}
      <div
        className={`
          w-80 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col
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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-semibold text-gray-900">在线客户</h2>
              {/* 移动端关闭按钮 */}
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
            <div className="flex items-center space-x-2 hidden md:flex">
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
          <div className="text-sm text-gray-600 hidden md:block">
            欢迎，{currentUser.name}
          </div>
        </div>

        {/* 客户列表 */}
        <div className="flex-1 overflow-y-auto">
          {clients.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <p className="text-sm">暂无在线客户</p>
            </div>
          ) : (
            <div className="p-2">
              {clients.map((client) => {
                // 找到该客户对应的会话并获取未读数
                const clientConv = conversations.find(
                  (c) => c.clientId === client.clientId
                );
                const clientUnread = clientConv?.unreadCount ?? 0;
                return (
                  <div
                    key={client.clientId}
                    onClick={() => handleCreateConversationWithClient(client)}
                    className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                  >
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {client.name.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {client.name}
                      </p>
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-xs text-gray-500">在线</span>
                      </div>
                    </div>
                    {clientUnread > 0 && (
                      <div className="ml-2">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium leading-none text-white bg-red-500 rounded-full">
                          {clientUnread > 99 ? "99+" : clientUnread}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 会话列表 */}
        {conversations.length > 0 && (
          <div className="border-t border-gray-200">
            <div className="p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                最近会话
              </h3>
            </div>
            <div className="max-h-40 overflow-y-auto">
              {conversations.slice(0, 3).map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => handleSelectConversation(conversation)}
                  className={`p-3 mx-2 rounded-lg cursor-pointer transition-colors ${
                    currentConversation?.id === conversation.id
                      ? "bg-blue-50"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {conversation.title || `客户 ${conversation.clientId}`}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {conversation.lastMessage || "暂无消息"}
                      </p>
                    </div>
                    {conversation.unreadCount &&
                      conversation.unreadCount > 0 && (
                        <div className="mt-1">
                          <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium leading-none text-white bg-red-500 rounded-full">
                            {conversation.unreadCount > 99
                              ? "99+"
                              : conversation.unreadCount}
                          </span>
                        </div>
                      )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 移动端遮罩层 */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
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
      <div className="flex-1 flex flex-col w-full md:w-auto">
        {currentConversation && chatPartner ? (
          <>
            {/* 聊天头部 */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-600">
                    {chatPartner.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {chatPartner.name}
                  </h3>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-sm text-gray-500">在线</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 消息区域 */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
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
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* 输入区域 */}
            <MessageInput
              onSendMessage={handleSendMessage}
              disabled={!isConnected}
              placeholder={isConnected ? "输入消息..." : "连接中..."}
            />
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
                点击客户头像开始聊天
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
    </div>
  );
}
