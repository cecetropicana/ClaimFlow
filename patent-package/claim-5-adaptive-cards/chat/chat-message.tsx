import type { ChatMessage as ChatMessageType } from "@shared/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DataCenterImpactCard } from "@/components/adaptive-cards/data-center-impact-card";
import { StormResilienceCard } from "@/components/adaptive-cards/storm-resilience-card";
import { NetworkTraceCard } from "@/components/adaptive-cards/network-trace-card";
import { LoadForecastCard } from "@/components/adaptive-cards/load-forecast-card";
import { CapacityCheckCard } from "@/components/adaptive-cards/capacity-check-card";
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
      case "datacenter-impact":
        return <DataCenterImpactCard data={message.cardData} isMockData={isMockData} />;
      case "storm-resilience":
        return <StormResilienceCard data={message.cardData} isMockData={isMockData} />;
      case "network-trace":
        return <NetworkTraceCard data={message.cardData} isMockData={isMockData} />;
      case "load-forecast":
        return <LoadForecastCard data={message.cardData} isMockData={isMockData} />;
      case "capacity-check":
        return <CapacityCheckCard data={message.cardData} isMockData={isMockData} />;
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
