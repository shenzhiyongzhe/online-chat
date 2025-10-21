import { Conversation, CurrentUser } from "../../types";
import { formatTime } from "../../lib/utils";
import { cn } from "../../lib/utils";

interface ConversationListProps {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  currentUser: CurrentUser | null;
  onSelectConversation: (conversation: Conversation) => void;
  onShowAgentList?: () => void;
}

export function ConversationList({
  conversations,
  currentConversation,
  currentUser,
  onSelectConversation,
  onShowAgentList,
}: ConversationListProps) {
  const getConversationName = (conversation: Conversation) => {
    if (!currentUser) return "未知";

    // 根据当前用户角色显示对方姓名
    if (currentUser.role === "client") {
      // 客户看到的是客服姓名，这里需要从agents数据中获取
      return `客服 ${conversation.agentId}`;
    } else {
      // 客服看到的是客户ID
      return `客户 ${conversation.clientId}`;
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* 头部 */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {currentUser?.role === "client"
                ? "客户"
                : currentUser?.name || "客服"}
            </h2>
            <p className="text-sm text-gray-500">
              {currentUser?.isOnline ? "在线" : "离线"}
            </p>
          </div>
          {currentUser?.role === "client" && onShowAgentList && (
            <button
              onClick={onShowAgentList}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              title="客服列表"
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
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* 会话列表 */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <p className="text-sm">暂无对话</p>
            {currentUser?.role === "client" && (
              <p className="text-xs mt-1">请先搜索并选择客服</p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => onSelectConversation(conversation)}
                className={cn(
                  "w-full p-4 text-left hover:bg-gray-50 transition-colors",
                  currentConversation?.id === conversation.id &&
                    "bg-blue-50 border-r-2 border-blue-500"
                )}
              >
                <div className="flex items-start space-x-3">
                  {/* 头像 */}
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600">
                        {getConversationName(conversation).charAt(0)}
                      </span>
                    </div>
                  </div>

                  {/* 内容 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {getConversationName(conversation)}
                      </h3>
                      <span className="text-xs text-gray-500">
                        {conversation.lastMessageTime &&
                          formatTime(conversation.lastMessageTime)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-1">
                      <p className="text-sm text-gray-500 truncate">
                        {conversation.lastMessage || "暂无消息"}
                      </p>
                      {conversation.unreadCount > 0 && (
                        <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                          {conversation.unreadCount > 99
                            ? "99+"
                            : conversation.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
