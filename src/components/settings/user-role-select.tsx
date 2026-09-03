"use client";

import { useTransition } from "react";
import { updateUserRole } from "@/app/actions/users";
import type { Role } from "@/generated/prisma/client";
import { Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export function UserRoleSelect({ userId, role }: { userId: string; role: Role }) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  return (
    <Select
      value={role}
      disabled={pending}
      onChange={(event) => {
        const value = event.target.value as Role;
        startTransition(async () => {
          try {
            await updateUserRole(userId, value);
            toast.success("Role updated.");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Couldn't update role.");
          }
        });
      }}
      className={cn("!h-7 w-auto px-2 text-xs")}
    >
      <option value="DEVELOPER">Developer</option>
      <option value="ADMIN">Admin</option>
    </Select>
  );
}
