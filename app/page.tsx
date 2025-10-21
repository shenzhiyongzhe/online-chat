"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, ArrowRight } from "lucide-react";
import { validateClientName } from "../lib/utils";
import { socketService } from "../lib/socket";
// 移除 Zustand store 依赖，使用本地状态管理
import { CurrentUser } from "../types";

export default function Home() {
  const [clientName, setClientName] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  // 本地状态管理 - 直接跳转，不需要全局状态
  const setCurrentUser = (user: CurrentUser | null) => {
    if (user) {
      // 将用户信息保存到 localStorage
      localStorage.setItem("clientNickname", user.name);
      // 跳转到客户端页面
      router.push("/client");
    }
  };

  const setConnected = (connected: boolean) => {
    // 主页面不需要连接状态管理
  };

  const handleStartChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateClientName(clientName)) {
      setError("请输入2-20个字符的昵称");
      return;
    }

    setIsConnecting(true);
    setError("");

    try {
      // 设置当前用户
      const currentUser: CurrentUser = {
        id: `CLIENT_${Date.now()}`,
        name: clientName.trim(),
        role: "client",
        isOnline: true,
      };
      setCurrentUser(currentUser);

      // 连接Socket
      const socket = socketService.connect();

      // 监听连接事件
      socket.on("connect", () => {
        console.log("Connected to server");
        setConnected(true);

        // 连接成功后发送用户登录事件
        socket.emit("user:login", currentUser);

        // 请求客服列表
        socket.emit("agents:list");

        // 跳转到客户聊天界面
        router.push("/client");
      });

      // 监听连接错误
      socket.on("connect_error", (error) => {
        setIsConnecting(false);
        setError("连接失败，请重试");
      });
    } catch (err) {
      setIsConnecting(false);
      setError("连接失败，请重试");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* 头部 */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-600 rounded-full">
              <MessageCircle className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">在线客服</h1>
          <p className="text-gray-600">输入您的昵称，开始与客服对话</p>
        </div>

        {/* 表单区域 */}
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          <form onSubmit={handleStartChat} className="space-y-6">
            {/* 客户昵称输入 */}
            <div className="space-y-2">
              <label
                htmlFor="clientName"
                className="block text-sm font-medium text-gray-700"
              >
                您的昵称
              </label>
              <input
                id="clientName"
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                maxLength={20}
                placeholder="请输入您的昵称"
                disabled={isConnecting}
              />
              <p className="text-xs text-gray-500">
                2-20个字符，支持中英文、数字
              </p>
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* 开始聊天按钮 */}
            <button
              type="submit"
              disabled={isConnecting || !clientName.trim()}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
            >
              {isConnecting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>连接中...</span>
                </>
              ) : (
                <>
                  <span>开始聊天</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* 客服登录链接 */}
          <div className="text-center">
            <p className="text-sm text-gray-500">
              您是客服？{" "}
              <a
                href="/admin"
                className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                点击这里登录
              </a>
            </p>
          </div>
        </div>

        {/* 特性介绍 */}
        <div className="grid grid-cols-1 gap-4 text-center">
          <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-1">实时对话</h3>
            <p className="text-sm text-gray-600">
              与客服实时沟通，快速解决问题
            </p>
          </div>
          <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-1">专业服务</h3>
            <p className="text-sm text-gray-600">
              专业客服团队为您提供优质服务
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
