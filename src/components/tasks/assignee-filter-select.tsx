"use client";

import { Select } from "@/components/ui/field";

export function AssigneeFilterSelect({
  users,
  currentUserId,
  defaultValue,
}: {
  users: { id: string; name: string }[];
  currentUserId: string;
  defaultValue?: string;
}) {
  return (
    <Select
      name="assignee"
      defaultValue={defaultValue ?? currentUserId}
      onChange={(event) => event.currentTarget.form?.requestSubmit()}
      className="w-auto"
    >
      <option value="all">All assignees</option>
      <option value="unassigned">Unassigned</option>
      {users.map((user) => (
        <option key={user.id} value={user.id}>
          {user.id === currentUserId ? `${user.name} (me)` : user.name}
        </option>
      ))}
    </Select>
  );
}
