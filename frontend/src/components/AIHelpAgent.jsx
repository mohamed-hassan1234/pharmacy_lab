import { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Languages, Loader2, MessageCircle, Mic, Send, Volume2, VolumeX, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = '/api/assistant/chat';

const getDefaultSuggestions = (role, lang = 'en') => {
  if (lang === 'so') {
    if (role === 'Cashier') {
      return [
        'Sidee baan bukaan u diiwaangeliyaa?',
        'I tus xaaladda nidaamka',
        'Maanta iyo shalay profit farqigooda i tus',
        'Warbixin daily/weekly/monthly/yearly i sii'
      ];
    }

    if (role === 'Doctor') {
      return [
        'Sidee consultation loo dhammeeyaa?',
        'Imisa ayaa doctor sugaya?',
        'I tus xaaladda nidaamka',
        'Warbixin monthly i sii'
      ];
    }

    if (role === 'Lab Technician') {
      return [
        'Sidee natiijooyinka lab loo geliyaa?',
        'Ii soo sheeg paid tickets',
        'Status-yada lab sharax',
        'Warbixin weekly i sii'
      ];
    }

    return [
      'Ii soo koob xaaladda nidaamka',
      'Profit maanta vs shalay i tus',
      'Warbixin daily/weekly/monthly/yearly',
      'Inventory status i tus'
    ];
  }

  if (role === 'Cashier') {
    return [
      'How do I register a patient?',
      'Show system status',
      'Compare today vs yesterday profit',
      'Give daily/weekly/monthly/yearly report'
    ];
  }

  if (role === 'Doctor') {
    return [
      'How do I finalize consultation?',
      'How many are awaiting doctor?',
      'Show system status',
      'Give monthly report'
    ];
  }

  if (role === 'Lab Technician') {
    return [
      'How do I enter lab results?',
      'Show paid lab tickets',
      'Explain lab statuses',
      'Give weekly report'
    ];
  }

  return [
    'Show system status',
    'Compare today vs yesterday profit',
    'Give daily/weekly/monthly/yearly report',
    'Show inventory health'
  ];
};

const getWelcomeText = (name, lang = 'en') => {
  if (lang === 'so') {
    return `Salaan ${name || ''}! Waxaan ahay AI Help Agent-kaaga. Waad qori kartaa ama cod ku hadli kartaa (English/Somali). I weydii status-ka nidaamka, profit maanta vs shalay, ama report daily/weekly/monthly/yearly.`;
  }
  return `Salaan ${name || ''}! Waxaan ahay AI Help Agent-kaaga. Waad qori kartaa ama cod ku hadli kartaa (English/Somali). I weydii xaaladda nidaamka, faa'iidada maanta iyo shalay, ama warbixin maalinle/usbuucle/bille/sanadle ah.`;
};

const normalizeLanguage = (lang) => (lang === 'so' ? 'so' : 'en');
const getSpeechLang = (lang) => (lang === 'so' ? 'so-SO' : 'en-US');

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const AIHelpAgent = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [language, setLanguage] = useState('auto');
  const [conversationLang, setConversationLang] = useState('en');
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(true);
  const [listening, setListening] = useState(false);
  const [voiceInputSupported, setVoiceInputSupported] = useState(false);
  const [messages, setMessages] = useState([]);
  const [suggestions, setSuggestions] = useState(getDefaultSuggestions(user?.role, 'en'));
  const listRef = useRef(null);
  const recognitionRef = useRef(null);
  const lastSpokenMessageIdRef = useRef(null);

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
    if (language === 'en' || language === 'so') {
      setConversationLang(language);
    }
  }, [language]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setVoiceInputSupported(Boolean(SpeechRecognition));
  }, []);

  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!open || !voiceOutputEnabled) return;
    const latestMessage = messages[messages.length - 1];
    if (!latestMessage || latestMessage.role !== 'assistant') return;
    if (lastSpokenMessageIdRef.current === latestMessage.id) return;
    if (!window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(latestMessage.text);
    utterance.lang = getSpeechLang(conversationLang);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
    lastSpokenMessageIdRef.current = latestMessage.id;
  }, [messages, open, voiceOutputEnabled, conversationLang]);

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

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setListening(false);
  };

  const startListening = () => {
    if (!voiceInputSupported || listening || sending) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = getSpeechLang(language === 'auto' ? conversationLang : language);
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setListening(true);
    recognition.onerror = () => setListening(false);
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim();
      if (transcript) {
        setInput(transcript);
        sendMessage(transcript);
      }
    };

    recognition.start();
  };

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
        "Jawaab ma abuuri karo hadda. Fadlan mar kale weydii su'aal la xiriirta nidaamka.";
      const assistantText = assistantTextRaw.replace(/\n{3,}/g, '\n\n').trim();

      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant', text: assistantText }]);
      setConversationLang(normalizeLanguage(data?.language || language));

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
            'Dhibaato xiriir ayaa jirta: adeegga kaaliyaha AI hadda lama heli karo.'
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
                <p className="text-sm font-semibold text-white">Kaaliyaha AI</p>
                <p className="text-[11px] text-slate-200">Jawaabo cad oo nidaamkaaga ah</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (voiceOutputEnabled && window.speechSynthesis) {
                    window.speechSynthesis.cancel();
                  }
                  setVoiceOutputEnabled((prev) => !prev);
                }}
                className="rounded-lg border border-white/20 bg-white/10 p-1.5 text-slate-100 hover:bg-white/20"
                aria-label={voiceOutputEnabled ? 'Demi codka jawaabta' : 'Shid codka jawaabta'}
                title={voiceOutputEnabled ? 'Codku wuu shidan yahay' : 'Codku wuu dansan yahay'}
              >
                {voiceOutputEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
              </button>
              <label className="ai-agent-lang">
                <Languages size={13} />
                <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                  <option value="auto">Toos</option>
                  <option value="en">EN</option>
                  <option value="so">SO</option>
                </select>
              </label>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-white/20 bg-white/10 p-1.5 text-slate-100 hover:bg-white/20"
                aria-label="Xir kaaliyaha AI"
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
                  Waan ka fikirayaa 1 ilbiriqsi...
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
            <button
              type="button"
              onClick={listening ? stopListening : startListening}
              disabled={!voiceInputSupported || sending}
              className={`btn-secondary px-3 py-2 ${listening ? 'border-red-200 bg-red-50 text-red-600' : ''}`}
              title={voiceInputSupported ? (listening ? 'Jooji dhegeysiga' : "Ku hadal su'aashaada") : 'Gelinta codka ma taageersana'}
            >
              <Mic size={14} />
            </button>
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={listening ? 'Waan dhegeysanayaa...' : 'Wax ka weydii ama ka hadal nidaamkan...'}
              className="ai-agent-input"
            />
            <button type="submit" className="btn-primary px-3 py-2" disabled={sending || !input.trim()}>
              <Send size={14} />
            </button>
          </form>
          <div className="px-3 pb-2 text-[11px] text-slate-500">
            {voiceInputSupported
              ? (listening
                ? 'Hadda waan dhegeysanayaa... Ku hadal English ama Somali.'
                : 'Codku waa diyaar: ku hadal English ama Somali.')
              : 'Gelinta codka kama shaqeyso browser-kan.'}
          </div>
        </section>
      )}

      <button
        type="button"
        className="ai-agent-toggle"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={open ? 'Qari kaaliyaha AI' : 'Muuji kaaliyaha AI'}
      >
        <MessageCircle size={18} />
        <span>{open ? 'Qari Caawinta' : 'Caawinta AI'}</span>
      </button>
    </div>
  );
};

export default AIHelpAgent;


