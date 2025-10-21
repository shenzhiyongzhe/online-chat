"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, User, Lock, ArrowLeft } from "lucide-react";
import { validateAgentCredentials } from "../../lib/utils";
import { CurrentUser } from "../../types";

export default function AdminLogin() {
  const [agentId, setAgentId] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  // 本地状态管理 - 直接跳转，不需要全局状态
  const setCurrentUser = (user: CurrentUser | null) => {
    if (user) {
      console.log("setCurrentUser 被调用，用户数据:", user);

      try {
        // 将用户信息保存到 localStorage
        const userData = JSON.stringify(user);
        localStorage.setItem("agentInfo", userData);
        console.log("数据已保存到 localStorage，键名: agentInfo");

        // 验证保存是否成功
        const savedData = localStorage.getItem("agentInfo");
        if (savedData === userData) {
          console.log("数据保存验证成功");
          // 延迟跳转，确保数据保存完成
          setTimeout(() => {
            console.log("准备跳转到客服页面");
            router.push("/agent");
          }, 100);
        } else {
          console.error("数据保存验证失败");
        }
      } catch (error) {
        console.error("保存用户数据失败:", error);
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // 基本验证
    if (!agentId.trim() || !password.trim()) {
      setError("请输入用户名和密码");
      return;
    }

    if (agentId.length < 2 || agentId.length > 20) {
      setError("用户名长度必须在2-20个字符之间");
      return;
    }

    if (password.length < 6) {
      setError("密码长度至少6位");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // 请求后端验证登录
      const response = await fetch("/api/auth/agent-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: agentId, // 使用 agentId 字段作为用户名
          password: password,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.message || "登录失败");
        setIsLoading(false);
        return;
      }

      // 登录成功，设置当前用户
      const currentUser: CurrentUser = {
        id: data.agent.id,
        name: data.agent.name,
        role: "agent",
        isOnline: true,
      };
      console.log("登录成功，准备保存用户数据:", currentUser);
      setCurrentUser(currentUser);
      console.log("用户数据已保存到 localStorage");
    } catch (err) {
      console.error("登录请求失败:", err);
      setIsLoading(false);
      setError("网络错误，请检查连接后重试");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* 头部 */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-gray-800 rounded-full">
              <LogIn className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">客服工作台</h1>
          <p className="text-gray-600">请使用您的账号密码登录</p>
        </div>

        {/* 登录表单 */}
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label
                htmlFor="agentId"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                用户名
              </label>
              <div className="relative">
                <input
                  id="agentId"
                  type="text"
                  value={agentId}
                  onChange={(e) => setAgentId(e.target.value)}
                  placeholder="请输入您的用户名"
                  className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition-all"
                />
                <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                密码
              </label>
              <div className="relative">
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入您的密码"
                  className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition-all"
                />
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !agentId.trim() || !password.trim()}
              className="w-full bg-gray-800 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-900 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? "登录中..." : "登录"}
            </button>
          </form>

          {/* 测试账号提示 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-800 mb-2">测试账号</h3>
            <div className="text-xs text-blue-700 space-y-1">
              <p>用户名: 张三, 密码: 123456</p>
              <p>用户名: 李四, 密码: 123456</p>
              <p>用户名: 王五, 密码: 123456</p>
            </div>
          </div>

          {/* 管理员监控入口 */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-green-800 mb-2">
              管理员功能
            </h3>
            <button
              onClick={() => router.push("/admin/monitor")}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all text-sm"
            >
              实时监控所有会话
            </button>
          </div>
        </div>

        {/* 返回首页 */}
        <div className="text-center">
          <button
            onClick={() => router.push("/")}
            className="inline-flex items-center text-gray-600 hover:text-gray-800 font-medium text-sm"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            返回首页
          </button>
        </div>
      </div>
    </div>
  );
}
