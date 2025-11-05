# Chatbot Integration Guide

This document explains how to integrate the enhanced chatbot system into your application, which provides hierarchical knowledge access through both organization documents and chatbot-specific context blocks.

## System Architecture

```
User Query → Chatbot → Enhanced Search → Response
                     ↓
            ┌─────────────────────┐
            │  Organization Docs  │ ← Vector Search (OpenAI + Pinecone)
            │  Context Blocks     │ ← Vector Search (OpenAI + Pinecone)
            └─────────────────────┘
                     ↓
            ┌─────────────────────┐
            │  Groq Text Gen      │ ← Fast, Cost-Effective Responses
            └─────────────────────┘
```

## Key Components

### 1. **Enhanced Chatbot Service** (`lib/chatbot-service-enhanced.ts`)

- Combines organization documents AND chatbot context blocks
- Uses OpenAI for embeddings, Groq for text generation
- Supports both regular and streaming responses
- Configurable search parameters

### 2. **Chatbot Chat API** (`app/api/chatbots/[id]/chat/route.ts`)

- RESTful endpoint for chatbot interactions
- Handles authentication and organization access
- Supports streaming responses
- Returns source attribution

### 3. **Chatbot Chat Interface** (`components/chat/ChatbotChatInterface.tsx`)

- React component for chatbot conversations
- Real-time streaming support
- Source type indicators (Org Doc vs Context)
- Token usage display

## Data Flow

### 1. **Organization Level**

- Organizations have `OrganizationDocument`s
- These are general knowledge base documents
- Accessible to all chatbots in the organization

### 2. **Chatbot Level**

- Chatbots have `ContextBlock`s
- These are chatbot-specific context documents
- Only accessible to that specific chatbot

### 3. **Search Process**

1. User asks a question to a chatbot
2. System searches both organization documents AND context blocks
3. Results are ranked by relevance score
4. Context is built from top results
5. Groq generates response using the context
6. Response includes source attribution

## Usage Examples

### Basic Chatbot Response

```typescript
import { enhancedChatbotService } from "@/lib/chatbot-service-enhanced";

const response = await enhancedChatbotService.generateChatbotResponse(
  "What is our company policy on remote work?",
  chatbotId,
  conversationHistory,
  {
    name: "HR Assistant",
    temperature: 0.7,
    maxSources: 5,
    includeOrganizationDocs: true,
    includeContextBlocks: true,
  }
);
```

### Streaming Response

```typescript
for await (const chunk of enhancedChatbotService.generateChatbotStreamResponse(
  "Explain our onboarding process",
  chatbotId,
  conversationHistory
)) {
  console.log(chunk.content);
  if (chunk.isComplete) {
    console.log("Sources:", chunk.sources);
  }
}
```

### API Usage

```typescript
// Regular response
const response = await fetch(`/api/chatbots/${chatbotId}/chat`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    message: "What are our company values?",
    conversationHistory: previousMessages,
  }),
});

// Streaming response
const response = await fetch(`/api/chatbots/${chatbotId}/chat`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    message: "Tell me about our products",
    stream: true,
  }),
});
```

## Configuration Options

### Chatbot Config (stored in database)

```typescript
interface ChatbotConfig {
  systemPrompt?: string; // Custom system prompt
  temperature?: number; // Response creativity (0-1)
  maxTokens?: number; // Max response length
  maxSources?: number; // Max documents to include
  includeOrganizationDocs?: boolean; // Include org documents
  includeContextBlocks?: boolean; // Include context blocks
}
```

### Environment Variables

```env
# Required for embeddings
OPENAI_API_KEY=your_openai_api_key

# Required for text generation
GROQ_API_KEY=your_groq_api_key

# Required for vector storage
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=eclipse-support-center
PINECONE_ENVIRONMENT=us-east-1-aws
```

## Integration Steps

### 1. **Set Up Environment**

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys
```

### 2. **Test the System**

```bash
# Test the hybrid system
npm run test:hybrid

# Test the enhanced chatbot system
npm run test:chatbot
```

### 3. **Create Test Data**

1. Create an organization
2. Upload organization documents
3. Create a chatbot
4. Add context blocks to the chatbot

### 4. **Use the Chat Interface**

```tsx
import { ChatbotChatInterface } from "@/components/chat/ChatbotChatInterface";

function ChatPage({ chatbotId }: { chatbotId: string }) {
  return (
    <div>
      <h1>Chat with Bot</h1>
      <ChatbotChatInterface chatbotId={chatbotId} />
    </div>
  );
}
```

## Source Attribution

The system provides detailed source attribution:

- **Organization Documents**: Marked as "Org Doc" with building icon
- **Context Blocks**: Marked as "Context" with message icon
- **Relevance Scores**: Percentage showing how relevant each source is
- **Snippets**: Relevant text excerpts from each source

## Performance Considerations

### 1. **Vector Search**

- Organization documents and context blocks are searched separately
- Results are combined and ranked by relevance
- Configurable max sources to control context size

### 2. **Token Usage**

- Groq provides fast, cost-effective text generation
- OpenAI embeddings are cached in Pinecone
- Token usage is tracked and displayed

### 3. **Streaming**

- Real-time response streaming for better UX
- Source attribution provided at the end
- Handles network interruptions gracefully

## Troubleshooting

### Common Issues

1. **"Service not configured"**

   - Check environment variables
   - Verify API keys are valid
   - Ensure Pinecone index exists

2. **"No relevant documents found"**

   - Check if organization has documents
   - Verify chatbot has context blocks
   - Ensure vector embeddings are generated

3. **"Chatbot not found"**
   - Verify user has access to organization
   - Check chatbot ID is correct
   - Ensure chatbot is active

### Debug Mode

Enable debug logging:

```env
NODE_ENV=development
DEBUG=chatbot:*
```

## Advanced Features

### 1. **Custom System Prompts**

Each chatbot can have a custom system prompt to define its personality and behavior.

### 2. **Selective Source Inclusion**

Configure whether to include organization documents, context blocks, or both.

### 3. **Conversation History**

Maintains conversation context for more natural interactions.

### 4. **Token Tracking**

Monitor token usage for cost management and optimization.

## Future Enhancements

1. **Multi-language Support**: Support for multiple languages in documents and responses
2. **Advanced Filtering**: Filter sources by type, date, or other metadata
3. **Response Caching**: Cache common responses for faster performance
4. **Analytics**: Track usage patterns and popular queries
5. **Custom Models**: Support for different Groq models based on use case

## Support

For issues or questions:

1. Check the troubleshooting section
2. Review the test scripts for examples
3. Check console logs for error messages
4. Verify environment configuration
