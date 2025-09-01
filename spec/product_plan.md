# **Product Positioning**

**uSpark is an AI-powered knowledge work platform** that generates and manages Markdown documents through conversational interaction, transforming AI-created content into editable, manageable, and reusable knowledge assets.

# **Core Value**

- **Conversation-driven**: Natural language interaction, no complex operations to learn
- **Document management**: AI-generated content automatically saved as editable Markdown documents
- **Team collaboration**: Real-time collaborative editing based on CRDT
- **Local sync**: Local file editing via File Provider and command-line tools

# **Target Users**

AI Power Users (knowledge workers with AI service subscriptions):

- Product Managers/Designers (30%)
- Entrepreneurs/Indie Developers (25%)
- Content Creators (25%)
- Technical Personnel (20%)

# **Technical Architecture**

## **Core Components**

1. **Conversation System**: Natural language understanding and response generation
2. **Document Engine**: Markdown document creation, editing, version control
3. **Collaboration Layer**: Real-time multi-user collaboration based on YJS/CRDT
4. **Sync System**:
   - macOS File Provider Extension (Finder integration)
   - `usync` command-line tool (cross-platform file sync)

## **Data Storage**

- **File Content**: Amazon S3 (content-addressed storage)
- **Metadata**: YJS documents (CRDT collaboration support)

# **Product Moat**

## **Artifact Ownership Strategy**

**Owning user data is essential for survival, not a choice.**

Lessons from Cursor:

- Pure tools have no moat, data is all on GitHub
- Users can switch from Cursor to Windsurf tomorrow with zero migration cost

uSpark's value lock-in:

- **Export differentiation**: Can export static files, but lose version history and relationships
- **Team lock-in effect**: Workflows formed through team collaboration are difficult to migrate
  - Team members have formed work habits
  - AI has learned the team's domain knowledge
  - Document collaboration relationships cannot be simply replicated
- **Network effect**: Individual use → Team collaboration → Organizational dependency, migration costs grow exponentially

## **AI-Native Architecture Advantage**

**Traditional tools' data structures are baggage in the AI era.**

- **Notion/Figma's dilemma**: Complex nested structures designed for humans, difficult for AI to understand
- **uSpark's advantages**:
  - Flat Markdown structure, AI-friendly
  - Semantic markup, supports precise modifications
  - No historical baggage, designed from scratch for AI

# **User Experience Design**

## **Progressive Feature Disclosure**

Lowering the learning curve through Progressive Disclosure:

1. **Entry**: Simple conversation interface (like ChatGPT)
2. **Discovery**: Content automatically saved as documents
3. **Deepening**: Multi-document management and editing
4. **Advanced**: Version history, local sync

## **Typical Workflow**

1. User describes requirements through conversation
2. AI generates Markdown documents
3. User clicks to enter editor for modifications
4. Continue conversation for iterative optimization
5. Documents accumulate to form knowledge base

## **Keys to Success**

1. **Low floor, high ceiling**: Easy to start but powerful
2. **Avoid direct competition**: Be the connection layer, not the AI model layer
3. **Maintain openness**: Support import/export, don't lock users in

# **Core Insigh**

**Conversation is the most natural interaction, but conversation outcomes need structured management.**

Essential differences from existing products:

- **Claude/ChatGPT**: Linear conversation history that cannot be managed
- **Notion**: Strong document management but AI is only auxiliary
- **uSpark**: AI-Native document management, every document can trace its source and relationships

Just as GitHub defined code collaboration, uSpark aims to define AI knowledge collaboration.
