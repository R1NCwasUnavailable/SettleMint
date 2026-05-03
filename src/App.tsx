import { useState, useRef, useEffect } from 'react';
import { Send, Leaf, Loader2, Calculator, History, Users, RefreshCw, ArrowRight } from 'lucide-react';
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import ReactMarkdown from 'react-markdown';
import './index.css';

const google = createGoogleGenerativeAI({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY,
});

type Message = {
  id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export type Profile = {
  name: string;
  preferences: string;
};

type PageState = 'landing' | 'chat' | 'balances';

const ProfileForm = ({ onSave, savedProfiles }: { onSave: (p: Profile[]) => void, savedProfiles: Profile[] }) => {
  const [profiles, setProfiles] = useState<Profile[]>(savedProfiles);
  const [name, setName] = useState('');
  const [pref, setPref] = useState('');

  const handleAdd = () => {
    if (name.trim()) {
      setProfiles([...profiles, { name: name.trim(), preferences: pref.trim() }]);
      setName('');
      setPref('');
    }
  };

  const handleRemove = (index: number) => {
    setProfiles(profiles.filter((_, i) => i !== index));
  };

  return (
    <div className="profile-form">
      <h4>👥 Group Members</h4>
      {profiles.length > 0 && (
        <ul>
          {profiles.map((p, i) => (
            <li key={i}>
              <span><strong>{p.name}</strong> {p.preferences && `(${p.preferences})`}</span>
              <button className="remove-btn" onClick={() => handleRemove(i)}>✕</button>
            </li>
          ))}
        </ul>
      )}
      <div className="profile-input-group">
        <input
          placeholder="Name (e.g. Sarah)"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <input
          placeholder="Preferences (e.g. Vegan)"
          value={pref}
          onChange={e => setPref(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <button className="btn-small" onClick={handleAdd}>Add</button>
      </div>
      <button className="btn-save" onClick={() => onSave(profiles)}>Save Group to Context</button>
    </div>
  );
};

const SYSTEM_PROMPT = `You are SettleMint, an incredibly intelligent and fair AI agent that acts as an accountant for group trips and hangouts.
Your job is to read natural language descriptions of expenses, figure out exactly who paid what, and calculate exactly who owes whom in the background.

CRITICAL RULES:
1. When a user logs an expense, ONLY provide a brief acknowledgement (e.g., "Got it! Recorded $100 for dinner paid by John.").
2. DO NOT provide the full mathematical breakdown or running tally of balances after every single expense. Keep the chat clean.
3. ONLY provide the full breakdown of who owes whom when the user explicitly asks for the "current balances", "status", or "who owes who".

If the user asks to set up the group, set up profiles, or mentions who is coming on the trip, you MUST include the exact text "[SHOW_PROFILE_UI]" in your response. This will trigger an interactive UI for them to input their friends' names and preferences.

Always be helpful, clear, and mathematically perfect. Format your math clearly when asked for a breakdown.`;

function App() {
  const [activePage, setActivePage] = useState<PageState>('landing');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, role: 'assistant', content: "Hi! I'm SettleMint. 🌿 I'll keep track of all your trip expenses quietly in the background.\n\nYou can ask me to **set up the group profiles**, or just start logging expenses right away! (e.g. *'John paid $50 for gas'*)." }
  ]);
  const [balancesText, setBalancesText] = useState<string | null>(null);
  const [isBalancesLoading, setIsBalancesLoading] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activePage === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activePage]);

  const sendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now(), role: 'user', content: textToSend };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const aiMessages = messages
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role, content: m.content }));
      aiMessages.push({ role: 'user', content: textToSend });

      let dynamicPrompt = SYSTEM_PROMPT;
      if (profiles.length > 0) {
        dynamicPrompt += `\n\nCURRENT GROUP PROFILES:\n` + JSON.stringify(profiles, null, 2);
      }

      const { text } = await generateText({
        model: google('gemini-2.5-flash'),
        system: dynamicPrompt,
        messages: aiMessages as any,
      });

      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: text }]);
    } catch (error: any) {
      console.error(error);
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: "Oops, something went wrong. Make sure your API key is valid and you have an internet connection!" }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = () => sendMessage(input);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const fetchBalances = async () => {
    if (messages.length < 2) {
      setBalancesText("No expenses logged yet. Add some expenses in the chat first!");
      return;
    }
    setIsBalancesLoading(true);
    try {
      const aiMessages = messages
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role, content: m.content }));
      
      let dynamicPrompt = SYSTEM_PROMPT;
      if (profiles.length > 0) {
        dynamicPrompt += `\n\nCURRENT GROUP PROFILES:\n` + JSON.stringify(profiles, null, 2);
      }

      const { text } = await generateText({
        model: google('gemini-2.5-flash'),
        system: dynamicPrompt,
        messages: [
          ...(aiMessages as any), 
          { role: 'user', content: 'Generate a clean, final markdown table showing EXACTLY who owes who, including any active preferences in consideration. Do not include chatty text or acknowledgements, just the final breakdown and balances ledger.' }
        ],
      });
      setBalancesText(text);
    } catch (error: any) {
      console.error(error);
      setBalancesText("Failed to load balances. Make sure you have a valid API key.");
    } finally {
      setIsBalancesLoading(false);
    }
  };

  const navigateToBalances = () => {
    setActivePage('balances');
    fetchBalances();
  };

  return (
    <>
      <div className="bg-blob blob-1"></div>
      <div className="bg-blob blob-2"></div>

      {activePage === 'landing' && (
        <div className="landing-page">
          <div className="hero glass-panel">
            <Leaf color="#10b981" size={56} className="hero-icon" />
            <h1 className="hero-title">Split trips, <span className="highlight">not hairs.</span></h1>
            <p className="hero-subtitle">The AI accountant that perfectly tracks who owes whom using natural language.</p>
            <button className="btn-primary-large" onClick={() => setActivePage('chat')}>
              Start a New Trip <ArrowRight size={20} />
            </button>
          </div>
          <div className="features-grid">
            <div className="feature-card glass-panel">
              <History color="#10b981" size={28} />
              <h3>Natural Language</h3>
              <p>Just type "John paid $50 for gas". SettleMint handles the math.</p>
            </div>
            <div className="feature-card glass-panel">
              <Users color="#3b82f6" size={28} />
              <h3>Smart Profiles</h3>
              <p>Tell the AI that Sarah is vegan, and it remembers forever.</p>
            </div>
            <div className="feature-card glass-panel">
              <Calculator color="#8b5cf6" size={28} />
              <h3>Instant Balances</h3>
              <p>Generate a perfect ledger of exactly who owes who on demand.</p>
            </div>
          </div>
        </div>
      )}

      {activePage !== 'landing' && (
        <div className="app-container">
          <nav className="top-nav glass-panel">
            <div className="logo" onClick={() => setActivePage('landing')}>
              <Leaf color="#10b981" size={24} />
              <h2>SettleMint</h2>
            </div>
            <div className="nav-links">
              <button className={`nav-tab ${activePage === 'chat' ? 'active' : ''}`} onClick={() => setActivePage('chat')}>
                <History size={18} /> Log Expenses
              </button>
              <button className={`nav-tab ${activePage === 'balances' ? 'active' : ''}`} onClick={navigateToBalances}>
                <Calculator size={18} /> Balances
              </button>
            </div>
          </nav>

          {activePage === 'chat' && (
            <div className="chat-layout glass-panel">
              <div className="chat-area">
                {messages.map((msg) => {
                  const showProfileUI = msg.content.includes('[SHOW_PROFILE_UI]');
                  const cleanContent = msg.content.replace('[SHOW_PROFILE_UI]', '');

                  return (
                    <div key={msg.id} className={`message ${msg.role === 'user' ? 'user' : 'ai'}`}>
                      <ReactMarkdown>{cleanContent}</ReactMarkdown>
                      {showProfileUI && (
                        <ProfileForm
                          savedProfiles={profiles}
                          onSave={(newProfiles) => {
                            setProfiles(newProfiles);
                            setMessages(prev => [...prev, {
                              id: Date.now(),
                              role: 'system',
                              content: `Group profiles saved: ${newProfiles.map(p => p.name).join(', ')}`
                            }]);
                          }}
                        />
                      )}
                    </div>
                  );
                })}
                {isLoading && (
                  <div className="message ai">
                    <Loader2 className="animate-spin" size={20} color="#10b981" />
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="input-area">
                <input
                  type="text"
                  className="chat-input"
                  placeholder="Type your expenses..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  disabled={isLoading}
                />
                <button className="send-button" onClick={handleSend} disabled={isLoading} style={{ opacity: isLoading ? 0.5 : 1 }}>
                  <Send size={20} />
                </button>
              </div>
            </div>
          )}

          {activePage === 'balances' && (
            <div className="balances-layout">
              <div className="sidebar glass-panel">
                <ProfileForm 
                  savedProfiles={profiles}
                  onSave={(newProfiles) => {
                    setProfiles(newProfiles);
                    fetchBalances();
                  }}
                />
              </div>
              <div className="main-receipt glass-panel">
                <div className="receipt-header">
                  <h2>Current Balances</h2>
                  <button className="btn-small" onClick={fetchBalances} disabled={isBalancesLoading}>
                    <RefreshCw size={16} className={isBalancesLoading ? 'animate-spin' : ''} />
                  </button>
                </div>
                <div className="receipt-content">
                  {isBalancesLoading ? (
                      <div className="loading-state">
                        <Loader2 className="animate-spin" size={32} color="#10b981" />
                        <p>Calculating perfect splits...</p>
                      </div>
                  ) : (
                      <div className="receipt-markdown">
                        <ReactMarkdown>{balancesText || "No data."}</ReactMarkdown>
                      </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default App;
