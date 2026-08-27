import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bot, User, Loader2 } from 'lucide-react';
import { chat } from '../services/api';

export default function ProductChat({ analysis }) {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen && !sessionId && analysis) {
      initSession();
    }
  }, [isOpen, sessionId, analysis]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const initSession = async () => {
    setSessionLoading(true);
    try {
      const res = await chat.create({
        productUrl: analysis.resolvedUrl || analysis.requestedUrl,
        productName: analysis.product?.title,
        analysis,
      });
      setSessionId(res.data.sessionId);
    } catch (err) {
      console.error('Failed to create chat session:', err);
    } finally {
      setSessionLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading || !sessionId) return;
    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const res = await chat.sendMessage(sessionId, {
        content: userMsg,
        analysis,
      });
      setMessages((prev) => [...prev, { role: 'assistant', content: res.data.response }]);
    } catch (err) {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickQuestions = [
    'Is this worth buying?',
    'What are the biggest problems?',
    'Which marketplace is cheapest?',
    'Is there a better option?',
  ];

  return (
    <>
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-teal-600 text-white shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 transition-shadow"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <MessageCircle className="h-6 w-6" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 flex w-[400px] max-w-[calc(100vw-3rem)] flex-col rounded-2xl border border-white/10 bg-[#0F1117] shadow-2xl shadow-black/50"
            style={{ height: 'min(600px, calc(100vh - 6rem))' }}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/15">
                  <Bot className="h-5 w-5 text-teal-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Ask Ayymus</h3>
                  <p className="text-[11px] text-white/40">About this product</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 hover:bg-white/5 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {sessionLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-teal-400" />
                </div>
              )}

              {!sessionLoading && messages.length === 0 && (
                <div className="space-y-3">
                  <p className="text-[13px] text-white/50 text-center py-4">
                    Ask anything about this product
                  </p>
                  {quickQuestions.map((q) => (
                    <button
                      key={q}
                      onClick={() => { setInput(q); }}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-left text-[13px] text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-500/15 mt-0.5">
                      <Bot className="h-3.5 w-3.5 text-teal-400" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-teal-600 text-white rounded-br-md'
                        : 'bg-white/5 text-white/80 rounded-bl-md'
                    }`}
                  >
                    {msg.content}
                  </div>
                  {msg.role === 'user' && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 mt-0.5">
                      <User className="h-3.5 w-3.5 text-white/60" />
                    </div>
                  )}
                </motion.div>
              ))}

              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-500/15">
                    <Bot className="h-3.5 w-3.5 text-teal-400" />
                  </div>
                  <div className="flex items-center gap-1.5 rounded-2xl bg-white/5 px-4 py-3">
                    <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal-400" style={{ animationDelay: '0ms' }} />
                    <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal-400" style={{ animationDelay: '150ms' }} />
                    <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal-400" style={{ animationDelay: '300ms' }} />
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-white/10 px-5 py-4">
              <div className="flex items-center gap-3">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about this product..."
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-teal-500/50 transition-colors"
                  disabled={loading || sessionLoading}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || loading || sessionLoading}
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-600 text-white hover:bg-teal-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
