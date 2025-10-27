import { NextApiRequest, NextApiResponse } from "next";
import { Server as NetServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { prisma } from "../../../prisma/prisma";

export type NextApiResponseServerIO = NextApiResponse & {
  socket: {
    server: NetServer & {
      io: SocketIOServer;
    };
  };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponseServerIO
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

      // 检查表单是否已经完成
      const existingForm = await prisma.clientForm.findUnique({
        where: { conversationId },
      });

      const updatedForm = await prisma.clientForm.update({
        where: { conversationId },
        data: {
          ...formData,
          isCompleted: true,
        },
      });

      // 如果是首次提交（之前未完成），则发送消息
      if (existingForm) {
        // 格式化表单内容
        const formattedContent = `姓名：${formData.name || ""}
城市区镇：${formData.city || ""}
手机号码：${formData.phone || ""}
性别年龄：${formData.gender || ""} ${formData.age || ""}
要借多少：${formData.loanAmount || ""}
工作岗位：${formData.jobPosition || ""}
做了多久：${formData.jobDuration || ""}
月入多少：${formData.monthlyIncome || ""}
发工资日：${formData.payday || ""}
住房多久：${formData.housingDuration || ""}
租金多少：${formData.rent || ""}
跟谁同住：${formData.livingWith || ""}
婚姻状况：${formData.maritalStatus || ""}
有无子女：${formData.hasChildren || ""}
征信情况：${formData.creditStatus || ""}
借款用途：${formData.loanPurpose || ""}
有无房车：${formData.hasProperty || ""}
借空放没：${formData.emptyLoan || ""}
芝麻信用：${formData.sesameCredit || ""}
手机型号：${formData.phoneModel || ""}
身份证后六位：${formData.end_of_id || ""}`;

        // 获取会话信息
        const conversation = await prisma.conversation.findUnique({
          where: { id: conversationId },
          select: { clientId: true, agentId: true },
        });

        if (conversation) {
          // 创建消息
          const message = await prisma.message.create({
            data: {
              conversationId,
              senderId: conversation.clientId || "",
              content: formattedContent,
              type: "form_submitted",
              status: "sent",
            },
          });

          // 更新会话的最后消息
          await prisma.conversation.update({
            where: { id: conversationId },
            data: {
              lastMessage: `表单已提交`,
              lastMessageTime: new Date(),
            },
          });

          // 通过 Socket.IO 发送消息（如果服务器正在运行）
          if (res.socket?.server?.io) {
            const io = res.socket.server.io;
            const outgoing = {
              id: message.id,
              conversationId: message.conversationId,
              senderId: message.senderId,
              content: message.content,
              type: message.type,
              status: message.status,
              timestamp: message.createdAt.toISOString(),
            };

            // 发送给 agent
            if (conversation.agentId) {
              io.to(`user:${conversation.agentId}`).emit(
                "message:receive",
                outgoing
              );
            }

            // 发送给 client
            if (conversation.clientId) {
              io.to(`user:${conversation.clientId}`).emit(
                "message:receive",
                outgoing
              );
            }

            // 广播到管理员监控房间
            io.to("room:admin-monitor").emit("admin:message", {
              ...outgoing,
              conversation: {
                id: conversationId,
                agentId: conversation.agentId,
                clientId: conversation.clientId,
              },
            });
          }
        }
      }

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
