'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bot,
  Send,
  User,
  Loader2,
  Sparkles,
  MessageSquare,
  HelpCircle,
  FileText,
  Calendar,
  DollarSign,
  Clock,
  Trash2,
  RotateCcw
} from 'lucide-react';

// Simple markdown renderer for chat messages
function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    // Bold text
    let processed = line.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // Italic text
    processed = processed.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    // Bullet points
    if (processed.startsWith('- ') || processed.startsWith('• ')) {
      processed = '• ' + processed.substring(2);
    }

    return (
      <span key={i}>
        <span dangerouslySetInnerHTML={{ __html: processed }} />
        {i < lines.length - 1 && <br />}
      </span>
    );
  });
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

const QUICK_ACTIONS = [
  { icon: Calendar, label: 'Check Leave Balance', query: 'What is my leave balance?' },
  { icon: Clock, label: 'Attendance Info', query: 'Show my attendance this month' },
  { icon: DollarSign, label: 'Payslip', query: 'Show me my latest payslip' },
  { icon: FileText, label: 'Company Policies', query: 'What are the company leave policies?' },
  { icon: HelpCircle, label: 'HR Help', query: 'How do I apply for leave?' },
];

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello! I'm your AI HR Assistant. I'm here to help you with any HR-related questions or tasks. I can assist you with:\n\n• Leave management and applications\n• Attendance tracking and queries\n• Payroll and salary information\n• Company policies and procedures\n• General HR inquiries\n\nFeel free to ask me anything!",
      timestamp: new Date(),
      suggestions: ['Check my leave balance', 'Show my attendance', 'View company policies'],
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID());
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const clearChat = () => {
    setMessages([
      {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: "Hello! I'm your AI HR Assistant. I'm here to help you with any HR-related questions or tasks. I can assist you with:\n\n• Leave management and applications\n• Attendance tracking and queries\n• Payroll and salary information\n• Company policies and procedures\n• General HR inquiries\n\nFeel free to ask me anything!",
        timestamp: new Date(),
        suggestions: ['Check my leave balance', 'Show my attendance', 'View company policies'],
      },
    ]);
    setSessionId(crypto.randomUUID());
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: text }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      const data = await response.json();

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        suggestions: data.suggestions,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: "I apologize, but I'm having trouble processing your request right now. Please try again in a moment, or contact HR directly for immediate assistance.",
        timestamp: new Date(),
        suggestions: ['Try again', 'Contact HR'],
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container py-6 max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Bot className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">AI HR Assistant</h1>
          <p className="text-muted-foreground">Your 24/7 intelligent HR companion</p>
        </div>
        <Badge className="ml-auto" variant="secondary">
          <Sparkles className="h-3 w-3 mr-1" />
          Powered by AI
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Quick Actions Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {QUICK_ACTIONS.map((action, idx) => (
                <Button
                  key={idx}
                  variant="ghost"
                  className="w-full justify-start text-left h-auto py-2"
                  onClick={() => sendMessage(action.query)}
                >
                  <action.icon className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm">{action.label}</span>
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Tips</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <p>• Ask natural questions like you would to a colleague</p>
              <p>• I can help with leave, attendance, payroll, and policies</p>
              <p>• I learn from our conversation to provide better assistance</p>
            </CardContent>
          </Card>
        </div>

        {/* Chat Area */}
        <Card className="lg:col-span-3 flex flex-col h-[600px]">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <CardTitle>Chat</CardTitle>
              </div>
              <Button variant="ghost" size="sm" onClick={clearChat} disabled={isLoading}>
                <RotateCcw className="h-4 w-4 mr-1" />
                New Chat
              </Button>
            </div>
            <CardDescription>Ask me anything about HR matters</CardDescription>
          </CardHeader>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div className={`max-w-[80%] ${message.role === 'user' ? 'order-first' : ''}`}>
                    <div
                      className={`rounded-lg px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <div className="text-sm">{renderMarkdown(message.content)}</div>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 px-1">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {message.suggestions && message.suggestions.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {message.suggestions.map((suggestion, idx) => (
                          <Button
                            key={idx}
                            variant="outline"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => sendMessage(suggestion)}
                          >
                            {suggestion}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                  {message.role === 'user' && (
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-lg px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Type your message..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
