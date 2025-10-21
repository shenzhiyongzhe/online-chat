import { prisma } from "../prisma/prisma";

let isDatabaseHealthy = false;
let lastHealthCheck = 0;
const HEALTH_CHECK_INTERVAL = 30000; // 30秒检查一次

export async function checkDatabaseHealth(): Promise<boolean> {
  // 检查是否在服务器环境
  if (typeof window !== "undefined") {
    console.warn("⚠️ 数据库健康检查只能在服务器端运行");
    return false;
  }

  const now = Date.now();

  // 如果最近检查过且数据库健康，直接返回
  if (isDatabaseHealthy && now - lastHealthCheck < HEALTH_CHECK_INTERVAL) {
    return true;
  }

  try {
    // 简单的ping测试
    await prisma.$queryRaw`SELECT 1`;
    isDatabaseHealthy = true;
    lastHealthCheck = now;
    console.log("✅ 数据库健康检查通过");
    return true;
  } catch (error) {
    isDatabaseHealthy = false;
    lastHealthCheck = now;
    console.error("❌ 数据库健康检查失败:", error);
    return false;
  }
}

export function isDatabaseReady(): boolean {
  return isDatabaseHealthy;
}

// 应用启动时进行初始检查
export async function initializeDatabaseHealthCheck(): Promise<void> {
  console.log("🔍 初始化数据库健康检查...");
  await checkDatabaseHealth();
}
