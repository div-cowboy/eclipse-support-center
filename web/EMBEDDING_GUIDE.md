# Eclipse Support Center - Chat Widget Embedding Guide

This guide explains how to embed the Eclipse Support Center chat widget into external websites using iframe or JavaScript integration.

## Overview

The Eclipse Support Center provides two main ways to embed chat functionality:

1. **Iframe Embedding** - Simple HTML iframe integration
2. **JavaScript Widget** - Advanced JavaScript SDK with customizable UI

## Iframe Embedding

### Basic Usage

Add an iframe to your website with the chat widget:

```html
<iframe
  src="https://your-domain.com/embed/chat?chatbotId=YOUR_CHATBOT_ID&organizationId=YOUR_ORG_ID"
  width="400"
  height="600"
  frameborder="0"
  style="border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);"
>
</iframe>
```

### Configuration Parameters

| Parameter        | Description                | Default       | Example                  |
| ---------------- | -------------------------- | ------------- | ------------------------ |
| `chatbotId`      | ID of the chatbot to use   | Required      | `cm123abc456def`         |
| `organizationId` | ID of the organization     | Optional      | `org789xyz012`           |
| `theme`          | Color theme                | `auto`        | `light`, `dark`, `auto`  |
| `primaryColor`   | Primary color (hex)        | Default theme | `#3b82f6`                |
| `borderRadius`   | Border radius              | `8px`         | `12px`, `0px`            |
| `height`         | Widget height              | `600px`       | `500px`, `100vh`         |
| `width`          | Widget width               | `100%`        | `400px`, `50vw`          |
| `showBranding`   | Show organization branding | `true`        | `true`, `false`          |
| `welcomeMessage` | Custom welcome message     | Default       | `Hello! How can I help?` |
| `placeholder`    | Input placeholder text     | Default       | `Ask me anything...`     |

### Example with Custom Styling

```html
<iframe
  src="https://your-domain.com/embed/chat?chatbotId=cm123abc456def&theme=dark&primaryColor=%23ff6b6b&borderRadius=12px&height=500px&width=350px&welcomeMessage=Welcome%20to%20our%20support%20chat!"
  width="350"
  height="500"
  frameborder="0"
  style="border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.2);"
>
</iframe>
```

## JavaScript Widget SDK

### Basic Integration

Include the SDK script and initialize with data attributes:

```html
<!-- Include the SDK -->
<script
  src="https://your-domain.com/eclipse-chat-widget.js"
  data-eclipse-chat
  data-chatbot-id="cm123abc456def"
  data-organization-id="org789xyz012"
  data-theme="auto"
  data-position="bottom-right"
  data-primary-color="#3b82f6"
  data-button-text="Chat with us"
></script>
```

### Advanced JavaScript Integration

```html
<script src="https://your-domain.com/eclipse-chat-widget.js"></script>
<script>
  const chatWidget = new EclipseChatWidget({
    chatbotId: "cm123abc456def",
    organizationId: "org789xyz012",
    theme: "dark",
    primaryColor: "#ff6b6b",
    borderRadius: "12px",
    height: "500px",
    width: "350px",
    position: "bottom-right",
    showBranding: true,
    welcomeMessage: "Welcome! How can I help you today?",
    placeholder: "Type your message here...",
    autoOpen: false,
    buttonText: "Need Help?",
  });

  // Programmatic control
  chatWidget.open(); // Open the chat
  chatWidget.close(); // Close the chat
  chatWidget.toggle(); // Toggle open/close
  chatWidget.destroy(); // Remove the widget
</script>
```

### Widget Configuration Options

| Option           | Type    | Default                 | Description                                                                |
| ---------------- | ------- | ----------------------- | -------------------------------------------------------------------------- |
| `chatbotId`      | string  | Required                | ID of the chatbot to use                                                   |
| `organizationId` | string  | Optional                | ID of the organization                                                     |
| `theme`          | string  | `"auto"`                | `"light"`, `"dark"`, `"auto"`                                              |
| `primaryColor`   | string  | Theme default           | Hex color code                                                             |
| `borderRadius`   | string  | `"8px"`                 | Border radius value                                                        |
| `height`         | string  | `"600px"`               | Widget height                                                              |
| `width`          | string  | `"400px"`               | Widget width                                                               |
| `position`       | string  | `"bottom-right"`        | `"bottom-right"`, `"bottom-left"`, `"top-right"`, `"top-left"`, `"center"` |
| `showBranding`   | boolean | `true`                  | Show organization branding                                                 |
| `welcomeMessage` | string  | Default                 | Custom welcome message                                                     |
| `placeholder`    | string  | Default                 | Input placeholder text                                                     |
| `autoOpen`       | boolean | `false`                 | Auto-open on page load                                                     |
| `buttonText`     | string  | `"Chat with us"`        | Button text                                                                |
| `containerId`    | string  | `"eclipse-chat-widget"` | Custom container ID                                                        |

### Widget Methods

| Method                 | Description                 |
| ---------------------- | --------------------------- |
| `open()`               | Open the chat widget        |
| `close()`              | Close the chat widget       |
| `toggle()`             | Toggle open/close state     |
| `destroy()`            | Remove the widget from DOM  |
| `updateConfig(config)` | Update widget configuration |

## Security Considerations

### CORS Configuration

The embed endpoints are configured with permissive CORS headers to allow embedding from any domain:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

### Iframe Security

The embed pages are configured to allow iframe embedding:

```
X-Frame-Options: ALLOWALL
Content-Security-Policy: frame-ancestors *
```

### Authentication

- **Embed endpoints** (`/api/embed/*`) work without authentication
- Only **active chatbots** can be embedded
- Organization and chatbot access is validated server-side

## Styling and Customization

### CSS Custom Properties

The widget supports CSS custom properties for theming:

```css
:root {
  --primary: #3b82f6;
  --primary-foreground: #ffffff;
  --background: #ffffff;
  --foreground: #000000;
  --muted: #f1f5f9;
  --muted-foreground: #64748b;
  --border: #e2e8f0;
  --border-radius: 8px;
}
```

### Responsive Design

The widget is responsive and adapts to different screen sizes:

```html
<!-- Mobile-friendly iframe -->
<iframe
  src="https://your-domain.com/embed/chat?chatbotId=YOUR_CHATBOT_ID"
  width="100%"
  height="100vh"
  frameborder="0"
  style="min-height: 400px;"
>
</iframe>
```

## Examples

### E-commerce Website

```html
<!-- Product page chat widget -->
<div class="product-chat">
  <iframe
    src="https://your-domain.com/embed/chat?chatbotId=product-support&theme=light&primaryColor=%23059669&welcomeMessage=Need%20help%20with%20this%20product?"
    width="350"
    height="500"
    frameborder="0"
    style="border-radius: 8px;"
  >
  </iframe>
</div>
```

### Documentation Site

```html
<!-- Documentation help widget -->
<script
  src="https://your-domain.com/eclipse-chat-widget.js"
  data-eclipse-chat
  data-chatbot-id="docs-support"
  data-theme="light"
  data-position="bottom-left"
  data-button-text="Get Help"
  data-welcome-message="Need%20help%20with%20our%20documentation?"
></script>
```

### Mobile App Integration

```html
<!-- Mobile-optimized widget -->
<script>
  const isMobile = window.innerWidth < 768;
  const chatWidget = new EclipseChatWidget({
    chatbotId: "mobile-support",
    width: isMobile ? "100vw" : "400px",
    height: isMobile ? "100vh" : "600px",
    position: isMobile ? "center" : "bottom-right",
    borderRadius: isMobile ? "0px" : "12px",
  });
</script>
```

## Troubleshooting

### Common Issues

1. **Widget not loading**: Check that the chatbot ID is correct and the chatbot is active
2. **CORS errors**: Ensure you're using the embed endpoints (`/api/embed/*`)
3. **Styling issues**: Check that CSS custom properties are supported
4. **Mobile responsiveness**: Test on different screen sizes

### Debug Mode

Enable debug mode to see detailed error messages:

```html
<iframe
  src="https://your-domain.com/embed/chat?chatbotId=YOUR_CHATBOT_ID&debug=true"
  width="400"
  height="600"
>
</iframe>
```

## API Reference

### Embed Endpoints

- `GET /api/embed/chatbots/{id}` - Get chatbot information
- `POST /api/embed/chatbots/{id}/chat` - Send message to chatbot
- `GET /embed/chat` - Chat widget page

### Response Format

```json
{
  "success": true,
  "response": "AI response text",
  "sources": [
    {
      "documentId": "doc123",
      "title": "Document Title",
      "score": 0.95,
      "snippet": "Relevant text snippet",
      "type": "organization_description"
    }
  ],
  "tokensUsed": 150
}
```

## Support

For technical support or questions about embedding the chat widget, please contact your Eclipse Support Center administrator or refer to the main documentation.
