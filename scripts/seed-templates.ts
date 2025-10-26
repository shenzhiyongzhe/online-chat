import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedTemplates() {
  try {
    // 获取第一个agent
    const agent = await prisma.agent.findFirst();

    if (!agent) {
      console.log("没有找到agent，请先创建agent");
      return;
    }

    console.log(`为agent ${agent.name} (${agent.agentId}) 创建默认模板...`);

    // 创建默认模板
    const templates = [
      {
        agentId: agent.agentId,
        title: "问候模板",
        content: "您好，请问有什么可以帮您？",
        order: 0,
      },
      {
        agentId: agent.agentId,
        title: "处理中模板",
        content: "我这边帮您查看下，请稍等。",
        order: 1,
      },
      {
        agentId: agent.agentId,
        title: "完成模板",
        content: "已为您处理完毕，感谢等待。",
        order: 2,
      },
      {
        agentId: agent.agentId,
        title: "结束模板",
        content: "感谢您的咨询，祝您生活愉快！",
        order: 3,
      },
    ];

    for (const template of templates) {
      const existing = await prisma.quickTemplate.findFirst({
        where: {
          agentId: template.agentId,
          content: template.content,
        },
      });

      if (!existing) {
        await prisma.quickTemplate.create({
          data: template,
        });
        console.log(`创建模板: ${template.title}`);
      } else {
        console.log(`模板已存在: ${template.title}`);
      }
    }

    console.log("模板创建完成！");
  } catch (error) {
    console.error("创建模板失败:", error);
  } finally {
    await prisma.$disconnect();
  }
}

seedTemplates();
