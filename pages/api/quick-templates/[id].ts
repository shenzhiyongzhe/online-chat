import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../prisma/prisma";

// PUT /api/quick-templates/:id - 修改模板
// DELETE /api/quick-templates/:id - 删除模板
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return res.status(400).json({
      success: false,
      message: "模板ID不能为空",
    });
  }

  if (req.method === "PUT") {
    try {
      const { title, content, order } = req.body;

      // 验证输入
      if (content === undefined && title === undefined && order === undefined) {
        return res.status(400).json({
          success: false,
          message: "至少需要提供一个要更新的字段",
        });
      }

      // 检查模板是否存在
      const existingTemplate = await prisma.quickTemplate.findUnique({
        where: { id },
      });

      if (!existingTemplate) {
        return res.status(404).json({
          success: false,
          message: "模板不存在",
        });
      }

      // 构建更新数据
      const updateData: any = {};
      if (title !== undefined) updateData.title = title;
      if (content !== undefined) updateData.content = content;
      if (order !== undefined) updateData.order = order;

      const template = await prisma.quickTemplate.update({
        where: { id },
        data: updateData,
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
        message: "快捷模板更新成功",
        template,
      });
    } catch (error) {
      console.error("更新快捷模板失败:", error);
      res.status(500).json({
        success: false,
        message: "更新快捷模板失败",
      });
    }
  } else if (req.method === "DELETE") {
    try {
      // 检查模板是否存在
      const existingTemplate = await prisma.quickTemplate.findUnique({
        where: { id },
      });

      if (!existingTemplate) {
        return res.status(404).json({
          success: false,
          message: "模板不存在",
        });
      }

      await prisma.quickTemplate.delete({
        where: { id },
      });

      res.status(200).json({
        success: true,
        message: "快捷模板删除成功",
      });
    } catch (error) {
      console.error("删除快捷模板失败:", error);
      res.status(500).json({
        success: false,
        message: "删除快捷模板失败",
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
