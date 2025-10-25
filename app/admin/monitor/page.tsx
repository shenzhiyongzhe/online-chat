"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, User, Eye, ArrowLeft } from "lucide-react";
import { MessageBubble } from "../../../components/chat/MessageBubble";
import { socketService } from "../../../lib/socket";
import { Message, Conversation, CurrentUser } from "../../../types";

export default function AdminMonitorPage() {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationMessages, setConversationMessages] = useState<
    Record<string, Message[]>
  >({});
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // Auto scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 同步当前选中会话的消息
  useEffect(() => {
    if (selectedConversation) {
      const conversationMessagesList =
        conversationMessages[selectedConversation.id] || [];
      setMessages(conversationMessagesList);
    } else {
      setMessages([]);
    }
  }, [selectedConversation, conversationMessages]);

  // Socket connection and admin setup
  useEffect(() => {
    const socket = socketService.connect();

    socket.on("connect", () => {
      console.log("Admin connected to server");
      setIsConnected(true);

      // Create admin user and join monitoring
      const adminUser: CurrentUser = {
        id: "ADMIN_MONITOR",
        name: "管理员",
        role: "admin",
        isOnline: true,
      };

      socket.emit("user:login", adminUser);
      socket.emit("admin:join-monitoring", adminUser);
      socket.emit("admin:get-all-conversations");
    });

    socket.on("disconnect", () => {
      console.log("Admin disconnected from server");
      setIsConnected(false);
    });

    socket.on("connect_error", (error) => {
      console.error("Admin WebSocket connection error:", error);
      setIsConnected(false);
    });

    // Listen for all conversations
    socket.on("admin:conversations", (conversationsList: Conversation[]) => {
      console.log("收到会话列表:", conversationsList);
      setConversations(conversationsList);
      setIsLoading(false);
    });

    // Listen for messages from specific conversation
    socket.on(
      "admin:messages",
      (data: { conversationId: string; messages: Message[] }) => {
        console.log("收到会话消息:", data);
        // 为每个会话独立存储消息
        setConversationMessages((prev) => ({
          ...prev,
          [data.conversationId]: data.messages,
        }));
      }
    );

    // Listen for real-time messages across all conversations
    socket.on(
      "admin:message",
      (
        messageData: Message & {
          conversation: { id: string; agentId: string; clientId: string };
        }
      ) => {
        console.log("收到实时消息:", messageData);

        // Update unread count for the conversation
        setUnreadCounts((prev) => ({
          ...prev,
          [messageData.conversation.id]:
            (prev[messageData.conversation.id] || 0) + 1,
        }));

        // 为每个会话独立添加消息
        setConversationMessages((prev) => {
          const conversationId = messageData.conversation.id;
          const existingMessages = prev[conversationId] || [];

          // 检查重复消息
          const exists = existingMessages.find((m) => m.id === messageData.id);
          if (exists) return prev;

          return {
            ...prev,
            [conversationId]: [...existingMessages, messageData],
          };
        });

        // Update conversation list with latest message
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === messageData.conversation.id
              ? {
                  ...conv,
                  lastMessage: messageData.content,
                  lastMessageTime: messageData.timestamp,
                }
              : conv
          )
        );
      }
    );

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [selectedConversation]);

  // Handle conversation selection
  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);

    // Clear unread count for selected conversation
    setUnreadCounts((prev) => ({
      ...prev,
      [conversation.id]: 0,
    }));

    // 如果该会话还没有消息，则请求消息
    if (!conversationMessages[conversation.id]) {
      socketService.emit("admin:get-room-messages", conversation.id);
    }
  };

  // Get conversation display name
  const getConversationDisplayName = (conversation: Conversation) => {
    const agentName = conversation.agent?.name || "未知客服";
    // 如果有自定义显示名称，使用自定义名称，否则使用原始名称
    const clientName =
      conversation.clientDisplayName || conversation.client?.name || "未知客户";
    const clientPhone = conversation.client?.phone || "";
    const phoneDisplay = clientPhone ? ` (${clientPhone})` : "";
    return `${agentName} ↔ ${clientName}${phoneDisplay}`;
  };

  // Get sender name for message
  const getSenderName = (message: Message, conversation: Conversation) => {
    if (message.senderId === conversation.agentId) {
      return conversation.agent?.name || "客服";
    } else if (message.senderId === conversation.clientId) {
      return conversation.client?.name || "客户";
    }
    return "未知";
  };

  // Check if message is from agent (for layout purposes)
  const isMessageFromAgent = (message: Message, conversation: Conversation) => {
    return message.senderId === conversation.agentId;
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

  return (
    <div className="h-screen flex bg-gray-100">
      {/* Left sidebar - Conversations list */}
      <div className="w-80 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 ">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Eye className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">实时监控</h2>
            </div>
            <div className="flex items-center space-x-2">
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
          <button
            onClick={() => router.push("/admin/agents")}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all text-sm"
          >
            管理Agent人员
          </button>
          <button
            onClick={() => router.push("/admin")}
            className="flex items-center text-sm text-gray-600 hover:text-gray-800 mt-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            返回登录
          </button>
        </div>

        {/* Conversations list */}
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">暂无活跃会话</p>
            </div>
          ) : (
            <div className="p-2">
              {conversations.map((conversation) => {
                const unreadCount = unreadCounts[conversation.id] || 0;
                const isSelected = selectedConversation?.id === conversation.id;

                return (
                  <div
                    key={conversation.id}
                    onClick={() => handleSelectConversation(conversation)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors mb-2 ${
                      isSelected
                        ? "bg-blue-50 border border-blue-200"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {getConversationDisplayName(conversation)}
                        </p>
                        <p className="text-xs text-gray-500 truncate mt-1">
                          {conversation.lastMessage || "暂无消息"}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <div className="flex items-center space-x-1">
                            <div
                              className={`w-2 h-2 rounded-full ${
                                conversation.agent?.isOnline
                                  ? "bg-green-500"
                                  : "bg-gray-400"
                              }`}
                            />
                            <span className="text-xs text-gray-500">
                              {conversation.agent?.name || "客服"}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <div
                              className={`w-2 h-2 rounded-full ${
                                conversation.client?.isOnline
                                  ? "bg-green-500"
                                  : "bg-gray-400"
                              }`}
                            />
                            <span className="text-xs text-gray-500">
                              {conversation.client?.name || "客户"}
                            </span>
                          </div>
                        </div>
                      </div>
                      {unreadCount > 0 && (
                        <div className="ml-2">
                          <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium leading-none text-white bg-red-500 rounded-full">
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Main area - Messages */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat header */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {getConversationDisplayName(selectedConversation)}
                  </h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          selectedConversation.agent?.isOnline
                            ? "bg-green-500"
                            : "bg-gray-400"
                        }`}
                      />
                      <span>{selectedConversation.agent?.name || "客服"}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          selectedConversation.client?.isOnline
                            ? "bg-green-500"
                            : "bg-gray-400"
                        }`}
                      />
                      <span>{selectedConversation.client?.name || "客户"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <p>暂无消息</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message, index) => {
                    const senderName = getSenderName(
                      message,
                      selectedConversation
                    );
                    const isFromAgent = isMessageFromAgent(
                      message,
                      selectedConversation
                    );
                    return (
                      <MessageBubble
                        key={`${message.id}-${index}`}
                        message={message}
                        isOwn={!isFromAgent}
                        senderName={senderName || "客服"}
                      />
                    );
                  })}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          </>
        ) : (
          /* Welcome message */
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center p-4">
              <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
                <Eye className="w-8 h-8 text-gray-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                选择会话开始监控
              </h3>
              <p className="text-gray-500 text-sm">
                从左侧列表中选择一个会话来查看实时消息
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
