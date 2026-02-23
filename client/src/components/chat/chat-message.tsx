import type { ChatMessage as ChatMessageType } from "@shared/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ClaimsSummaryCard } from "@/components/adaptive-cards/claims-summary-card";
import { ClaimDetailCard } from "@/components/adaptive-cards/claim-detail-card";
import { BacklogStatsCard } from "@/components/adaptive-cards/backlog-stats-card";
import { AdjusterWorkloadCard } from "@/components/adaptive-cards/adjuster-workload-card";
import { StormClaimsCard } from "@/components/adaptive-cards/storm-claims-card";
import { Bot, User } from "lucide-react";

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  const renderCard = () => {
    if (!message.cardData || !message.cardType) return null;

    const isMockData = message.isMockData ?? false;

    switch (message.cardType) {
      case "claims-summary":
        return <ClaimsSummaryCard data={message.cardData} isMockData={isMockData} />;
      case "claim-detail":
        return <ClaimDetailCard data={message.cardData} isMockData={isMockData} />;
      case "backlog-stats":
        return <BacklogStatsCard data={message.cardData} isMockData={isMockData} />;
      case "adjuster-workload":
        return <AdjusterWorkloadCard data={message.cardData} isMockData={isMockData} />;
      case "storm-claims":
        return <StormClaimsCard data={message.cardData} isMockData={isMockData} />;
      default:
        return null;
    }
  };

  return (
    <div 
      className={`flex gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}
      data-testid={`message-${message.id}`}
    >
      {!isUser && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback className="bg-primary text-primary-foreground">
            <Bot className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={`flex flex-col gap-2 ${isUser ? 'items-end' : 'items-start'} max-w-2xl`}>
        {message.content && (
          <div 
            className={`px-4 py-3 rounded-lg ${
              isUser 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-foreground'
            }`}
          >
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          </div>
        )}
        
        {message.cardType && message.cardType !== "text" && renderCard()}
        
        <span className="text-xs text-muted-foreground px-1">
          {new Date(message.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </span>
      </div>
      
      {isUser && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback className="bg-secondary text-secondary-foreground">
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
