import React, { useState } from 'react';
import { Send, Mic, Sparkles, Utensils } from 'lucide-react';

export default function ChatInputBar({ onSendMessage }) {
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  const handleMicClick = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'zh-TW';
      recognition.interimResults = false;

      setIsListening(true);
      recognition.start();

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
        setInputText('今天午餐吃雞腿便當 110 元');
      };

      recognition.onend = () => {
        setIsListening(false);
      };
    } else {
      setInputText('今天午餐吃雞腿便當 110 元');
    }
  };

  const handlePillClick = (pillText) => {
    onSendMessage(pillText);
  };

  return (
    <div className="p-3 bg-card border-t border-card space-y-2">
      {/* Quick Shortcut Pills including Food Recommendation */}
      <div className="flex items-center gap-1-5 overflow-x-auto pb-1 no-scrollbar text-11">
        <span className="text-muted shrink-0 flex items-center gap-0-5">
          <Sparkles size={11} /> 快速試試：
        </span>
        <button
          onClick={() => handlePillClick('等下要吃什麼？')}
          className="btn-interactive shrink-0 px-2-5 py-1 rounded-full bg-amber-500-20 text-amber-400 border border-amber-400 font-bold flex items-center gap-1"
        >
          <Utensils size={12} />
          <span>🍱 管家推薦吃什麼</span>
        </button>
        <button
          onClick={() => handlePillClick('今天午餐吃了 120 元')}
          className="btn-interactive shrink-0 px-2-5 py-1 rounded-full bg-input text-secondary border border-card"
        >
          午餐 120元
        </button>
        <button
          onClick={() => handlePillClick('搭公車 15')}
          className="btn-interactive shrink-0 px-2-5 py-1 rounded-full bg-input text-secondary border border-card"
        >
          🚌 公車 15
        </button>
        <button
          onClick={() => handlePillClick('領薪水 35000 元')}
          className="btn-interactive shrink-0 px-2-5 py-1 rounded-full bg-input text-secondary border border-card"
        >
          💰 領薪水 35000
        </button>
        <button
          onClick={() => handlePillClick('想存 50000 元到日本旅行')}
          className="btn-interactive shrink-0 px-2-5 py-1 rounded-full bg-input text-secondary border border-card"
        >
          🎯 存日本旅行 5萬
        </button>
      </div>

      {/* Input Bar & Speech Button */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleMicClick}
          className={`btn-interactive p-2-5 rounded-xl border flex items-center justify-center ${
            isListening
              ? 'bg-rose-500-20 text-rose-400 border-rose-400'
              : 'bg-input text-accent-sky border-card'
          }`}
          title="語音對話記帳 (Speech to Text)"
          aria-label="語音輸入"
        >
          <Mic size={18} />
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="想記點什麼？或問「等下要吃什麼」..."
          className="flex-1 px-3-5 py-2-5 rounded-xl bg-input text-xs text-primary border border-card outline-none"
        />

        <button
          onClick={handleSend}
          disabled={!inputText.trim()}
          aria-label="送出訊息"
          className="btn-interactive p-2-5 rounded-xl bg-sky-500-20 text-accent-sky border border-sky-500-30 font-bold flex items-center justify-center"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
