import { createClient } from "@supabase/supabase-js";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const mailbox = process.env.LOCAL_MAILPIT_URL ?? "http://127.0.0.1:54324";
for (const value of [url, mailbox])
  if (!value || !["127.0.0.1", "localhost"].includes(new URL(value).hostname))
    throw new Error("Notification worker is restricted to local services");
const client = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
async function cycle() {
  const reminders = await client.rpc("enqueue_reminders");
  if (reminders.error) throw reminders.error;
  const { data, error } = await client.rpc("claim_emails");
  if (error) throw error;
  let sent = 0,
    failed = 0;
  for (const message of data ?? []) {
    let success = false;
    try {
      const response = await fetch(mailbox + "/api/v1/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(5000),
        body: JSON.stringify({
          From: {
            Email: "care@careathome.test",
            Name: "CareAtHome · Local demo",
          },
          To: [{ Email: message.email }],
          Subject: message.title,
          Text:
            message.body +
            "\n\nOpen your local care workspace to view details.\nhttp://127.0.0.1:3000/dashboard\n\nSynthetic demonstration notification.",
          Headers: { "Message-ID": "<" + message.id + "@careathome.test>" },
        }),
      });
      success = response.ok;
    } catch {
      /* The database retains a retryable job; no booking mutation occurs. */
    }
    const finished = await client.rpc("finish_email", {
      p_id: message.id,
      p_success: success,
    });
    if (finished.error) throw finished.error;
    if (success) sent++;
    else failed++;
  }
  if (sent || failed || process.argv.includes("--once"))
    console.log(
      "Local notifications: " +
        sent +
        " delivered, " +
        failed +
        " retryable failures.",
    );
}
await cycle();
if (!process.argv.includes("--once"))
  setInterval(
    () =>
      cycle().catch(() =>
        console.error(
          "Local notification cycle unavailable; retrying on the next interval.",
        ),
      ),
    30000,
  );
