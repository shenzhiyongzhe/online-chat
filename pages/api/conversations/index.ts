import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../prisma/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({
      success: false,
      message: `方法 ${req.method} 不被允许`,
    });
  }

  const { agentId } = req.query;

  if (!agentId || typeof agentId !== "string") {
    return res.status(400).json({
      success: false,
      message: "缺少agentId参数",
    });
  }

  try {
    const conversations = await prisma.conversation.findMany({
      where: { agentId: agentId },
      include: {
        client: {
          select: {
            clientId: true,
            name: true,
            phone: true,
          },
        },
      },
      orderBy: [{ unreadCount: "desc" }, { updatedAt: "desc" }],
    });

    // Transform the data to match the Conversation interface
    const formattedConversations = conversations.map((conv) => ({
      id: conv.id,
      type: conv.type,
      title: conv.title,
      agentId: conv.agentId,
      clientId: conv.clientId,
      updatedAt: conv.updatedAt.toISOString(),
      unreadCount: conv.unreadCount,
      lastMessage: conv.lastMessage,
      lastMessageTime: conv.lastMessageTime?.toISOString(),
      isActive: conv.isActive,
      clientDisplayName: conv.clientDisplayName,
      client: conv.client
        ? {
            id: conv.client.clientId,
            clientId: conv.client.clientId,
            name: conv.client.name,
            phone: conv.client.phone,
            isOnline: false, // We don't track online status in DB currently
          }
        : undefined,
    }));

    res.status(200).json({
      success: true,
      conversations: formattedConversations,
    });
  } catch (error) {
    console.error("获取会话列表失败:", error);
    res.status(500).json({
      success: false,
      message: "获取会话列表失败",
      error: error instanceof Error ? error.message : "未知错误",
    });
  }
}
