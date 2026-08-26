"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, UploadCloud } from "lucide-react";
import {
  confirmContactImport,
  previewContactImport,
  type ImportPreview,
  type ImportResult,
} from "@/app/actions/contact-import";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Label } from "@/components/ui/field";
import { cn } from "@/lib/utils";

type Phase =
  | { name: "upload" }
  | { name: "preview"; preview: ImportPreview }
  | { name: "done"; result: ImportResult };

export function ImportForm() {
  const [phase, setPhase] = useState<Phase>({ name: "upload" });
  const [error, setError] = useState<string | null>(null);
  const [fillMissingInfo, setFillMissingInfo] = useState(true);
  const [pending, startTransition] = useTransition();
  const uploadFormRef = useRef<HTMLFormElement>(null);

  function handleUpload(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await previewContactImport(formData);
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      setPhase({ name: "preview", preview: result });
    });
  }

  function handleConfirm(preview: ImportPreview) {
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("rows", JSON.stringify(preview.rows));
      formData.set("duplicateAction", fillMissingInfo ? "update" : "skip");
      const result = await confirmContactImport(formData);
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      setPhase({ name: "done", result });
    });
  }

  function startOver() {
    setError(null);
    setPhase({ name: "upload" });
    uploadFormRef.current?.reset();
  }

  if (phase.name === "done") {
    const { result } = phase;
    return (
      <Card>
        <CardBody className="space-y-4 text-center py-10">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
          <div>
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Import complete
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {result.created} contact{result.created === 1 ? "" : "s"} created
              {result.updated > 0 &&
                `, ${result.updated} existing contact${result.updated === 1 ? "" : "s"} updated with missing info`}
              {result.companiesCreated > 0 &&
                `, ${result.companiesCreated} new compan${result.companiesCreated === 1 ? "y" : "ies"}`}
              {result.skippedDuplicates > 0 &&
                `, ${result.skippedDuplicates} duplicate${result.skippedDuplicates === 1 ? "" : "s"} skipped`}
              {result.skippedInvalid > 0 &&
                `, ${result.skippedInvalid} row${result.skippedInvalid === 1 ? "" : "s"} skipped (no name)`}
              .
            </p>
          </div>
          <div className="flex justify-center gap-2">
            <Link href="/contacts" className="inline-flex">
              <Button variant="secondary">View contacts</Button>
            </Link>
            <Button onClick={startOver}>Import another file</Button>
          </div>
        </CardBody>
      </Card>
    );
  }

  if (phase.name === "preview") {
    const { preview } = phase;
    return (
      <div className="space-y-4">
        <Card>
          <CardBody className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {preview.fileName}
              </p>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                {preview.importableRows} of {preview.totalRows} contacts will be
                imported
                {preview.skippedRows > 0 &&
                  ` — ${preview.skippedRows} skipped (no name)`}
                {preview.duplicateEmails.length > 0 &&
                  `, ${preview.duplicateEmails.length} match an existing contact by email`}
                .
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={fillMissingInfo}
                onChange={(event) => setFillMissingInfo(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Fill in missing info on existing contacts (matched by email)
            </label>
          </CardBody>
        </Card>

        {error && (
          <p className="rounded-md bg-rose-50 px-4 py-2 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300">
            {error}
          </p>
        )}

        <Card>
          <div className="max-h-[28rem] overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Email</th>
                  <th className="px-4 py-2 font-medium">Phone</th>
                  <th className="px-4 py-2 font-medium">Company</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
                {preview.rows.map((row) => {
                  const isDuplicate = Boolean(
                    row.email &&
                      preview.duplicateEmails.some(
                        (email) => email.toLowerCase() === row.email!.toLowerCase(),
                      ),
                  );
                  return (
                    <tr key={row.row}>
                      <td className="px-4 py-2 text-slate-800 dark:text-slate-200">
                        {[row.firstName, row.lastName].filter(Boolean).join(" ") ||
                          "—"}
                      </td>
                      <td className="px-4 py-2 text-slate-500 dark:text-slate-400">
                        {row.email ?? "—"}
                      </td>
                      <td className="px-4 py-2 text-slate-500 dark:text-slate-400">
                        {row.phone ?? "—"}
                      </td>
                      <td className="px-4 py-2 text-slate-500 dark:text-slate-400">
                        {row.companyName ?? "—"}
                      </td>
                      <td className="px-4 py-2">
                        {!row.importable ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            {row.issues[0]}
                          </span>
                        ) : isDuplicate ? (
                          <span
                            className={cn(
                              "text-xs font-medium",
                              fillMissingInfo
                                ? "text-slate-500 dark:text-slate-400"
                                : "text-amber-600 dark:text-amber-400",
                            )}
                          >
                            {fillMissingInfo ? "Duplicate — will fill in missing info" : "Duplicate — will skip"}
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            New
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={startOver} disabled={pending}>
            Start over
          </Button>
          <Button onClick={() => handleConfirm(preview)} disabled={pending}>
            {pending
              ? "Importing…"
              : `Import ${preview.importableRows} contact${preview.importableRows === 1 ? "" : "s"}`}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardBody>
        <form
          ref={uploadFormRef}
          action={handleUpload}
          className="flex flex-col items-center gap-4 py-8 text-center"
        >
          <UploadCloud className="h-10 w-10 text-slate-400" />
          <div>
            <Label htmlFor="file" className="sr-only">
              CSV file
            </Label>
            <input
              id="file"
              name="file"
              type="file"
              accept=".csv,text/csv"
              required
              className="block text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100 dark:text-slate-400 dark:file:bg-indigo-950 dark:file:text-indigo-300"
            />
            <p className="mt-2 text-xs text-slate-400">
              From Google Contacts: Export → Google CSV. Max 5MB.
            </p>
          </div>
          {error && (
            <p className="rounded-md bg-rose-50 px-4 py-2 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300">
              {error}
            </p>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? "Reading file…" : "Preview import"}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
