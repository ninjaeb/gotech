// The "whichever one of these is set" shape shared by Activity's own parent
// columns and anything that needs to point back at the same entity later
// (see WhatsAppMentionNotification in schema.prisma).
export type ActivityEntityRefs = {
  taskId: string | null;
  contactId: string | null;
  companyId: string | null;
  dealId: string | null;
  projectId: string | null;
};

export function notificationHref(notification: {
  // Set directly for a task-description @mention (see notifyTaskMentions);
  // separate from activity.taskId below, which covers a note/email/
  // WhatsApp send logged from the task's own detail page instead.
  taskId: string | null;
  activity: ActivityEntityRefs | null;
}): string | null {
  if (notification.taskId) return `/tasks/${notification.taskId}`;
  const activity = notification.activity;
  if (!activity) return null;
  if (activity.taskId) return `/tasks/${activity.taskId}`;
  if (activity.contactId) return `/contacts/${activity.contactId}`;
  if (activity.companyId) return `/companies/${activity.companyId}`;
  if (activity.dealId) return `/deals/${activity.dealId}`;
  if (activity.projectId) return `/projects/${activity.projectId}`;
  return null;
}
