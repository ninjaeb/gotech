"use client";

import { useActionState, useEffect, useRef } from "react";
import { createUser } from "@/app/actions/users";
import { Label, Input, RequiredMark } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export function CreateUserForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(createUser, undefined);

  useEffect(() => {
    if (state && "success" in state) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-3 border-t border-slate-100 pt-4 dark:border-neutral-800"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor="new-user-name">
            Name
            <RequiredMark />
          </Label>
          <Input id="new-user-name" name="name" required placeholder="Jane Doe" />
        </div>
        <div>
          <Label htmlFor="new-user-email">
            Email
            <RequiredMark />
          </Label>
          <Input id="new-user-email" name="email" type="email" required placeholder="jane@example.com" />
        </div>
        <div>
          <Label htmlFor="new-user-title">Title (optional)</Label>
          <Input id="new-user-title" name="title" placeholder="Sales" />
        </div>
      </div>

      {state && "error" in state && (
        <p className="text-sm text-rose-600 dark:text-rose-400">{state.error}</p>
      )}
      {state && "success" in state && (
        <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          Created <strong>{state.email}</strong>. Password:{" "}
          <code className="font-mono">{state.password}</code>
          <br />
          Shown once — copy it down now.
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add user"}
      </Button>
    </form>
  );
}
