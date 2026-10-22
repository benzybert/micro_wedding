"use client";

import { createContext, startTransition, useActionState, useContext, useRef } from "react";
import { Loader2 } from "lucide-react";
import type { ActionState } from "@/lib/action-state";
import { cn } from "@/lib/utils";
import { Button, type ButtonSize, type ButtonVariant } from "./button";

const PendingContext = createContext(false);

/**
 * <form> wired to a server action. Unlike a bare `action={fn}` it does NOT wipe the
 * inputs when the action reports an error (React 19 resets forms after every action).
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  successHint = true,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  successHint?: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    async (prev: ActionState, fd: FormData) => {
      const next = await action(prev, fd);
      if (next?.ok && resetOnSuccess) formRef.current?.reset();
      return next;
    },
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <PendingContext value={pending}>
      <form
        ref={formRef}
        className={className}
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
          startTransition(() => formAction(fd));
        }}
      >
        {children}
        {state?.error ? (
          <p role="alert" className="mt-3 rounded-lg bg-rose-soft px-3 py-2 text-sm text-rose-ink">
            {state.error}
          </p>
        ) : null}
        {successHint && state?.ok && state.message ? (
          <p role="status" className="mt-3 rounded-lg bg-sage-soft px-3 py-2 text-sm text-sage-ink">
            {state.message}
          </p>
        ) : null}
      </form>
    </PendingContext>
  );
}

export function SubmitButton({
  children,
  variant = "primary",
  size = "md",
  className,
  name,
  value,
  pendingLabel,
}: {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  name?: string;
  value?: string;
  pendingLabel?: string;
}) {
  const pending = useContext(PendingContext);
  return (
    <Button type="submit" variant={variant} size={size} className={cn(className)} disabled={pending} name={name} value={value}>
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}
