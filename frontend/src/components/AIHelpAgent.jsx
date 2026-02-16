import { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Languages, Loader2, MessageCircle, Send, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = 'https://homecare.nidwa.com/api/assistant/chat';

const getDefaultSuggestions = (role, lang = 'en') => {
  if (lang === 'so') {
    if (role === 'Cashier') {
      return [
        'Sidee baan bukaan u diiwaangeliyaa?',
        'Ii soo koob iibka maanta',
        'Dayn intee leeg ayaa furan?',
        'Warbixinta USD sidee loo akhriyaa?'
      ];
    }

    if (role === 'Doctor') {
      return [
        'Sidee consultation loo dhammeeyaa?',
        'Imisa ayaa doctor sugaya?',
        'Sidee prescription loo diraa?',
        'Ii soo koob queue-ga maanta'
      ];
    }

    if (role === 'Lab Technician') {
      return [
        'Sidee natiijooyinka lab loo geliyaa?',
        'Ii soo sheeg paid tickets',
        'Sidee doctor loogu diraa natiijo?',
        'Status-yada lab sharax'
      ];
    }

    return [
      'Ii soo koob dashboard-ka',
      'Inventory health i tus',
      'Dayn furan i tus',
      'Workflow-ka system-ka sharax'
    ];
  }

  if (role === 'Cashier') {
    return [
      'How do I register a patient?',
      'Show today sales summary',
      'How much debt is open?',
      'How to read USD in reports?'
    ];
  }

  if (role === 'Doctor') {
    return [
      'How do I finalize consultation?',
      'How many are awaiting doctor?',
      'How do I send a prescription?',
      'Show my queue today'
    ];
  }

  if (role === 'Lab Technician') {
    return [
      'How do I enter lab results?',
      'Show paid lab tickets',
      'How do I send results to doctor?',
      'Explain lab statuses'
    ];
  }

  return [
    'Give me dashboard summary',
    'Show inventory health',
    'Show open debts today',
    'Explain full system workflow'
  ];
};

const getWelcomeText = (name, lang = 'en') => {
  if (lang === 'so') {
    return `Salaan ${name || ''}! Waxaan ahay AI Help Agent-kaaga. I weydii su'aalo ku saabsan patients, medicines, sales, reports, lab, iyo roles.`;
  }
  return `Hi ${name || 'there'}! I am your AI Help Agent. Ask about patients, medicines, sales, reports, lab, and role workflows.`;
};

const normalizeLanguage = (lang) => (lang === 'so' ? 'so' : 'en');

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const AIHelpAgent = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [language, setLanguage] = useState('auto');
  const [messages, setMessages] = useState([]);
  const [suggestions, setSuggestions] = useState(getDefaultSuggestions(user?.role, 'en'));
  const listRef = useRef(null);

  useEffect(() => {
    const lang = normalizeLanguage(language);
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        text: getWelcomeText(user?.name, lang)
      }
    ]);
    setSuggestions(getDefaultSuggestions(user?.role, lang));
  }, [user?.name, user?.role]);

  useEffect(() => {
    const lang = normalizeLanguage(language);
    if (messages.length <= 1) {
      setMessages((prev) =>
        prev.map((message) =>
          message.role === 'assistant'
            ? { ...message, text: getWelcomeText(user?.name, lang) }
            : message
        )
      );
      setSuggestions(getDefaultSuggestions(user?.role, lang));
    }
  }, [language]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, sending, open]);

  const historyPayload = useMemo(
    () =>
      messages.slice(-8).map((message) => ({
        role: message.role === 'assistant' ? 'assistant' : 'user',
        content: message.text
      })),
    [messages]
  );

  const sendMessage = async (rawMessage) => {
    const message = String(rawMessage || '').trim();
    if (!message || sending || !user?.token) return;

    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', text: message }]);
    setInput('');
    setSending(true);
    const startedAt = Date.now();

    try {
      const { data } = await axios.post(
        API_URL,
        {
          message,
          language,
          currentPath: `${location.pathname}${location.search || ''}`,
          history: historyPayload
        },
        {
          headers: {
            Authorization: `Bearer ${user.token}`
          }
        }
      );

      const elapsed = Date.now() - startedAt;
      if (elapsed < 1000) await wait(1000 - elapsed);

      const assistantTextRaw =
        String(data?.answer || '') ||
        'I could not generate an answer right now. Please ask again with a system-related question.';
      const assistantText = assistantTextRaw.replace(/\n{3,}/g, '\n\n').trim();

      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant', text: assistantText }]);

      if (Array.isArray(data?.suggestions) && data.suggestions.length > 0) {
        setSuggestions(data.suggestions.slice(0, 4));
      }
    } catch (error) {
      const elapsed = Date.now() - startedAt;
      if (elapsed < 1000) await wait(1000 - elapsed);

      setMessages((prev) => [
        ...prev,
        {
          id: `a-err-${Date.now()}`,
          role: 'assistant',
          text:
            error?.response?.data?.message ||
            'Connection issue: AI assistant service is not available right now.'
        }
      ]);
    } finally {
      setSending(false);
    }
  };

  if (!user) return null;

  return (
    <div className="ai-agent-anchor">
      {open && (
        <section className="ai-agent-panel">
          <header className="ai-agent-header">
            <div className="flex items-center gap-2">
              <div className="ai-agent-icon-wrap">
                <Bot size={16} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">AI Help Agent</p>
                <p className="text-[11px] text-slate-200">Clear answers for your system</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="ai-agent-lang">
                <Languages size={13} />
                <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                  <option value="auto">Auto</option>
                  <option value="en">EN</option>
                  <option value="so">SO</option>
                </select>
              </label>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-white/20 bg-white/10 p-1.5 text-slate-100 hover:bg-white/20"
                aria-label="Close AI assistant"
              >
                <X size={14} />
              </button>
            </div>
          </header>

          <div ref={listRef} className="ai-agent-messages custom-scrollbar">
            {messages.map((message) => (
              <div key={message.id} className={message.role === 'assistant' ? 'ai-msg ai-msg-assistant' : 'ai-msg ai-msg-user'}>
                <p className="whitespace-pre-line">{message.text}</p>
              </div>
            ))}
            {sending && (
              <div className="ai-msg ai-msg-assistant">
                <p className="inline-flex items-center gap-2">
                  <Loader2 size={13} className="animate-spin" />
                  Thinking for 1 second...
                </p>
              </div>
            )}
          </div>

          <div className="ai-agent-suggestions">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="ai-suggestion-chip"
                onClick={() => sendMessage(suggestion)}
                disabled={sending}
              >
                {suggestion}
              </button>
            ))}
          </div>

          <form
            className="ai-agent-input-row"
            onSubmit={(event) => {
              event.preventDefault();
              sendMessage(input);
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about this system..."
              className="ai-agent-input"
            />
            <button type="submit" className="btn-primary px-3 py-2" disabled={sending || !input.trim()}>
              <Send size={14} />
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        className="ai-agent-toggle"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={open ? 'Hide AI assistant' : 'Show AI assistant'}
      >
        <MessageCircle size={18} />
        <span>{open ? 'Hide Help' : 'AI Help'}</span>
      </button>
    </div>
  );
};

export default AIHelpAgent;

