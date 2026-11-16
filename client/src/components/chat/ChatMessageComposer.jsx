import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';

const MAX_MESSAGE_LENGTH = 1000;

const ChatMessageComposer = forwardRef(function ChatMessageComposer(
  { onSendMessage, onTyping, isBlocked, sending },
  ref
) {
  const [content, setContent] = useState('');
  const textareaRef = useRef(null);

  useImperativeHandle(ref, () => ({
    setText: (text) => {
      setContent(text);
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    },
    focus: () => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    },
  }));

  const handleChange = (e) => {
    const val = e.target.value;
    if (val.length <= MAX_MESSAGE_LENGTH) {
      setContent(val);
      if (onTyping) {
        onTyping(val.trim().length > 0);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || sending || isBlocked) return;

    const success = await onSendMessage(trimmed);
    if (success) {
      setContent('');
      if (onTyping) onTyping(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [content]);

  if (isBlocked) {
    return (
      <div className="p-4 bg-beige-100 border-t border-surface-border text-center">
        <div className="inline-flex items-center gap-2 text-sm text-text-secondary font-medium">
          <svg className="w-4 h-4 text-[#C75146] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          <span>This conversation is disabled because a user has been blocked.</span>
        </div>
      </div>
    );
  }

  const charCount = content.length;
  const isNearLimit = charCount > MAX_MESSAGE_LENGTH * 0.85;
  const isAtLimit = charCount >= MAX_MESSAGE_LENGTH;

  return (
    <form
      onSubmit={handleSubmit}
      className="p-3 sm:p-4 bg-surface border-t border-surface-border relative"
      aria-label="Chat Message Form"
    >
      <div className="flex items-end gap-2 bg-beige-50 border border-surface-border rounded-2xl p-2 focus-within:bg-surface focus-within:border-peach-deep focus-within:ring-2 focus-within:ring-peach-deep/20 transition-all shadow-2xs">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (Press Enter to send, Shift+Enter for new line)"
          rows={1}
          maxLength={MAX_MESSAGE_LENGTH}
          disabled={sending || isBlocked}
          aria-label="Message content"
          className="w-full resize-none bg-transparent text-sm text-text-primary placeholder-text-secondary/60 focus:outline-none max-h-36 py-1.5 px-2 leading-relaxed"
        />

        <div className="flex items-center gap-2 shrink-0 pb-0.5">
          {/* Character counter */}
          {charCount > 100 && (
            <span
              className={`text-[11px] font-mono select-none ${
                isAtLimit
                  ? 'text-[#C75146] font-bold'
                  : isNearLimit
                  ? 'text-[#D9A441]'
                  : 'text-text-secondary/70'
              }`}
            >
              {charCount}/{MAX_MESSAGE_LENGTH}
            </span>
          )}

          {/* Send button */}
          <button
            type="submit"
            disabled={!content.trim() || sending || isBlocked}
            aria-label="Send message"
            className="w-9 h-9 rounded-xl bg-peach-deep hover:bg-peach-deeper disabled:bg-beige-200 text-white disabled:text-text-secondary/50 flex items-center justify-center transition-colors shadow-xs cursor-pointer disabled:cursor-not-allowed group focus:outline-none focus:ring-2 focus:ring-peach-deep"
          >
            {sending ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg
                className="w-4 h-4 rotate-45 -mt-0.5 -ml-0.5 group-hover:scale-110 transition-transform"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            )}
          </button>
        </div>
      </div>
    </form>
  );
});

export default ChatMessageComposer;
