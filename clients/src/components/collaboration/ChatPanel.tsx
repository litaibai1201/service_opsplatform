import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useCollaboration } from '../../contexts/CollaborationProvider';
import { ChatMessage } from '../../contexts/CollaborationProvider';

interface ChatPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  position?: 'left' | 'right' | 'bottom';
  width?: number;
  height?: number;
  showParticipants?: boolean;
}

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

// 表情选择器
function EmojiPicker({ onEmojiSelect, isOpen, onClose }: EmojiPickerProps) {
  const emojiCategories = {
    '表情': ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍'],
    '手势': ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚'],
    '符号': ['❤️', '💔', '💕', '💖', '💗', '💘', '💙', '💚', '💛', '🧡', '💜', '🖤', '🤍', '🤎', '💯'],
    '其他': ['🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🎯', '⭐', '✨', '💫', '⚡', '🔥', '💡', '💰', '📝'],
  };

  if (!isOpen) return null;

  return (
    <div className="absolute bottom-12 left-0 bg-white border rounded-lg shadow-lg p-3 z-50 w-64">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-sm font-medium text-gray-700">选择表情</h4>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {Object.entries(emojiCategories).map(([category, emojis]) => (
          <div key={category}>
            <h5 className="text-xs text-gray-500 mb-1">{category}</h5>
            <div className="grid grid-cols-8 gap-1">
              {emojis.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => {
                    onEmojiSelect(emoji);
                    onClose();
                  }}
                  className="p-1 hover:bg-gray-100 rounded text-lg"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 消息组件
function MessageComponent({ 
  message, 
  isOwn, 
  showAvatar = true,
  onReact,
}: { 
  message: ChatMessage; 
  isOwn: boolean; 
  showAvatar?: boolean;
  onReact?: (messageId: string, emoji: string) => void;
}) {
  const [showReactions, setShowReactions] = useState(false);
  const reactions = ['👍', '❤️', '😂', '😮', '😢', '😡'];

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={`flex space-x-2 ${isOwn ? 'flex-row-reverse space-x-reverse' : ''} group`}>
      {/* 头像 */}
      {showAvatar && !isOwn && (
        <div className="flex-shrink-0">
          {message.avatar ? (
            <img
              src={message.avatar}
              alt={message.username}
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
              {message.username.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      )}

      <div className={`flex-1 max-w-xs ${isOwn ? 'text-right' : ''}`}>
        {/* 用户名和时间 */}
        {!isOwn && (
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-sm font-medium text-gray-700">{message.username}</span>
            <span className="text-xs text-gray-400">{formatTime(message.timestamp)}</span>
          </div>
        )}

        {/* 消息内容 */}
        <div className="relative">
          <div
            className={`px-3 py-2 rounded-lg ${
              isOwn
                ? 'bg-blue-500 text-white'
                : message.type === 'system'
                ? 'bg-gray-100 text-gray-600 text-center italic'
                : 'bg-white border text-gray-900'
            }`}
          >
            {message.type === 'file' ? (
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm">{message.message}</span>
              </div>
            ) : (
              <p className="text-sm whitespace-pre-wrap">{message.message}</p>
            )}
          </div>

          {/* 消息反应 */}
          {message.metadata?.reactions && (
            <div className="flex space-x-1 mt-1">
              {Object.entries(message.metadata.reactions).map(([emoji, count]) => (
                <button
                  key={emoji}
                  onClick={() => onReact?.(message.id, emoji)}
                  className="px-2 py-1 bg-gray-100 rounded-full text-xs flex items-center space-x-1 hover:bg-gray-200"
                >
                  <span>{emoji}</span>
                  <span>{count}</span>
                </button>
              ))}
            </div>
          )}

          {/* 快速反应按钮 */}
          <div className={`absolute ${isOwn ? 'left-0' : 'right-0'} top-0 opacity-0 group-hover:opacity-100 transition-opacity`}>
            <div className="relative">
              <button
                onClick={() => setShowReactions(!showReactions)}
                className="p-1 bg-white border rounded-full shadow-sm hover:bg-gray-50"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>

              {showReactions && (
                <div className="absolute bottom-full mb-1 bg-white border rounded-lg shadow-lg p-1 flex space-x-1">
                  {reactions.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => {
                        onReact?.(message.id, emoji);
                        setShowReactions(false);
                      }}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 时间（自己的消息） */}
        {isOwn && (
          <div className="text-xs text-gray-400 mt-1">
            {formatTime(message.timestamp)}
          </div>
        )}
      </div>
    </div>
  );
}

// 主聊天面板组件
export function ChatPanel({
  isOpen,
  onToggle,
  position = 'right',
  width = 320,
  height = 400,
  showParticipants = true,
}: ChatPanelProps) {
  const { state, sendChatMessage, getRoomUserCount } = useCollaboration();
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const messages = state.chatMessages;
  const currentUserId = state.currentUser?.userId;

  // 自动滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);

  // 处理消息发送
  const handleSendMessage = () => {
    if (!message.trim()) return;

    sendChatMessage(message);
    setMessage('');
    setIsTyping(false);
    
    // 重新聚焦输入框
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  // 处理键盘事件
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    setIsTyping(e.target.value.length > 0);
  };

  // 处理表情选择
  const handleEmojiSelect = (emoji: string) => {
    setMessage(prev => prev + emoji);
    inputRef.current?.focus();
  };

  // 处理消息反应
  const handleMessageReaction = (messageId: string, emoji: string) => {
    // 这里需要实现消息反应功能
    console.log('React to message:', messageId, emoji);
  };

  // 点击外部关闭表情选择器
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className={`fixed ${
          position === 'right' ? 'right-4' : 'left-4'
        } bottom-4 bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full shadow-lg transition-colors z-40`}
      >
        <div className="relative">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          
          {/* 未读消息指示器 */}
          {messages.length > 0 && (
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {messages.length > 99 ? '99+' : messages.length}
            </div>
          )}
        </div>
      </button>
    );
  }

  const panelStyle = {
    width: `${width}px`,
    height: `${height}px`,
    [position]: '16px',
  };

  return (
    <div
      ref={panelRef}
      className={`fixed ${
        position === 'bottom' ? 'bottom-4 left-1/2 transform -translate-x-1/2' : 'bottom-4'
      } bg-white border rounded-lg shadow-xl z-40 flex flex-col`}
      style={panelStyle}
    >
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-lg">
        <div className="flex items-center space-x-2">
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <h3 className="font-semibold text-gray-900">团队聊天</h3>
          {showParticipants && (
            <span className="text-sm text-gray-500">
              ({getRoomUserCount()} 人在线)
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {/* 最小化按钮 */}
          <button
            onClick={onToggle}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* 消息区域 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p>还没有消息</p>
            <p className="text-sm">开始与团队成员聊天吧！</p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageComponent
              key={msg.id}
              message={msg}
              isOwn={msg.userId === currentUserId}
              onReact={handleMessageReaction}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="border-t p-4">
        <div className="relative">
          {/* 表情选择器 */}
          <EmojiPicker
            onEmojiSelect={handleEmojiSelect}
            isOpen={showEmojiPicker}
            onClose={() => setShowEmojiPicker(false)}
          />

          {/* 输入框 */}
          <div className="flex items-end space-x-2">
            <div className="flex-1">
              <textarea
                ref={inputRef}
                value={message}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder="输入消息..."
                className="w-full px-3 py-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={1}
                style={{ minHeight: '40px', maxHeight: '100px' }}
              />
            </div>

            {/* 工具按钮 */}
            <div className="flex items-center space-x-1">
              {/* 表情按钮 */}
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>

              {/* 发送按钮 */}
              <button
                onClick={handleSendMessage}
                disabled={!message.trim()}
                className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>

          {/* 正在输入指示器 */}
          {isTyping && (
            <div className="text-xs text-gray-400 mt-1">
              正在输入...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 迷你聊天组件
export function MiniChat({ className = '' }: { className?: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={className}>
      <ChatPanel
        isOpen={isOpen}
        onToggle={() => setIsOpen(!isOpen)}
        width={280}
        height={350}
        showParticipants={false}
      />
    </div>
  );
}