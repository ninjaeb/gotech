"use client";

import { Select } from "@/components/ui/field";

export function AssigneeFilterSelect({
  users,
  defaultValue,
}: {
  users: { id: string; name: string }[];
  defaultValue?: string;
}) {
  return (
    <Select
      name="assignee"
      defaultValue={defaultValue ?? ""}
      onChange={(event) => event.currentTarget.form?.requestSubmit()}
      className="w-auto"
    >
      <option value="">All assignees</option>
      {users.map((user) => (
        <option key={user.id} value={user.id}>
          {user.name}
        </option>
      ))}
    </Select>
  );
}
