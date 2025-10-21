// 客户端初始化逻辑
export function initializeClientApp(): void {
  console.log("🚀 初始化客户端应用...");

  // 客户端特定的初始化逻辑
  // 例如：检查本地存储、设置主题、初始化客户端状态等

  console.log("✅ 客户端应用初始化完成");
}

export function isClientAppReady(): boolean {
  // 检查客户端应用是否准备就绪
  return typeof window !== "undefined";
}
