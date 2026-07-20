import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFirebase } from "@/lib/firebase";
import { useChats, sendMessage } from "@/lib/store";

export function ChatModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { db } = useFirebase();
 const { user, db } = useFirebase();
const { messages } = useChats(user?.uid || "");
  const [text, setText] = useState("");

  const handleSend = async () => {
    if (!db || !text.trim()) return;

    if (!user) return;

await sendMessage(
  db,
  user.uid,
  "customer",
  text
);

    setText("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>💬 Contact Seller</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="h-80 overflow-y-auto rounded-lg border p-3 space-y-2">
            {messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No messages yet.
              </p>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`max-w-[80%] rounded-lg p-2 text-sm ${
                    msg.sender === "admin"
                      ? "bg-primary/10"
                      : "ml-auto bg-green-600 text-white"
                  }`}
                >
                  {msg.message}
                </div>
              ))
            )}
          </div>

          <div className="flex gap-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type message..."
            />

            <Button
              onClick={handleSend}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Send
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
