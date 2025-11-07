/**
 * Eclipse Support Center Chat Widget SDK
 *
 * This SDK provides an easy way to embed the Eclipse Support Center chat widget
 * into any website using iframe or JavaScript integration.
 *
 * @typedef {Object} ChatWidgetConfig
 * @property {string} [organizationId]
 * @property {string} [chatbotId]
 * @property {"light"|"dark"|"auto"} [theme]
 * @property {string} [primaryColor]
 * @property {string} [borderRadius]
 * @property {string} [height]
 * @property {string} [width]
 * @property {boolean} [showBranding]
 * @property {string} [welcomeMessage]
 * @property {string} [placeholder]
 * @property {string} [autoSendFirstMessage] - Auto-send this message when chat opens (for new chats only)
 * @property {"bottom-right"|"bottom-left"|"top-right"|"top-left"|"center"} [position]
 * @property {boolean} [autoOpen]
 * @property {string} [buttonText]
 * @property {string} [buttonIcon]
 * @property {string} [containerId]
 * @property {"popup"|"icon"} [mode]
 * @property {string} [iconSize]
 * @property {Object} [offset]
 */

class EclipseChatWidget {
  constructor(config = {}, baseUrl = "") {
    console.log("[EclipseChatWidget] 🏗️ Constructor called with config:", {
      config,
      baseUrl,
      hasAutoSendFirstMessage: !!config.autoSendFirstMessage,
      autoSendFirstMessage: config.autoSendFirstMessage,
    });

    this.config = {
      theme: "auto",
      borderRadius: "8px",
      height: "600px",
      width: "400px",
      showBranding: true,
      position: "bottom-right",
      autoOpen: false,
      buttonText: "Chat with us",
      mode: "popup",
      iconSize: "60px",
      offset: {},
      ...config,
    };

    console.log("[EclipseChatWidget] ✅ Final merged config:", {
      autoSendFirstMessage: this.config.autoSendFirstMessage,
      welcomeMessage: this.config.welcomeMessage,
      chatbotId: this.config.chatbotId,
      mode: this.config.mode,
    });

    this.baseUrl = baseUrl;
    this.iframe = null;
    this.button = null;
    this.container = null;
    this.iframeWrapper = null;
    this.isOpen = false;
    this.init();
  }

  init() {
    this.createContainer();
    this.createButton();
    this.createIframe();

    // Listen for close message from iframe
    window.addEventListener("message", (event) => {
      if (event.data && event.data.type === "eclipse-chat-close") {
        this.close();
      }
    });

    if (this.config.autoOpen) {
      this.open();
    }
  }

  createContainer() {
    const containerId = this.config.containerId || "eclipse-chat-widget";
    let container = document.getElementById(containerId);

    if (!container) {
      container = document.createElement("div");
      container.id = containerId;
      container.style.cssText = `
        position: fixed;
        z-index: 9999;
        ${this.getPositionStyles()}
      `;
      document.body.appendChild(container);
    }

    this.container = container;
  }

  getPositionStyles() {
    const position = this.config.position || "bottom-right";
    const offset = this.config.offset || {};

    // Default offsets
    const defaults = {
      bottom: offset.bottom || "20px",
      right: offset.right || "20px",
      left: offset.left || "20px",
      top: offset.top || "20px",
    };

    switch (position) {
      case "bottom-right":
        return `bottom: ${defaults.bottom}; right: ${defaults.right};`;
      case "bottom-left":
        return `bottom: ${defaults.bottom}; left: ${defaults.left};`;
      case "top-right":
        return `top: ${defaults.top}; right: ${defaults.right};`;
      case "top-left":
        return `top: ${defaults.top}; left: ${defaults.left};`;
      case "center":
        return "top: 50%; left: 50%; transform: translate(-50%, -50%);";
      default:
        return `bottom: ${defaults.bottom}; right: ${defaults.right};`;
    }
  }

  createButton() {
    if (!this.container) return;

    this.button = document.createElement("button");
    const isIconMode = this.config.mode === "icon";

    if (isIconMode) {
      // Intercom-style icon button
      this.button.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      `;

      this.button.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: center;
        width: ${this.config.iconSize};
        height: ${this.config.iconSize};
        padding: 0;
        background: ${this.config.primaryColor || "#3b82f6"};
        color: white;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        will-change: transform;
      `;
    } else {
      // Popup mode with text
      this.button.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <span>${this.config.buttonText}</span>
      `;

      this.button.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 16px;
        background: ${this.config.primaryColor || "#3b82f6"};
        color: white;
        border: none;
        border-radius: ${this.config.borderRadius};
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        will-change: transform;
      `;
    }

    this.button.addEventListener("click", () => this.toggle());
    this.button.addEventListener("mouseenter", () => {
      if (this.button) {
        this.button.style.transform = isIconMode
          ? "scale(1.1)"
          : "translateY(-2px)";
        this.button.style.boxShadow = isIconMode
          ? "0 8px 24px rgba(0, 0, 0, 0.25)"
          : "0 6px 16px rgba(0, 0, 0, 0.2)";
      }
    });
    this.button.addEventListener("mouseleave", () => {
      if (this.button) {
        this.button.style.transform = isIconMode ? "scale(1)" : "translateY(0)";
        this.button.style.boxShadow = isIconMode
          ? "0 4px 16px rgba(0, 0, 0, 0.2)"
          : "0 4px 12px rgba(0, 0, 0, 0.15)";
      }
    });

    this.container.appendChild(this.button);
  }

  createIframe() {
    if (!this.container) return;

    // Create wrapper for iframe and close button
    this.iframeWrapper = document.createElement("div");
    this.iframeWrapper.style.cssText = `
      position: relative;
      width: ${this.config.width};
      height: ${this.config.height};
      display: none;
      border-radius: ${this.config.borderRadius};
      overflow: hidden;
    `;

    this.iframe = document.createElement("iframe");

    console.log("[EclipseChatWidget] 🔧 Creating iframe with config:", {
      chatbotId: this.config.chatbotId,
      autoSendFirstMessage: this.config.autoSendFirstMessage,
      welcomeMessage: this.config.welcomeMessage,
      placeholder: this.config.placeholder,
      mode: this.config.mode,
      allConfig: this.config,
    });

    const params = new URLSearchParams();
    if (this.config.organizationId)
      params.set("organizationId", this.config.organizationId);
    if (this.config.chatbotId) params.set("chatbotId", this.config.chatbotId);
    if (this.config.theme) params.set("theme", this.config.theme);
    if (this.config.primaryColor)
      params.set("primaryColor", this.config.primaryColor);
    if (this.config.borderRadius)
      params.set("borderRadius", this.config.borderRadius);
    if (this.config.height) params.set("height", this.config.height);
    if (this.config.width) params.set("width", this.config.width);
    if (this.config.showBranding !== undefined)
      params.set("showBranding", this.config.showBranding.toString());
    if (this.config.welcomeMessage)
      params.set("welcomeMessage", this.config.welcomeMessage);
    if (this.config.placeholder)
      params.set("placeholder", this.config.placeholder);
    if (this.config.autoSendFirstMessage) {
      params.set("autoSendFirstMessage", this.config.autoSendFirstMessage);
      console.log(
        "[EclipseChatWidget] ✅ Added autoSendFirstMessage to URL params:",
        this.config.autoSendFirstMessage
      );
    } else {
      console.log(
        "[EclipseChatWidget] ⚠️ autoSendFirstMessage is missing from config:",
        {
          hasAutoSendFirstMessage: !!this.config.autoSendFirstMessage,
          autoSendFirstMessage: this.config.autoSendFirstMessage,
        }
      );
    }

    // Use baseUrl if provided, otherwise use current origin (for same-origin embedding)
    // If neither works, fall back to detecting from script tag or window.location

    // NEEDS TO BE STATIC
    let baseUrl = "https://069986a950f8.ngrok-free.app";

    console.log("[EclipseChatWidget] 🔧 BASE URL:", baseUrl);

    const iframeUrl = `${baseUrl}/embed/chat?${params.toString()}`;
    console.log("[EclipseChatWidget] 🔗 Generated iframe URL:", iframeUrl, {
      baseUrl,
      providedBaseUrl: this.baseUrl,
      currentOrigin:
        typeof window !== "undefined" ? window.location.origin : "N/A",
    });
    this.iframe.src = iframeUrl;
    this.iframe.style.cssText = `
      width: 100%;
      height: 100%;
      border: none;
      display: block;
      background: white;
    `;

    this.iframeWrapper.appendChild(this.iframe);

    // Apply shadow to wrapper
    this.iframeWrapper.style.boxShadow = "0 8px 32px rgba(0, 0, 0, 0.2)";

    this.container.appendChild(this.iframeWrapper);
  }

  open() {
    if (!this.iframeWrapper || !this.button) return;

    const isIconMode = this.config.mode === "icon";

    // Hide button and show iframe wrapper
    this.button.style.display = "none";
    this.iframeWrapper.style.display = "block";
    this.isOpen = true;

    // Set initial animation state
    if (isIconMode) {
      // Intercom-style: scale from bottom-right corner
      this.iframeWrapper.style.opacity = "0";
      this.iframeWrapper.style.transform = "scale(0.8) translateY(20px)";
      this.iframeWrapper.style.transformOrigin = "bottom right";
    } else {
      // Popup mode: simple fade and scale
      this.iframeWrapper.style.opacity = "0";
      this.iframeWrapper.style.transform = "scale(0.95)";
    }

    // Trigger animation
    requestAnimationFrame(() => {
      if (this.iframeWrapper) {
        this.iframeWrapper.style.transition =
          "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)";
        this.iframeWrapper.style.opacity = "1";
        this.iframeWrapper.style.transform = "scale(1) translateY(0)";
      }
    });
  }

  close() {
    if (!this.iframeWrapper || !this.button) return;

    const isIconMode = this.config.mode === "icon";

    // Animate out
    this.iframeWrapper.style.transition =
      "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
    this.iframeWrapper.style.opacity = "0";

    if (isIconMode) {
      this.iframeWrapper.style.transform = "scale(0.8) translateY(20px)";
    } else {
      this.iframeWrapper.style.transform = "scale(0.95)";
    }

    setTimeout(() => {
      if (this.iframeWrapper && this.button) {
        this.iframeWrapper.style.display = "none";
        this.button.style.display = isIconMode ? "flex" : "flex";
        this.isOpen = false;
      }
    }, 300);
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };

    // Recreate iframe with new config
    if (this.iframeWrapper) {
      this.iframeWrapper.remove();
      this.createIframe();
    }
  }

  destroy() {
    if (this.container) {
      this.container.remove();
    }
    this.iframe = null;
    this.button = null;
    this.iframeWrapper = null;
    this.container = null;
  }
}

// Export for module usage
if (typeof window !== "undefined") {
  window.EclipseChatWidget = EclipseChatWidget;
}

// Auto-initialize if data attributes are present
if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    const script = document.querySelector("script[data-eclipse-chat]");
    if (script) {
      // Parse offset if provided
      let offset = {};
      const offsetStr = script.getAttribute("data-offset");
      if (offsetStr) {
        try {
          offset = JSON.parse(offsetStr);
        } catch {
          console.warn("Invalid offset JSON:", offsetStr);
        }
      }

      const config = {
        organizationId:
          script.getAttribute("data-organization-id") || undefined,
        chatbotId: script.getAttribute("data-chatbot-id") || undefined,
        theme: script.getAttribute("data-theme") || "auto",
        primaryColor: script.getAttribute("data-primary-color") || undefined,
        borderRadius: script.getAttribute("data-border-radius") || "8px",
        height: script.getAttribute("data-height") || "600px",
        width: script.getAttribute("data-width") || "400px",
        showBranding: script.getAttribute("data-show-branding") !== "false",
        welcomeMessage:
          script.getAttribute("data-welcome-message") || undefined,
        placeholder:
          script.getAttribute("data-placeholder") || "Type your message...",
        autoSendFirstMessage:
          script.getAttribute("data-auto-send-first-message") || undefined,
        position: script.getAttribute("data-position") || "bottom-right",
        autoOpen: script.getAttribute("data-auto-open") === "true",
        buttonText: script.getAttribute("data-button-text") || "Chat with us",
        mode: script.getAttribute("data-mode") || "popup",
        iconSize: script.getAttribute("data-icon-size") || "60px",
        offset: offset,
      };

      console.log(
        "[EclipseChatWidget] 📋 Parsed config from data attributes:",
        {
          autoSendFirstMessage: config.autoSendFirstMessage,
          dataAutoSendFirstMessage: script.getAttribute(
            "data-auto-send-first-message"
          ),
          welcomeMessage: config.welcomeMessage,
          chatbotId: config.chatbotId,
          mode: config.mode,
          allAttributes: Array.from(script.attributes).map((attr) => ({
            name: attr.name,
            value: attr.value,
          })),
        }
      );

      const baseUrl = script.getAttribute("data-base-url") || "";
      new EclipseChatWidget(config, baseUrl);
    }
  });
}

// CommonJS export
if (typeof module !== "undefined" && module.exports) {
  module.exports = EclipseChatWidget;
}
