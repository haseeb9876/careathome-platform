/** The caller must derive this identity from a verified server-side session. */
export type DatabaseIdentity = Readonly<{
  userId: string;
  assurance: "aal1" | "aal2";
}> | null;

export interface TransactionConnection {
  query(sql: string, values?: unknown[]): Promise<unknown>;
  release(error?: boolean): void;
}

export interface TransactionPool<C extends TransactionConnection> {
  connect(): Promise<C>;
}

/** Transaction-local identity prevents one pooled request inheriting another's access. */
export async function withDatabaseIdentity<C extends TransactionConnection, T>(
  pool: TransactionPool<C>,
  identity: DatabaseIdentity,
  operation: (connection: C) => Promise<T>,
): Promise<T> {
  if (
    identity &&
    (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      identity.userId,
    ) ||
      !["aal1", "aal2"].includes(identity.assurance))
  ) {
    throw new Error("Invalid authenticated database identity.");
  }
  const connection = await pool.connect();
  let discard = false;
  try {
    // Fixed SQL only: combine setup to avoid four extra network round trips.
    await connection.query(
      "BEGIN; SET LOCAL statement_timeout = '8s'; SET LOCAL lock_timeout = '3s'; SET LOCAL idle_in_transaction_session_timeout = '10s'; SET LOCAL ROLE " +
        (identity ? "authenticated" : "anon"),
    );
    await connection.query(
      "SELECT set_config('request.jwt.claims', $1, true)",
      [
        JSON.stringify(
          identity ? { sub: identity.userId, aal: identity.assurance } : {},
        ),
      ],
    );
    const result = await operation(connection);
    await connection.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await connection.query("ROLLBACK");
    } catch {
      // A failed rollback cannot return a potentially contaminated client to the pool.
      discard = true;
    }
    throw error;
  } finally {
    connection.release(discard);
  }
}
