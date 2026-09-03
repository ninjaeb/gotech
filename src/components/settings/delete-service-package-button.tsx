"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteServicePackage } from "@/app/actions/service-packages";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { useToast } from "@/components/ui/toast";

// Imperative toast (not useActionState + useActionToast) on purpose: a
// successful delete removes this exact row from the list on the same
// revalidation that carries the result, unmounting this component before a
// state-driven effect would ever get to render it — firing the toast
// straight from the resolved promise doesn't depend on this component still
// being around afterward.
export function DeleteServicePackageButton({ id, name }: { id: string; name: string }) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  return (
    <form
      action={() => {
        startTransition(async () => {
          try {
            const result = await deleteServicePackage(id);
            if (result && "error" in result) {
              toast.error(result.error);
            } else {
              toast.success("Removed from catalog.");
            }
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Couldn't remove from catalog.");
          }
        });
      }}
    >
      <ConfirmSubmitButton confirmMessage={`Remove "${name}" from the catalog?`} size="sm" disabled={pending}>
        <Trash2 className="h-3.5 w-3.5" />
      </ConfirmSubmitButton>
    </form>
  );
}
