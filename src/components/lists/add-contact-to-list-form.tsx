"use client";

import { useRef, useState, useTransition } from "react";
import { addContactToList } from "@/app/actions/contact-lists";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { fullName } from "@/lib/format";

type ContactOption = { id: string; firstName: string; lastName: string | null };

export function AddContactToListForm({
  listId,
  contacts,
}: {
  listId: string;
  contacts: ContactOption[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [contactId, setContactId] = useState("");

  return (
    <form
      ref={formRef}
      action={(formData) => {
        startTransition(async () => {
          await addContactToList(listId, formData);
          formRef.current?.reset();
          setContactId("");
        });
      }}
      className="flex items-end gap-2"
    >
      <Combobox
        name="contactId"
        value={contactId}
        onValueChange={setContactId}
        placeholder={contacts.length === 0 ? "Every contact is already in this list" : "Add a contact…"}
        disabled={contacts.length === 0}
        className="flex-1"
        options={contacts.map((contact) => ({
          value: contact.id,
          label: fullName(contact.firstName, contact.lastName),
        }))}
      />
      <Button type="submit" size="sm" disabled={pending || contacts.length === 0 || !contactId}>
        {pending ? "Adding…" : "Add"}
      </Button>
    </form>
  );
}
