"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { MessageCircle, User, ArrowRight } from "lucide-react";
import { MessageBubble } from "../../../components/chat/MessageBubble";
import { MessageInput } from "../../../components/chat/MessageInput";
import { socketService } from "../../../lib/socket";
import { generateId } from "../../../lib/utils";
import { Message, Conversation, Agent, CurrentUser } from "../../../types";

export default function AgentRoomPage() {
  const params = useParams();
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    }
    setIsLoading(false);
  }, []);

  // Auto scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Socket connection and agent info
  useEffect(() => {
    if (!agentId || isLoading) return;

    const socket = socketService.connect();

    socket.on("connect", () => {
      console.log("Client connected to server");
      setIsConnected(true);

      // Login user if exists
      if (currentUser) {
        socket.emit("user:login", currentUser);
      }

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
      } else {
        console.error("Agent not found:", agentId);
        setNicknameError("客服不存在或已离线");
      }
    });

    socket.on("message:receive", (message: Message & { tempId?: string }) => {
      console.log("收到新消息:", message);

      // Only show messages for current conversation
      if (
        currentConversation &&
        message.conversationId === currentConversation.id
      ) {
        setMessages((prev) => {
          // Check for duplicates by ID
          const existingIndex = prev.findIndex((m) => m.id === message.id);
          if (existingIndex !== -1) {
            // Update existing message
            const copy = [...prev];
            copy[existingIndex] = message;
            return copy;
          }

          // Replace temp message if exists
          if (message.tempId) {
            const tempIndex = prev.findIndex((m) => m.id === message.tempId);
            if (tempIndex !== -1) {
              const copy = [...prev];
              copy[tempIndex] = { ...message };
              return copy;
            }
          }

          // Add new message only if it doesn't exist
          const alreadyExists = prev.some((m) => m.id === message.id);
          if (alreadyExists) {
            return prev;
          }

          return [...prev, message];
        });

        // Mark as read if not sent by current user
        if (message.senderId !== currentUser?.id) {
          socketService.emit("messages:read", message.conversationId);
        }
      }
    });

    socket.on("message:status", (messageId: string, status: string) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, status: status as any } : msg
        )
      );
    });

    socket.on("messages:list", (msgs: Message[]) => {
      console.log("收到历史消息列表，数量:", msgs?.length ?? 0);
      setMessages(msgs || []);
    });

    socket.on("conversation:created", (conversation: Conversation) => {
      console.log("收到会话创建成功事件:", conversation);
      setCurrentConversation(conversation);
      setMessages([]);

      // Get conversation messages
      socketService.emit("messages:get", conversation.id);

      // Send pending message if exists
      const pendingMessage = (window as any).pendingMessage;
      if (pendingMessage) {
        setTimeout(() => {
          const payload: Omit<Message, "id" | "timestamp" | "status"> & {
            tempId: string;
          } = {
            conversationId: conversation.id,
            senderId: currentUser?.id || "",
            content: pendingMessage.content,
            type: "text",
            tempId: pendingMessage.tempId,
          };

          socketService.emit("message:send", payload);

          const newMessage: Message = {
            ...payload,
            id: pendingMessage.tempId,
            timestamp: new Date().toISOString(),
            status: "sending",
          };
          setMessages((prev) => {
            // Check if message already exists to prevent duplicates
            const exists = prev.some((m) => m.id === pendingMessage.tempId);
            if (exists) return prev;
            return [...prev, newMessage];
          });

          // Clear pending message
          (window as any).pendingMessage = null;
        }, 100);
      }
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [agentId, isLoading, currentConversation, currentUser]);

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

    // Login to socket
    const socket = socketService.getSocket();
    if (socket) {
      socket.emit("user:login", currentUser);
    }
  };

  // Handle send message
  const handleSendMessage = (content: string) => {
    // Check if user has nickname, if not show modal
    if (!currentUser) {
      setShowNicknameModal(true);
      return;
    }

    // If no conversation exists, create one first
    if (!currentConversation) {
      if (!agent || !agent.agentId) return;

      const conversationData = {
        type: "agent" as const,
        title: `与 ${agent.name} 的对话`,
        agentId: agent.agentId,
        clientId: currentUser.id,
      };

      console.log("创建与客服的会话:", conversationData);
      socketService.emit("conversation:create", conversationData);

      // Store the message to send after conversation is created
      const tempId = generateId();
      const pendingMessage = {
        content,
        tempId,
      };

      // Store pending message in a ref or state for later use
      (window as any).pendingMessage = pendingMessage;
      return;
    }

    // Send message normally
    const tempId = generateId();
    const payload: Omit<Message, "id" | "timestamp" | "status"> & {
      tempId: string;
    } = {
      conversationId: currentConversation.id,
      senderId: currentUser.id,
      content,
      type: "text",
      tempId,
    };

    socketService.emit("message:send", payload);

    const newMessage: Message = {
      ...payload,
      id: tempId,
      timestamp: new Date().toISOString(),
      status: "sending",
    };
    setMessages((prev) => {
      // Check if message already exists to prevent duplicates
      const exists = prev.some((m) => m.id === tempId);
      if (exists) return prev;
      return [...prev, newMessage];
    });
  };

  // Clear saved nickname
  const clearSavedNickname = () => {
    localStorage.removeItem("clientNickname");
    setCurrentUser(null);
    setCurrentConversation(null);
    setMessages([]);
    setNickname("");
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
                  切换账号
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
                    切换账号
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
