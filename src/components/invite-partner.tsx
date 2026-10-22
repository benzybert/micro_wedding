"use client";

import { useState, useTransition } from "react";
import { UserPlus } from "lucide-react";
import { createInviteAction } from "@/app/actions/wedding";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/guests/client-bits";
import { whatsappShareLink } from "@/lib/phone";

export function InvitePartner({ partnerName }: { partnerName: string }) {
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-col gap-3">
      <Button
        variant="secondary"
        className="self-start"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await createInviteAction();
            if (res.error) setError(res.error);
            else if (res.path) setLink(`${window.location.origin}${res.path}`);
          })
        }
      >
        <UserPlus className="size-4" aria-hidden />
        {link ? "יצירת קישור חדש" : `הזמנת ${partnerName} לתכנון`}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-rose-ink">
          {error}
        </p>
      ) : null}
      {link ? (
        <div className="rounded-xl bg-surface-2 p-3">
          <p className="mb-2 break-all text-sm" dir="ltr">
            {link}
          </p>
          <div className="flex flex-wrap gap-2">
            <CopyButton text={link} />
            <a
              className="inline-flex min-h-9 items-center rounded-xl border border-line bg-surface px-3 text-sm font-medium hover:bg-surface-2"
              target="_blank"
              rel="noopener noreferrer"
              href={whatsappShareLink(`היי ${partnerName}, מצטרפים לתכנון החתונה שלנו במקום אחד: ${link}`)}
            >
              שליחה בוואטסאפ
            </a>
          </div>
          <p className="mt-2 text-xs text-muted">הקישור תקף 7 ימים, לשימוש חד-פעמי.</p>
        </div>
      ) : null}
    </div>
  );
}
