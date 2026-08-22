"use client";

import { useTransition } from "react";
import { updateUserRole } from "@/app/actions/users";
import type { Role } from "@/generated/prisma/client";
import { Select } from "@/components/ui/field";
import { cn } from "@/lib/utils";

export function UserRoleSelect({ userId, role }: { userId: string; role: Role }) {
  const [pending, startTransition] = useTransition();

  return (
    <Select
      value={role}
      disabled={pending}
      onChange={(event) => {
        const value = event.target.value as Role;
        startTransition(() => {
          void updateUserRole(userId, value);
        });
      }}
      className={cn("!h-7 w-auto px-2 text-xs")}
    >
      <option value="DEVELOPER">Developer</option>
      <option value="ADMIN">Admin</option>
    </Select>
  );
}
