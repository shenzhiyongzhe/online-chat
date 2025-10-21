import { Agent } from "../../types";
import { cn } from "../../lib/utils";

interface AgentListModalProps {
  agents: Agent[];
  isOpen: boolean;
  onClose: () => void;
  onSelectAgent: (agent: Agent) => void;
}

export function AgentListModal({
  agents,
  isOpen,
  onClose,
  onSelectAgent,
}: AgentListModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* 模态框 */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden">
          {/* 头部 */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">在线客服</h2>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* 客服列表 */}
          <div className="max-h-96 overflow-y-auto">
            {agents.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <p className="text-sm">暂无在线客服</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {agents.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => {
                      onSelectAgent(agent);
                      onClose();
                    }}
                    className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      {/* 头像 */}
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                          <span className="text-lg font-medium text-gray-600">
                            {agent.name.charAt(0)}
                          </span>
                        </div>
                      </div>

                      {/* 信息 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {agent.name}
                          </h3>
                          <div className="flex items-center space-x-1">
                            <div
                              className={cn(
                                "w-2 h-2 rounded-full",
                                agent.isOnline ? "bg-green-500" : "bg-gray-400"
                              )}
                            />
                            <span className="text-xs text-gray-500">
                              {agent.isOnline ? "在线" : "离线"}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 truncate">
                          工号: {agent.id}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
