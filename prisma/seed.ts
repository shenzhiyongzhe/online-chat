import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("开始初始化数据库...");

  // 创建测试客服
  const agents = await Promise.all([
    prisma.agent.upsert({
      where: { agentId: "A001" },
      update: {},
      create: {
        agentId: "A001",
        password: "123456",
        name: "张三",
        avatar: "/avatars/a001.jpg",
        isOnline: false,
      },
    }),
    prisma.agent.upsert({
      where: { agentId: "A002" },
      update: {},
      create: {
        agentId: "A002",
        password: "123456",
        name: "李四",
        avatar: "/avatars/a002.jpg",
        isOnline: false,
      },
    }),
    prisma.agent.upsert({
      where: { agentId: "A003" },
      update: {},
      create: {
        agentId: "A003",
        password: "123456",
        name: "王五",
        avatar: "/avatars/a003.jpg",
        isOnline: false,
      },
    }),
  ]);

  console.log("客服数据初始化完成:", agents.length, "个客服");

  // 创建一些测试客户
  const clients = await Promise.all([
    prisma.client.upsert({
      where: { clientId: "CLIENT_001" },
      update: {},
      create: {
        clientId: "CLIENT_001",
        name: "测试客户1",
        isOnline: false,
      },
    }),
    prisma.client.upsert({
      where: { clientId: "CLIENT_002" },
      update: {},
      create: {
        clientId: "CLIENT_002",
        name: "测试客户2",
        isOnline: false,
      },
    }),
  ]);

  console.log("客户数据初始化完成:", clients.length, "个客户");

  console.log("数据库初始化完成!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
