const { PrismaClient } = require('@prisma/client');

async function quickTest() {
  const prisma = new PrismaClient();

  try {
    console.log('🔍 快速数据库连接测试...');

    // 测试连接
    await prisma.$connect();
    console.log('✅ 连接成功');

    // 测试查询
    const agentCount = await prisma.agent.count();
    const clientCount = await prisma.client.count();
    const conversationCount = await prisma.conversation.count();
    const messageCount = await prisma.message.count();

    console.log('📊 数据统计:');
    console.log(`   客服: ${agentCount} 个`);
    console.log(`   客户: ${clientCount} 个`);
    console.log(`   会话: ${conversationCount} 个`);
    console.log(`   消息: ${messageCount} 条`);

    console.log('🎉 数据库连接正常！');

  } catch (error) {
    console.error('❌ 连接失败:', error.message);
    console.log('\n请检查:');
    console.log('1. MySQL服务是否运行');
    console.log('2. 数据库是否创建');
    console.log('3. .env文件配置');
    console.log('4. 运行 npm run db:push');
  } finally {
    await prisma.$disconnect();
  }
}

quickTest();
