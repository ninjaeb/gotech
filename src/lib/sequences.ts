import { db } from "@/lib/db";

export function getActiveSequences() {
  return db.sequence.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export function nextDueDate(from: Date, delayDays: number): Date {
  const due = new Date(from);
  due.setDate(due.getDate() + delayDays);
  return due;
}
