/**
 * Eclipse Support Center Chat Widget SDK
 * 
 * This SDK provides an easy way to embed the Eclipse Support Center chat widget
 * into any website using iframe or JavaScript integration.
 */

interface ChatWidgetConfig {
  organizationId?: string;
  chatbotId?: string;
  theme?: "light" | "dark" | "auto";
  primaryColor?: string;
  borderRadius?: string;
  height?: string;
  width?: string;
  showBranding?: boolean;
  welcomeMessage?: string;
  placeholder?: string;
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left" | "center";
  autoOpen?: boolean;
  buttonText?: string;
  buttonIcon?: string;
  containerId?: string;
}

interface ChatWidgetInstance {
  open: () => void;
  close: () => void;
  toggle: () => void;
  destroy: () => void;
  updateConfig: (config: Partial<ChatWidgetConfig>) => void;
}

class EclipseChatWidget {
  private config: ChatWidgetConfig;
  private iframe: HTMLIFrameElement | null = null;
  private button: HTMLButtonElement | null = null;
  private container: HTMLElement | null = null;
  private isOpen: boolean = false;
  private baseUrl: string;

  constructor(config: ChatWidgetConfig, baseUrl: string = "") {
    this.config = {
      theme: "auto",
      borderRadius: "8px",
      height: "600px",
      width: "400px",
      showBranding: true,
      position: "bottom-right",
      autoOpen: false,
      buttonText: "Chat with us",
      ...config,
    };
    this.baseUrl = baseUrl;
    this.init();
  }

  private init(): void {
    this.createContainer();
    this.createButton();
    this.createIframe();
    
    if (this.config.autoOpen) {
      this.open();
    }
  }

  private createContainer(): void {
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

  private getPositionStyles(): string {
    const position = this.config.position || "bottom-right";
    
    switch (position) {
      case "bottom-right":
        return "bottom: 20px; right: 20px;";
      case "bottom-left":
        return "bottom: 20px; left: 20px;";
      case "top-right":
        return "top: 20px; right: 20px;";
      case "top-left":
        return "top: 20px; left: 20px;";
      case "center":
        return "top: 50%; left: 50%; transform: translate(-50%, -50%);";
      default:
        return "bottom: 20px; right: 20px;";
    }
  }

  private createButton(): void {
    if (!this.container) return;

    this.button = document.createElement("button");
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
      transition: all 0.2s ease;
    `;
    
    this.button.addEventListener("click", () => this.toggle());
    this.button.addEventListener("mouseenter", () => {
      if (this.button) {
        this.button.style.transform = "translateY(-2px)";
        this.button.style.boxShadow = "0 6px 16px rgba(0, 0, 0, 0.2)";
      }
    });
    this.button.addEventListener("mouseleave", () => {
      if (this.button) {
        this.button.style.transform = "translateY(0)";
        this.button.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
      }
    });
    
    this.container.appendChild(this.button);
  }

  private createIframe(): void {
    if (!this.container) return;

    this.iframe = document.createElement("iframe");
    
    const params = new URLSearchParams();
    if (this.config.organizationId) params.set("organizationId", this.config.organizationId);
    if (this.config.chatbotId) params.set("chatbotId", this.config.chatbotId);
    if (this.config.theme) params.set("theme", this.config.theme);
    if (this.config.primaryColor) params.set("primaryColor", this.config.primaryColor);
    if (this.config.borderRadius) params.set("borderRadius", this.config.borderRadius);
    if (this.config.height) params.set("height", this.config.height);
    if (this.config.width) params.set("width", this.config.width);
    if (this.config.showBranding !== undefined) params.set("showBranding", this.config.showBranding.toString());
    if (this.config.welcomeMessage) params.set("welcomeMessage", this.config.welcomeMessage);
    if (this.config.placeholder) params.set("placeholder", this.config.placeholder);
    
    this.iframe.src = `${this.baseUrl}/embed/chat?${params.toString()}`;
    this.iframe.style.cssText = `
      width: ${this.config.width};
      height: ${this.config.height};
      border: none;
      border-radius: ${this.config.borderRadius};
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
      display: none;
      background: white;
    `;
    
    this.container.appendChild(this.iframe);
  }

  public open(): void {
    if (!this.iframe || !this.button) return;
    
    this.iframe.style.display = "block";
    this.button.style.display = "none";
    this.isOpen = true;
    
    // Add animation
    this.iframe.style.opacity = "0";
    this.iframe.style.transform = "scale(0.9)";
    
    requestAnimationFrame(() => {
      if (this.iframe) {
        this.iframe.style.transition = "all 0.3s ease";
        this.iframe.style.opacity = "1";
        this.iframe.style.transform = "scale(1)";
      }
    });
  }

  public close(): void {
    if (!this.iframe || !this.button) return;
    
    this.iframe.style.transition = "all 0.3s ease";
    this.iframe.style.opacity = "0";
    this.iframe.style.transform = "scale(0.9)";
    
    setTimeout(() => {
      if (this.iframe && this.button) {
        this.iframe.style.display = "none";
        this.button.style.display = "flex";
        this.isOpen = false;
      }
    }, 300);
  }

  public toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  public updateConfig(newConfig: Partial<ChatWidgetConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Recreate iframe with new config
    if (this.iframe) {
      this.iframe.remove();
      this.createIframe();
    }
  }

  public destroy(): void {
    if (this.container) {
      this.container.remove();
    }
    this.iframe = null;
    this.button = null;
    this.container = null;
  }
}

// Global function for easy integration
declare global {
  interface Window {
    EclipseChatWidget: typeof EclipseChatWidget;
  }
}

// Export for module usage
if (typeof window !== "undefined") {
  window.EclipseChatWidget = EclipseChatWidget;
}

// Auto-initialize if data attributes are present
if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    const script = document.querySelector('script[data-eclipse-chat]');
    if (script) {
      const config: ChatWidgetConfig = {
        organizationId: script.getAttribute('data-organization-id') || undefined,
        chatbotId: script.getAttribute('data-chatbot-id') || undefined,
        theme: (script.getAttribute('data-theme') as any) || "auto",
        primaryColor: script.getAttribute('data-primary-color') || undefined,
        borderRadius: script.getAttribute('data-border-radius') || "8px",
        height: script.getAttribute('data-height') || "600px",
        width: script.getAttribute('data-width') || "400px",
        showBranding: script.getAttribute('data-show-branding') !== "false",
        welcomeMessage: script.getAttribute('data-welcome-message') || undefined,
        placeholder: script.getAttribute('data-placeholder') || "Type your message...",
        position: (script.getAttribute('data-position') as any) || "bottom-right",
        autoOpen: script.getAttribute('data-auto-open') === "true",
        buttonText: script.getAttribute('data-button-text') || "Chat with us",
      };
      
      const baseUrl = script.getAttribute('data-base-url') || '';
      new EclipseChatWidget(config, baseUrl);
    }
  });
}

export default EclipseChatWidget;
