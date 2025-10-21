import { initializeDatabaseHealthCheck } from "./db-health-check";

let isAppInitialized = false;

export async function initializeApp(): Promise<void> {
  // 检查是否在服务器环境
  if (typeof window !== "undefined") {
    console.warn("⚠️ 应用初始化只能在服务器端运行");
    return;
  }

  if (isAppInitialized) {
    return;
  }

  console.log("🚀 初始化应用...");

  try {
    // 初始化数据库健康检查
    await initializeDatabaseHealthCheck();

    isAppInitialized = true;
    console.log("✅ 应用初始化完成");
  } catch (error) {
    console.error("❌ 应用初始化失败:", error);
    // 不抛出错误，让应用继续运行
  }
}

export function isAppReady(): boolean {
  return isAppInitialized;
}
