import { db } from "@/lib/db";
import { AcceptInviteForm } from "@/components/portal/accept-invite-form";
import { Card, CardBody } from "@/components/ui/card";

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const clientUser = await db.clientUser.findUnique({
    where: { inviteToken: token },
    select: { email: true, inviteTokenExpiresAt: true },
  });
  const valid = !!clientUser && !!clientUser.inviteTokenExpiresAt && clientUser.inviteTokenExpiresAt > new Date();

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-indigo-600 text-base font-bold text-white">
            G
          </div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {valid ? "Set your password" : "Invite not found"}
          </h1>
          {valid && (
            <p className="text-sm text-slate-500 dark:text-slate-400">{clientUser.email}</p>
          )}
        </div>

        <Card>
          <CardBody>
            {valid ? (
              <AcceptInviteForm token={token} />
            ) : (
              <p className="text-sm text-slate-600 dark:text-slate-400">
                This invite link is invalid or has expired. Ask your contact at GoTech for a new one.
              </p>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
