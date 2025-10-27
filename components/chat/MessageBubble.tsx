import { Message } from "../../types";
import { formatMessageTime } from "../../lib/utils";
import { Check, CheckCheck, RefreshCw } from "lucide-react";

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  senderName: string;
  onRetry?: (msg: Message) => void;
  onFillForm?: (msg: Message) => void;
  isFormCompleted?: boolean;
}

export function MessageBubble({
  message,
  isOwn,
  senderName,
  onRetry,
  onFillForm,
  isFormCompleted = false,
}: MessageBubbleProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sending":
        return (
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
        );
      case "failed":
        return <RefreshCw className="w-3 h-3 text-red-500" />;
      case "sent":
        return <Check className="w-3 h-3 text-gray-400" />;
      case "delivered":
        return <CheckCheck className="w-3 h-3 text-gray-400" />;
      case "read":
        return <CheckCheck className="w-3 h-3 text-blue-500" />;
      default:
        return null;
    }
  };

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`flex max-w-xs lg:max-w-md ${
          isOwn ? "flex-row-reverse" : "flex-row"
        }`}
      >
        {/* 头像 */}
        <div className={`flex-shrink-0 ${isOwn ? "ml-3" : "mr-3"}`}>
          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-gray-600">
              {senderName.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>

        {/* 消息内容 */}
        <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
          {/* 发送者姓名（仅非自己的消息显示） */}
          {!isOwn && (
            <span className="text-xs text-gray-500 mb-1">{senderName}</span>
          )}

          {/* 消息气泡 */}
          <div
            className={`px-4 py-2 rounded-2xl ${
              isOwn
                ? "bg-blue-500 text-white rounded-br-md"
                : "bg-gray-100 text-gray-900 rounded-bl-md"
            }`}
          >
            <p className="text-sm whitespace-pre-wrap break-words">
              {message.content}
            </p>
          </div>

          {/* 表单请求按钮 */}
          {!isOwn && message.type === "form_request" && onFillForm && (
            <button
              onClick={() => onFillForm(message)}
              className={`mt-2 px-4 py-2 rounded-lg hover:opacity-90 transition-colors text-sm font-medium ${
                isFormCompleted
                  ? "bg-green-600 text-white"
                  : "bg-blue-600 text-white"
              }`}
            >
              {isFormCompleted ? "修改" : "填写表单"}
            </button>
          )}

          {/* 时间和状态 */}
          <div
            className={`flex items-center mt-1 space-x-1 ${
              isOwn ? "flex-row-reverse space-x-reverse" : ""
            }`}
          >
            <span className="text-xs text-gray-500">
              {formatMessageTime(message.timestamp)}
            </span>
            {isOwn && (
              <div className="flex items-center space-x-2">
                {getStatusIcon(message.status)}
                {/* 重试按钮，仅当失败时显示，可点击触发父组件的重试处理 */}
                {(message as any).status === "failed" && onRetry && (
                  <button
                    onClick={() => onRetry(message)}
                    className="text-xs text-red-600 hover:underline"
                    aria-label="重试发送"
                  >
                    重试
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
