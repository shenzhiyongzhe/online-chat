import { NextApiRequest, NextApiResponse } from "next";
import { initializeApp } from "../../lib/app-init";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    console.log("🚀 手动触发应用初始化...");
    await initializeApp();
    res.status(200).json({
      success: true,
      message: "应用初始化完成",
    });
  } catch (error) {
    console.error("❌ 应用初始化失败:", error);
    res.status(500).json({
      success: false,
      message: "应用初始化失败",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
