import { useEffect, useState } from "react";
import { Shimmer } from "@/components/ai-elements/shimmer";

const MESSAGES = [
  "Reading your matter…",
  "Identifying legal issues…",
  "Searching Pakistani case law…",
  "Cross-checking citations…",
  "Drafting your document…",
];

const VISION_MESSAGES = [
  "Transcribing your document…",
  "Running vision OCR on the scan…",
  "Reading the uploaded text…",
  ...MESSAGES,
];

export function LoadingState({ hasImages = false }: { hasImages?: boolean }) {
  const messages = hasImages ? VISION_MESSAGES : MESSAGES;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % messages.length);
    }, 4000);
    return () => clearInterval(id);
  }, [messages.length]);

  return (
    <div className="flex items-center gap-2.5 py-3">
      <span className="h-1.5 w-1.5 rounded-full bg-gold pulse-gold" />
      <Shimmer key={index} className="font-sans text-sm">
        {messages[index]}
      </Shimmer>
    </div>
  );
}
