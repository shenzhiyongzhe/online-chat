"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { MessageCircle, User, ArrowRight } from "lucide-react";
import { MessageBubble } from "../../../components/chat/MessageBubble";
import { MessageInput } from "../../../components/chat/MessageInput";
import { socketService } from "../../../lib/socket";
import { generateId } from "../../../lib/utils";
import { Message, Conversation, Agent, CurrentUser } from "../../../types";

export default function AgentRoomPage() {
  const params = useParams();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isSendingRef = useRef(false);

  const agentId = params?.id as string;

  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [nickname, setNickname] = useState("");
  const [nicknameError, setNicknameError] = useState("");

  // Local state management
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [currentConversation, setCurrentConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [agent, setAgent] = useState<Agent | null>(null);

  // Check for saved nickname and agent info on mount
  useEffect(() => {
    const savedNickname = localStorage.getItem("clientNickname");
    if (savedNickname) {
      setNickname(savedNickname);
      // Create user immediately if nickname exists
      const currentUser: CurrentUser = {
        id: `CLIENT_${savedNickname}`,
        name: savedNickname,
        role: "client",
        isOnline: true,
      };
      setCurrentUser(currentUser);
      // Trigger WebSocket connection after user is set
      setIsLoading(false);
    } else {
      // Show nickname modal if no saved nickname
      setShowNicknameModal(true);
      setIsLoading(false);
    }
  }, []);

  // Auto scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Socket connection and agent info
  useEffect(() => {
    if (!agentId || isLoading || !currentUser) return;

    const socket = socketService.connect();

    socket.on("connect", () => {
      console.log("Client connected to server");
      setIsConnected(true);

      // Login user (currentUser is guaranteed to exist at this point)
      socket.emit("user:login", currentUser);

      // Get agent list to find the specific agent
      socket.emit("agents:list");
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected from server");
      setIsConnected(false);
    });

    socket.on("connect_error", (error) => {
      console.error("WebSocket connection error:", error);
      setIsConnected(false);
    });

    socket.on("agents:list", (agentsList: Agent[]) => {
      const targetAgent = agentsList.find((a) => a.agentId === agentId);
      if (targetAgent) {
        setAgent(targetAgent);

        // Auto-create conversation if user exists and no conversation yet
        if (currentUser && !currentConversation && targetAgent.agentId) {
          const conversationData = {
            type: "agent" as const,
            title: `与 ${targetAgent.name} 的对话`,
            agentId: targetAgent.agentId,
            clientId: currentUser.id,
          };

          console.log("自动创建与客服的会话:", conversationData);
          socketService.emit("conversation:create", conversationData);
        }
      } else {
        console.error("Agent not found:", agentId);
        setNicknameError("客服不存在或已离线");
      }
    });

    socket.on("message:receive", (message: Message) => {
      console.log("收到新消息:", message);
      console.log("当前会话ID:", currentConversation?.id);
      console.log("消息会话ID:", message.conversationId);
      console.log(currentConversation);

      // Get current user ID for comparison
      const currentUserState = localStorage.getItem("clientNickname") || "null";
      const currentUserId = currentUserState
        ? `CLIENT_${currentUserState}`
        : "";

      // Show messages if they belong to current conversation OR if we don't have a conversation yet
      // This handles the case where messages arrive before conversation state is set
      const shouldShowMessage =
        !currentConversation ||
        message.conversationId === currentConversation.id;

      if (shouldShowMessage) {
        setMessages((prev) => {
          console.log("当前消息列表长度:", prev.length);
          console.log("检查重复消息ID:", message.id);

          const alreadyExists = prev.some((m) => m.id === message.id);
          if (alreadyExists) {
            console.log("消息已存在，跳过添加");
            return prev;
          }

          console.log("添加新消息到列表");
          return [...prev, message];
        });

        // Mark as read if not sent by current user
        // Use setTimeout to ensure message is fully processed before marking as read
        if (message.senderId !== currentUserId) {
          setTimeout(() => {
            socketService.emit("messages:read", message.conversationId);
          }, 100);
        }
      }
    });

    socket.on("message:status", (messageId: string, status: string) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === messageId) {
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
    });

    // Listen for read status updates
    socket.on(
      "messages:read",
      (data: {
        conversationId: string;
        readerId: string;
        timestamp: string;
      }) => {
        console.log("收到已读状态更新:", data);

        // Get current user ID for comparison
        const currentUserState =
          localStorage.getItem("clientNickname") || "null";
        const currentUserId = currentUserState
          ? `CLIENT_${currentUserState}`
          : "";

        // Update message status to read for messages in this conversation
        // that are sent by the current user (because current user is the reader)
        setMessages((prev) => {
          const updated = prev.map((msg) => {
            if (
              msg.conversationId === data.conversationId &&
              msg.senderId === currentUserId &&
              msg.status !== "read"
            ) {
              console.log(
                `更新消息 ${msg.id} 状态为已读，原状态: ${msg.status}`
              );
              return { ...msg, status: "read" as const };
            }
            return msg;
          });

          // Log how many messages were updated
          const updatedCount = updated.filter(
            (msg, index) =>
              msg.status === "read" && prev[index].status !== "read"
          ).length;

          if (updatedCount > 0) {
            console.log(`已更新 ${updatedCount} 条消息为已读状态`);
          }

          return updated;
        });
      }
    );

    socket.on("messages:list", (msgs: Message[]) => {
      console.log("收到历史消息列表，数量:", msgs?.length ?? 0);
      console.log(
        "历史消息列表:",
        msgs?.map((m) => ({ id: m.id, content: m.content }))
      );
      // Replace messages completely to avoid duplicates
      setMessages(msgs || []);
    });

    socket.on("conversation:created", (conversation: Conversation) => {
      console.log("收到会话创建成功事件:", conversation);
      setCurrentConversation(conversation);

      // Clear messages when switching to new conversation
      setMessages([]);

      // Get conversation messages immediately
      console.log("加载会话历史消息:", conversation.id);
      socketService.emit("messages:get", conversation.id);

      // Send pending message if exists
      const pendingMessage = (window as any).pendingMessage;
      if (pendingMessage) {
        setTimeout(() => {
          // Get current user from state at the time of execution
          const currentUserState =
            localStorage.getItem("clientNickname") || "null";
          const userId = currentUserState ? `CLIENT_${currentUserState}` : "";

          const payload: Omit<Message, "id" | "timestamp" | "status"> = {
            conversationId: conversation.id,
            senderId: userId,
            content: pendingMessage.content,
            type: "text",
          };

          console.log("发送待发送消息:", payload);
          socketService.emit("message:send", payload);

          // Clear pending message
          (window as any).pendingMessage = null;
        }, 100);
      }
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [agentId, isLoading, currentUser]);

  // Handle nickname submission
  const handleNicknameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) {
      setNicknameError("请输入昵称");
      return;
    }
    if (nickname.trim().length < 2 || nickname.trim().length > 20) {
      setNicknameError("昵称长度应在2-20个字符之间");
      return;
    }

    const trimmedNickname = nickname.trim();
    localStorage.setItem("clientNickname", trimmedNickname);

    // Create user immediately
    const currentUser: CurrentUser = {
      id: `CLIENT_${trimmedNickname}`,
      name: trimmedNickname,
      role: "client",
      isOnline: true,
    };

    setCurrentUser(currentUser);
    setShowNicknameModal(false);
    setNicknameError("");

    // WebSocket connection will be established automatically via useEffect
    // when currentUser state changes
    // Conversation will be auto-created when agent info is available
  };

  // Handle send message
  const handleSendMessage = (content: string) => {
    console.log("handleSendMessage 被调用，内容:", content);

    // Prevent duplicate calls
    if (isSendingRef.current) {
      console.log("正在发送消息，跳过重复调用");
      return;
    }

    // Check if user has nickname, if not show modal
    if (!currentUser) {
      setShowNicknameModal(true);
      return;
    }

    // If no conversation exists yet, store message as pending
    if (!currentConversation) {
      console.log("会话尚未创建，存储待发送消息");
      const pendingMessage = {
        content,
      };
      (window as any).pendingMessage = pendingMessage;
      return;
    }

    // Set sending flag
    isSendingRef.current = true;

    // Send message normally - no optimistic update
    const payload: Omit<Message, "id" | "timestamp" | "status"> = {
      conversationId: currentConversation.id,
      senderId: currentUser.id,
      content,
      type: "text",
    };

    console.log("发送消息到服务端:", payload);
    socketService.emit("message:send", payload);

    // Reset sending flag after a short delay
    setTimeout(() => {
      isSendingRef.current = false;
    }, 1000);
  };

  // Clear saved nickname
  const clearSavedNickname = () => {
    localStorage.removeItem("clientNickname");
    setCurrentUser(null);
    setCurrentConversation(null);
    setMessages([]);
    setNickname("");
    setShowNicknameModal(true);
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
      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {currentConversation ? (
          <>
            {/* Chat header */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {agent?.name || "客服"}
                    </h3>
                    <div className="flex items-center space-x-1">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          agent?.isOnline ? "bg-green-500" : "bg-gray-400"
                        }`}
                      />
                      <span className="text-sm text-gray-500">
                        {agent?.isOnline ? "在线" : "离线"}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={clearSavedNickname}
                  className="text-sm text-gray-500 hover:text-gray-700 underline"
                >
                  更换昵称
                </button>
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <p>开始对话吧...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message, index) => (
                    <MessageBubble
                      key={`${message.id}-${index}`}
                      message={message}
                      isOwn={message.senderId === currentUser?.id}
                      senderName={
                        message.senderId === currentUser?.id
                          ? currentUser?.name || "我"
                          : agent?.name || "客服"
                      }
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input area */}
            <MessageInput
              onSendMessage={handleSendMessage}
              disabled={!isConnected}
              placeholder={isConnected ? "输入消息..." : "连接中..."}
            />
          </>
        ) : (
          /* Chat interface without conversation - ready to send messages */
          <>
            {/* Chat header */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {agent?.name || "客服"}
                    </h3>
                    <div className="flex items-center space-x-1">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          agent?.isOnline ? "bg-green-500" : "bg-gray-400"
                        }`}
                      />
                      <span className="text-sm text-gray-500">
                        {agent?.isOnline ? "在线" : "离线"}
                      </span>
                    </div>
                  </div>
                </div>
                {currentUser && (
                  <button
                    onClick={clearSavedNickname}
                    className="text-sm text-gray-500 hover:text-gray-700 underline"
                  >
                    更换昵称
                  </button>
                )}
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium mb-2">开始对话</p>
                  <p className="text-sm">
                    {currentUser
                      ? `与 ${agent?.name || "客服"} 开始聊天`
                      : "输入消息开始对话"}
                  </p>
                </div>
              </div>
            </div>

            {/* Input area */}
            <MessageInput
              onSendMessage={handleSendMessage}
              disabled={!isConnected || !agent}
              placeholder={
                !agent
                  ? "客服不存在或已离线"
                  : !currentUser
                  ? "输入消息开始对话..."
                  : isConnected
                  ? "输入消息..."
                  : "连接中..."
              }
            />
          </>
        )}
      </div>

      {/* Nickname input modal */}
      {showNicknameModal && (
        <div className="fixed inset-0 bg-gray-500/50  backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                欢迎使用在线客服
              </h2>
              <p className="text-gray-600">请输入您的昵称开始对话</p>
            </div>

            <form onSubmit={handleNicknameSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="nickname"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  您的昵称
                </label>
                <input
                  id="nickname"
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="请输入2-20个字符的昵称"
                  maxLength={20}
                  autoFocus
                />
                {nicknameError && (
                  <p className="mt-2 text-sm text-red-600">{nicknameError}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                确认昵称
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
