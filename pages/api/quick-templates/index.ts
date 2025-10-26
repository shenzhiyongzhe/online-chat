import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../prisma/prisma";

// GET /api/quick-templates - 获取当前agent的模板列表
// POST /api/quick-templates - 新增模板
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    try {
      const { agentId } = req.query;

      if (!agentId || typeof agentId !== "string") {
        return res.status(400).json({
          success: false,
          message: "agentId参数不能为空",
        });
      }

      const templates = await prisma.quickTemplate.findMany({
        where: {
          agentId,
        },
        orderBy: {
          order: "asc",
        },
        select: {
          id: true,
          title: true,
          content: true,
          order: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      res.status(200).json({
        success: true,
        templates,
      });
    } catch (error) {
      console.error("获取快捷模板失败:", error);
      res.status(500).json({
        success: false,
        message: "获取快捷模板失败",
      });
    }
  } else if (req.method === "POST") {
    try {
      const { agentId, title, content, order } = req.body;

      // 验证输入
      if (!agentId || !content) {
        return res.status(400).json({
          success: false,
          message: "agentId和content不能为空",
        });
      }

      // 验证agent是否存在
      const agent = await prisma.agent.findUnique({
        where: { agentId },
      });

      if (!agent) {
        return res.status(404).json({
          success: false,
          message: "Agent不存在",
        });
      }

      // 如果没有提供order，获取当前最大order值
      let templateOrder = order;
      if (templateOrder === undefined || templateOrder === null) {
        const maxOrderTemplate = await prisma.quickTemplate.findFirst({
          where: { agentId },
          orderBy: { order: "desc" },
        });
        templateOrder = maxOrderTemplate ? maxOrderTemplate.order + 1 : 0;
      }

      const template = await prisma.quickTemplate.create({
        data: {
          agentId,
          title: title || "",
          content,
          order: templateOrder,
        },
        select: {
          id: true,
          title: true,
          content: true,
          order: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      res.status(201).json({
        success: true,
        message: "快捷模板创建成功",
        template,
      });
    } catch (error) {
      console.error("创建快捷模板失败:", error);
      res.status(500).json({
        success: false,
        message: "创建快捷模板失败",
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
