"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Plus,
  Edit,
  Trash2,
  ArrowLeft,
  Search,
  Eye,
  EyeOff,
  Save,
  X,
} from "lucide-react";

interface Agent {
  agentId: string;
  name: string;
  password?: string;
  isOnline?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export default function AgentManagementPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>(
    {}
  );

  // 表单状态
  const [formData, setFormData] = useState({
    agentId: "",
    name: "",
    password: "",
    confirmPassword: "",
  });
  const [formError, setFormError] = useState("");

  // 加载agents数据
  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/agents");
      const data = await response.json();

      if (data.success) {
        setAgents(data.agents || []);
      } else {
        console.error("加载agents失败:", data.message);
      }
    } catch (error) {
      console.error("加载agents失败:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 搜索过滤
  const filteredAgents = agents.filter((agent) =>
    agent.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 处理添加/编辑表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    // 验证表单
    if (!formData.agentId.trim()) {
      setFormError("请输入agent ID");
      return;
    }

    if (!formData.name.trim()) {
      setFormError("请输入agent名称");
      return;
    }

    if (!formData.password.trim()) {
      setFormError("请输入密码");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setFormError("两次输入的密码不一致");
      return;
    }

    if (formData.password.length < 6) {
      setFormError("密码长度至少6位");
      return;
    }

    try {
      const url = editingAgent
        ? `/api/agents/${editingAgent.agentId}`
        : "/api/agents";
      const method = editingAgent ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agentId: formData.agentId.trim(),
          name: formData.name.trim(),
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // 刷新列表
        await loadAgents();
        // 重置表单
        resetForm();
      } else {
        setFormError(data.message || "操作失败");
      }
    } catch (error) {
      console.error("操作失败:", error);
      setFormError("网络错误，请重试");
    }
  };

  // 删除agent
  const handleDelete = async (agent: Agent) => {
    if (!confirm(`确定要删除agent "${agent.name}" 吗？此操作不可撤销。`)) {
      return;
    }

    try {
      const response = await fetch(`/api/agents/${agent.agentId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        await loadAgents();
      } else {
        alert(data.message || "删除失败");
      }
    } catch (error) {
      console.error("删除失败:", error);
      alert("网络错误，请重试");
    }
  };

  // 重置表单
  const resetForm = () => {
    setFormData({
      agentId: "",
      name: "",
      password: "",
      confirmPassword: "",
    });
    setFormError("");
    setShowAddForm(false);
    setEditingAgent(null);
  };

  // 开始编辑
  const startEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setFormData({
      agentId: agent.agentId,
      name: agent.name,
      password: agent.password || "",
      confirmPassword: agent.password || "",
    });
    setFormError("");
  };

  // 切换密码显示
  const togglePasswordVisibility = (agentId: string) => {
    setShowPasswords((prev) => ({
      ...prev,
      [agentId]: !prev[agentId],
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push("/admin/monitor")}
                className="flex items-center text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Monitor页面
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <div className="flex items-center space-x-2">
                <Users className="h-6 w-6 text-blue-600" />
                <h1 className="text-xl font-semibold text-gray-900">
                  Agent管理
                </h1>
              </div>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              添加Agent
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 搜索栏 */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="搜索agent名称..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Agent列表 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {filteredAgents.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm ? "没有找到匹配的agent" : "暂无agent数据"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Agent信息
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      密码
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      状态
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      创建时间
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAgents.map((agent) => (
                    <tr key={agent.agentId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-medium text-sm">
                              {agent.name.charAt(0)}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {agent.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {agent.agentId}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-900 font-mono">
                            {showPasswords[agent.agentId]
                              ? agent.password
                              : "••••••••"}
                          </span>
                          <button
                            onClick={() =>
                              togglePasswordVisibility(agent.agentId)
                            }
                            className="text-gray-400 hover:text-gray-600"
                          >
                            {showPasswords[agent.agentId] ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            agent.isOnline
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {agent.isOnline ? "在线" : "离线"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {agent.createdAt
                          ? new Date(agent.createdAt).toLocaleString()
                          : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => startEdit(agent)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(agent)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 添加/编辑表单模态框 */}
      {(showAddForm || editingAgent) && (
        <div className="fixed inset-0  bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingAgent ? "编辑Agent" : "添加Agent"}
                </h3>
                <button
                  onClick={resetForm}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Agent ID
                </label>
                <input
                  type="text"
                  value={formData.agentId}
                  onChange={(e) =>
                    setFormData({ ...formData, agentId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="请输入agent ID"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Agent名称
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="请输入agent名称"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {editingAgent ? "新密码（留空则保持原密码）" : "密码"}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="请输入密码"
                  required={!editingAgent}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  确认密码
                </label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      confirmPassword: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="请再次输入密码"
                  required={!editingAgent}
                />
              </div>

              {formError && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                  {formError}
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {editingAgent ? "更新" : "创建"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
