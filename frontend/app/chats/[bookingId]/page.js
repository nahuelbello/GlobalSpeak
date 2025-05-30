"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import ChatDrawer from "../../components/ChatDrawer";

export default function ChatPage() {
  const { bookingId } = useParams();
  const [open, setOpen] = useState(true);

  return (
    <>
      {open && (
        <ChatDrawer
          bookingId={bookingId}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}