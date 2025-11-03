# Support Form System - Quick Summary

## Overview
A customizable embeddable support form system that allows organizations to create custom ticket submission forms and embed them via iframe. Forms submit directly to the support ticket system.

## Key Features

### 1. Form Builder (Admin UI)
- **Location**: `/app/forms` (new navigation item)
- Drag-and-drop form builder
- Customizable fields (text, email, textarea, select, checkbox, radio, file, number, date)
- Theme customization (colors, fonts, styling)
- Form settings (default category, priority, tags, auto-assignment)
- Live preview
- Analytics (submission counts, trends)

### 2. Embeddable Form
- **Location**: `/embed/form?code=abc123`
- Dynamic form rendering based on configuration
- Iframe embed (similar to chat embed)
- Responsive design
- Theme support
- Success/error states

### 3. Form Submission
- Public API endpoint: `/api/forms/[embedCode]/submit`
- Validates form data against form configuration
- Creates ticket via ticket service
- Maps form fields to ticket fields
- Stores form submission data in ticket `customFields`

## Database Schema

### SupportForm Model
- Stores form configuration as JSON (flexible, no schema changes needed)
- Organization-scoped
- Embed code for public access
- Status tracking (ACTIVE, INACTIVE, ARCHIVED)
- Analytics fields (submissionCount, lastSubmittedAt)

## Performance & Cost Considerations

### Optimizations
- **JSON Storage**: Form config stored as JSONB (single query, no joins)
- **Indexes**: Strategic indexes on `organizationId`, `embedCode`, `status`
- **Minimal Queries**: Single API call for form submission
- **No External Services**: Built-in, no third-party dependencies
- **Counter Field**: `submissionCount` as integer (no COUNT queries)

### Cost Efficiency
- **Lifetime Data**: Forms and tickets stored indefinitely
- **No Temporary Storage**: Direct to database
- **Efficient Queries**: Use indexes, avoid N+1 queries
- **Minimal Processing**: Simple validation, no heavy computation

## Implementation Phases

1. **Phase 1**: Database schema & core services
2. **Phase 2**: Form builder UI
3. **Phase 3**: Embeddable form iframe
4. **Phase 4**: Integration & testing
5. **Phase 5**: Polish & optimization

## Technical Decisions

- **JSON for Form Config**: Flexibility without schema changes
- **Embed Code**: Short unique codes (6-8 chars) for URL-friendly embedding
- **Single API Call**: Form submission in one request
- **Iframe Embed**: CSS/JS isolation, easier security

## File Structure

```
app/
  api/
    forms/
      route.ts                    # List/Create forms
      [id]/route.ts               # Get/Update/Delete form
      [id]/embed/route.ts         # Get embed config
      [embedCode]/submit/route.ts # Submit ticket (public)
  app/
    forms/
      page.tsx                    # Forms list
      new/page.tsx                # Create form
      [id]/page.tsx               # Form details
      [id]/edit/page.tsx          # Edit form
  embed/
    form/page.tsx                 # Embed form page

components/
  forms/
    FormBuilder.tsx               # Main form builder
    FormFieldEditor.tsx            # Field editor
    FormSettingsPanel.tsx          # Form settings
    FormPreview.tsx                # Live preview
    FormList.tsx                   # Forms list
    FormAnalytics.tsx              # Analytics
    embed/
      EmbedForm.tsx                # Embed form component
      FormFieldRenderer.tsx        # Field renderer
      FormSubmission.tsx           # Submission handler

lib/
  form-service.ts                  # Form CRUD & submission logic
```

## Next Steps

1. Review and approve plan
2. Start Phase 1: Database migration
3. Build form service
4. Create form builder UI
5. Build embed form
6. Test and iterate

