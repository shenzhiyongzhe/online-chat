import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../../prisma/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return res.status(400).json({
      success: false,
      message: "无效的会话ID",
    });
  }

  if (req.method === "GET") {
    // 获取会话备注
    try {
      const conversation = await prisma.conversation.findUnique({
        where: { id },
        select: {
          id: true,
          agentId: true,
          clientDisplayName: true,
        },
      });

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: "会话不存在",
        });
      }

      res.status(200).json({
        success: true,
        clientDisplayName: conversation.clientDisplayName || "",
      });
    } catch (error) {
      console.error("获取会话备注失败:", error);
      res.status(500).json({
        success: false,
        message: "获取会话备注失败",
      });
    }
  } else if (req.method === "PUT") {
    // 更新会话备注
    try {
      const { clientDisplayName, agentId } = req.body;

      if (!agentId) {
        return res.status(400).json({
          success: false,
          message: "缺少agentId参数",
        });
      }

      // 验证agent是否有权限修改此会话
      const conversation = await prisma.conversation.findUnique({
        where: { id },
        select: {
          id: true,
          agentId: true,
        },
      });

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: "会话不存在",
        });
      }

      if (conversation.agentId !== agentId) {
        return res.status(403).json({
          success: false,
          message: "无权限修改此会话的备注",
        });
      }

      // 更新自定义显示名称
      const updatedConversation = await prisma.conversation.update({
        where: { id },
        data: {
          clientDisplayName: clientDisplayName || null,
        },
        select: {
          id: true,
          clientDisplayName: true,
        },
      });

      res.status(200).json({
        success: true,
        message: "自定义昵称更新成功",
        clientDisplayName: updatedConversation.clientDisplayName,
      });
    } catch (error) {
      console.error("更新会话备注失败:", error);
      res.status(500).json({
        success: false,
        message: "更新会话备注失败",
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
