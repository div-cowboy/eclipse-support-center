"use client";

import { useState, useEffect } from "react";

export default function TestFormEmbedPage() {
  const [embedCode, setEmbedCode] = useState("cK0l2PKa");
  const [width, setWidth] = useState("100%");
  const [height, setHeight] = useState("600");
  const [iframeKey, setIframeKey] = useState(0);

  const buildIframeUrl = () => {
    if (!embedCode) return "";
    return `/embed/form?code=${embedCode}`;
  };

  // Auto-load form on mount
  useEffect(() => {
    if (embedCode) {
      setIframeKey((prev) => prev + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  const handleUpdate = () => {
    if (!embedCode) {
      alert("Please enter a form embed code");
      return;
    }
    setIframeKey((prev) => prev + 1);
  };

  const copyEmbedCode = () => {
    if (!embedCode) {
      alert("Please enter a form embed code first");
      return;
    }

    const iframeCode = `<iframe src="${window.location.origin}/embed/form?code=${embedCode}" width="${width}" height="${height}" frameborder="0"></iframe>`;
    
    navigator.clipboard.writeText(iframeCode).then(() => {
      alert("Embed code copied to clipboard!");
    }).catch(() => {
      // Fallback
      const textArea = document.createElement("textarea");
      textArea.value = iframeCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      alert("Embed code copied to clipboard!");
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-indigo-700 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center text-white">
          <h1 className="text-4xl font-bold mb-2">📋 Form Embed Test Page</h1>
          <p className="text-lg opacity-90">
            Test your embeddable support form
          </p>
          <p className="text-sm opacity-75 mt-2">
            ✅ Test form submission and validation
          </p>
        </div>

        {/* Iframe */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ height: `${height}px` }}>
          <iframe
            key={iframeKey}
            src={buildIframeUrl()}
            className="w-full h-full border-0"
            title="Form Embed"
            style={{ minHeight: "400px" }}
          />
        </div>

        {/* Controls */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4">⚙️ Configuration</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Form Embed Code *
              </label>
              <input
                type="text"
                value={embedCode}
                onChange={(e) => setEmbedCode(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500"
                placeholder="Enter form embed code (e.g., abc123)"
              />
              <p className="text-xs text-gray-500 mt-1">
                Find this in your form details page
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Width
              </label>
              <input
                type="text"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500"
                placeholder="100%"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Height (px)
              </label>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500"
                placeholder="600"
                min="300"
              />
            </div>
          </div>

          <div className="flex gap-4 mt-6">
            <button
              onClick={handleUpdate}
              className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold py-3 px-6 rounded-lg hover:shadow-lg transition-all transform hover:-translate-y-0.5"
            >
              🚀 Reload Form
            </button>
            <button
              onClick={copyEmbedCode}
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold py-3 px-6 rounded-lg hover:shadow-lg transition-all transform hover:-translate-y-0.5"
            >
              📋 Copy Embed Code
            </button>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">
              🧪 Testing Instructions
            </h4>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Enter a form embed code from your forms list</li>
              <li>Click &quot;Reload Form&quot; to load the form</li>
              <li>Fill out the form fields</li>
              <li>Test validation by submitting with empty required fields</li>
              <li>Submit the form and verify the success message</li>
              <li>
                Check{" "}
                <a
                  href="/app/tickets"
                  target="_blank"
                  className="underline font-medium"
                >
                  /app/tickets
                </a>{" "}
                to see if a ticket was created
              </li>
              <li>Test different field types (text, email, select, etc.)</li>
              <li>Verify form styling and theme customization</li>
            </ol>
          </div>

          <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <h4 className="font-semibold text-yellow-900 mb-2">
              💡 Quick Access
            </h4>
            <div className="text-sm text-yellow-800 space-y-2">
              <p>
                <a
                  href="/app/forms"
                  target="_blank"
                  className="underline font-medium"
                >
                  View Forms
                </a>{" "}
                - See all your forms and get embed codes
              </p>
              <p>
                <a
                  href="/app/forms/new"
                  target="_blank"
                  className="underline font-medium"
                >
                  Create Form
                </a>{" "}
                - Create a new form to test
              </p>
            </div>
          </div>
        </div>

        {/* Embed Code Preview */}
        {embedCode && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-semibold mb-4">📝 Embed Code</h3>
            <div className="relative">
              <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                {`<iframe src="${window.location.origin}/embed/form?code=${embedCode}" width="${width}" height="${height}" frameborder="0"></iframe>`}
              </pre>
              <button
                onClick={copyEmbedCode}
                className="absolute top-2 right-2 bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700"
              >
                Copy
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

