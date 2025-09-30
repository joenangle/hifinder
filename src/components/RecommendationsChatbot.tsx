'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageCircle, Send, X, Sparkles, RefreshCw, Settings } from 'lucide-react'

interface ComponentUpdate {
  type: 'filter' | 'sort' | 'refine'
  data: {
    sortBy?: string
    soundSignature?: string[]
    category?: string[]
    features?: string[]
  }
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  suggestions?: string[]
  componentUpdate?: ComponentUpdate
}

interface Component {
  id: string
  name: string
  brand: string
  category: string
  price_used_min?: number
  price_used_max?: number
  [key: string]: unknown
}

interface ChatbotProps {
  initialRecommendations: Component[]
  userPreferences: {
    budget: number
    experience: string
    usage: string
    soundSignature: string
  }
  onUpdateRecommendations: (updates: ComponentUpdate) => void
}

export function RecommendationsChatbot({
  initialRecommendations,
  userPreferences,
  onUpdateRecommendations
}: ChatbotProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `I've found ${initialRecommendations.length} recommendations based on your preferences. How can I help refine these results?`,
      timestamp: new Date(),
      suggestions: [
        "Show me the best value options",
        "I need better bass response",
        "What about portable options?",
        "Explain the top recommendation"
      ]
    }
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsTyping(true)

    // Simulate AI processing
    setTimeout(() => {
      const assistantResponse = processUserQuery(input, initialRecommendations, userPreferences)

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: assistantResponse.message,
        timestamp: new Date(),
        suggestions: assistantResponse.suggestions,
        componentUpdate: assistantResponse.update
      }])

      if (assistantResponse.update) {
        onUpdateRecommendations(assistantResponse.update)
      }

      setIsTyping(false)
    }, 1000)
  }

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion)
    handleSend()
  }

  return (
    <>
      {/* Chat Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-accent-primary text-white rounded-full p-4 shadow-lg hover:bg-accent-primary/90 transition-all transform hover:scale-105 z-50"
        >
          <div className="relative">
            <MessageCircle className="w-6 h-6" />
            <Sparkles className="w-3 h-3 absolute -top-1 -right-1 text-yellow-400" />
          </div>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-surface-primary rounded-xl shadow-2xl flex flex-col z-50 border border-border-primary">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border-secondary">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="font-semibold text-text-primary">Audio Advisor</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-text-tertiary hover:text-text-primary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map(message => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-accent-primary text-white'
                      : 'bg-surface-elevated text-text-primary'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>

                  {/* Suggestions */}
                  {message.suggestions && (
                    <div className="mt-3 space-y-1">
                      {message.suggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="block w-full text-left text-xs px-2 py-1 rounded bg-surface-hover hover:bg-surface-primary transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Component Update Indicator */}
                  {message.componentUpdate && (
                    <div className="mt-2 flex items-center gap-1 text-xs opacity-70">
                      <RefreshCw className="w-3 h-3" />
                      <span>Results updated</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-surface-elevated rounded-lg p-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-text-tertiary rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-text-tertiary rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-text-tertiary rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-border-secondary">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about your recommendations..."
                className="flex-1 px-3 py-2 bg-surface-elevated rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="p-2 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2 mt-2">
              <button className="text-xs text-text-tertiary hover:text-text-secondary">
                <Settings className="w-3 h-3 inline mr-1" />
                Adjust preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Simulate AI processing logic
interface UserPreferences {
  budget: number
  experience: string
  usage: string
  soundSignature: string
}

function processUserQuery(query: string, recommendations: Component[], preferences: UserPreferences): {
  message: string
  suggestions: string[]
  update?: ComponentUpdate
} {
  const lowerQuery = query.toLowerCase()

  // Value-focused queries
  if (lowerQuery.includes('value') || lowerQuery.includes('bang for buck')) {
    return {
      message: "I'll prioritize options with the best price-to-performance ratio. These models offer excellent sound quality for their price point.",
      suggestions: [
        "Tell me about the top pick",
        "What makes these good value?",
        "Show budget options under $200"
      ],
      update: {
        type: 'sort' as const,
        data: { sortBy: 'value' }
      }
    }
  }

  // Bass preference
  if (lowerQuery.includes('bass') || lowerQuery.includes('low end')) {
    return {
      message: "For enhanced bass response, I'm highlighting warm and fun-tuned options. These will give you that satisfying low-end impact.",
      suggestions: [
        "Which has the deepest bass?",
        "Any basshead recommendations?",
        "What about balanced bass?"
      ],
      update: {
        type: 'filter' as const,
        data: { soundSignature: ['warm', 'fun'] }
      }
    }
  }

  // Portability
  if (lowerQuery.includes('portable') || lowerQuery.includes('travel')) {
    return {
      message: "For portability, I'm focusing on IEMs and compact gear. These are perfect for on-the-go listening.",
      suggestions: [
        "Best wireless options?",
        "Need a case recommendation",
        "Battery life important?"
      ],
      update: {
        type: 'filter' as const,
        data: { category: ['iems'], features: ['portable'] }
      }
    }
  }

  // Explanation request
  if (lowerQuery.includes('explain') || lowerQuery.includes('why') || lowerQuery.includes('tell me about')) {
    const topRec = recommendations[0]
    return {
      message: `The ${topRec?.name || 'top recommendation'} stands out because of its excellent tonal balance and technical performance. It matches your ${preferences.soundSignature} preference while staying within your $${preferences.budget} budget. The build quality is exceptional for this price range.`,
      suggestions: [
        "What are the alternatives?",
        "Any downsides to this?",
        "Where can I buy it?"
      ],
      update: undefined
    }
  }

  // Default response
  return {
    message: "I can help you refine these recommendations based on specific features, use cases, or preferences. What aspect is most important to you?",
    suggestions: [
      "Focus on comfort",
      "Need amplification advice",
      "Compare top 3 options",
      "Show expert reviews"
    ]
  }
}