# 🚀 Icon Mode Quick Start Guide

## What's New?

Your Eclipse chat widget now supports an **Intercom-style floating icon mode** with smooth, GPU-accelerated animations!

## ✨ Key Features

- 🎯 **Floating circular icon** - Unobtrusive chat button in bottom-right corner
- 🎬 **Smooth animations** - Scale and slide effects using CSS transforms
- 🎨 **Customizable** - Size, color, position all configurable
- ⚡ **Performant** - GPU-accelerated with 60fps animations
- 📱 **Mobile-friendly** - Works great on all devices
- ❌ **Close button** - Elegant close button with backdrop blur

## 🎮 Try It Now

### Option 1: View the Demo Page

1. Start your dev server:
```bash
npm run dev
```

2. Open the demo page:
```
http://localhost:3000/icon-mode-demo.html
```

3. See the icon mode in action! Look at the bottom-right corner of the page.

### Option 2: Try Different Modes in the Embed Example

1. Open the updated embed example:
```
http://localhost:3000/embed-example.html
```

2. Select "Widget Mode" from the dropdown
3. Choose between:
   - **Inline** - Embedded in the page (original)
   - **Floating Icon** - Intercom-style icon
   - **Floating Popup** - Button with text

4. Click "Update Chat" to see the changes

## 🔧 How to Use in Your Site

### Simple Setup (HTML)

```html
<!-- Add this to your website -->
<script src="https://your-domain.com/eclipse-chat-widget.js"
        data-eclipse-chat
        data-mode="icon"
        data-chatbot-id="your-chatbot-id"
        data-primary-color="#3b82f6">
</script>
```

### JavaScript API

```html
<script src="https://your-domain.com/eclipse-chat-widget.js"></script>
<script>
  const widget = new EclipseChatWidget({
    mode: 'icon',               // 🔥 New! Use 'icon' for Intercom-style
    chatbotId: 'your-id',
    primaryColor: '#3b82f6',    // Your brand color
    iconSize: '60px',           // Size of the floating icon
    position: 'bottom-right',   // Where to position it
    height: '600px',            // Chat window height when open
    width: '400px',             // Chat window width when open
    borderRadius: '16px'        // Rounded corners
  });
</script>
```

## 🎨 Customization Examples

### Default Blue Icon (Intercom-style)
```javascript
new EclipseChatWidget({
  mode: 'icon',
  chatbotId: 'your-id',
  primaryColor: '#3b82f6',
  iconSize: '60px'
});
```

### Large Green Icon
```javascript
new EclipseChatWidget({
  mode: 'icon',
  chatbotId: 'your-id',
  primaryColor: '#10b981',  // Emerald green
  iconSize: '70px',
  borderRadius: '20px'
});
```

### Custom Position with Offset
```javascript
new EclipseChatWidget({
  mode: 'icon',
  chatbotId: 'your-id',
  position: 'bottom-right',
  offset: {
    bottom: '100px',  // 100px from bottom (to avoid footer)
    right: '30px'     // 30px from right
  }
});
```

### Button with Text (Popup Mode)
```javascript
new EclipseChatWidget({
  mode: 'popup',
  chatbotId: 'your-id',
  buttonText: 'Need help? 💬',
  primaryColor: '#8b5cf6'
});
```

## 🎬 Animation Details

The icon mode features carefully crafted animations:

- **Opening**: Scales from 0.8 to 1.0 with a slight upward slide
- **Closing**: Scales down to 0.8 with a downward slide
- **Hover**: Scales up to 1.1 with enhanced shadow
- **Timing**: Uses cubic-bezier easing for natural motion
- **Performance**: GPU-accelerated transforms for 60fps

## 🎯 Best Practices

1. **Icon Size**: 60px is optimal for most sites (40-80px range)
2. **Position**: Bottom-right is most familiar to users
3. **Color**: Match your brand's primary color
4. **Offset**: Use if you have other fixed elements (like cookie banners)

## 📱 Mobile Behavior

The widget automatically adapts:
- Icon scales appropriately on mobile
- Chat fills available screen space when open
- Touch-friendly tap targets
- Smooth animations on mobile devices

## 🎮 Programmatic Control

```javascript
// Open the chat programmatically
widget.open();

// Close it
widget.close();

// Toggle open/closed
widget.toggle();

// Change settings on the fly
widget.updateConfig({
  primaryColor: '#10b981',
  iconSize: '70px'
});

// Remove the widget
widget.destroy();
```

## 🐛 Troubleshooting

### Icon not appearing?
- Check that you provided a valid `chatbotId`
- Make sure the script loaded (check browser console)
- Verify no CSS conflicts with `z-index` (widget uses 9999)

### Animation not smooth?
- The widget uses modern CSS features
- Older browsers may have reduced animations
- Check browser console for errors

### Icon overlapping other elements?
- Use the `offset` option to adjust position:
```javascript
offset: {
  bottom: '100px',  // Move up to avoid overlap
  right: '30px'
}
```

## 📖 Full Documentation

See `EMBED_WIDGET_MODES.md` for complete documentation including:
- All configuration options
- Animation details
- Browser support
- Advanced features
- Event listeners (coming soon)

## 🎉 What's Next?

Future enhancements planned:
- Event listeners (on open, close, message)
- Custom animations
- Badge with unread count
- Sound notifications
- Typing indicators visibility
- Custom icons (use your own SVG)

## 💬 Feedback

Found a bug or have a feature request? Let us know!

---

**Happy chatting! 🎉**

