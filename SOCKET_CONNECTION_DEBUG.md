# Socket.io 连接调试指南

## 🐛 当前问题

**错误信息:**

```
WebSocket connection to 'ws://localhost:3000/api/socket/?EIO=4&transport=websocket' failed: WebSocket is closed before the connection is established.
```

## 🔍 诊断结果

### ✅ 服务器端正常

- **HTTP API**: `curl http://localhost:3000/api/socket` → 200 OK
- **Socket.io 握手**: `curl "http://localhost:3000/api/socket/?EIO=4&transport=polling"` → 成功
- **服务器配置**: 已优化，支持轮询和 WebSocket

### ❌ 客户端连接问题

- **WebSocket 升级失败**: 可能是网络或浏览器问题
- **轮询连接**: 应该可以正常工作

## 🔧 解决方案

### 1. 修改传输优先级

**文件**: `lib/socket.ts`

```typescript
this.socket = io(this.url, {
  path: "/api/socket",
  transports: ["polling", "websocket"], // 先尝试轮询
  autoConnect: true,
  forceNew: true,
  timeout: 20000,
});
```

### 2. 优化服务器配置

**文件**: `pages/api/socket.ts`

```typescript
const io = new SocketIOServer(res.socket.server, {
  path: "/api/socket",
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  transports: ["websocket", "polling"],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
});
```

### 3. 创建测试页面

**文件**: `simple-socket-test.html`

- 最简单的 Socket.io 连接测试
- 使用默认配置

**文件**: `debug-socket.html`

- 分别测试轮询和 WebSocket
- 详细的调试信息

## 🎯 测试步骤

### 步骤 1: 测试轮询连接

```bash
# 打开浏览器访问
http://localhost:3000/simple-socket-test.html
```

### 步骤 2: 测试客户端页面

```bash
# 访问客户页面
http://localhost:3000/client
```

### 步骤 3: 检查控制台日志

- 打开浏览器开发者工具
- 查看控制台中的连接日志
- 检查网络面板中的请求

## 📊 预期结果

### ✅ 轮询连接应该成功

- Socket.io 握手正常
- 轮询传输应该可以工作
- 即使 WebSocket 失败，轮询也能提供实时通信

### 🔄 WebSocket 升级

- 如果轮询成功，Socket.io 会尝试升级到 WebSocket
- 如果 WebSocket 失败，会回退到轮询

## 🚀 当前状态

- ✅ **服务器**: 配置优化，支持多种传输方式
- ✅ **客户端**: 优先使用轮询传输
- ✅ **测试工具**: 创建了多个测试页面
- ✅ **诊断**: 确认服务器端正常工作

## 🔍 下一步调试

1. **打开测试页面**: 访问 `simple-socket-test.html`
2. **检查控制台**: 查看详细的连接日志
3. **测试轮询**: 确认轮询连接是否成功
4. **检查网络**: 查看浏览器网络面板中的请求

现在应该可以正常连接了！如果轮询连接成功，即使 WebSocket 失败，应用也能正常工作。🎉
