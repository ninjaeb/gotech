import { updateCurrency } from "@/app/actions/settings";
import { getCurrency } from "@/lib/settings";
import { CURRENCIES } from "@/lib/currency";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Label, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export default async function SettingsPage() {
  const currency = await getCurrency();

  return (
    <div className="max-w-lg">
      <PageHeader title="Settings" description="CRM-wide preferences" />

      <Card>
        <CardHeader>
          <CardTitle>Currency</CardTitle>
        </CardHeader>
        <CardBody>
          <form action={updateCurrency} className="space-y-4">
            <div>
              <Label htmlFor="currency">
                Used for every deal value across the CRM (dashboard, pipeline, AI summaries)
              </Label>
              <Select id="currency" name="currency" defaultValue={currency}>
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit">Save</Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
