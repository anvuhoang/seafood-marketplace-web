import { AdminChatbotView } from "@/features/admin/components/AdminChatbotView";

export const metadata = {
  title: "Chatbot AI | HaiSan Express Admin",
  description: "Theo dõi hội thoại, mức hài lòng và lời nhắn khách để lại cho nhân viên.",
};

// Rendered behind a client-side sign-in check, so there is no instant shell to validate.
export const instant = false;

export default function AdminChatbotPage() {
  return <AdminChatbotView />;
}
