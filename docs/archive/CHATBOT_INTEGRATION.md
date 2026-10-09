# Chatbot Integration Strategy for HiFinder

## Overview
A two-stage recommendation system that combines structured onboarding with conversational refinement.

## Architecture

### Stage 1: Progressive Onboarding (Completed)
- **Location**: `/onboarding-v2`
- **Purpose**: Gather core preferences through guided flow
- **Output**: Initial recommendations based on v2 API scoring

### Stage 2: Conversational Refinement (In Progress)
- **Component**: `RecommendationsChatbot`
- **Purpose**: Refine and personalize recommendations through natural conversation
- **Integration**: Updates live recommendations without page reload

## Chatbot Capabilities

### 1. Query Understanding
The chatbot interprets natural language queries and maps them to actions:

```typescript
// Example query patterns and responses
"I need more bass" → Filter for warm/fun signatures
"Best value options" → Sort by value rating
"Explain this recommendation" → Detailed component analysis
"Too expensive" → Adjust budget filters
"For small rooms" → Filter for near-field options
"Gaming focus" → Prioritize imaging and soundstage
```

### 2. Dynamic Recommendation Updates
The chatbot can modify recommendations in real-time:

- **Filtering**: Narrow results by specific criteria
- **Sorting**: Reorder by value, price, expert ratings
- **Expansion**: Show alternatives or similar options
- **Refinement**: Adjust weightings in scoring algorithm

### 3. Educational Responses
Helps users understand audio concepts:

- Explain technical terms (impedance, sensitivity, DAC)
- Compare products side-by-side
- Suggest upgrade paths
- Provide buying advice

## Implementation Plan

### Phase 1: UI Integration ✅
```typescript
// Add chatbot to recommendations page
import { RecommendationsChatbot } from '@/components/RecommendationsChatbot'

// Pass current recommendations and preferences
<RecommendationsChatbot
  initialRecommendations={recommendations}
  userPreferences={preferences}
  onUpdateRecommendations={handleUpdate}
/>
```

### Phase 2: State Management
```typescript
// Sync chatbot actions with recommendation filters
const [filters, setFilters] = useState(initialFilters)
const [chatHistory, setChatHistory] = useState([])

// Update both UI and chat state
const handleChatUpdate = (update: ChatUpdate) => {
  setFilters(applyUpdate(filters, update))
  setChatHistory(prev => [...prev, update])
}
```

### Phase 3: AI Integration
Options for natural language processing:

1. **OpenAI API Integration**
   - Use GPT-4 for query understanding
   - Fine-tune on audio terminology
   - Generate personalized explanations

2. **Local LLM Option**
   - Ollama for privacy-conscious users
   - Smaller model for basic queries
   - Fallback to rule-based system

3. **Hybrid Approach**
   - Rule-based for common queries (fast)
   - AI for complex questions (accurate)
   - Learn from user interactions

### Phase 4: Advanced Features

#### Smart Suggestions
```typescript
// Proactive recommendations based on context
if (userSelected.headphones && !userSelected.amp) {
  if (needsAmplification(selectedHeadphones)) {
    chatbot.suggest("These headphones need an amp. Want suggestions?")
  }
}
```

#### Conversation Memory
```typescript
// Remember user preferences across sessions
const userProfile = {
  preferredBrands: [],
  budgetHistory: [],
  commonQueries: [],
  rejectedRecommendations: []
}
```

#### Multi-turn Conversations
```typescript
// Context-aware responses
User: "I want good bass"
Bot: "For music or gaming?"
User: "Music, especially EDM"
Bot: "Got it! Here are bass-forward options perfect for electronic music..."
```

## API Endpoints Needed

### 1. Chat Processing
```typescript
POST /api/chat
{
  message: string
  context: {
    currentRecommendations: Component[]
    userPreferences: Preferences
    conversationHistory: Message[]
  }
}

Response:
{
  reply: string
  suggestions: string[]
  recommendationUpdate?: {
    type: 'filter' | 'sort' | 'expand'
    data: any
  }
}
```

### 2. Feedback Loop
```typescript
POST /api/chat/feedback
{
  messageId: string
  helpful: boolean
  correctAction: boolean
}
```

## User Experience Flow

1. **Complete Onboarding** → Initial recommendations
2. **Chat Appears** → "How can I refine these results?"
3. **User Query** → "I mainly listen to jazz"
4. **Bot Response** → Updates to show neutral/warm options
5. **Follow-up** → "Tell me about the Sundara"
6. **Detailed Info** → Reviews, specs, where to buy
7. **Action** → Add to comparison or wishlist

## Success Metrics

- **Engagement Rate**: % of users who interact with chatbot
- **Refinement Success**: % who find better matches through chat
- **Query Resolution**: Average messages to satisfaction
- **Conversion Impact**: Purchase rate with/without chat use

## Security Considerations

- Sanitize all user inputs
- Rate limiting on API calls
- No PII in conversation logs
- Option to disable chat history
- Clear data retention policy

## Next Steps

1. [ ] Integrate chatbot into recommendations page
2. [ ] Connect to v2 API for live updates
3. [ ] Add OpenAI/LLM integration
4. [ ] Implement conversation persistence
5. [ ] A/B test chat effectiveness
6. [ ] Gather user feedback for improvements