// 用户角色类型
export type UserRole = "client" | "agent" | "admin";

// 消息状态
export type MessageStatus = "sending" | "sent" | "delivered" | "read";

// 客服信息
export interface Agent {
  id: string;
  agentId?: string;
  password?: string; // 可选，因为客户端不需要密码
  name: string;
  avatar: string;
  isOnline: boolean;
}

// 客户信息
export interface Client {
  id: string;
  clientId?: string;
  name: string;
  isOnline: boolean;
}

// 会话信息
export interface Conversation {
  id: string;
  type?: "agent" | "group";
  title?: string;
  participants?: Array<{
    id: string;
    name: string;
    role: UserRole;
  }>;
  agentId?: string;
  clientId?: string;
  updatedAt: string;
  unreadCount: number;
  lastMessage?: string;
  lastMessageTime?: string;
  isActive?: boolean;
  // Include related data for admin monitoring
  agent?: Agent;
  client?: Client;
}

// 消息信息
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  timestamp: string;
  status: MessageStatus;
  type?: "text" | "emoji";
}

// 当前用户信息
export interface CurrentUser {
  id: string;
  name: string;
  role: UserRole;
  isOnline: boolean;
}

// Socket事件类型
export interface SocketEvents {
  // 连接事件
  connect: () => void;
  disconnect: () => void;

  // 用户事件
  "user:login": (user: CurrentUser) => void;
  "user:logout": (userId: string) => void;
  "user:online": (userId: string) => void;
  "user:offline": (userId: string) => void;

  // 消息事件
  "message:send": (
    message: Omit<Message, "id" | "timestamp" | "status">
  ) => void;
  "messages:read": (conversationId: string) => void;
  "message:receive": (message: Message) => void;
  "message:status": (messageId: string, status: MessageStatus) => void;

  // 会话事件
  "conversation:create": (conversationData: {
    type: string;
    title?: string;
    agentId: string;
    clientId: string;
  }) => void;
  "conversation:created": (conversation: Conversation) => void;
  "conversation:join": (conversationId: string) => void;
  "conversation:leave": (conversationId: string) => void;

  // 客服列表事件
  "agents:list": (agents: Agent[]) => void;
  "agent:search": (query: string) => void;
  "agent:found": (agent: Agent | null) => void;

  // 客户列表事件
  "clients:list": (clients: any[]) => void;

  // 消息事件
  "messages:get": (conversationId: string) => void;
  "messages:list": (messages: Message[]) => void;

  // 管理员监控事件
  "admin:join-monitoring": (user: CurrentUser) => void;
  "admin:get-all-conversations": () => void;
  "admin:get-room-messages": (conversationId: string) => void;
  "admin:conversations": (conversations: Conversation[]) => void;
  "admin:messages": (data: {
    conversationId: string;
    messages: Message[];
  }) => void;
  "admin:message": (
    message: Message & {
      conversation: { id: string; agentId: string; clientId: string };
    }
  ) => void;
}

// 聊天界面状态
export interface ChatState {
  currentUser: CurrentUser | null;
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  agents: Agent[];
  isConnected: boolean;
}

// 搜索客服结果
export interface SearchAgentResult {
  success: boolean;
  agent?: Agent;
  message?: string;
}
