import Link from "next/link";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { buttonClasses } from "@/components/ui/button";
import { CompanySearchList } from "@/components/companies/company-search-list";

export default async function CompaniesPage() {
  const companies = await db.company.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { contacts: true, deals: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Companies"
        description={`${companies.length} ${companies.length === 1 ? "company" : "companies"}`}
        actions={
          <Link href="/companies/new" className={buttonClasses()}>
            <Plus className="h-4 w-4" />
            New company
          </Link>
        }
      />

      <CompanySearchList companies={companies} />
    </div>
  );
}
