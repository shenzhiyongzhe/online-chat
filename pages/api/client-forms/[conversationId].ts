import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../prisma/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { conversationId } = req.query;

  if (!conversationId || typeof conversationId !== "string") {
    return res.status(400).json({
      success: false,
      message: "缺少conversationId参数",
    });
  }

  if (req.method === "GET") {
    // 获取表单数据
    try {
      const form = await prisma.clientForm.findUnique({
        where: { conversationId },
      });

      res.status(200).json({
        success: true,
        form: form || null,
      });
    } catch (error) {
      console.error("获取表单失败:", error);
      res.status(500).json({
        success: false,
        message: "获取表单失败",
      });
    }
  } else if (req.method === "PUT") {
    // 更新表单数据
    try {
      const formData = req.body;

      const updatedForm = await prisma.clientForm.update({
        where: { conversationId },
        data: {
          ...formData,
          isCompleted: true,
        },
      });

      res.status(200).json({
        success: true,
        form: updatedForm,
      });
    } catch (error) {
      console.error("更新表单失败:", error);
      res.status(500).json({
        success: false,
        message: "更新表单失败",
      });
    }
  } else {
    res.setHeader("Allow", ["GET", "PUT"]);
    res.status(405).json({
      success: false,
      message: `方法 ${req.method} 不被允许`,
    });
  }
}
