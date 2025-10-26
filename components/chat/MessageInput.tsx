import { useState, KeyboardEvent, useEffect, useRef } from "react";
import { Send, ChevronDown, Edit2, Trash2, X } from "lucide-react";
import { Button } from "../ui/Button";

interface QuickTemplate {
  id: string;
  title: string;
  content: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
  agentId?: string;
}

export function MessageInput({
  onSendMessage,
  disabled = false,
  placeholder = "输入消息...",
  agentId,
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  // 快捷消息模板
  const [quickOpen, setQuickOpen] = useState(false);
  const [templates, setTemplates] = useState<QuickTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // 弹窗相关状态
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<QuickTemplate | null>(
    null
  );
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // 模板面板引用
  const templatePanelRef = useRef<HTMLDivElement>(null);

  // 加载快捷模板
  const loadTemplates = async () => {
    if (!agentId) return;

    try {
      const response = await fetch(`/api/quick-templates?agentId=${agentId}`);
      const data = await response.json();

      if (data.success) {
        setTemplates(data.templates);
      } else {
        console.error("加载模板失败:", data.message);
        // 如果加载失败，使用默认模板
        setTemplates([
          {
            id: "default-1",
            title: "默认模板1",
            content: "您好，请问有什么可以帮您？",
            order: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: "default-2",
            title: "默认模板2",
            content: "我这边帮您查看下，请稍等。",
            order: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: "default-3",
            title: "默认模板3",
            content: "已为您处理完毕，感谢等待。",
            order: 2,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]);
      }
    } catch (error) {
      console.error("加载模板失败:", error);
      setError("加载模板失败");
    }
  };

  // 保存模板
  const saveTemplate = async (
    template: Omit<QuickTemplate, "id" | "createdAt" | "updatedAt">
  ) => {
    if (!agentId) return null;

    try {
      const response = await fetch("/api/quick-templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agentId,
          title: template.title,
          content: template.content,
          order: template.order,
        }),
      });

      const data = await response.json();
      if (data.success) {
        return data.template;
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error("保存模板失败:", error);
      throw error;
    }
  };

  // 更新模板
  const updateTemplate = async (
    id: string,
    updates: Partial<QuickTemplate>
  ) => {
    try {
      const response = await fetch(`/api/quick-templates/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      const data = await response.json();
      if (data.success) {
        return data.template;
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error("更新模板失败:", error);
      throw error;
    }
  };

  // 删除模板
  const deleteTemplate = async (id: string) => {
    try {
      const response = await fetch(`/api/quick-templates/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error("删除模板失败:", error);
      throw error;
    }
  };

  // 组件加载时获取模板
  useEffect(() => {
    loadTemplates();
  }, [agentId]);

  // 自动清除错误信息
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // 点击外部关闭模板面板
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        quickOpen &&
        templatePanelRef.current &&
        !templatePanelRef.current.contains(event.target as Node)
      ) {
        setQuickOpen(false);
      }
    };

    if (quickOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [quickOpen]);

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage("");
    }
  };

  const handleTemplateInsert = (template: QuickTemplate) => {
    setMessage((prev) =>
      prev ? prev + "\n" + template.content : template.content
    );
    setQuickOpen(false);
  };

  const handleTemplateSend = (template: QuickTemplate) => {
    onSendMessage(template.content);
    setQuickOpen(false);
  };

  // 打开编辑弹窗
  const handleTemplateEdit = (template: QuickTemplate) => {
    setEditingTemplate(template);
    setEditTitle(template.title);
    setEditContent(template.content);
    setShowEditModal(true);
  };

  // 打开新增弹窗
  const handleAddTemplate = () => {
    setEditingTemplate(null);
    setEditTitle("");
    setEditContent("");
    setShowEditModal(true);
  };

  // 保存模板（编辑或新增）
  const handleSaveTemplate = async () => {
    if (!agentId || !editContent.trim()) {
      console.warn("保存模板失败: agentId或内容为空", { agentId, editContent });
      setError("模板内容不能为空");
      return;
    }
    setError(""); // 清除之前的错误
    setIsSaving(true);
    try {
      if (editingTemplate) {
        console.log("开始更新模板:", editingTemplate.id, {
          title: editTitle,
          content: editContent,
        });
        // 编辑现有模板
        await updateTemplate(editingTemplate.id, {
          title: editTitle,
          content: editContent,
        });
        setTemplates((prev) =>
          prev.map((t) =>
            t.id === editingTemplate.id
              ? { ...t, title: editTitle, content: editContent }
              : t
          )
        );
      } else {
        // 新增模板
        const newTemplate = {
          title: editTitle || "新模板",
          content: editContent,
          order: templates.length,
        };
        console.log("开始新增模板:", newTemplate);
        const savedTemplate = await saveTemplate(newTemplate);
        if (savedTemplate) {
          setTemplates((prev) => [...prev, savedTemplate]);
        } else {
          console.error("保存模板失败: 未返回模板数据", savedTemplate);
          throw new Error("保存模板失败: 未返回模板数据");
        }
      }
      setShowEditModal(false);
      setError("");
    } catch (error) {
      setError("保存模板失败");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTemplateDelete = async (idx: number) => {
    const template = templates[idx];
    if (!template.id.startsWith("default-")) {
      try {
        await deleteTemplate(template.id);
        setTemplates((prev) => prev.filter((_, i) => i !== idx));
      } catch (error) {
        setError("删除模板失败");
      }
    } else {
      // 默认模板直接删除
      setTemplates((prev) => prev.filter((_, i) => i !== idx));
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-4 border-t border-gray-200 bg-white">
      <div className="flex items-end space-x-3">
        {/* 快捷按钮和面板 */}
        <div className="relative" ref={templatePanelRef}>
          <button
            onClick={() => setQuickOpen((s) => !s)}
            className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-lg hover:bg-gray-200"
            aria-label="快捷回复"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
          {quickOpen && (
            <div className="absolute left-0 bottom-12 w-64 bg-white border rounded-lg shadow-lg z-40 p-2">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">快捷消息</div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleAddTemplate}
                    className="text-xs text-blue-600 hover:text-blue-800"
                    title="添加新模板"
                  >
                    + 添加
                  </button>
                </div>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {templates.map((template, idx) => (
                  <div key={template.id} className="flex items-center w-full">
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="text-xs text-gray-500 mb-1 truncate">
                        {template.title || `模板 ${idx + 1}`}
                      </div>
                      <div className="text-sm text-gray-800 truncate">
                        {template.content}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 flex-shrink-0">
                      <button
                        onClick={() => handleTemplateInsert(template)}
                        className="text-xs text-gray-600 hover:text-gray-800 px-1"
                        title="插入到输入框"
                      >
                        插入
                      </button>
                      <button
                        onClick={() => handleTemplateSend(template)}
                        className="text-xs text-green-600 hover:text-green-800 px-1"
                        title="直接发送"
                      >
                        发送
                      </button>
                      <button
                        onClick={() => handleTemplateEdit(template)}
                        className="text-xs text-gray-600 hover:text-gray-800"
                        title="编辑模板"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleTemplateDelete(idx)}
                        className="text-xs text-red-600 hover:text-red-800 px-1"
                        title="删除模板"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
                {templates.length === 0 && (
                  <div className="text-sm text-gray-500 text-center py-4">
                    暂无快捷模板
                  </div>
                )}
              </div>
              {error && (
                <div className="text-xs text-red-600 mt-2 p-2 bg-red-50 rounded">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex-1">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] max-h-32"
            style={{ height: "auto" }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = Math.min(target.scrollHeight, 128) + "px";
            }}
          />
        </div>
        <Button
          onClick={handleSend}
          disabled={!message.trim() || disabled}
          size="lg"
          className="px-4 py-3"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>

      {/* 编辑/新增模板弹窗 */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingTemplate ? "编辑模板" : "新增模板"}
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  模板标题
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="请输入模板标题（可选）"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  模板内容 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                  rows={4}
                  placeholder="请输入模板内容..."
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={isSaving}
              >
                取消
              </button>
              <button
                onClick={handleSaveTemplate}
                disabled={!editContent.trim() || isSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
