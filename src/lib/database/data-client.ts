import type { QueryResultRow } from "pg";

export type QueryExecutor = (
  sql: string,
  values: unknown[],
) => Promise<{ rows: QueryResultRow[] }>;
type Result<T> = {
  data: T | null;
  error: { message: string } | null;
  count: number | null;
};
const tables = new Set([
  "profiles",
  "patient_profiles",
  "provider_profiles",
  "services",
  "settings",
  "credentials",
  "verification_history",
  "availability",
  "bookings",
  "booking_history",
  "audit_log",
  "provider_contacts",
  "provider_services",
  "time_off",
  "session_records",
  "record_amendments",
  "notifications",
  "payments",
  "gateway_payments",
  "payment_history",
  "reviews",
  "review_moderation",
  "support_requests",
  "support_replies",
  "reports",
  "report_shares",
  "report_access",
]);
const functions = new Set([
  "update_patient_profile",
  "request_booking",
  "queue_booking",
  "cancel_booking",
  "save_provider",
  "register_credential",
  "verify_provider",
  "save_availability",
  "manage_time_off",
  "assign_booking",
  "require_reassignment",
  "reschedule_booking",
  "start_visit",
  "complete_visit",
  "amend_record",
  "mark_notification_read",
  "save_service",
  "set_account_active",
  "save_settings",
  "prefer_provider",
  "simulate_payment",
  "refund_payment",
  "submit_review",
  "moderate_review",
  "create_support",
  "reply_support",
  "create_report",
  "review_report",
  "share_report",
  "revoke_share",
  "read_shared_report",
  "discover_providers",
  "eligible_providers",
]);
function identifier(value: string) {
  if (!/^[a-z][a-z0-9_]*$/.test(value))
    throw new Error("Invalid query identifier.");
  return '"' + value + '"';
}
function errorResult<T>(error: unknown): Result<T> {
  return {
    data: null,
    error: {
      message:
        error instanceof Error ? error.message : "Database request failed.",
    },
    count: null,
  };
}

class ReadQuery implements PromiseLike<Result<QueryResultRow[]>> {
  private columns = "*";
  private filters: string[] = [];
  private values: unknown[] = [];
  private ordering: string[] = [];
  private maximum = 1000;
  private countOnly = false;
  private countRequested = false;
  private execute: QueryExecutor;
  private table: string;
  constructor(execute: QueryExecutor, table: string) {
    this.execute = execute;
    this.table = table;
  }
  select(columns = "*", options?: { count?: "exact"; head?: boolean }) {
    this.columns =
      columns === "*"
        ? "*"
        : columns
            .split(",")
            .map((c) => identifier(c.trim()))
            .join(",");
    this.countOnly = options?.head === true;
    this.countRequested = options?.count === "exact";
    return this;
  }
  private filter(
    column: string,
    operator: "=" | "<>" | ">=" | "<=",
    value: unknown,
  ) {
    this.values.push(value);
    this.filters.push(
      `${identifier(column)} ${operator} $${this.values.length}`,
    );
    return this;
  }
  eq(column: string, value: unknown) {
    return this.filter(column, "=", value);
  }
  neq(column: string, value: unknown) {
    return this.filter(column, "<>", value);
  }
  gte(column: string, value: unknown) {
    return this.filter(column, ">=", value);
  }
  lte(column: string, value: unknown) {
    return this.filter(column, "<=", value);
  }
  is(column: string, value: null) {
    if (value !== null) throw new Error("Only null checks are supported.");
    this.filters.push(`${identifier(column)} IS NULL`);
    return this;
  }
  order(column: string, options?: { ascending?: boolean }) {
    this.ordering.push(
      identifier(column) + (options?.ascending === false ? " DESC" : " ASC"),
    );
    return this;
  }
  limit(value: number) {
    if (!Number.isInteger(value) || value < 1 || value > 1000)
      throw new Error("Invalid query limit.");
    this.maximum = value;
    return this;
  }
  private async run(): Promise<Result<QueryResultRow[]>> {
    try {
      const base =
        ` FROM public.${identifier(this.table)}` +
        (this.filters.length ? " WHERE " + this.filters.join(" AND ") : "");
      if (this.countOnly) {
        const result = await this.execute(
          "SELECT count(*)::integer AS count" + base,
          this.values,
        );
        return { data: null, count: result.rows[0].count, error: null };
      }
      const result = await this.execute(
        "SELECT " +
          this.columns +
          (this.countRequested ? ", count(*) over()::integer AS __total" : "") +
          base +
          (this.ordering.length ? " ORDER BY " + this.ordering.join(",") : "") +
          ` LIMIT ${this.maximum}`,
        this.values,
      );
      // JSON serialization normalizes pg Date values to the established UI contract.
      const rows: QueryResultRow[] = JSON.parse(JSON.stringify(result.rows));
      const count = this.countRequested ? (rows[0]?.__total ?? 0) : null;
      rows.forEach((row) => delete row.__total);
      return { data: rows, error: null, count };
    } catch (error) {
      return errorResult(error);
    }
  }
  async single(): Promise<Result<QueryResultRow>> {
    const result = await this.limit(2).run();
    if (result.error) return { ...result, data: null };
    if (result.data?.length !== 1)
      return errorResult(new Error("Expected one accessible record."));
    return { ...result, data: result.data[0] };
  }
  async maybeSingle(): Promise<Result<QueryResultRow>> {
    const result = await this.limit(2).run();
    if (result.error || !result.data?.length) return { ...result, data: null };
    if (result.data.length !== 1)
      return errorResult(new Error("Expected at most one accessible record."));
    return { ...result, data: result.data[0] };
  }
  then<TResult1 = Result<QueryResultRow[]>, TResult2 = never>(
    onfulfilled?:
      | ((value: Result<QueryResultRow[]>) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.run().then(onfulfilled, onrejected);
  }
}

export function createDataClient(execute: QueryExecutor) {
  return {
    from(table: string) {
      if (!tables.has(table))
        throw new Error("Table is not exposed to application queries.");
      return new ReadQuery(execute, table);
    },
    async rpc(
      name: string,
      args: Record<string, unknown> = {},
    ): Promise<Result<QueryResultRow[] | string | null>> {
      if (!functions.has(name))
        return errorResult(
          new Error("Function is not exposed to application queries."),
        );
      try {
        const entries = Object.entries(args);
        const call = `public.${identifier(name)}(${entries.map(([key], i) => `${identifier(key)} => $${i + 1}`).join(",")})`;
        const setReturning =
          name === "eligible_providers" || name === "discover_providers";
        const result = await execute(
          setReturning
            ? "SELECT * FROM " + call
            : "SELECT " + call + " AS result",
          entries.map(([, value]) => value),
        );
        return {
          data: JSON.parse(
            JSON.stringify(
              setReturning ? result.rows : (result.rows[0]?.result ?? null),
            ),
          ),
          error: null,
          count: null,
        };
      } catch (error) {
        return errorResult(error);
      }
    },
  };
}
