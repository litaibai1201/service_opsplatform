import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useCollaboration } from '../../contexts/CollaborationProvider';
import { Comment, CommentReply } from '../../contexts/CollaborationProvider';

interface CommentSystemProps {
  elementId?: string;
  containerRef?: React.RefObject<HTMLElement>;
  showResolved?: boolean;
  maxComments?: number;
}

interface CommentThreadProps {
  comment: Comment;
  onResolve: (commentId: string) => void;
  onReply: (commentId: string, content: string) => void;
  onDelete: (commentId: string) => void;
  isOwner: boolean;
  canModerate: boolean;
}

interface CommentFormProps {
  onSubmit: (content: string) => void;
  onCancel: () => void;
  placeholder?: string;
  submitText?: string;
  autoFocus?: boolean;
}

// 评论表单组件
function CommentForm({
  onSubmit,
  onCancel,
  placeholder = "添加评论...",
  submitText = "发布",
  autoFocus = false,
}: CommentFormProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(content.trim());
      setContent('');
    } catch (error) {
      console.error('Failed to submit comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder={placeholder}
        className="w-full px-3 py-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        rows={3}
        disabled={isSubmitting}
      />
      
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">
          按 Ctrl+Enter 快速发布
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
            disabled={isSubmitting}
          >
            取消
          </button>
          <button
            type="submit"
            disabled={!content.trim() || isSubmitting}
            className="px-4 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '发布中...' : submitText}
          </button>
        </div>
      </div>
    </form>
  );
}

// 评论回复组件
function CommentReplyComponent({ 
  reply, 
  onDelete, 
  canDelete 
}: { 
  reply: CommentReply; 
  onDelete: (replyId: string) => void;
  canDelete: boolean;
}) {
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return diffMinutes < 1 ? '刚刚' : `${diffMinutes}分钟前`;
    }
    if (diffHours < 24) return `${diffHours}小时前`;
    
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex space-x-2 py-2 group">
      {/* 头像 */}
      <div className="flex-shrink-0">
        {reply.avatar ? (
          <img
            src={reply.avatar}
            alt={reply.username}
            className="w-6 h-6 rounded-full"
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center text-white text-xs font-medium">
            {reply.username.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* 内容 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">{reply.username}</span>
          <span className="text-xs text-gray-400">{formatTime(reply.timestamp)}</span>
          
          {canDelete && (
            <button
              onClick={() => onDelete(reply.id)}
              className="opacity-0 group-hover:opacity-100 text-xs text-red-500 hover:text-red-700"
            >
              删除
            </button>
          )}
        </div>
        
        <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{reply.content}</p>
      </div>
    </div>
  );
}

// 评论线程组件
function CommentThread({ 
  comment, 
  onResolve, 
  onReply, 
  onDelete, 
  isOwner, 
  canModerate 
}: CommentThreadProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [showReplies, setShowReplies] = useState(comment.replies.length > 0);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return diffMinutes < 1 ? '刚刚' : `${diffMinutes}分钟前`;
    }
    if (diffHours < 24) return `${diffHours}小时前`;
    
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleReply = (content: string) => {
    onReply(comment.id, content);
    setShowReplyForm(false);
  };

  return (
    <div className={`border rounded-lg p-4 ${comment.resolved ? 'bg-green-50 border-green-200' : 'bg-white'} shadow-sm`}>
      {/* 评论头部 */}
      <div className="flex items-start space-x-3">
        {/* 头像 */}
        <div className="flex-shrink-0">
          {comment.avatar ? (
            <img
              src={comment.avatar}
              alt={comment.username}
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
              {comment.username.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* 评论内容 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-2">
            <span className="font-medium text-gray-900">{comment.username}</span>
            <span className="text-sm text-gray-500">{formatTime(comment.timestamp)}</span>
            
            {comment.resolved && (
              <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                已解决
              </span>
            )}
          </div>
          
          <p className="text-gray-700 whitespace-pre-wrap mb-3">{comment.content}</p>

          {/* 操作按钮 */}
          <div className="flex items-center space-x-3 text-sm">
            {!comment.resolved && (
              <>
                <button
                  onClick={() => setShowReplyForm(!showReplyForm)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  回复
                </button>
                
                {(isOwner || canModerate) && (
                  <button
                    onClick={() => onResolve(comment.id)}
                    className="text-green-600 hover:text-green-800"
                  >
                    标记为已解决
                  </button>
                )}
              </>
            )}
            
            {comment.replies.length > 0 && (
              <button
                onClick={() => setShowReplies(!showReplies)}
                className="text-gray-600 hover:text-gray-800"
              >
                {showReplies ? '隐藏' : '显示'} {comment.replies.length} 条回复
              </button>
            )}
            
            {(isOwner || canModerate) && (
              <button
                onClick={() => onDelete(comment.id)}
                className="text-red-600 hover:text-red-800"
              >
                删除
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 回复表单 */}
      {showReplyForm && !comment.resolved && (
        <div className="mt-4 ml-11">
          <CommentForm
            onSubmit={handleReply}
            onCancel={() => setShowReplyForm(false)}
            placeholder="回复此评论..."
            submitText="回复"
            autoFocus
          />
        </div>
      )}

      {/* 回复列表 */}
      {showReplies && comment.replies.length > 0 && (
        <div className="mt-4 ml-11 space-y-2">
          {comment.replies.map(reply => (
            <CommentReplyComponent
              key={reply.id}
              reply={reply}
              onDelete={(replyId) => {
                // 这里需要实现删除回复的逻辑
                console.log('Delete reply:', replyId);
              }}
              canDelete={isOwner || canModerate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// 评论位置指示器
function CommentPositionIndicator({
  position,
  onClick,
  count,
}: {
  position: { x: number; y: number };
  onClick: () => void;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className="absolute transform -translate-x-1/2 -translate-y-1/2 bg-yellow-400 hover:bg-yellow-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-lg transition-colors z-40"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      {count}
    </button>
  );
}

// 主评论系统组件
export function CommentSystem({
  elementId,
  containerRef,
  showResolved = false,
  maxComments = 50,
}: CommentSystemProps) {
  const { 
    state, 
    addComment, 
    resolveComment, 
    replyToComment, 
    deleteComment 
  } = useCollaboration();
  
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [selectedComment, setSelectedComment] = useState<string | null>(null);
  const [clickPosition, setClickPosition] = useState<{ x: number; y: number } | null>(null);
  
  const currentUserId = state.currentUser?.userId;
  
  // 过滤评论
  const filteredComments = state.comments.filter(comment => {
    if (elementId && comment.elementId !== elementId) return false;
    if (!showResolved && comment.resolved) return false;
    return true;
  }).slice(0, maxComments);

  // 按位置分组评论
  const commentGroups = filteredComments.reduce((groups, comment) => {
    const key = `${comment.position.x}-${comment.position.y}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(comment);
    return groups;
  }, {} as Record<string, Comment[]>);

  // 处理点击事件添加评论
  const handleContainerClick = useCallback((e: MouseEvent) => {
    if (!containerRef?.current || isAddingComment) return;

    // 检查是否点击了评论相关元素
    const target = e.target as HTMLElement;
    if (target.closest('[data-comment-system]') || target.closest('.comment-thread')) {
      return;
    }

    // 按住Alt键时添加评论
    if (e.altKey) {
      e.preventDefault();
      const rect = containerRef.current.getBoundingClientRect();
      const position = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      
      setClickPosition(position);
      setIsAddingComment(true);
    }
  }, [containerRef, isAddingComment]);

  // 绑定点击事件
  useEffect(() => {
    const container = containerRef?.current;
    if (!container) return;

    container.addEventListener('click', handleContainerClick);
    return () => container.removeEventListener('click', handleContainerClick);
  }, [handleContainerClick, containerRef]);

  // 处理添加评论
  const handleAddComment = (content: string) => {
    if (!clickPosition) return;

    const targetElementId = elementId || 'document';
    addComment(targetElementId, content, clickPosition);
    
    setIsAddingComment(false);
    setClickPosition(null);
  };

  // 处理取消添加评论
  const handleCancelAdd = () => {
    setIsAddingComment(false);
    setClickPosition(null);
  };

  return (
    <div data-comment-system className="relative">
      {/* 评论位置指示器 */}
      {Object.entries(commentGroups).map(([key, comments]) => {
        const position = comments[0].position;
        return (
          <CommentPositionIndicator
            key={key}
            position={position}
            count={comments.length}
            onClick={() => setSelectedComment(selectedComment === key ? null : key)}
          />
        );
      })}

      {/* 添加评论表单（浮动） */}
      {isAddingComment && clickPosition && (
        <div
          className="absolute z-50 bg-white border rounded-lg shadow-xl p-4 w-80"
          style={{
            left: Math.min(clickPosition.x, (containerRef?.current?.clientWidth || 0) - 320),
            top: Math.max(0, clickPosition.y - 100),
          }}
        >
          <h4 className="font-medium text-gray-900 mb-3">添加评论</h4>
          <CommentForm
            onSubmit={handleAddComment}
            onCancel={handleCancelAdd}
            autoFocus
          />
        </div>
      )}

      {/* 选中的评论线程 */}
      {selectedComment && commentGroups[selectedComment] && (
        <div
          className="absolute z-40 bg-white border rounded-lg shadow-xl w-96 max-h-96 overflow-y-auto"
          style={{
            left: Math.min(
              commentGroups[selectedComment][0].position.x + 30,
              (containerRef?.current?.clientWidth || 0) - 384
            ),
            top: Math.max(0, commentGroups[selectedComment][0].position.y - 50),
          }}
        >
          <div className="p-4 border-b bg-gray-50">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">
                评论 ({commentGroups[selectedComment].length})
              </h4>
              <button
                onClick={() => setSelectedComment(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          <div className="p-4 space-y-4">
            {commentGroups[selectedComment].map(comment => (
              <CommentThread
                key={comment.id}
                comment={comment}
                onResolve={resolveComment}
                onReply={replyToComment}
                onDelete={deleteComment}
                isOwner={comment.userId === currentUserId}
                canModerate={true} // 这里应该基于用户权限
              />
            ))}
          </div>
        </div>
      )}

      {/* 使用说明（第一次使用时显示） */}
      {filteredComments.length === 0 && !isAddingComment && (
        <div className="absolute top-4 right-4 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700 max-w-64 z-30">
          <div className="flex items-start space-x-2">
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-medium mb-1">如何添加评论</p>
              <p>按住 Alt 键并点击任意位置即可添加评论</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 评论侧边栏组件
export function CommentSidebar({
  isOpen,
  onToggle,
  elementId,
  showResolved = false,
}: {
  isOpen: boolean;
  onToggle: () => void;
  elementId?: string;
  showResolved?: boolean;
}) {
  const { state, resolveComment, replyToComment, deleteComment } = useCollaboration();
  const currentUserId = state.currentUser?.userId;

  const filteredComments = state.comments.filter(comment => {
    if (elementId && comment.elementId !== elementId) return false;
    if (!showResolved && comment.resolved) return false;
    return true;
  });

  const resolvedCount = state.comments.filter(c => c.resolved).length;
  const unresolvedCount = state.comments.filter(c => !c.resolved).length;

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed right-4 top-1/2 transform -translate-y-1/2 bg-yellow-500 hover:bg-yellow-600 text-white p-3 rounded-l-lg shadow-lg z-40"
      >
        <div className="flex flex-col items-center space-y-1">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {unresolvedCount > 0 && (
            <span className="text-xs bg-red-500 rounded-full w-5 h-5 flex items-center justify-center">
              {unresolvedCount}
            </span>
          )}
        </div>
      </button>
    );
  }

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white border-l shadow-xl z-40 flex flex-col">
      {/* 头部 */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">评论</h3>
          <button
            onClick={onToggle}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
          <span>{unresolvedCount} 待解决</span>
          <span>{resolvedCount} 已解决</span>
        </div>
      </div>

      {/* 评论列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filteredComments.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p>还没有评论</p>
            <p className="text-sm">按 Alt + 点击 添加评论</p>
          </div>
        ) : (
          filteredComments.map(comment => (
            <CommentThread
              key={comment.id}
              comment={comment}
              onResolve={resolveComment}
              onReply={replyToComment}
              onDelete={deleteComment}
              isOwner={comment.userId === currentUserId}
              canModerate={true}
            />
          ))
        )}
      </div>
    </div>
  );
}