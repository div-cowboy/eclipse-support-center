# Embed Chat Styling Guide

This guide shows you how to customize the appearance of the embedded chat interface.

## Method 1: URL Parameters (Recommended)

You can customize styles by passing URL parameters to the iframe source.

### Basic Example

```html
<iframe 
  src="https://your-domain.com/embed/chat?chatbotId=YOUR_ID&primaryColor=%2300ff00&fontFamily=Arial"
  width="400"
  height="600"
  frameborder="0"
></iframe>
```

### Available URL Parameters

| Parameter | Type | Default | Description | Example |
|-----------|------|---------|-------------|---------|
| `chatbotId` | string | required | The chatbot ID | `chatbotId=abc123` |
| `organizationId` | string | optional | Organization ID (alternative to chatbotId) | `organizationId=org123` |
| `theme` | string | `"auto"` | Theme: "light", "dark", or "auto" | `theme=dark` |
| `primaryColor` | string | default | Primary color (URL encoded hex) | `primaryColor=%23ff6b6b` |
| `borderRadius` | string | `"8px"` | Border radius for the container | `borderRadius=16px` |
| `height` | string | `"600px"` | Height of the chat container | `height=100vh` |
| `width` | string | `"100%"` | Width of the chat container | `width=100%` |
| `showBranding` | boolean | `true` | Show organization branding | `showBranding=false` |
| `welcomeMessage` | string | default | Custom welcome message | `welcomeMessage=Hello!` |
| `placeholder` | string | `"Type your message..."` | Input placeholder text | `placeholder=Ask%20me%20anything` |
| `fontFamily` | string | default | Font family for all text | `fontFamily=Inter` |
| `fontSize` | string | default | Base font size | `fontSize=16px` |
| `customCSS` | string | none | Custom CSS rules (URL encoded) | See below |

### URL Encoding

Remember to URL encode special characters:
- `#` becomes `%23` (for hex colors)
- Space becomes `%20`
- `!` becomes `%21`

## Method 2: Custom CSS via URL Parameter

For advanced customization, you can pass custom CSS through the `customCSS` parameter.

### Example: Custom Message Bubbles

```javascript
// Define your custom CSS
const customCSS = `
  .bg-primary {
    background-color: #ff6b6b !important;
  }
  .bg-muted {
    background-color: #f0f0f0 !important;
  }
  [class*="rounded-lg"] {
    border-radius: 20px !important;
  }
`;

// URL encode it
const encodedCSS = encodeURIComponent(customCSS);

// Use in iframe src
const iframeSrc = `https://your-domain.com/embed/chat?chatbotId=abc123&customCSS=${encodedCSS}`;
```

### Example: Custom Header Styling

```javascript
const customCSS = `
  .border-b {
    border-color: #ff6b6b !important;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }
  .border-b * {
    color: white !important;
  }
`;

const iframeSrc = `https://your-domain.com/embed/chat?chatbotId=abc123&customCSS=${encodeURIComponent(customCSS)}`;
```

### Example: Hide Branding and Customize Colors

```javascript
const customCSS = `
  /* Hide organization badge */
  [class*="Badge"] {
    display: none;
  }
  
  /* Custom scrollbar */
  .overflow-y-auto::-webkit-scrollbar {
    width: 8px;
  }
  .overflow-y-auto::-webkit-scrollbar-track {
    background: #f1f1f1;
  }
  .overflow-y-auto::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 4px;
  }
  
  /* Custom message animations */
  [class*="flex gap-3"] {
    animation: slideIn 0.3s ease-out;
  }
  
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;
```

## Method 3: Complete JavaScript Integration

Here's a complete example with a customizable embed:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Custom Chat Embed</title>
  <style>
    body {
      margin: 0;
      font-family: system-ui, -apple-system, sans-serif;
    }
    
    .chat-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 400px;
      height: 600px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      border-radius: 12px;
      overflow: hidden;
      z-index: 1000;
    }
    
    @media (max-width: 768px) {
      .chat-container {
        bottom: 0;
        right: 0;
        width: 100%;
        height: 100vh;
        border-radius: 0;
      }
    }
  </style>
</head>
<body>
  <h1>My Website</h1>
  <p>Chat widget will appear in the bottom right corner.</p>

  <div class="chat-container">
    <iframe 
      id="chat-iframe"
      width="100%" 
      height="100%" 
      frameborder="0"
      allow="clipboard-write"
    ></iframe>
  </div>

  <script>
    // Configuration
    const chatConfig = {
      chatbotId: 'YOUR_CHATBOT_ID',
      theme: 'light',
      primaryColor: '#667eea',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '15px',
      welcomeMessage: 'Hi! How can I help you today?',
      placeholder: 'Type your message here...',
      customCSS: `
        .bg-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .border-b {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .border-b * {
          color: white !important;
        }
      `
    };

    // Build URL with parameters
    function buildChatURL(config) {
      const baseURL = 'https://your-domain.com/embed/chat';
      const params = new URLSearchParams();
      
      Object.entries(config).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value);
        }
      });
      
      return `${baseURL}?${params.toString()}`;
    }

    // Initialize iframe
    const iframe = document.getElementById('chat-iframe');
    iframe.src = buildChatURL(chatConfig);
  </script>
</body>
</html>
```

## Method 4: Global Styles in Embed Layout

For consistent styling across all embeds, you can add global styles directly to the embed layout.

Create or edit `app/embed/globals.css`:

```css
/* Custom embed styles */
.embed-chat-container {
  /* Your global styles here */
}

/* Override Tailwind classes */
.bg-primary {
  background-color: var(--embed-primary-color, #3b82f6) !important;
}
```

Then import it in `app/embed/layout.tsx`:

```typescript
import "./globals.css";
```

## Common Styling Examples

### 1. Rounded Message Bubbles

```javascript
const customCSS = `
  [class*="rounded-lg"] {
    border-radius: 20px !important;
  }
`;
```

### 2. Transparent Background

```javascript
const customCSS = `
  .bg-background {
    background-color: transparent !important;
  }
  .border-0 {
    box-shadow: none !important;
  }
`;
```

### 3. Custom Accent Color

```javascript
const customCSS = `
  .bg-primary, .bg-blue-600 {
    background-color: #10b981 !important;
  }
  .text-blue-600, .text-blue-700 {
    color: #10b981 !important;
  }
`;
```

### 4. Larger Text

```javascript
const customCSS = `
  .text-sm {
    font-size: 16px !important;
  }
  .text-lg {
    font-size: 20px !important;
  }
`;
```

### 5. Hide Elements

```javascript
const customCSS = `
  /* Hide timestamps */
  .opacity-70 {
    display: none !important;
  }
  
  /* Hide avatar icons */
  .rounded-full {
    display: none !important;
  }
`;
```

## Security Note

The `customCSS` parameter uses `dangerouslySetInnerHTML` to inject styles. Only allow trusted sources to provide custom CSS to prevent CSS injection attacks. Consider implementing:

1. CSS sanitization
2. Allowlist of CSS properties
3. Content Security Policy headers

## Testing Your Styles

You can test your embed styling locally:

```bash
# Start the development server
npm run dev

# Open in browser with parameters:
# http://localhost:3000/embed/chat?chatbotId=YOUR_ID&primaryColor=%23ff0000
```

## Troubleshooting

### Styles not applying?
- Check URL encoding of special characters
- Use `!important` to override Tailwind classes
- Inspect the iframe content in browser DevTools

### iframe not displaying?
- Check CORS headers
- Verify the chatbot ID is correct
- Check browser console for errors

### Custom fonts not loading?
- Host fonts on your CDN
- Include font URL in customCSS with `@import` or `@font-face`

