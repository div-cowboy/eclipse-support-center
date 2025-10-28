"use client";

import { useState } from "react";

export default function TestEmbedPage() {
  const [chatbotId, setChatbotId] = useState("cmgzje3c4000am64yeow24kpi");
  const [primaryColor, setPrimaryColor] = useState("#667eea");
  const [theme, setTheme] = useState("auto");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [placeholder, setPlaceholder] = useState("Type your message...");
  const [iframeKey, setIframeKey] = useState(0);

  const buildIframeUrl = () => {
    const params = new URLSearchParams({
      chatbotId,
      theme,
      primaryColor,
      placeholder,
      showBranding: "true",
    });

    if (welcomeMessage) {
      params.append("welcomeMessage", welcomeMessage);
    }

    return `/embed/chat?${params.toString()}`;
  };

  const handleUpdate = () => {
    setIframeKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-indigo-700 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center text-white">
          <h1 className="text-4xl font-bold mb-2">🤖 Embed Chat Test Page</h1>
          <p className="text-lg opacity-90">
            Test real-time chat escalation (iframe ↔ agent window)
          </p>
          <p className="text-sm opacity-75 mt-2">
            ✅ Same origin - BroadcastChannel will work!
          </p>
        </div>

        {/* Iframe */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden h-[600px]">
          <iframe
            key={iframeKey}
            src={buildIframeUrl()}
            className="w-full h-full border-0"
            allow="clipboard-write"
            title="Chat Embed"
          />
        </div>

        {/* Controls */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4">⚙️ Configuration</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Chatbot ID
              </label>
              <input
                type="text"
                value={chatbotId}
                onChange={(e) => setChatbotId(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500"
                placeholder="Enter chatbot ID"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Primary Color
              </label>
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-full h-10 px-2 border-2 border-gray-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Theme</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500"
              >
                <option value="auto">Auto</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Placeholder
              </label>
              <input
                type="text"
                value={placeholder}
                onChange={(e) => setPlaceholder(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">
                Welcome Message (optional)
              </label>
              <input
                type="text"
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500"
                placeholder="Hi! How can I help you?"
              />
            </div>
          </div>

          <button
            onClick={handleUpdate}
            className="mt-6 w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold py-3 px-6 rounded-lg hover:shadow-lg transition-all transform hover:-translate-y-0.5"
          >
            🚀 Reload Chat
          </button>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">
              🧪 Testing Instructions
            </h4>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Send a message in the chat below</li>
              <li>Type: "I need to speak to a human"</li>
              <li>Click "Connect with Customer Support"</li>
              <li>
                Open{" "}
                <a
                  href="/app/chats"
                  target="_blank"
                  className="underline font-medium"
                >
                  /app/chats
                </a>{" "}
                in a new tab
              </li>
              <li>Find the escalated chat and click "Assign to Me"</li>
              <li>
                You should see "✅ You're now connected to [Name]" in THIS
                iframe
              </li>
              <li>Messages should flow in real-time between both tabs!</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
