import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../prisma/prisma";
import bcrypt from "bcryptjs";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const {
      name,
      password,
      agentId: rawAgentId,
    } = req.body as {
      name?: string;
      password?: string;
      agentId?: string;
    };
    console.log(`name: ${name}, password: ${password}, agentId: ${rawAgentId}`);
    // 兼容：允许用 agentId 或 name 登录
    const loginId = (rawAgentId ?? name ?? "").trim();

    // 验证输入
    if (!password) {
      return res.status(400).json({
        success: false,
        message: "用户名/姓名和密码不能为空",
      });
    }

    if (loginId.length < 2 || loginId.length > 20) {
      return res.status(400).json({
        success: false,
        message: "用户名长度必须在2-20个字符之间",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "密码长度至少6位",
      });
    }

    // 在数据库中查找客服（支持用工号 agentId 或 姓名 name 登录），并获取密码字段进行比对
    const agent = await prisma.agent.findFirst({
      where: {
        OR: [{ agentId: loginId }, { name: loginId }],
      },
      select: {
        id: true,
        agentId: true,
        name: true,
        password: true,
        avatar: true,
        isOnline: true,
      },
    });

    if (!agent) {
      return res.status(401).json({
        success: false,
        message: "用户名或密码错误",
      });
    }

    // 验证密码（支持明文和 bcrypt 加密两种方式）
    let passwordValid = false;

    // 先尝试 bcrypt 验证（若数据库中是明文，compare 会返回 false 或抛错）
    try {
      passwordValid = await bcrypt.compare(password, agent.password);
    } catch (error) {
      // ignore; 在下方进行明文回退比较
    }

    // 若 bcrypt 校验未通过，则进行明文回退比较（兼容旧数据）
    if (!passwordValid) {
      passwordValid = password === agent.password;
    }

    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        message: "用户名或密码错误",
      });
    }

    // 登录成功，返回客服信息
    return res.status(200).json({
      success: true,
      message: "登录成功",
      agent: {
        id: agent.agentId, // 使用 agentId 作为前端使用的 ID
        name: agent.name,
        avatar: agent.avatar,
        isOnline: agent.isOnline,
      },
    });
  } catch (error) {
    console.error("客服登录验证失败:", error);
    return res.status(500).json({
      success: false,
      message: "服务器内部错误",
    });
  }
}
