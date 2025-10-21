"use client";

import { useState, useEffect } from "react";
import { MessageCircle, X } from "lucide-react";

interface MessageNotificationProps {
  message: {
    id: string;
    content: string;
    senderName: string;
    conversationId: string;
    timestamp: string;
  };
  onClose: () => void;
  onClick: () => void;
}

export function MessageNotification({
  message,
  onClose,
  onClick,
}: MessageNotificationProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // 5秒后自动消失
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // 等待动画完成后调用onClose
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const handleClick = () => {
    onClick();
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  if (!isVisible) return null;

  return (
    <div className="max-w-sm">
      <div
        className={`bg-white rounded-lg shadow-lg border border-gray-200 p-4 cursor-pointer transform transition-all duration-300 ${
          isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
        }`}
        onClick={handleClick}
      >
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900 truncate">
                {message.senderName}
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsVisible(false);
                  setTimeout(onClose, 300);
                }}
                className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-gray-600 truncate mt-1">
              {message.content}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {new Date(message.timestamp).toLocaleTimeString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
