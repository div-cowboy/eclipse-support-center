# Eclipse Chat Widget - Display Modes

The Eclipse Chat Widget now supports multiple display modes, including an Intercom-style floating icon with smooth, performant animations.

## 🎨 Display Modes

### 1. Icon Mode (Intercom-style)

A floating circular icon that appears in the corner of the screen and expands into a full chat window when clicked.

**Features:**
- Circular floating button with chat icon
- Smooth scale and slide animations
- Close button with backdrop blur effect
- Hover effects with scale transformation
- GPU-accelerated animations
- Mobile-friendly and responsive

**Usage:**

```html
<!-- HTML Data Attributes -->
<script src="/eclipse-chat-widget.js"
        data-eclipse-chat
        data-mode="icon"
        data-chatbot-id="your-chatbot-id"
        data-primary-color="#3b82f6"
        data-icon-size="60px"
        data-position="bottom-right"
        data-height="600px"
        data-width="400px">
</script>
```

```javascript
// JavaScript API
const widget = new EclipseChatWidget({
  mode: 'icon',
  chatbotId: 'your-chatbot-id',
  primaryColor: '#3b82f6',
  iconSize: '60px',
  position: 'bottom-right',
  height: '600px',
  width: '400px',
  borderRadius: '16px',
  offset: {
    bottom: '20px',
    right: '20px'
  }
});
```

### 2. Popup Mode

A floating button with text that expands into a chat window.

**Features:**
- Button with icon and custom text
- Smooth fade and scale animations
- Hover effects with vertical lift
- Customizable button text

**Usage:**

```html
<script src="/eclipse-chat-widget.js"
        data-eclipse-chat
        data-mode="popup"
        data-chatbot-id="your-chatbot-id"
        data-button-text="Chat with us"
        data-position="bottom-right">
</script>
```

```javascript
const widget = new EclipseChatWidget({
  mode: 'popup',
  chatbotId: 'your-chatbot-id',
  buttonText: 'Chat with us',
  position: 'bottom-right',
  height: '600px',
  width: '400px'
});
```

## ⚙️ Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mode` | `"icon"` \| `"popup"` | `"popup"` | Display mode for the widget |
| `iconSize` | `string` | `"60px"` | Size of the icon button (icon mode only) |
| `position` | `string` | `"bottom-right"` | Position on screen: `bottom-right`, `bottom-left`, `top-right`, `top-left`, `center` |
| `primaryColor` | `string` | `"#3b82f6"` | Primary color for buttons and accents |
| `borderRadius` | `string` | `"8px"` | Border radius for the chat window |
| `height` | `string` | `"600px"` | Height of the chat window |
| `width` | `string` | `"400px"` | Width of the chat window |
| `offset` | `object` | `{}` | Custom positioning offset (e.g., `{bottom: "30px", right: "30px"}`) |
| `buttonText` | `string` | `"Chat with us"` | Text for popup mode button |
| `autoOpen` | `boolean` | `false` | Automatically open chat on page load |
| `welcomeMessage` | `string` | `undefined` | Welcome message displayed in chat |
| `placeholder` | `string` | `"Type your message..."` | Input placeholder text |

## 🎬 Animation Details

### Icon Mode Animations

The icon mode uses carefully crafted animations for maximum smoothness:

1. **Opening Animation**
   - Transform origin: `bottom right`
   - Scale: `0.8` → `1.0`
   - Translate Y: `20px` → `0`
   - Opacity: `0` → `1`
   - Duration: `0.4s`
   - Easing: `cubic-bezier(0.4, 0, 0.2, 1)`

2. **Closing Animation**
   - Scale: `1.0` → `0.8`
   - Translate Y: `0` → `20px`
   - Opacity: `1` → `0`
   - Duration: `0.3s`

3. **Button Hover**
   - Scale: `1.0` → `1.1`
   - Box shadow: Enhanced depth
   - Duration: `0.3s`

### Performance Optimizations

- **GPU Acceleration**: Uses `transform` and `opacity` for hardware-accelerated animations
- **Will-change**: Applied to animated elements for optimization hints
- **RequestAnimationFrame**: Ensures animations are synchronized with browser repaints
- **Cubic-bezier Easing**: Smooth, natural motion curves
- **Backdrop Filter**: Modern blur effects for close button

## 🎯 Position Presets

```javascript
// Bottom Right (default)
{ position: 'bottom-right' } // 20px from bottom and right

// Bottom Left
{ position: 'bottom-left' } // 20px from bottom and left

// Top Right
{ position: 'top-right' } // 20px from top and right

// Top Left
{ position: 'top-left' } // 20px from top and left

// Center
{ position: 'center' } // Centered on screen

// Custom Offset
{
  position: 'bottom-right',
  offset: {
    bottom: '50px',
    right: '50px'
  }
}
```

## 🎨 Customization Examples

### Large Icon with Custom Colors

```javascript
new EclipseChatWidget({
  mode: 'icon',
  chatbotId: 'your-id',
  primaryColor: '#10b981', // Emerald green
  iconSize: '70px',
  borderRadius: '20px',
  height: '650px',
  width: '420px'
});
```

### Popup with Custom Text

```javascript
new EclipseChatWidget({
  mode: 'popup',
  chatbotId: 'your-id',
  buttonText: 'Need help? 💬',
  primaryColor: '#8b5cf6', // Purple
  position: 'bottom-left'
});
```

### Icon with Custom Position

```javascript
new EclipseChatWidget({
  mode: 'icon',
  chatbotId: 'your-id',
  position: 'bottom-right',
  offset: {
    bottom: '100px',
    right: '30px'
  }
});
```

## 🎮 Programmatic Control

```javascript
// Initialize widget
const widget = new EclipseChatWidget({
  mode: 'icon',
  chatbotId: 'your-id'
});

// Open chat programmatically
widget.open();

// Close chat
widget.close();

// Toggle chat
widget.toggle();

// Update configuration
widget.updateConfig({
  primaryColor: '#10b981',
  iconSize: '70px'
});

// Destroy widget
widget.destroy();
```

## 📱 Mobile Responsive

The widget automatically adapts to mobile screens:

- Icon size scales appropriately on smaller screens
- Chat window fills available space
- Touch-friendly tap targets
- Smooth animations on mobile devices

## 🔧 Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- iOS Safari (iOS 12+)
- Chrome Android (latest)

**Note:** Advanced features like `backdrop-filter` may have limited support on older browsers but will gracefully degrade.

## 📖 Demo Pages

1. **Icon Mode Demo**: `/icon-mode-demo.html`
   - Showcases the Intercom-style icon mode
   - Multiple customization examples
   - Features list and documentation

2. **Embed Example**: `/embed-example.html`
   - Interactive configuration panel
   - Switch between inline, icon, and popup modes
   - Live preview of customization options

## 🚀 Getting Started

1. Include the widget script:
```html
<script src="/eclipse-chat-widget.js"></script>
```

2. Initialize in icon mode:
```javascript
new EclipseChatWidget({
  mode: 'icon',
  chatbotId: 'your-chatbot-id',
  primaryColor: '#3b82f6'
});
```

3. That's it! The widget will appear in the bottom-right corner of your page.

## 💡 Tips

- Use `mode: 'icon'` for the most unobtrusive, Intercom-like experience
- Set `autoOpen: true` to immediately show the chat on page load
- Customize `iconSize` to match your design (recommended: 50px-80px)
- Use `offset` to avoid overlapping with other fixed elements
- The close button automatically appears in icon mode for easy dismissal

## 🎯 Best Practices

1. **Icon Mode**: Best for sites where you want minimal visual intrusion
2. **Popup Mode**: Best when you want to be more explicit about chat availability
3. **Primary Color**: Match your brand color for consistency
4. **Icon Size**: 60px is optimal for most designs (40-80px recommended range)
5. **Position**: Bottom-right is most familiar to users (Intercom standard)
6. **Welcome Message**: Add a friendly greeting to encourage engagement

## 🔥 Advanced Features

### Event Listeners (Coming Soon)

```javascript
widget.on('open', () => {
  console.log('Chat opened');
});

widget.on('close', () => {
  console.log('Chat closed');
});

widget.on('message', (message) => {
  console.log('New message:', message);
});
```

### Custom Animations (Coming Soon)

```javascript
new EclipseChatWidget({
  mode: 'icon',
  animations: {
    open: {
      duration: '0.5s',
      easing: 'ease-out'
    }
  }
});
```

