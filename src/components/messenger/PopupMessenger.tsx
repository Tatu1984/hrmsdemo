'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Minimize2, Send, Search, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Contact {
  id: string;
  name: string;
  designation: string;
  online: boolean;
  unreadCount: number;
}

interface Message {
  id: string;
  senderId: string;
  content: string;
  createdAt: Date;
  read: boolean;
}

interface ChatWindow {
  id: string;
  contact: Contact;
  messages: Message[];
  minimized: boolean;
}

interface PopupMessengerProps {
  currentUserId: string;
  currentUserName: string;
}

export function PopupMessenger({ currentUserId, currentUserName }: PopupMessengerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [chatWindows, setChatWindows] = useState<ChatWindow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch contacts
  useEffect(() => {
    if (isOpen) {
      fetchContacts();
    }
  }, [isOpen]);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/messages/contacts');
      if (response.ok) {
        const data = await response.json();
        setContacts(data);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const openChat = async (contact: Contact) => {
    // Check if chat already open
    if (chatWindows.find(w => w.contact.id === contact.id)) {
      return;
    }

    // Fetch messages for this contact
    try {
      const response = await fetch(`/api/messages/conversation/${contact.id}`);
      if (response.ok) {
        const messages = await response.json();
        setChatWindows(prev => [...prev, {
          id: contact.id,
          contact,
          messages,
          minimized: false,
        }]);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }

    setIsOpen(false);
  };

  const closeChat = (contactId: string) => {
    setChatWindows(prev => prev.filter(w => w.contact.id !== contactId));
  };

  const toggleMinimize = (contactId: string) => {
    setChatWindows(prev => prev.map(w =>
      w.contact.id === contactId ? { ...w, minimized: !w.minimized } : w
    ));
  };

  const sendMessage = async (contactId: string, content: string) => {
    if (!content.trim()) return;

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: contactId,
          content: content.trim(),
        }),
      });

      if (response.ok) {
        const newMessage = await response.json();
        setChatWindows(prev => prev.map(w =>
          w.contact.id === contactId
            ? { ...w, messages: [...w.messages, newMessage] }
            : w
        ));
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUnread = contacts.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <>
      {/* Main Messenger Button - Bottom Right */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 bg-orange-600 hover:bg-orange-700 text-white rounded-full p-4 shadow-lg z-50 transition-all"
      >
        <MessageSquare className="w-6 h-6" />
        {totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        )}
      </button>

      {/* Contacts List Popup */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-80 bg-white rounded-lg shadow-2xl z-50 border border-gray-200">
          <div className="bg-orange-600 text-white p-4 rounded-t-lg flex items-center justify-between">
            <h3 className="font-semibold">Messages</h3>
            <button onClick={() => setIsOpen(false)} className="hover:bg-orange-700 rounded p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">Loading...</div>
            ) : filteredContacts.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No contacts found</div>
            ) : (
              filteredContacts.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => openChat(contact)}
                  className="w-full p-3 hover:bg-gray-50 flex items-center gap-3 border-b transition-colors"
                >
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-semibold">
                      {contact.name.charAt(0)}
                    </div>
                    <Circle
                      className={`absolute bottom-0 right-0 w-3 h-3 ${
                        contact.online
                          ? 'fill-green-500 text-green-500'
                          : 'fill-gray-400 text-gray-400'
                      }`}
                    />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium text-sm">{contact.name}</div>
                    <div className="text-xs text-gray-500">{contact.designation}</div>
                  </div>
                  {contact.unreadCount > 0 && (
                    <span className="bg-orange-600 text-white text-xs rounded-full px-2 py-1 font-semibold">
                      {contact.unreadCount}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Chat Windows - Bottom Right, stacked */}
      <div className="fixed bottom-6 right-24 flex gap-3 z-40">
        {chatWindows.map((window, index) => (
          <ChatWindow
            key={window.id}
            window={window}
            currentUserId={currentUserId}
            onClose={() => closeChat(window.contact.id)}
            onMinimize={() => toggleMinimize(window.contact.id)}
            onSend={(content) => sendMessage(window.contact.id, content)}
            style={{ marginRight: `${index * 10}px` }}
          />
        ))}
      </div>
    </>
  );
}

interface ChatWindowProps {
  window: ChatWindow;
  currentUserId: string;
  onClose: () => void;
  onMinimize: () => void;
  onSend: (content: string) => void;
  style?: React.CSSProperties;
}

function ChatWindow({ window, currentUserId, onClose, onMinimize, onSend, style }: ChatWindowProps) {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [window.messages]);

  const handleSend = () => {
    if (message.trim()) {
      onSend(message);
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className={cn(
        "bg-white rounded-t-lg shadow-2xl border border-gray-200 flex flex-col",
        window.minimized ? "w-80 h-14" : "w-80 h-96"
      )}
      style={style}
    >
      {/* Header */}
      <div className="bg-orange-600 text-white p-3 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-semibold text-sm">
            {window.contact.name.charAt(0)}
          </div>
          <div>
            <div className="font-medium text-sm">{window.contact.name}</div>
            <div className="text-xs text-orange-100">
              {window.contact.online ? 'Active now' : 'Offline'}
            </div>
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={onMinimize} className="hover:bg-orange-700 rounded p-1">
            <Minimize2 className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="hover:bg-orange-700 rounded p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!window.minimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
            {window.messages.length === 0 ? (
              <div className="text-center text-gray-500 text-sm mt-8">
                No messages yet. Start the conversation!
              </div>
            ) : (
              window.messages.map((msg) => {
                const isOwn = msg.senderId === currentUserId;
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex",
                      isOwn ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[70%] rounded-2xl px-4 py-2 text-sm",
                        isOwn
                          ? "bg-orange-600 text-white"
                          : "bg-white text-gray-900 border"
                      )}
                    >
                      {msg.content}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t bg-white">
            <div className="flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="flex-1"
              />
              <Button
                onClick={handleSend}
                disabled={!message.trim()}
                className="bg-orange-600 hover:bg-orange-700"
                size="sm"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
