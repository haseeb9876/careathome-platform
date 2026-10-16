import { describe, expect, it } from "vitest";
import { applicationDatabaseConfig } from "../../src/lib/database/config";
import {
  withDatabaseIdentity,
  type TransactionConnection,
} from "../../src/lib/database/transaction";

const valid =
  "postgresql://careathome_app:synthetic-password@ep-example-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=verify-full&channel_binding=require";

describe("Neon application configuration", () => {
  it("uses a bounded pool and verified TLS without URL overrides", () => {
    const config = applicationDatabaseConfig({ DATABASE_URL: valid });
    expect(config.ssl.rejectUnauthorized).toBe(true);
    expect(config.enableChannelBinding).toBe(true);
    expect(config.max).toBe(4);
    expect(new URL(config.connectionString).search).toBe("");
  });
  it.each([
    undefined,
    "not-a-url",
    valid.replace("careathome_app", "neondb_owner"),
    valid.replace(".neon.tech", ".neon.tech.attacker.example"),
    valid.replace("verify-full", "disable"),
    valid.replace("verify-full", "require"),
    valid + "&options=-c%20role%3Dneondb_owner",
    valid + "&sslcert=some-file",
    valid.replace("postgresql:", "https:"),
  ])("rejects unsafe configuration without leaking the password", (value) => {
    expect(() => applicationDatabaseConfig({ DATABASE_URL: value })).toThrow();
    try {
      applicationDatabaseConfig({ DATABASE_URL: value });
    } catch (error) {
      expect(String(error)).not.toContain("synthetic-password");
    }
  });
});

class Connection implements TransactionConnection {
  calls: { sql: string; values?: unknown[] }[] = [];
  releases: boolean[] = [];
  failRollback = false;
  async query(sql: string, values?: unknown[]) {
    this.calls.push({ sql, values });
    if (sql === "ROLLBACK" && this.failRollback)
      throw new Error("disconnected");
    return {};
  }
  release(discard = false) {
    this.releases.push(discard);
  }
}

describe("transaction-scoped identity", () => {
  const identity = {
    userId: "11111111-1111-4111-8111-111111111111",
    assurance: "aal1" as const,
  };
  it("sets role and parameterised identity before executing work and committing", async () => {
    const client = new Connection();
    const result = await withDatabaseIdentity(
      { connect: async () => client },
      identity,
      async (connection) => {
        await connection.query("SELECT private.active_user()");
        return 42;
      },
    );
    expect(result).toBe(42);
    expect(client.calls[0].sql).toMatch(/^BEGIN;.*SET LOCAL ROLE authenticated$/);
    expect(client.calls[0].sql).toContain("statement_timeout = '8s'");
    expect(client.calls[1]).toEqual({
      sql: "SELECT set_config('request.jwt.claims', $1, true)",
      values: [JSON.stringify({ sub: identity.userId, aal: "aal1" })],
    });
    expect(client.calls.at(-1)?.sql).toBe("COMMIT");
    expect(client.releases).toEqual([false]);
  });
  it("explicitly clears identity for anonymous requests", async () => {
    const client = new Connection();
    await withDatabaseIdentity(
      { connect: async () => client },
      null,
      async () => undefined,
    );
    expect(client.calls[0].sql).toMatch(/SET LOCAL ROLE anon$/);
    expect(client.calls[1].values).toEqual(["{}"]);
  });
  it("rolls back failures and never commits them", async () => {
    const client = new Connection();
    await expect(
      withDatabaseIdentity(
        { connect: async () => client },
        identity,
        async () => {
          throw new Error("denied");
        },
      ),
    ).rejects.toThrow("denied");
    expect(client.calls.at(-1)?.sql).toBe("ROLLBACK");
    expect(client.calls.some(({ sql }) => sql === "COMMIT")).toBe(false);
    expect(client.releases).toEqual([false]);
  });
  it("discards connections when rollback fails", async () => {
    const client = new Connection();
    client.failRollback = true;
    await expect(
      withDatabaseIdentity(
        { connect: async () => client },
        identity,
        async () => {
          throw new Error("original failure");
        },
      ),
    ).rejects.toThrow("original failure");
    expect(client.releases).toEqual([true]);
  });
  it("rejects invalid identity before acquiring a connection", async () => {
    let connections = 0;
    await expect(
      withDatabaseIdentity(
        {
          connect: async () => {
            connections++;
            return new Connection();
          },
        },
        { ...identity, userId: "' OR true --" },
        async () => undefined,
      ),
    ).rejects.toThrow("Invalid authenticated database identity");
    expect(connections).toBe(0);
  });
});
