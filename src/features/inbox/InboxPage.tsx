import { useState } from 'react';
import { MessageThread } from '@/types';
import { SEED_MESSAGES } from '@/lib/mockData';
import { WidgetBoundary } from '@/components/system/WidgetBoundary';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { useUIStore } from '@/stores/uiStore';
import { cn } from '@/utils/cn';
import {
  MessageSquare,
  Mail,
  Smartphone,
  Send,
  Sparkles,
  CheckCheck,
} from 'lucide-react';

export function InboxPage() {
  const [threads, setThreads] = useState<MessageThread[]>(SEED_MESSAGES);
  const [activeThreadId, setActiveThreadId] = useState<string>(SEED_MESSAGES[0]?.id || '');
  const [replyText, setReplyText] = useState('');
  const { addToast } = useUIStore();

  const activeThread = threads.find((t) => t.id === activeThreadId) || threads[0];

  const handleSendMessage = (textToSend?: string) => {
    const content = textToSend || replyText;
    if (!content.trim() || !activeThread) return;

    const newMessage = {
      id: `msg_${Date.now()}`,
      sender: 'USER' as const,
      content: content,
      timestamp: 'Just now',
      status: 'SENT' as const,
    };

    const updatedThreads = threads.map((t) => {
      if (t.id === activeThread.id) {
        return {
          ...t,
          lastMessageSnippet: content,
          lastMessageAt: 'Just now',
          unreadCount: 0,
          messages: [...t.messages.filter((m) => m.sender !== 'AI_DRAFT'), newMessage],
        };
      }
      return t;
    });

    setThreads(updatedThreads);
    setReplyText('');

    addToast({
      type: 'success',
      title: 'Message Dispatched',
      message: `Sent via ${activeThread.contactChannel} to ${activeThread.contactName}`,
    });
  };

  const channelIcons = {
    WHATSAPP: <MessageSquare className="w-3.5 h-3.5 text-green-600" />,
    EMAIL: <Mail className="w-3.5 h-3.5 text-blue-600" />,
    SMS: <Smartphone className="w-3.5 h-3.5 text-indigo-600" />,
  };

  return (
    <div className="space-y-fib-21">
      {/* Header */}
      <div className="pb-fib-8 border-b border-neutral-200">
        <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight">
          Unified Multi-Channel Inbox
        </h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          Consolidated WhatsApp, SMS, and Email conversation threads with AI Draft copilot.
        </p>
      </div>

      {/* Main Inbox 2-Column Fibonacci Proportion Layout */}
      <WidgetBoundary name="unified-inbox-shell">
        <div className="skeuo-raised-2 bg-white rounded-xl border border-neutral-200 grid grid-cols-1 md:grid-cols-12 min-h-[600px] overflow-hidden">
          {/* Left Column: 5 Cols */}
          <div className="md:col-span-5 border-r border-neutral-200 bg-neutral-50/60 flex flex-col">
            <div className="p-fib-13 border-b border-neutral-200 bg-white font-bold text-xs text-neutral-800 flex items-center justify-between">
              <span>All Conversations</span>
              <span className="text-[11px] px-fib-8 py-0.5 rounded-pill bg-blue-100 text-blue-800">
                {threads.length} Active
              </span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-neutral-100">
              {threads.length === 0 ? (
                <div className="p-8 text-center text-xs text-neutral-500">
                  No conversation threads yet. Inbound customer communications across WhatsApp, SMS, and Email will appear here in real-time.
                </div>
              ) : (
                threads.map((t) => {
                  const isSelected = t.id === activeThreadId;
                  return (
                    <div
                      key={t.id}
                      onClick={() => setActiveThreadId(t.id)}
                      className={cn(
                        'p-fib-13 cursor-pointer transition-colors select-none flex items-start gap-fib-13',
                        isSelected ? 'bg-blue-50/70 border-l-4 border-l-blue-600' : 'hover:bg-neutral-100/70'
                      )}
                    >
                      <Avatar name={t.contactName} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="text-xs font-bold text-neutral-900 truncate">
                            {t.contactName}
                          </span>
                          <span className="text-[10px] text-neutral-400 font-mono">
                            {t.lastMessageAt}
                          </span>
                        </div>
                        <div className="flex items-center gap-fib-5 text-[11px] text-neutral-500 mb-1">
                          {channelIcons[t.contactChannel]}
                          <span className="truncate">{t.contactAddress}</span>
                        </div>
                        <p className="text-xs text-neutral-600 line-clamp-1">
                          {t.lastMessageSnippet}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: 7 Cols */}
          <div className="md:col-span-7 flex flex-col bg-white">
            {!activeThread ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-neutral-400">
                <MessageSquare className="w-12 h-12 stroke-1 mb-2 text-neutral-300" />
                <p className="text-sm font-semibold text-neutral-600">No active thread selected</p>
                <p className="text-xs text-neutral-400 max-w-xs mt-1">
                  Select a customer thread from the left or await new inbound conversations.
                </p>
              </div>
            ) : (
              <>
                {/* Conversation Header */}
                <div className="p-fib-13 border-b border-neutral-200 bg-white flex items-center justify-between">
                  <div className="flex items-center gap-fib-13">
                    <Avatar name={activeThread.contactName} size="sm" status="online" />
                    <div>
                      <div className="flex items-center gap-fib-8">
                        <h3 className="text-xs font-bold text-neutral-900">
                          {activeThread.contactName}
                        </h3>
                        <span className="text-[10px] font-semibold px-fib-8 py-0.2 rounded-pill bg-neutral-100 text-neutral-700 border border-neutral-200">
                          {activeThread.contactChannel}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500">{activeThread.contactAddress}</p>
                    </div>
                  </div>
                </div>

                {/* Messages Stream */}
                <div className="flex-1 overflow-y-auto p-fib-13 space-y-fib-13 bg-neutral-50/40">
                  {activeThread.messages.map((msg) => {
                    if (msg.sender === 'AI_DRAFT') {
                      return (
                        <div
                          key={msg.id}
                          className="p-fib-13 rounded-lg bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 text-xs space-y-fib-8 max-w-lg ml-auto shadow-sm"
                        >
                          <div className="flex items-center justify-between text-violet-800 font-bold text-[11px]">
                            <span className="flex items-center gap-fib-5">
                              <Sparkles className="w-3.5 h-3.5 text-violet-600" />
                              AI Suggested Quick Reply
                            </span>
                            <span className="text-[10px] uppercase font-mono px-fib-5 py-0.2 bg-violet-200 rounded">
                              Draft
                            </span>
                          </div>
                          <p className="text-neutral-800 leading-relaxed">{msg.content}</p>
                          <div className="flex items-center justify-end gap-fib-8 pt-1 border-t border-violet-100">
                            <Button
                              size="xs"
                              variant="primary"
                              icon={<Send className="w-3 h-3" />}
                              onClick={() => handleSendMessage(msg.content)}
                            >
                              Approve & Send
                            </Button>
                          </div>
                        </div>
                      );
                    }

                    const isMe = msg.sender === 'USER';
                    return (
                      <div
                        key={msg.id}
                        className={cn('flex flex-col max-w-md text-xs', isMe ? 'ml-auto items-end' : 'mr-auto items-start')}
                      >
                        <div
                          className={cn(
                            'p-fib-13 rounded-lg leading-relaxed shadow-sm',
                            isMe
                              ? 'bg-blue-600 text-white rounded-br-none'
                              : 'bg-white border border-neutral-200 text-neutral-800 rounded-bl-none'
                          )}
                        >
                          {msg.content}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-neutral-400 mt-1 font-mono">
                          <span>{msg.timestamp}</span>
                          {isMe && <CheckCheck className="w-3 h-3 text-blue-500" />}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Composer Bar */}
                <div className="p-fib-13 border-t border-neutral-200 bg-white">
                  <div className="skeuo-sunken rounded-lg p-fib-8 bg-neutral-100 focus-within:bg-white transition-all space-y-fib-8">
                    <textarea
                      rows={2}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={`Write a response via ${activeThread.contactChannel}...`}
                      className="w-full bg-transparent text-xs text-neutral-900 placeholder:text-neutral-400 outline-none resize-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />
                    <div className="flex items-center justify-between pt-1 border-t border-neutral-200/60">
                      <div className="flex items-center gap-2 text-neutral-400">
                        <button
                          type="button"
                          onClick={() => {
                            setReplyText(
                              'Thanks for reaching out! Our team is reviewing this and will get back to you shortly.'
                            );
                          }}
                          className="text-[11px] text-violet-700 font-semibold flex items-center gap-1 hover:text-violet-900 px-fib-5 py-0.5 rounded bg-violet-50"
                        >
                          <Sparkles className="w-3 h-3" />
                          Auto-generate reply
                        </button>
                      </div>
                      <Button
                        size="xs"
                        variant="primary"
                        icon={<Send className="w-3 h-3" />}
                        onClick={() => handleSendMessage()}
                      >
                        Send
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </WidgetBoundary>
    </div>
  );
}
