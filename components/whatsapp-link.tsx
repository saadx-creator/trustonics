import { MessageCircle } from "lucide-react";
import { businessWhatsApp, type WhatsAppLocation } from "@/lib/whatsapp";
export function WhatsAppLink({
  location,
  message,
  requestRef,
  build = false,
  className = "",
  children,
}: {
  location: WhatsAppLocation;
  message?: string;
  requestRef?: string;
  build?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const href = businessWhatsApp(process.env.NEXT_PUBLIC_TRUSTONICS_WHATSAPP, {
    message,
    ref: requestRef,
    build,
  });
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`whatsapp-link ${className}`}
      data-location={location}
    >
      <MessageCircle size={18} />
      {children || "Chat with us"}
    </a>
  );
}
