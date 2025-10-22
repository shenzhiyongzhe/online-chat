import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../prisma/prisma";
import bcrypt from "bcryptjs";

// GET /api/agents - 获取所有agents
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    try {
      const agents = await prisma.agent.findMany({
        select: {
          id: true,
          name: true,
          password: true,
          isOnline: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      res.status(200).json({
        success: true,
        agents,
      });
    } catch (error) {
      console.error("获取agents失败:", error);
      res.status(500).json({
        success: false,
        message: "获取agents失败",
      });
    }
  } else if (req.method === "POST") {
    // 创建新agent
    try {
      const { name, password } = req.body;

      // 验证输入
      if (!name || !password) {
        return res.status(400).json({
          success: false,
          message: "名称和密码不能为空",
        });
      }

      if (name.length < 2 || name.length > 20) {
        return res.status(400).json({
          success: false,
          message: "名称长度必须在2-20个字符之间",
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: "密码长度至少6位",
        });
      }

      // 生成agentId（使用时间戳+随机数）
      const agentId = `AGENT_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      // 检查名称是否已存在
      const existingAgent = await prisma.agent.findFirst({
        where: { name },
      });

      if (existingAgent) {
        return res.status(400).json({
          success: false,
          message: "该名称已存在",
        });
      }

      // 加密密码
      const hashedPassword = await bcrypt.hash(password, 10);

      // 创建agent
      const agent = await prisma.agent.create({
        data: {
          agentId,
          name,
          password: hashedPassword,
          isOnline: false,
        },
        select: {
          id: true,
          name: true,
          password: true,
          isOnline: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      res.status(201).json({
        success: true,
        message: "Agent创建成功",
        agent,
      });
    } catch (error) {
      console.error("创建agent失败:", error);
      res.status(500).json({
        success: false,
        message: "创建agent失败",
      });
    }
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).json({
      success: false,
      message: `方法 ${req.method} 不被允许`,
    });
  }
}
