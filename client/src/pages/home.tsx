import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { ChatMessage } from "@/components/chat/chat-message";
import { ChatInput } from "@/components/chat/chat-input";
import { TypingIndicator } from "@/components/chat/typing-indicator";
import { GovernanceBanner } from "@/components/governance-banner";
import { QuickStartPanel } from "@/components/quick-start-panel";
import { GuidedActions } from "@/components/guided-actions";
import { apiRequest } from "@/lib/queryClient";
import type { ChatMessage as ChatMessageType } from "@shared/schema";

export default function Home() {
  const [messages, setMessages] = useState<ChatMessageType[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello! I'm ClaimFlow, your insurance claims management assistant. I can help you with:\n\n• Claim lookups and detail review\n• Backlog management and triage\n• Storm claims analysis\n• Adjuster workload and assignments\n• Claim triage and prioritization\n\nWhat would you like to explore today?",
      timestamp: new Date().toISOString(),
      cardType: "text"
    }
  ]);
  
  const [showGuidedActions, setShowGuidedActions] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", "/api/chat", { content });
      return response.json();
    },
    onMutate: (content) => {
      const userMessage: ChatMessageType = {
        id: `user-${Date.now()}`,
        role: "user",
        content,
        timestamp: new Date().toISOString(),
        cardType: "text"
      };
      setMessages(prev => [...prev, userMessage]);
    },
    onSuccess: (data) => {
      const assistantMessage: ChatMessageType = {
        id: data.id || `assistant-${Date.now()}`,
        role: "assistant",
        content: data.content,
        timestamp: new Date().toISOString(),
        cardType: data.cardType || "text",
        cardData: data.cardData
      };
      setMessages(prev => [...prev, assistantMessage]);
    },
    onError: () => {
      const errorMessage: ChatMessageType = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: "I apologize, but I encountered an error processing your request. Please try again.",
        timestamp: new Date().toISOString(),
        cardType: "text"
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  });

  useEffect(() => {
    const scrollToBottom = () => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
    };
    scrollToBottom();
    const t1 = setTimeout(scrollToBottom, 100);
    const t2 = setTimeout(scrollToBottom, 300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [messages, sendMessage.isPending]);

  const handleSendMessage = (content: string) => {
    sendMessage.mutate(content);
  };

  const isFirstMessage = messages.length === 1;

  return (
    <div className="flex flex-col h-full min-h-0" data-testid="page-home">
      <GovernanceBanner />
      
      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-6"
      >
        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          
          {isFirstMessage && (
            <QuickStartPanel 
              onSendMessage={handleSendMessage}
              onOpenGuidedActions={() => setShowGuidedActions(true)}
            />
          )}
          
          {sendMessage.isPending && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>
      </div>
      
      <div className="border-t border-border p-3 sm:p-4 bg-background shrink-0">
        <div className="max-w-4xl mx-auto">
          <ChatInput 
            onSend={handleSendMessage} 
            isLoading={sendMessage.isPending}
          />
        </div>
      </div>

      <GuidedActions 
        open={showGuidedActions}
        onOpenChange={setShowGuidedActions}
        onSelectAction={handleSendMessage}
      />
    </div>
  );
}
