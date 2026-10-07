import ChatView from "@/components/chat/ChatView";

export const metadata = { title: "Biddy · FarmBiddy" };

/** /chat → new chat; /chat?c=<id> → that chat; /chat?q=<question> → new chat asking it (from the header box). */
export default async function ChatPage({ searchParams }) {
  const { c, q } = await searchParams;
  const one = (v) => (Array.isArray(v) ? v[0] : v);
  return <ChatView chatId={one(c) ?? null} initialQuestion={one(q)?.slice(0, 1000) ?? null} />;
}
