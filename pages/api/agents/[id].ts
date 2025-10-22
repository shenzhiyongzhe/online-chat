import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../prisma/prisma";
import bcrypt from "bcryptjs";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return res.status(400).json({
      success: false,
      message: "无效的agent ID",
    });
  }

  if (req.method === "PUT") {
    // 更新agent
    try {
      const { name, password } = req.body;

      // 验证输入
      if (!name) {
        return res.status(400).json({
          success: false,
          message: "名称不能为空",
        });
      }

      if (name.length < 2 || name.length > 20) {
        return res.status(400).json({
          success: false,
          message: "名称长度必须在2-20个字符之间",
        });
      }

      // 检查agent是否存在
      const existingAgent = await prisma.agent.findFirst({
        where: {
          OR: [{ id }, { agentId: id }],
        },
      });

      if (!existingAgent) {
        return res.status(404).json({
          success: false,
          message: "Agent不存在",
        });
      }

      // 检查名称是否被其他agent使用
      const nameConflict = await prisma.agent.findFirst({
        where: {
          name,
          id: { not: existingAgent.id },
        },
      });

      if (nameConflict) {
        return res.status(400).json({
          success: false,
          message: "该名称已被其他agent使用",
        });
      }

      // 准备更新数据
      const updateData: any = {
        name,
      };

      // 如果提供了新密码，则更新密码
      if (password && password.trim()) {
        if (password.length < 6) {
          return res.status(400).json({
            success: false,
            message: "密码长度至少6位",
          });
        }
        updateData.password = await bcrypt.hash(password, 10);
      }

      // 更新agent
      const updatedAgent = await prisma.agent.update({
        where: { id: existingAgent.id },
        data: updateData,
        select: {
          id: true,
          name: true,
          password: true,
          isOnline: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      res.status(200).json({
        success: true,
        message: "Agent更新成功",
        agent: updatedAgent,
      });
    } catch (error) {
      console.error("更新agent失败:", error);
      res.status(500).json({
        success: false,
        message: "更新agent失败",
      });
    }
  } else if (req.method === "DELETE") {
    // 删除agent
    try {
      // 检查agent是否存在
      const existingAgent = await prisma.agent.findFirst({
        where: {
          OR: [{ id }, { agentId: id }],
        },
      });

      if (!existingAgent) {
        return res.status(404).json({
          success: false,
          message: "Agent不存在",
        });
      }

      // 检查agent是否在线
      if (existingAgent.isOnline) {
        return res.status(400).json({
          success: false,
          message: "无法删除在线状态的agent",
        });
      }

      // 检查是否有相关的会话
      const relatedConversations = await prisma.conversation.findFirst({
        where: {
          agentId: existingAgent.agentId,
        },
      });

      if (relatedConversations) {
        return res.status(400).json({
          success: false,
          message: "无法删除有会话记录的agent",
        });
      }

      // 删除agent
      await prisma.agent.delete({
        where: { id: existingAgent.id },
      });

      res.status(200).json({
        success: true,
        message: "Agent删除成功",
      });
    } catch (error) {
      console.error("删除agent失败:", error);
      res.status(500).json({
        success: false,
        message: "删除agent失败",
      });
    }
  } else {
    res.setHeader("Allow", ["PUT", "DELETE"]);
    res.status(405).json({
      success: false,
      message: `方法 ${req.method} 不被允许`,
    });
  }
}
