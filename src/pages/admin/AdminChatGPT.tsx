export default function AdminChatGPT() {
  return (
    <div className="h-[calc(100vh-8rem)] w-full">
      <iframe
        src="https://chat.openai.com"
        title="ChatGPT"
        className="w-full h-full rounded-lg border border-border"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
      />
    </div>
  );
}
