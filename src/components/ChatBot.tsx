import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bot, 
  Send, 
  X, 
  MessageCircle, 
  Sparkles, 
  CornerDownLeft,
  ChevronRight
} from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: "👋 Hi there! I'm your Booking & Payment Manager AI Assistant. I'm here to guide you on how to use this app and help you with any questions or confusion!\n\nHere are some of the key things you can do here:\n- **Calendar Scheduling**: Book appointments, manage staff slots, and print beautiful ticket-like receipts.\n- **Dynamic Client Profiles**: Search clients and sort them by visits, total spending, or recent bookings.\n- **Prepaid Packages**: Sell and track packages/memberships to simplify repeat business.\n- **Payments Ledger**: Log and manage dues, settles, and packages purchases.\n\nHow can I help you today?"
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of conversation thread
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;
    
    setErrorMsg(null);
    const userMessage: Message = { role: 'user', text: textToSend };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Map message structure matching server.ts expect
      const payload = {
        message: textToSend,
        history: messages.map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          text: m.text
        }))
      };

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Could not connect to Gemini service. Please check your API key config.');
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setMessages(prev => [...prev, { role: 'assistant', text: data.text }]);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Something went wrong. Please check your setup.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickQuestion = (question: string) => {
    handleSendMessage(question);
  };

  return (
    <div className="fixed bottom-20 md:bottom-6 right-6 z-50 no-print" id="chatbot-container">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-[92vw] sm:w-[380px] h-[500px] flex flex-col overflow-hidden mb-4"
            id="chatbot-window"
          >
            {/* Header */}
            <div className="bg-indigo-600 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-white/10 rounded-lg">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider">App Assistant Guide</h3>
                  <span className="text-[10px] text-indigo-200 font-semibold flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-amber-300" /> Powered by Gemini
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/10 rounded-xl transition-all cursor-pointer"
                aria-label="Close chat"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Message Thread Area */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/70"
              id="chatbot-messages-list"
            >
              {messages.map((msg, index) => (
                <div 
                  key={index}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    {msg.role === 'assistant' && (
                      <div className="h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="h-4 w-4 text-indigo-600" />
                      </div>
                    )}
                    <div 
                      className={`rounded-2xl px-3.5 py-2.5 text-xs font-medium leading-relaxed shadow-xs whitespace-pre-wrap ${
                        msg.role === 'user' 
                          ? 'bg-indigo-600 text-white rounded-tr-none' 
                          : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
                      }`}
                    >
                      {/* Simple custom bold text formatter for assistant markdown-like bold syntax */}
                      {msg.text.split('\n').map((line, lIdx) => {
                        // Check if it's a list item
                        const isBullet = line.trim().startsWith('-');
                        let cleanLine = isBullet ? line.trim().substring(1).trim() : line;
                        
                        // Parse **bold** parts
                        const parts = [];
                        let lastIdx = 0;
                        const boldRegex = /\*\*(.*?)\*\*/g;
                        let match;
                        while ((match = boldRegex.exec(cleanLine)) !== null) {
                          if (match.index > lastIdx) {
                            parts.push(cleanLine.substring(lastIdx, match.index));
                          }
                          parts.push(<strong key={match.index} className="font-extrabold text-slate-950">{match[1]}</strong>);
                          lastIdx = boldRegex.lastIndex;
                        }
                        if (lastIdx < cleanLine.length) {
                          parts.push(cleanLine.substring(lastIdx));
                        }

                        return (
                          <div key={lIdx} className={isBullet ? "flex items-start gap-1.5 my-0.5" : "my-1"}>
                            {isBullet && <span className="text-indigo-500 mt-1 shrink-0">•</span>}
                            <span>{parts.length > 0 ? parts : cleanLine}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex gap-2 items-center">
                    <div className="h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-indigo-600 animate-pulse" />
                    </div>
                    <div className="bg-white border border-slate-100 rounded-2xl px-4 py-2 text-[10px] font-bold text-slate-400 flex items-center gap-1">
                      <span>Thinking</span>
                      <span className="animate-bounce delay-75">.</span>
                      <span className="animate-bounce delay-150">.</span>
                      <span className="animate-bounce delay-300">.</span>
                    </div>
                  </div>
                </div>
              )}

              {errorMsg && (
                <div className="bg-rose-50 border border-rose-100 text-rose-700 p-3 rounded-xl text-[10px] font-semibold">
                  ⚠️ {errorMsg}
                </div>
              )}
            </div>

            {/* Quick Questions suggestion */}
            {messages.length < 3 && !isLoading && (
              <div className="p-3 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-2">
                {[
                  "How to manage staff?",
                  "How to sort clients?",
                  "How to print receipts?"
                ].map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleQuickQuestion(q)}
                    className="text-[10px] font-bold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                  >
                    <span>{q}</span>
                    <ChevronRight className="h-3 w-3 text-slate-400" />
                  </button>
                ))}
              </div>
            )}

            {/* Footer Input Area */}
            <div className="p-3 bg-white border-t border-slate-100 flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(input)}
                placeholder="Ask me how to use the app..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-indigo-500 focus:bg-white"
                disabled={isLoading}
              />
              <button
                onClick={() => handleSendMessage(input)}
                disabled={isLoading || !input.trim()}
                className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white disabled:text-slate-400 rounded-xl transition-all cursor-pointer shadow-xs shrink-0"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Launcher Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-12 w-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all cursor-pointer transform hover:scale-105 active:scale-95"
        id="chatbot-launcher"
        title="App Guide Assistant"
      >
        {isOpen ? (
          <X className="h-5 w-5 text-white" />
        ) : (
          <div className="relative">
            <Bot className="h-6 w-6 text-white" />
            <span className="absolute -top-1 -right-1 h-2 w-2 bg-amber-400 rounded-full animate-ping" />
            <span className="absolute -top-1 -right-1 h-2 w-2 bg-amber-400 rounded-full" />
          </div>
        )}
      </button>
    </div>
  );
}
