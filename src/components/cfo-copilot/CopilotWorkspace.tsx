"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Bot, 
  Sparkles, 
  Send, 
  Plus, 
  Trash2, 
  MessageSquare, 
  TrendingUp, 
  AlertTriangle, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Terminal, 
  Building2,
  Activity,
  FileText,
  RefreshCw,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  ArrowLeft,
  SlidersHorizontal,
  ShieldCheck,
  ExternalLink,
  Brain,
  Cpu
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

interface ChatSession {
  chatId: string;
  tenantId: string | number;
  title: string;
  createdAt: string;
  updatedAt: string;
  lastMessage?: string;
}

interface ToolActivity {
  toolName: string;
  args: any;
  status: 'SUCCESS' | 'ERROR';
  resultSummary: string;
  recordsCount: number;
}

interface ChatMessage {
  id: string;
  chatId: string;
  tenantId: string | number;
  role: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  debugActivities?: ToolActivity[];
  isStreaming?: boolean;
}

interface ModelOption {
  id: string;
  label: string;
  tag: string;
}

const CHAT_PROMPTS = [
  {
    id: 'risk_scan',
    title: 'Financial Risk & Anomaly Audit',
    subtitle: 'Scan for unusual vendor outlays, duplicate expense entries & cost spikes',
    prompt: 'Run a deep anomaly scan to identify unusual transactions, cost spikes, or suspicious payments across my accounts.',
    badge: 'Audit & Risks',
    icon: AlertTriangle,
    iconColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20'
  },
  {
    id: 'cash_drivers',
    title: 'Cashflow Inflows & Outflows Breakdown',
    subtitle: 'Identify top customer collections, supplier payments & 30-day liquidity buffer',
    prompt: 'Show me top customer collections (cash inflows) and top supplier payments (cash outflows) for this period.',
    badge: 'Cash Velocity',
    icon: TrendingUp,
    iconColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
  },
  {
    id: 'pnl_review',
    title: 'Profit & Loss & Margin Review',
    subtitle: 'Analyze gross margin, net profit variance, revenue channels & OpEx growth',
    prompt: 'Analyze my Profit & Loss performance, revenue margins, gross profit, and main operating expense breakdown.',
    badge: 'P&L Review',
    icon: Activity,
    iconColor: 'text-blue-400 bg-blue-500/10 border-blue-500/20'
  },
  {
    id: 'ar_recovery',
    title: 'Overdue Invoices & AR Recovery Status',
    subtitle: 'List overdue customer invoices, days outstanding (DSO) & recovery action plan',
    prompt: 'Which customer sales invoices are currently overdue and what is our accounts receivable collection status?',
    badge: 'AR / Receivables',
    icon: FileText,
    iconColor: 'text-purple-400 bg-purple-500/10 border-purple-500/20'
  }
];

export function CopilotWorkspace({ initialChatId }: { initialChatId?: string }) {
  const router = useRouter();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string>(initialChatId || '');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [loadingSessions, setLoadingSessions] = useState<boolean>(true);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [expandedTraceMap, setExpandedTraceMap] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Dynamic Model Selection from Admin Settings
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([
    { id: 'omega-plus', label: 'Ω Omega Plus', tag: 'Fast Proxy' }
  ]);
  const [selectedModel, setSelectedModel] = useState<string>('omega-plus');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (initialChatId && initialChatId !== activeChatId) {
      setActiveChatId(initialChatId);
    }
  }, [initialChatId]);

  // Fetch Admin Enabled Models (No Store Cache)
  const fetchAvailableModels = async () => {
    try {
      const res = await fetch(`/api/cfo/copilot/models?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.models) && data.models.length > 0) {
          setAvailableModels(data.models);
          if (data.defaultModel && data.models.some((m: any) => m.id === data.defaultModel)) {
            setSelectedModel(data.defaultModel);
          } else {
            setSelectedModel(data.models[0].id);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load active LLM models:', err);
    }
  };

  const fetchSessions = async (autoSelect = false) => {
    try {
      const res = await fetch('/api/cfo/copilot/chats');
      if (res.ok) {
        const data = await res.json();
        const list = data.sessions || [];
        setSessions(list);

        if (list.length > 0) {
          if ((!activeChatId && autoSelect) || (initialChatId && !list.some((s: any) => s.chatId === initialChatId))) {
            setActiveChatId(list[0].chatId);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load chat sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  const fetchMessages = async (chatId: string) => {
    if (!chatId || isGenerating) {
      return;
    }
    try {
      const res = await fetch(`/api/cfo/copilot/chats?chatId=${chatId}`);
      if (res.ok) {
        const data = await res.json();
        if (!isGenerating) {
          setMessages(data.messages || []);
        }
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  useEffect(() => {
    fetchAvailableModels();
    fetchSessions(true);
  }, []);

  useEffect(() => {
    if (activeChatId && !isGenerating) {
      fetchMessages(activeChatId);
    } else if (!activeChatId && !isGenerating) {
      setMessages([]);
    }
  }, [activeChatId, isGenerating]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  const createNewChat = async () => {
    if (isGenerating) return;
    try {
      const res = await fetch('/api/cfo/copilot/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CREATE', title: 'New Financial Analysis' })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.session) {
          const newChatId = data.session.chatId;
          setActiveChatId(newChatId);
          setMessages([]);
          fetchSessions();
          router.push(`/cfo-copilot/${newChatId}`);
        }
      }
    } catch (err) {
      toast.error('Failed to create new chat session');
    }
  };

  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isGenerating) return;
    try {
      const res = await fetch('/api/cfo/copilot/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'DELETE', chatId })
      });
      if (res.ok) {
        toast.success('Chat thread deleted');
        const remaining = sessions.filter(s => s.chatId !== chatId);
        setSessions(remaining);
        if (activeChatId === chatId) {
          if (remaining.length > 0) {
            const nextId = remaining[0].chatId;
            setActiveChatId(nextId);
            router.push(`/cfo-copilot/${nextId}`);
          } else {
            setActiveChatId('');
            router.push('/cfo-copilot');
          }
        }
      }
    } catch (err) {
      toast.error('Failed to delete chat');
    }
  };

  const selectChatThread = (chatId: string) => {
    if (isGenerating) return;
    setActiveChatId(chatId);
    router.push(`/cfo-copilot/${chatId}`);
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || inputPrompt).trim();
    if (!textToSend || isGenerating) return;

    let targetChatId = activeChatId;

    if (!targetChatId) {
      try {
        const res = await fetch('/api/cfo/copilot/chats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'CREATE', title: textToSend.substring(0, 35) + '...' })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.session) {
            targetChatId = data.session.chatId;
            setActiveChatId(targetChatId);
            if (typeof window !== 'undefined') {
              window.history.pushState(null, '', `/cfo-copilot/${targetChatId}`);
            }
          }
        }
      } catch (e) {}
    }

    if (!targetChatId) targetChatId = 'chat_' + Date.now();

    setInputPrompt('');
    setIsGenerating(true);

    const userMsg: ChatMessage = {
      id: 'msg_user_' + Date.now(),
      chatId: targetChatId,
      tenantId: '',
      role: 'user',
      text: textToSend,
      timestamp: new Date().toISOString()
    };

    const assistantMsgId = 'msg_asst_' + Date.now();
    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      chatId: targetChatId,
      tenantId: '',
      role: 'assistant',
      text: '',
      timestamp: new Date().toISOString(),
      debugActivities: [],
      isStreaming: true
    };

    setMessages(prev => [...prev, userMsg, assistantMsg]);

    try {
      const response = await fetch('/api/cfo/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: targetChatId,
          message: textToSend,
          model: selectedModel
        })
      });

      if (!response.ok) throw new Error('Failed to execute financial investigation.');
      if (!response.body) throw new Error('ReadableStream not supported.');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        streamBuffer += decoder.decode(value, { stream: true });
        const lines = streamBuffer.split('\n');
        streamBuffer = lines.pop() || '';

        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.substring(6).trim();
              if (!jsonStr) continue;
              const evt = JSON.parse(jsonStr);

              if (evt.type === 'tool_done') {
                setMessages(prev => prev.map(m => {
                  if (m.id === assistantMsgId) {
                    const currentLogs = m.debugActivities || [];
                    const exists = currentLogs.some(l => l.toolName === evt.name && l.resultSummary === evt.summary);
                    if (!exists) {
                      return {
                        ...m,
                        debugActivities: [
                          ...currentLogs,
                          {
                            toolName: evt.name,
                            args: {},
                            status: evt.status || 'SUCCESS',
                            resultSummary: evt.summary || 'Completed',
                            recordsCount: evt.count || 1
                          }
                        ]
                      };
                    }
                  }
                  return m;
                }));
              } else if (evt.type === 'token') {
                setMessages(prev => prev.map(m => {
                  if (m.id === assistantMsgId) {
                    return { ...m, text: m.text + evt.content };
                  }
                  return m;
                }));
              } else if (evt.type === 'done') {
                setMessages(prev => prev.map(m => {
                  if (m.id === assistantMsgId) {
                    return {
                      ...m,
                      isStreaming: false,
                      debugActivities: evt.debugActivities || m.debugActivities
                    };
                  }
                  return m;
                }));
              } else if (evt.type === 'error') {
                setMessages(prev => prev.map(m => {
                  if (m.id === assistantMsgId) {
                    return {
                      ...m,
                      text: m.text + `\n\n> ⚠️ **Error**: ${evt.error}`,
                      isStreaming: false
                    };
                  }
                  return m;
                }));
              }
            } catch (e) {
              console.warn('Error parsing SSE event:', e);
            }
          }
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Error executing AI analysis');
      setMessages(prev => prev.map(m => {
        if (m.id === assistantMsgId) {
          return {
            ...m,
            text: m.text + `\n\n> ⚠️ **Error**: Unable to complete analysis. (${err.message})`,
            isStreaming: false
          };
        }
        return m;
      }));
    } finally {
      setIsGenerating(false);
      fetchSessions();
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleTraceDrawer = (msgId: string) => {
    setExpandedTraceMap(prev => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const filteredSessions = sessions.filter(s => 
    !searchFilter || s.title.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const activeSessionTitle = sessions.find(s => s.chatId === activeChatId)?.title || 'New Financial Chat';

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#090d16] text-slate-100 font-sans relative">
      
      {/* ========================================================================= */}
      {/* LEFT CHAT SIDEBAR (CHATGPT / CLAUDE SLEEK THREAD HISTORY) */}
      {/* ========================================================================= */}
      <div
        className={cn(
          "bg-[#0e131f] border-r border-[#1e2638] flex flex-col shrink-0 transition-all duration-300 relative z-20 shadow-2xl",
          isSidebarCollapsed ? "w-16" : "w-72"
        )}
      >
        {/* Top App Branding & Return to Dashboard button */}
        <div className="p-3.5 border-b border-[#1e2638] flex items-center justify-between">
          {!isSidebarCollapsed ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center text-white shadow-lg border border-emerald-400/30">
                  <Brain className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-xs font-black text-white tracking-wider uppercase">Virtual CFO</h2>
                  <p className="text-[10px] text-emerald-400 font-semibold">Intelligence Hub</p>
                </div>
              </div>

              <button
                onClick={() => router.push('/')}
                className="p-1.5 rounded-lg bg-[#182030] hover:bg-[#232e44] text-slate-400 hover:text-white transition cursor-pointer border border-[#273248]"
                title="Return to Main Dashboard"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => router.push('/')}
              className="h-9 w-9 mx-auto rounded-xl bg-[#182030] hover:bg-[#232e44] text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer border border-[#273248]"
              title="Return to Main Dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* New Chat CTA Button */}
        <div className="p-3 border-b border-[#1e2638]/60">
          {isSidebarCollapsed ? (
            <button
              onClick={createNewChat}
              className="h-10 w-10 mx-auto rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white flex items-center justify-center shadow-md transition cursor-pointer"
              title="New Chat (⌘N)"
            >
              <Plus className="h-5 w-5" />
            </button>
          ) : (
            <button
              onClick={createNewChat}
              className="w-full flex items-center justify-between py-2.5 px-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black tracking-wide shadow-lg shadow-emerald-950/40 transition cursor-pointer group border border-emerald-400/30"
            >
              <span className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-white group-hover:rotate-90 transition-transform duration-300" />
                <span>New Financial Chat</span>
              </span>
              <span className="text-[10px] bg-black/20 px-1.5 py-0.5 rounded font-mono text-emerald-200">⌘N</span>
            </button>
          )}
        </div>

        {/* Search Input */}
        {!isSidebarCollapsed && (
          <div className="px-3 py-2 border-b border-[#1e2638]/40">
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search history..."
                className="w-full bg-[#141b2b] border border-[#1e2638] rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 outline-none focus:border-emerald-500 transition font-medium placeholder:text-slate-500"
              />
            </div>
          </div>
        )}

        {/* Threads List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {loadingSessions ? (
            <div className="p-4 text-center text-xs text-slate-500 font-medium animate-pulse">
              {!isSidebarCollapsed && "Loading chat threads..."}
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500 font-medium">
              {!isSidebarCollapsed && "No past chats yet."}
            </div>
          ) : (
            filteredSessions.map((s) => {
              const isActive = s.chatId === activeChatId;

              if (isSidebarCollapsed) {
                return (
                  <button
                    key={s.chatId}
                    onClick={() => selectChatThread(s.chatId)}
                    className={cn(
                      "h-9 w-9 mx-auto rounded-xl flex items-center justify-center transition cursor-pointer my-1",
                      isActive ? "bg-emerald-600 text-white shadow-md" : "text-slate-400 hover:bg-[#182030]"
                    )}
                    title={s.title}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </button>
                );
              }

              return (
                <div
                  key={s.chatId}
                  onClick={() => selectChatThread(s.chatId)}
                  className={cn(
                    "group flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all text-xs border my-0.5",
                    isActive
                      ? "bg-[#182030] text-white border-[#273248] border-l-2 border-l-emerald-400 font-bold shadow-md"
                      : "text-slate-400 hover:bg-[#141b2b] hover:text-slate-200 border-transparent"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <MessageSquare className={cn("h-3.5 w-3.5 shrink-0", isActive ? "text-emerald-400" : "text-slate-500")} />
                    <span className="truncate text-xs font-semibold">{s.title || 'Financial Analysis'}</span>
                  </div>

                  <button
                    onClick={(e) => handleDeleteChat(s.chatId, e)}
                    className="opacity-0 group-hover:opacity-100 h-5 w-5 rounded hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 flex items-center justify-center transition shrink-0 ml-1 cursor-pointer"
                    title="Delete Thread"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Org Badge */}
        {!isSidebarCollapsed && (
          <div className="p-3 bg-[#090d16] border-t border-[#1e2638] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-emerald-400" />
              <span className="font-bold text-slate-300">MI Health Ltd</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold">
              Xero Live
            </span>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MAIN PURE CHAT CANVAS (CHATGPT / CLAUDE ULTRA-CLEAN FULLSCREEN WORKSPACE) */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col bg-[#090d16] relative overflow-hidden h-full">
        
        {/* Sleek Minimal Header with LLM Model Selector (Populated from Admin Settings) */}
        <div className="px-4 md:px-8 py-3 bg-[#0e131f]/90 backdrop-blur border-b border-[#1e2638] flex items-center justify-between gap-4 z-10 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-1.5 rounded-xl bg-[#141b2b] hover:bg-[#1e2638] text-slate-400 hover:text-white transition border border-[#1e2638] cursor-pointer shrink-0"
              title={isSidebarCollapsed ? "Expand History" : "Collapse Sidebar"}
            >
              {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>

            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-xs md:text-sm font-black text-white tracking-tight truncate">
                {messages.length > 0 ? activeSessionTitle : "Virtual CFO AI Copilot"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            
            {/* Dynamic Admin-Enabled LLM Model Selector Dropdown */}
            <div className="relative">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-[#141b2b] hover:bg-[#1e2638] border border-[#1e2638] text-xs font-bold text-emerald-400 rounded-xl px-3 py-1.5 outline-none cursor-pointer transition font-mono pr-7 appearance-none"
              >
                {availableModels.map(m => (
                  <option key={m.id} value={m.id} className="bg-[#0e131f] text-slate-200">
                    {m.label} ({m.tag})
                  </option>
                ))}
              </select>
              <ChevronDown className="h-3.5 w-3.5 text-emerald-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <span className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold font-mono">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Autonomous AI Active
            </span>

            <button
              onClick={createNewChat}
              className="p-1.5 rounded-xl bg-[#141b2b] hover:bg-[#1e2638] text-slate-300 hover:text-white transition border border-[#1e2638] cursor-pointer text-xs font-semibold flex items-center gap-1.5"
              title="Start New Thread"
            >
              <Plus className="h-4 w-4 text-emerald-400" />
              <span className="hidden md:inline">New Chat</span>
            </button>
          </div>
        </div>

        {/* Central Chat Stream Area */}
        <div className="flex-1 overflow-y-auto px-4 md:px-12 py-8 space-y-6">
          
          {/* Welcome Hero Screen (When thread is empty) */}
          {messages.length === 0 && (
            <div className="max-w-3xl mx-auto my-8 text-center space-y-8 animate-fadeIn">
              
              <div className="relative inline-block">
                <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 opacity-30 blur-xl"></div>
                <div className="relative h-20 w-20 mx-auto rounded-3xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center text-white shadow-2xl border border-emerald-400/40">
                  <Sparkles className="h-10 w-10" />
                </div>
              </div>

              <div>
                <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">How can I assist your CFO decisions today?</h2>
                <p className="text-xs text-slate-400 font-medium mt-2.5 max-w-lg mx-auto leading-relaxed">
                  Select a targeted financial investigation workflow below or ask any custom questions regarding Cashflow Drivers, P&L Margins, AR Recovery, or Anomaly Audits.
                </p>
              </div>

              {/* 4 Sleek Prompt Cards (2x2 Grid) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left pt-2">
                {CHAT_PROMPTS.map((sp) => {
                  const IconComp = sp.icon;
                  return (
                    <div
                      key={sp.id}
                      onClick={() => handleSendMessage(sp.prompt)}
                      className="bg-[#0e131f] hover:bg-[#141b2b] border border-[#1e2638] hover:border-emerald-500/50 p-5 rounded-2xl cursor-pointer transition-all duration-200 group shadow-lg flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border", sp.iconColor)}>
                            {sp.badge}
                          </span>
                          <IconComp className="h-4 w-4 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                        </div>

                        <h3 className="text-xs font-black text-slate-100 group-hover:text-emerald-400 transition-colors flex items-center justify-between">
                          <span>{sp.title}</span>
                          <ArrowUpRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-400" />
                        </h3>
                        <p className="text-[11.5px] text-slate-400 mt-1.5 line-clamp-2 leading-relaxed font-medium">{sp.subtitle}</p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-[#1e2638] flex items-center justify-between text-[11px] text-emerald-400 font-bold">
                        <span>Run Investigation →</span>
                        <span className="text-slate-500 font-mono text-[10px]">Xero Live Sync</span>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* Active Messages List */}
          {messages.map((m) => {
            const isUser = m.role === 'user';
            const isTraceExpanded = Boolean(expandedTraceMap[m.id]);
            const hasTrace = m.debugActivities && m.debugActivities.length > 0;

            return (
              <div
                key={m.id}
                className={cn(
                  "flex gap-3 max-w-3xl mx-auto",
                  isUser ? "justify-end" : "justify-start"
                )}
              >
                {!isUser && (
                  <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white shrink-0 shadow-md border border-emerald-400/30 mt-1">
                    <Sparkles className="h-4 w-4" />
                  </div>
                )}

                <div className={cn("flex flex-col min-w-0 max-w-[88%]", isUser ? "items-end" : "items-start")}>

                  {/* Message Bubble Card */}
                  <div
                    className={cn(
                      "p-4 md:p-5 rounded-2xl text-xs leading-relaxed shadow-sm border",
                      isUser
                        ? "bg-[#182030] text-white rounded-tr-none border-[#273248] font-medium"
                        : "bg-[#0e131f] text-slate-200 rounded-tl-none border-[#1e2638] shadow-md"
                    )}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap text-xs">{m.text}</p>
                    ) : (
                      <div className="relative group/bubble">
                        <div className="prose prose-invert prose-xs max-w-none space-y-3 text-slate-200 leading-relaxed font-sans">
                          <ReactMarkdown>{m.text}</ReactMarkdown>
                          {m.isStreaming && (
                            <span className="inline-block h-4 w-2 ml-1 bg-emerald-400 animate-pulse"></span>
                          )}
                        </div>

                        {!m.isStreaming && (
                          <button
                            onClick={() => copyToClipboard(m.text, m.id)}
                            className="absolute top-0 right-0 opacity-0 group-hover/bubble:opacity-100 p-1.5 rounded-lg bg-[#182030] hover:bg-[#232e44] text-slate-400 hover:text-white transition cursor-pointer border border-[#273248]"
                            title="Copy Response"
                          >
                            {copiedId === m.id ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <span className="text-[10px] text-slate-500 mt-1 font-mono px-2">
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {isUser && (
                  <div className="h-8 w-8 rounded-xl bg-[#182030] flex items-center justify-center text-slate-300 shrink-0 border border-[#273248] mt-1">
                    <span className="text-[10px] font-black">YOU</span>
                  </div>
                )}
              </div>
            );
          })}

          <div ref={messagesEndRef} />
        </div>

        {/* Floating Bottom Input Dock */}
        <div className="p-4 bg-gradient-to-t from-[#090d16] via-[#090d16] to-transparent z-10 shrink-0">
          <div className="max-w-3xl mx-auto bg-[#0e131f] border border-[#1e2638] focus-within:border-emerald-500/60 focus-within:ring-2 focus-within:ring-emerald-500/20 rounded-2xl p-3 shadow-2xl relative transition-all">
            
            <textarea
              ref={textareaRef}
              rows={2}
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Ask Virtual CFO Copilot about Cashflow, P&L, AR/AP, or Financial Anomalies..."
              className="w-full bg-transparent border-0 outline-none text-xs text-white placeholder:text-slate-500 resize-none font-medium leading-relaxed pr-12"
            />

            <button
              onClick={() => handleSendMessage()}
              disabled={!inputPrompt.trim() || isGenerating}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 h-9 w-9 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 disabled:opacity-40 text-white flex items-center justify-center transition cursor-pointer shadow-md"
            >
              {isGenerating ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>

          <p className="text-[10px] text-slate-500 text-center mt-2 font-mono">
            Press <kbd className="bg-[#182030] px-1 py-0.5 rounded border border-[#273248] text-slate-400">Enter</kbd> to submit, <kbd className="bg-[#182030] px-1 py-0.5 rounded border border-[#273248] text-slate-400">Shift + Enter</kbd> for new line. Powered by OmegaPlus AI Gateway.
          </p>
        </div>

      </div>
    </div>
  );
}
