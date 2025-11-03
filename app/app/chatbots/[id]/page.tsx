"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/shadcn/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shadcn/ui/card";
import { Badge } from "@/components/shadcn/ui/badge";
import { Input } from "@/components/shadcn/ui/input";
import { Label } from "@/components/shadcn/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shadcn/ui/select";
import { Checkbox } from "@/components/shadcn/ui/checkbox";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Bot,
  MessageSquare,
  FileText,
  MessageCircle,
  Copy,
  Check,
} from "lucide-react";
import {
  ContextBlockList,
  ContextBlock as ContextBlockListType,
} from "@/components/chatbots/ContextBlockList";
import { ContextBlockForm } from "@/components/chatbots/ContextBlockForm";
import { ChatbotConfig } from "@/lib/chatbot-service-enhanced";
import { ContextBlock } from "@prisma/client";

interface Chatbot {
  id: string;
  name: string;
  description?: string;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  config?: ChatbotConfig;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
  contextBlocks: ContextBlock[];
  _count: {
    chats: number;
    contextBlocks: number;
  };
}

export default function ChatbotDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [chatbot, setChatbot] = useState<Chatbot | null>(null);
  const [loading, setLoading] = useState(true);
  const [showContextForm, setShowContextForm] = useState(false);
  const [editingContextBlock, setEditingContextBlock] =
    useState<ContextBlock | null>(null);
  const [copied, setCopied] = useState(false);
  const [embedConfig, setEmbedConfig] = useState({
    embedType: "iframe" as "iframe" | "icon" | "popup",
    theme: "auto" as "light" | "dark" | "auto",
    primaryColor: "#3b82f6",
    borderRadius: "8px",
    width: "400",
    height: "600",
    showBranding: true,
    welcomeMessage: "",
    placeholder: "Type your message...",
    fontFamily: "",
    fontSize: "",
    // Widget-specific options
    iconSize: "60",
    position: "bottom-right" as "bottom-right" | "bottom-left" | "top-right" | "top-left" | "center",
    buttonText: "Chat with us",
    autoOpen: false,
  });

  useEffect(() => {
    // Fetch chatbot data
    const fetchChatbot = async () => {
      try {
        const response = await fetch(`/api/chatbots/${params.id}`);
        if (response.ok) {
          const data = await response.json();
          setChatbot(data);
        } else {
          console.error("Failed to fetch chatbot");
        }
      } catch (error) {
        console.error("Error fetching chatbot:", error);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchChatbot();
    }
  }, [params.id]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800";
      case "INACTIVE":
        return "bg-yellow-100 text-yellow-800";
      case "ARCHIVED":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const handleContextBlockSubmit = async (data: {
    title: string;
    content: string;
    type:
      | "TEXT"
      | "CODE"
      | "DOCUMENTATION"
      | "FAQ"
      | "TROUBLESHOOTING"
      | "TUTORIAL";
    metadata?: ContextBlock["metadata"];
  }) => {
    try {
      const url = editingContextBlock
        ? `/api/chatbots/${params.id}/context-blocks/${editingContextBlock.id}`
        : `/api/chatbots/${params.id}/context-blocks`;

      const method = editingContextBlock ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        // Refresh chatbot data
        const updatedResponse = await fetch(`/api/chatbots/${params.id}`);
        if (updatedResponse.ok) {
          const updatedData = await updatedResponse.json();
          setChatbot(updatedData);
        }
        setShowContextForm(false);
        setEditingContextBlock(null);
      } else {
        console.error("Failed to save context block");
      }
    } catch (error) {
      console.error("Error saving context block:", error);
    }
  };

  const handleContextBlockDelete = async (contextBlockId: string) => {
    if (!confirm("Are you sure you want to delete this context block?")) return;

    try {
      const response = await fetch(
        `/api/chatbots/${params.id}/context-blocks/${contextBlockId}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        // Refresh chatbot data
        const updatedResponse = await fetch(`/api/chatbots/${params.id}`);
        if (updatedResponse.ok) {
          const updatedData = await updatedResponse.json();
          setChatbot(updatedData);
        }
      } else {
        console.error("Failed to delete context block");
      }
    } catch (error) {
      console.error("Error deleting context block:", error);
    }
  };

  const handleContextBlockEdit = (contextBlock: ContextBlockListType) => {
    // Find the original Prisma ContextBlock to set as editing
    const originalBlock = chatbot?.contextBlocks.find(
      (block) => block.id === contextBlock.id
    );
    if (originalBlock) {
      setEditingContextBlock(originalBlock);
      setShowContextForm(true);
    }
  };

  const handleAddContextBlock = () => {
    setEditingContextBlock(null);
    setShowContextForm(false);
    setShowContextForm(true);
  };

  const getBaseUrl = () => {
    // Use environment variable if set, otherwise fall back to window.location.origin
    if (typeof window !== "undefined") {
      const envBaseUrl = process.env.NEXT_PUBLIC_EMBED_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL;
      if (envBaseUrl) {
        // Ensure it doesn't have a trailing slash
        return envBaseUrl.replace(/\/$/, "");
      }
      return window.location.origin;
    }
    return "";
  };

  const getEmbedUrl = () => {
    if (!chatbot) return "";
    
    const baseUrl = getBaseUrl();
    const params = new URLSearchParams({
      chatbotId: chatbot.id,
    });
    
    if (chatbot.organizationId) {
      params.append("organizationId", chatbot.organizationId);
    }

    // Add configurable parameters
    if (embedConfig.theme && embedConfig.theme !== "auto") {
      params.append("theme", embedConfig.theme);
    }
    if (embedConfig.primaryColor) {
      // URL encode the # symbol - URLSearchParams doesn't encode # automatically
      const encodedColor = embedConfig.primaryColor.startsWith("#") 
        ? "%23" + embedConfig.primaryColor.slice(1)
        : embedConfig.primaryColor;
      params.append("primaryColor", encodedColor);
    }
    if (embedConfig.borderRadius) {
      params.append("borderRadius", embedConfig.borderRadius);
    }
    if (embedConfig.width) {
      const widthValue = embedConfig.width + (embedConfig.width.includes("px") || embedConfig.width.includes("%") || embedConfig.width.includes("vw") || embedConfig.width.includes("vh") ? "" : "px");
      params.append("width", widthValue);
    }
    if (embedConfig.height) {
      const heightValue = embedConfig.height + (embedConfig.height.includes("px") || embedConfig.height.includes("%") || embedConfig.height.includes("vw") || embedConfig.height.includes("vh") ? "" : "px");
      params.append("height", heightValue);
    }
    if (!embedConfig.showBranding) {
      params.append("showBranding", "false");
    }
    if (embedConfig.welcomeMessage) {
      params.append("welcomeMessage", embedConfig.welcomeMessage);
    }
    if (embedConfig.placeholder) {
      params.append("placeholder", embedConfig.placeholder);
    }
    if (embedConfig.fontFamily) {
      params.append("fontFamily", embedConfig.fontFamily);
    }
    if (embedConfig.fontSize) {
      params.append("fontSize", embedConfig.fontSize);
    }

    return `${baseUrl}/embed/chat?${params.toString()}`;
  };

  const getEmbedCode = () => {
    if (!chatbot) return "";
    
    const baseUrl = getBaseUrl();
    
    if (embedConfig.embedType === "iframe") {
      const embedUrl = getEmbedUrl();
      const widthValue = embedConfig.width + (embedConfig.width.includes("px") || embedConfig.width.includes("%") || embedConfig.width.includes("vw") || embedConfig.width.includes("vh") ? "" : "px");
      const heightValue = embedConfig.height + (embedConfig.height.includes("px") || embedConfig.height.includes("%") || embedConfig.height.includes("vw") || embedConfig.height.includes("vh") ? "" : "px");
      const borderRadiusValue = embedConfig.borderRadius;
      
      return `<iframe
  src="${embedUrl}"
  width="${widthValue}"
  height="${heightValue}"
  frameborder="0"
  style="border-radius: ${borderRadiusValue}; box-shadow: 0 4px 12px rgba(0,0,0,0.15);"
></iframe>`;
    } else {
      // Widget mode (icon or popup)
      const config: string[] = [];
      config.push(`  mode: '${embedConfig.embedType}',`);
      config.push(`  chatbotId: '${chatbot.id}',`);
      
      if (chatbot.organizationId) {
        config.push(`  organizationId: '${chatbot.organizationId}',`);
      }
      if (embedConfig.theme && embedConfig.theme !== "auto") {
        config.push(`  theme: '${embedConfig.theme}',`);
      }
      if (embedConfig.primaryColor) {
        config.push(`  primaryColor: '${embedConfig.primaryColor}',`);
      }
      if (embedConfig.borderRadius) {
        config.push(`  borderRadius: '${embedConfig.borderRadius}',`);
      }
      if (embedConfig.width) {
        const widthValue = embedConfig.width + (embedConfig.width.includes("px") || embedConfig.width.includes("%") || embedConfig.width.includes("vw") || embedConfig.width.includes("vh") ? "" : "px");
        config.push(`  width: '${widthValue}',`);
      }
      if (embedConfig.height) {
        const heightValue = embedConfig.height + (embedConfig.height.includes("px") || embedConfig.height.includes("%") || embedConfig.height.includes("vw") || embedConfig.height.includes("vh") ? "" : "px");
        config.push(`  height: '${heightValue}',`);
      }
      if (embedConfig.welcomeMessage) {
        config.push(`  welcomeMessage: '${embedConfig.welcomeMessage.replace(/'/g, "\\'")}',`);
      }
      if (embedConfig.placeholder) {
        config.push(`  placeholder: '${embedConfig.placeholder.replace(/'/g, "\\'")}',`);
      }
      
      if (embedConfig.embedType === "icon") {
        if (embedConfig.iconSize) {
          const iconSizeValue = embedConfig.iconSize + (embedConfig.iconSize.includes("px") ? "" : "px");
          config.push(`  iconSize: '${iconSizeValue}',`);
        }
      }
      
      if (embedConfig.position !== "bottom-right") {
        config.push(`  position: '${embedConfig.position}',`);
      }
      
      if (embedConfig.embedType === "popup" && embedConfig.buttonText) {
        config.push(`  buttonText: '${embedConfig.buttonText.replace(/'/g, "\\'")}',`);
      }
      
      if (embedConfig.autoOpen) {
        config.push(`  autoOpen: true,`);
      }
      
      // Join config and remove trailing comma from last item
      let configStr = config.join("\n");
      // Remove trailing comma from the last line
      configStr = configStr.replace(/,\s*$/, "");
      
      return `<script src="${baseUrl}/eclipse-chat-widget.js"></script>
<script>
  new EclipseChatWidget({
${configStr}
  });
</script>`;
    }
  };

  const handleCopyEmbedCode = async () => {
    const embedCode = getEmbedCode();
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = embedCode;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Fallback copy failed:", err);
      } finally {
        document.body.removeChild(textArea);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading chatbot...</div>
      </div>
    );
  }

  if (!chatbot) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Chatbot not found</div>
      </div>
    );
  }

  if (showContextForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => setShowContextForm(false)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Chatbot
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">
            {editingContextBlock ? "Edit Context Block" : "Add Context Block"}
          </h1>
        </div>
        <ContextBlockForm
          contextBlock={editingContextBlock || undefined}
          onSubmit={handleContextBlockSubmit}
          onCancel={() => {
            setShowContextForm(false);
            setEditingContextBlock(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center">
              <Bot className="h-6 w-6 mr-2" />
              {chatbot.name}
            </h1>
            <p className="text-muted-foreground">
              {chatbot.description || "No description provided"}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={() =>
              window.open(`/app/chatbots/${params.id}/chat`, "_blank")
            }
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Start Chat
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/app/chatbots/${params.id}/edit`)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Chatbot
          </Button>
          <Button variant="outline">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={`${getStatusColor(chatbot.status)} w-fit`}>
              {chatbot.status}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Chats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <MessageSquare className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-2xl font-bold">
                {chatbot._count?.chats || 0}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Context Blocks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-2xl font-bold">
                {chatbot._count?.contextBlocks || 0}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Embed Code</CardTitle>
            <Button
              onClick={handleCopyEmbedCode}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Code
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              Configure the embed options below. The embed code will update automatically based on your selection.
            </p>
          </div>

          {/* Configuration Controls */}
          <div className="space-y-2">
            <Label htmlFor="embedType">Embed Type</Label>
            <Select
              value={embedConfig.embedType}
              onValueChange={(value: "iframe" | "icon" | "popup") =>
                setEmbedConfig((prev) => ({ ...prev, embedType: value }))
              }
            >
              <SelectTrigger id="embedType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="iframe">Inline iframe</SelectItem>
                <SelectItem value="icon">Icon Mode (Floating Icon)</SelectItem>
                <SelectItem value="popup">Popup Mode (Floating Button)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {embedConfig.embedType === "iframe" && "Direct iframe embed - best for embedding in a specific location"}
              {embedConfig.embedType === "icon" && "Floating icon button (Intercom-style) - expands to full chat window"}
              {embedConfig.embedType === "popup" && "Floating button with text - expands to full chat window"}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="theme">Theme</Label>
              <Select
                value={embedConfig.theme}
                onValueChange={(value: "light" | "dark" | "auto") =>
                  setEmbedConfig((prev) => ({ ...prev, theme: value }))
                }
              >
                <SelectTrigger id="theme">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="primaryColor">Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="primaryColor"
                  type="color"
                  value={embedConfig.primaryColor}
                  onChange={(e) =>
                    setEmbedConfig((prev) => ({ ...prev, primaryColor: e.target.value }))
                  }
                  className="w-16 h-10 p-1"
                />
                <Input
                  type="text"
                  value={embedConfig.primaryColor}
                  onChange={(e) =>
                    setEmbedConfig((prev) => ({ ...prev, primaryColor: e.target.value }))
                  }
                  placeholder="#3b82f6"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="borderRadius">Border Radius</Label>
              <Input
                id="borderRadius"
                value={embedConfig.borderRadius}
                onChange={(e) =>
                  setEmbedConfig((prev) => ({ ...prev, borderRadius: e.target.value }))
                }
                placeholder="8px"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="width">Width</Label>
              <Input
                id="width"
                value={embedConfig.width}
                onChange={(e) =>
                  setEmbedConfig((prev) => ({ ...prev, width: e.target.value }))
                }
                placeholder="400px or 100%"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="height">Height</Label>
              <Input
                id="height"
                value={embedConfig.height}
                onChange={(e) =>
                  setEmbedConfig((prev) => ({ ...prev, height: e.target.value }))
                }
                placeholder="600px or 100vh"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="welcomeMessage">Welcome Message</Label>
              <Input
                id="welcomeMessage"
                value={embedConfig.welcomeMessage}
                onChange={(e) =>
                  setEmbedConfig((prev) => ({ ...prev, welcomeMessage: e.target.value }))
                }
                placeholder="Hello! How can I help you today?"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="placeholder">Input Placeholder</Label>
              <Input
                id="placeholder"
                value={embedConfig.placeholder}
                onChange={(e) =>
                  setEmbedConfig((prev) => ({ ...prev, placeholder: e.target.value }))
                }
                placeholder="Type your message..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fontFamily">Font Family</Label>
              <Input
                id="fontFamily"
                value={embedConfig.fontFamily}
                onChange={(e) =>
                  setEmbedConfig((prev) => ({ ...prev, fontFamily: e.target.value }))
                }
                placeholder="Inter, Arial, sans-serif"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fontSize">Font Size</Label>
              <Input
                id="fontSize"
                value={embedConfig.fontSize}
                onChange={(e) =>
                  setEmbedConfig((prev) => ({ ...prev, fontSize: e.target.value }))
                }
                placeholder="16px"
              />
            </div>

            {/* Widget-specific options */}
            {embedConfig.embedType === "icon" && (
              <div className="space-y-2">
                <Label htmlFor="iconSize">Icon Size</Label>
                <Input
                  id="iconSize"
                  value={embedConfig.iconSize}
                  onChange={(e) =>
                    setEmbedConfig((prev) => ({ ...prev, iconSize: e.target.value }))
                  }
                  placeholder="60px"
                />
              </div>
            )}

            {embedConfig.embedType === "popup" && (
              <div className="space-y-2">
                <Label htmlFor="buttonText">Button Text</Label>
                <Input
                  id="buttonText"
                  value={embedConfig.buttonText}
                  onChange={(e) =>
                    setEmbedConfig((prev) => ({ ...prev, buttonText: e.target.value }))
                  }
                  placeholder="Chat with us"
                />
              </div>
            )}

            {(embedConfig.embedType === "icon" || embedConfig.embedType === "popup") && (
              <div className="space-y-2">
                <Label htmlFor="position">Position</Label>
                <Select
                  value={embedConfig.position}
                  onValueChange={(value: "bottom-right" | "bottom-left" | "top-right" | "top-left" | "center") =>
                    setEmbedConfig((prev) => ({ ...prev, position: value }))
                  }
                >
                  <SelectTrigger id="position">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bottom-right">Bottom Right</SelectItem>
                    <SelectItem value="bottom-left">Bottom Left</SelectItem>
                    <SelectItem value="top-right">Top Right</SelectItem>
                    <SelectItem value="top-left">Top Left</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="showBranding"
              checked={embedConfig.showBranding}
              onCheckedChange={(checked) =>
                setEmbedConfig((prev) => ({ ...prev, showBranding: checked === true }))
              }
            />
            <Label
              htmlFor="showBranding"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Show organization branding
            </Label>
          </div>

          {(embedConfig.embedType === "icon" || embedConfig.embedType === "popup") && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="autoOpen"
                checked={embedConfig.autoOpen}
                onCheckedChange={(checked) =>
                  setEmbedConfig((prev) => ({ ...prev, autoOpen: checked === true }))
                }
              />
              <Label
                htmlFor="autoOpen"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Automatically open chat on page load
              </Label>
            </div>
          )}

          {/* Live Preview */}
          {embedConfig.embedType === "iframe" && (
            <div className="space-y-2">
              <Label>Live Preview</Label>
              <div className="bg-muted p-4 rounded-lg flex justify-center items-center">
                <div
                  style={{
                    width: embedConfig.width.includes("%") || embedConfig.width.includes("vw") || embedConfig.width.includes("vh") 
                      ? "100%" 
                      : embedConfig.width + (embedConfig.width.includes("px") ? "" : "px"),
                    height: embedConfig.height.includes("%") || embedConfig.height.includes("vh") 
                      ? "600px" 
                      : embedConfig.height + (embedConfig.height.includes("px") ? "" : "px"),
                    maxWidth: "100%",
                    borderRadius: embedConfig.borderRadius,
                    overflow: "hidden",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  }}
                >
                  <iframe
                    src={getEmbedUrl()}
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    style={{
                      border: "none",
                      display: "block",
                    }}
                    title="Chat widget preview"
                  />
                </div>
              </div>
            </div>
          )}

          {(embedConfig.embedType === "icon" || embedConfig.embedType === "popup") && (
            <div className="space-y-2">
              <Label>Preview Note</Label>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Widget modes (icon/popup) create a floating button that appears on your website. 
                  The preview will be available when you embed the code on your site. 
                  Copy the code below and include it in your HTML to see the widget in action.
                </p>
              </div>
            </div>
          )}

          {/* Embed Code Preview */}
          <div className="space-y-2">
            <Label>Embed Code</Label>
            <div className="bg-muted p-4 rounded-lg relative">
              <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-words">
                <code>{getEmbedCode()}</code>
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Chatbot Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium">Created</h4>
              <p className="text-sm text-muted-foreground">
                {formatDate(chatbot.createdAt)}
              </p>
            </div>
            <div>
              <h4 className="font-medium">Last Updated</h4>
              <p className="text-sm text-muted-foreground">
                {formatDate(chatbot.updatedAt)}
              </p>
            </div>
            {chatbot.config && (
              <div>
                <h4 className="font-medium">Configuration</h4>
                <pre className="text-sm text-muted-foreground bg-muted p-2 rounded">
                  {JSON.stringify(chatbot.config, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vector Database Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Vectorized Blocks</span>
                <span className="text-sm font-medium">
                  {
                    chatbot.contextBlocks.filter((block) => block.vectorId)
                      .length
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Pending Blocks</span>
                <span className="text-sm font-medium">
                  {
                    chatbot.contextBlocks.filter((block) => !block.vectorId)
                      .length
                  }
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 mt-2">
                <div
                  className="bg-primary h-2 rounded-full"
                  style={{
                    width: `${
                      chatbot.contextBlocks.length > 0
                        ? (chatbot.contextBlocks.filter(
                            (block) => block.vectorId
                          ).length /
                            chatbot.contextBlocks.length) *
                          100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <ContextBlockList
        contextBlocks={chatbot.contextBlocks.map(
          (block): ContextBlockListType => ({
            id: block.id,
            title: block.title,
            content: block.content,
            type: block.type,
            metadata: block.metadata
              ? {
                  title: block.title,
                  content: block.content,
                  type: block.type,
                  chatbotId: block.chatbotId,
                  contextBlockId: block.id,
                }
              : undefined,
            vectorId: block.vectorId || undefined,
            createdAt: block.createdAt,
            updatedAt: block.updatedAt,
          })
        )}
        onEdit={handleContextBlockEdit}
        onDelete={handleContextBlockDelete}
        onAdd={handleAddContextBlock}
      />
    </div>
  );
}
