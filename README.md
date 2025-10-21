# 在线客服聊天系统

一个基于 Next.js 和 Socket.io 的实时在线客服聊天系统，支持双角色身份（客服与客户），界面设计参考微信。

## 功能特性

### 🎯 核心功能

- **双角色支持**：客户和客服两种身份
- **实时通信**：基于 WebSocket 的实时消息收发
- **会话管理**：支持多会话切换和管理
- **在线状态**：实时显示用户在线/离线状态
- **消息状态**：发送中、已发送、已送达、已读状态
- **响应式设计**：支持 PC 端和移动端

### 👥 用户角色

#### 客户

- 无需登录，输入昵称即可使用
- 搜索指定客服并开始对话
- 查看客服在线状态
- 支持多客服会话

#### 客服

- 需要账号密码登录
- 查看所有客户会话
- 实时接收客户消息
- 支持多客户同时服务

## 技术栈

- **前端**：Next.js 15, React 19, TypeScript
- **状态管理**：Zustand
- **样式**：Tailwind CSS
- **实时通信**：Socket.io
- **图标**：Lucide React
- **后端**：Next.js API Routes + Socket.io

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发服务器

```bash
# 启动开发服务器（包含前端和Socket.io后端）
npm run dev
```

### 3. 访问应用

- **客户入口**：http://localhost:3000
- **客服入口**：http://localhost:3000/admin
- **移动端**：http://localhost:3000/chat/mobile
- **Socket.io**：http://localhost:3000/api/socket

## 使用说明

### 客户使用流程

1. 访问首页，输入您的昵称
2. 搜索客服（输入客服 ID 或姓名）
3. 系统自动跳转到聊天界面
4. 开始与客服对话

### 客服使用流程

1. 访问 `/admin` 页面
2. 使用测试账号登录：
   - 工号：A001，密码：123456（张三）
   - 工号：A002，密码：123456（李四）
   - 工号：A003，密码：123456（王五）
3. 登录成功后进入客服工作台
4. 等待客户联系或主动查看会话

## 项目结构

```
online-chat/
├── app/                    # Next.js App Router
│   ├── page.tsx           # 客户入口页面
│   ├── admin/             # 客服登录页面
│   ├── chat/              # 聊天界面
│   │   ├── page.tsx       # PC端聊天界面
│   │   └── mobile/        # 移动端聊天界面
│   └── globals.css        # 全局样式
├── pages/                 # Next.js Pages Router
│   └── api/               # API路由
│       └── socket.ts      # Socket.io服务器
├── components/            # React组件
│   ├── ui/               # 基础UI组件
│   └── chat/             # 聊天相关组件
├── lib/                  # 工具函数
├── store/                # 状态管理
├── types/                # TypeScript类型定义
└── public/               # 静态资源
```

## 核心组件

- **MessageBubble**：消息气泡组件
- **ConversationList**：会话列表组件
- **MessageInput**：消息输入组件
- **AgentListModal**：客服列表模态框

## 数据模型

### 用户

```typescript
interface CurrentUser {
  id: string;
  name: string;
  role: "client" | "agent";
  isOnline: boolean;
}
```

### 消息

```typescript
interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  timestamp: string;
  status: "sending" | "sent" | "delivered" | "read";
}
```

### 会话

```typescript
interface Conversation {
  id: string;
  agentId: string;
  clientId: string;
  updatedAt: string;
  unreadCount: number;
}
```

## 开发说明

### 添加新功能

1. 在 `types/index.ts` 中定义相关类型
2. 在 `store/chatStore.ts` 中添加状态管理
3. 在 `components/` 中创建相关组件
4. 在 `server/index.js` 中添加 Socket 事件处理

### 自定义样式

项目使用 Tailwind CSS，可以在 `app/globals.css` 中添加自定义样式。

### 部署

1. 构建项目：`npm run build`
2. 启动生产服务器：`npm start`
3. Socket.io 服务器会自动随 Next.js 一起运行

## 测试账号

### 客服账号

- 工号：A001，密码：123456（张三）
- 工号：A002，密码：123456（李四）
- 工号：A003，密码：123456（王五）

## 许可证

MIT License
