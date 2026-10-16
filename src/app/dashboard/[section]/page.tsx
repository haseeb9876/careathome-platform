import { notFound } from "next/navigation";
import { requireAccount } from "@/modules/accounts/session";
import { dashboardSections } from "@/modules/care/screens/registry";
export default async function Section({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { section } = await params;
  const query = await searchParams;
  const account = await requireAccount();
  const definition = Object.hasOwn(dashboardSections, section)
    ? dashboardSections[section]
    : undefined;
  if (!definition?.roles.includes(account.profile.role)) notFound();
  const Screen = definition.render;
  return (
    <>
      {query.message && (
        <p className="notice" role="status">
          {query.message}
        </p>
      )}
      {query.error && (
        <p className="notice error" role="alert">
          {query.error}
        </p>
      )}
      <Screen account={account} query={query} />
    </>
  );
}
