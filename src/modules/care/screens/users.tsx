import { PageHeading, Panel, Badge, ActionForm } from "@/components/care-ui";
import type { SectionProps } from "./types";
import { AdministratorInvitations } from "@/components/account-security";

export async function UsersSection({ account, query }: SectionProps) {
  const { client } = account;

  const { data } = await client
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });
  const people = (data ?? []).filter(
    (p) => !query.q || p.name.toLowerCase().includes(query.q.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        title="The people behind every visit."
        description="Manage account access without exposing private clinical records."
      />
      <form className="search-form mb-6">
        <label>
          Find a person
          <input name="q" defaultValue={query.q} placeholder="Search by name" />
        </label>
        <button className="primary-link">Search accounts</button>
      </form>
      <div className="mb-6">
        <AdministratorInvitations />
      </div>
      <Panel>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Person</th>
                <th>Role</th>
                <th>Status</th>
                <th>Account access</th>
              </tr>
            </thead>
            <tbody>
              {people.map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.name}
                    <small>{p.id.slice(0, 8)}</small>
                  </td>
                  <td>{p.role}</td>
                  <td>
                    <Badge status={p.active ? "Active" : "Inactive"} />
                  </td>
                  <td>
                    {p.role !== "admin" ? (
                      <ActionForm
                        op="account"
                        fields={{
                          p_user: p.id,
                          p_active: p.active ? "false" : "true",
                        }}
                        label={
                          p.active ? "Deactivate account" : "Restore access"
                        }
                        variant="outline"
                      />
                    ) : (
                      <small>Administrator access is protected</small>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
