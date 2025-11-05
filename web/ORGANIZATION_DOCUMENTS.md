# Organization Documents Feature

This document explains the organization document upload functionality that stores text content in both Supabase (PostgreSQL) and Pinecone (vector database) for semantic search capabilities.

## Overview

The organization documents feature allows users to:

- Upload text content during organization creation
- Store documents with metadata in Supabase
- Generate vector embeddings and store them in Pinecone
- Perform semantic search across organization documents
- Manage document types (TEXT, POLICY, PROCEDURE, MANUAL, GUIDE, FAQ, ANNOUNCEMENT)

## Architecture

### Database Schema

#### OrganizationDocument Model

```prisma
model OrganizationDocument {
  id             String                    @id @default(cuid())
  title          String
  content        String
  type           OrganizationDocumentType  @default(TEXT)
  metadata       Json?
  vectorId       String?                   @unique
  organizationId String
  uploadedBy     String
  createdAt      DateTime                  @default(now())
  updatedAt      DateTime                  @updatedAt
  organization   Organization              @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  uploader       User                      @relation(fields: [uploadedBy], references: [id])
}
```

### API Endpoints

#### Organization Documents

- `GET /api/organizations/[id]/documents` - List all documents for an organization
- `POST /api/organizations/[id]/documents` - Create a new document
- `GET /api/organizations/[id]/documents/[documentId]` - Get a specific document
- `PUT /api/organizations/[id]/documents/[documentId]` - Update a document
- `DELETE /api/organizations/[id]/documents/[documentId]` - Delete a document

#### Organization Creation with Documents

- `POST /api/organizations` - Create organization with optional documents

### Vector Database Integration

The system uses a dual-storage approach:

1. **Supabase (PostgreSQL)**: Stores document metadata, content, and relationships
2. **Pinecone**: Stores vector embeddings for semantic search

## Setup Instructions

### 1. Environment Variables

Add the following environment variables to your `.env` file:

```env
# Pinecone Configuration
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=eclipse-support-center
PINECONE_ENVIRONMENT=us-east-1-aws

# OpenAI Configuration (for embeddings)
OPENAI_API_KEY=your_openai_api_key
```

### 2. Install Required Packages

```bash
# For Pinecone integration
npm install @pinecone-database/pinecone

# For OpenAI embeddings
npm install openai

# For text processing (if needed)
npm install natural
```

### 3. Database Migration

The database schema has already been updated. Run the migration:

```bash
npm run db:migrate
```

### 4. Enable Vector Storage

To enable real vector storage (instead of mock embeddings):

1. **Update `lib/vector-db.ts`** - Uncomment the OpenAI integration code
2. **Update `lib/vector-config.ts`** - Uncomment the Pinecone initialization code
3. **Update API endpoints** - Uncomment the vector storage code in:
   - `app/api/organizations/route.ts`
   - `app/api/organizations/[id]/documents/route.ts`
   - `app/api/organizations/[id]/documents/[documentId]/route.ts`

## Usage

### Frontend Integration

The `DocumentUploadForm` component is already integrated into the organization creation form:

```tsx
import {
  DocumentUploadForm,
  OrganizationDocument,
} from "@/components/organizations/DocumentUploadForm";

// In your component
const [documents, setDocuments] = useState<OrganizationDocument[]>([]);

<DocumentUploadForm documents={documents} onDocumentsChange={setDocuments} />;
```

### Creating Organizations with Documents

```typescript
const response = await fetch("/api/organizations", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "My Organization",
    description: "Organization description",
    slug: "my-org",
    documents: [
      {
        title: "Company Handbook",
        content: "This is the content of our company handbook...",
        type: "MANUAL",
      },
    ],
  }),
});
```

### Managing Documents

```typescript
// Create a new document
const response = await fetch(`/api/organizations/${orgId}/documents`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    title: "New Document",
    content: "Document content...",
    type: "POLICY",
  }),
});

// Update a document
const response = await fetch(`/api/organizations/${orgId}/documents/${docId}`, {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    title: "Updated Title",
    content: "Updated content...",
    type: "POLICY",
  }),
});

// Delete a document
const response = await fetch(`/api/organizations/${orgId}/documents/${docId}`, {
  method: "DELETE",
});
```

## Text Processing Features

The system includes advanced text processing capabilities:

### Text Chunking

- Automatically splits large documents into smaller chunks
- Maintains sentence and paragraph boundaries
- Configurable chunk size and overlap

### Metadata Extraction

- Word count and character count
- Estimated reading time
- Detection of code, URLs, and email addresses
- Content validation

### Usage Example

```typescript
import { processOrganizationDocument } from "@/lib/text-processing";

const chunks = processOrganizationDocument(
  "doc-123",
  "Company Handbook",
  "This is the full content...",
  "MANUAL",
  "org-456"
);
```

## Vector Search

Once documents are stored with vector embeddings, you can perform semantic search:

```typescript
import { OrganizationDocumentVectorService } from "@/lib/vector-db";

const vectorService = new OrganizationDocumentVectorService(vectorDB);

// Search for relevant documents
const results = await vectorService.searchOrganizationDocuments(
  "How do I request time off?",
  organizationId,
  10 // top 10 results
);
```

## Best Practices

### 1. Document Types

Use appropriate document types for better organization:

- **TEXT**: General content
- **POLICY**: Company policies and guidelines
- **PROCEDURE**: Step-by-step procedures
- **MANUAL**: User manuals and technical docs
- **GUIDE**: How-to guides and tutorials
- **FAQ**: Frequently asked questions
- **ANNOUNCEMENT**: Important announcements

### 2. Content Guidelines

- Keep individual documents focused and well-structured
- Use clear, descriptive titles
- Include relevant metadata for better search results
- Consider breaking large documents into smaller, focused pieces

### 3. Vector Storage

- Monitor vector database usage and costs
- Consider chunking large documents for better search results
- Regularly update embeddings when content changes
- Implement proper error handling for vector operations

### 4. Security

- Validate all input content
- Implement proper authorization checks
- Sanitize content before processing
- Monitor for inappropriate content

## Troubleshooting

### Common Issues

1. **Vector storage not working**

   - Check environment variables
   - Verify Pinecone API key and index name
   - Ensure OpenAI API key is configured

2. **Documents not appearing**

   - Check database migrations
   - Verify user permissions
   - Check API endpoint responses

3. **Search not returning results**
   - Verify vector embeddings are being created
   - Check Pinecone index configuration
   - Ensure search queries are properly formatted

### Debug Mode

Enable debug logging by setting:

```env
NODE_ENV=development
DEBUG=vector-db:*
```

## Future Enhancements

1. **File Upload Support**: Add support for PDF, Word, and other file formats
2. **Advanced Search**: Implement faceted search and filtering
3. **Document Versioning**: Track document changes over time
4. **Collaboration**: Add comments and collaborative editing
5. **Analytics**: Track document usage and search patterns
6. **AI Integration**: Use AI to auto-categorize and tag documents

## Support

For issues or questions about the organization documents feature:

1. Check the troubleshooting section above
2. Review the API documentation
3. Check the console logs for error messages
4. Verify environment configuration
