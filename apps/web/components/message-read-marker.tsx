"use client";

import { useEffect, useRef } from "react";
import { markConversationReadAction } from "../app/actions";

type MessageReadMarkerProps = {
  conversationId: string;
};

export function MessageReadMarker({ conversationId }: MessageReadMarkerProps) {
  const markedConversationId = useRef<string | null>(null);

  useEffect(() => {
    if (!conversationId || markedConversationId.current === conversationId) {
      return;
    }

    markedConversationId.current = conversationId;
    const formData = new FormData();
    formData.set("conversationId", conversationId);

    void markConversationReadAction(formData).catch(() => {
      markedConversationId.current = null;
    });
  }, [conversationId]);

  return null;
}
