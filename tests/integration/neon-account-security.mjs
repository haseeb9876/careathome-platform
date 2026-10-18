import assert from "node:assert/strict";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { Pool } from "pg";
import { owner, createAccount, close } from "./neon-fixtures.mjs";
import { applicationDatabaseConfig } from "../../src/lib/database/config.ts";
import { withDatabaseIdentity } from "../../src/lib/database/transaction.ts";

const restricted = new Pool(
  applicationDatabaseConfig(
    { DATABASE_URL: process.env.AUTH_DATABASE_URL },
    "careathome_auth",
  ),
);
const app = new Pool(applicationDatabaseConfig(process.env));
const ids = [];
const email = () =>
  `security-${randomBytes(8).toString("hex")}@careathome.test`;
const password = randomBytes(24).toString("hex");
const freshHash = () =>
  createHash("sha256").update(randomBytes(32)).digest("hex");
let checks = 0;
const pass = (label) => {
  checks++;
  console.log("PASS " + label);
};
async function account(role = "patient", address = email()) {
  const result = await createAccount(
    address,
    password,
    "Synthetic account security",
    role,
  );
  ids.push(result.id);
  return result.id;
}
async function session(user, mfa = false) {
  const id = randomUUID();
  await owner.query(
    'insert into public.identity_sessions(id,"userId",token,"expiresAt","createdAt","updatedAt","mfaVerified","userAgent") values($1,$2,$3,now()+interval \'1 hour\',now(),now(),$4,\'Synthetic security integration\')',
    [id, user, randomBytes(32).toString("hex"), mfa],
  );
  return id;
}
async function createLink(sid, kind, recipient = email(), hash = freshHash()) {
  const result = await restricted.query(
    "select private.account_link_create($1,$2,$3,$4) as id",
    [sid, kind, recipient, hash],
  );
  return { id: result.rows[0].id, hash, recipient };
}
const deliver = (link) =>
  restricted.query("select private.account_link_delivery($1,true)", [link.id]);
const accept = (link, user) =>
  restricted.query("select private.account_invitation_accept($1,$2)", [
    link.hash,
    user,
  ]);
const confirm = (sid, link) =>
  restricted.query("select private.account_email_confirm($1,$2)", [
    sid,
    link.hash,
  ]);
try {
  const patient = await account(),
    stranger = await account(),
    admin = await account("admin");
  const ps = await session(patient),
    ss = await session(stranger),
    adminLow = await session(admin);
  await assert.rejects(() =>
    withDatabaseIdentity(app, { userId: patient, assurance: "aal1" }, (c) =>
      c.query("select private.account_link_create($1,'admin',$2,$3)", [
        ps,
        email(),
        freshHash(),
      ]),
    ),
  );
  await assert.rejects(() =>
    withDatabaseIdentity(app, null, (c) =>
      c.query("select * from private.account_links"),
    ),
  );
  pass(
    "application and anonymous roles cannot access privileged token operations",
  );
  await assert.rejects(() => createLink(ps, "admin"), /Not permitted/);
  pass("patients cannot create administrator invitations");
  await assert.rejects(() => createLink(adminLow, "admin"), /two-step/);
  await owner.query(
    'update public.identity_users set "twoFactorEnabled"=true where id=$1',
    [admin],
  );
  await assert.rejects(() => createLink(adminLow, "admin"), /two-step/);
  const adminStrong = await session(admin, true);
  pass("administrator invitations require enrolled and verified MFA");
  const invite = await createLink(adminStrong, "admin");
  assert.equal(
    (
      await restricted.query("select * from private.account_link_preview($1)", [
        invite.hash,
      ])
    ).rowCount,
    0,
  );
  await deliver(invite);
  assert.equal(
    (
      await restricted.query("select * from private.account_link_preview($1)", [
        invite.hash,
      ])
    ).rowCount,
    1,
  );
  pass("undelivered links are unusable and delivered links can be previewed");
  await assert.rejects(() => accept(invite, stranger));
  pass("invitation cannot promote an account with a different email");
  const recipient = await account("patient", invite.recipient);
  await session(recipient);
  const results = await Promise.allSettled([
    accept(invite, recipient),
    accept(invite, recipient),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const promoted = (
    await owner.query(
      'select p.role,u."emailVerified" as verified from public.profiles p join public.identity_users u on u.id=p.id where p.id=$1',
      [recipient],
    )
  ).rows[0];
  assert.deepEqual(promoted, { role: "admin", verified: true });
  assert.equal(
    (
      await owner.query(
        'select id from public.identity_sessions where "userId"=$1',
        [recipient],
      )
    ).rowCount,
    0,
  );
  pass(
    "concurrent invitation acceptance has one winner, verifies email and retires sessions",
  );
  await assert.rejects(() => accept(invite, recipient), /already used/);
  pass("accepted invitations cannot be replayed");
  const revoked = await createLink(adminStrong, "admin");
  await deliver(revoked);
  await restricted.query("select private.account_link_revoke($1,$2)", [
    adminStrong,
    revoked.id,
  ]);
  assert.equal(
    (
      await restricted.query("select * from private.account_link_preview($1)", [
        revoked.hash,
      ])
    ).rowCount,
    0,
  );
  await assert.rejects(() => accept(revoked, stranger));
  pass("revoked invitations cannot be used");
  const expired = await createLink(adminStrong, "admin");
  await deliver(expired);
  await owner.query(
    "update private.account_links set created_at=now()-interval '2 days',expires_at=now()-interval '1 day' where id=$1",
    [expired.id],
  );
  await assert.rejects(() => accept(expired, stranger));
  pass("expired invitations cannot be used");
  const disabled = await createLink(adminStrong, "admin");
  await deliver(disabled);
  await owner.query("update public.profiles set active=false where id=$1", [
    admin,
  ]);
  await assert.rejects(() => accept(disabled, stranger), /no longer available/);
  await owner.query("update public.profiles set active=true where id=$1", [
    admin,
  ]);
  pass("invitations lose authority when their sender is deactivated");
  const change = await createLink(ps, "email");
  await deliver(change);
  assert.notEqual(
    (
      await owner.query("select email from public.identity_users where id=$1", [
        patient,
      ])
    ).rows[0].email,
    change.recipient,
  );
  await assert.rejects(() => confirm(ss, change));
  pass(
    "email remains unchanged until verification by the matching signed-in user",
  );
  await session(patient);
  await confirm(ps, change);
  assert.equal(
    (
      await owner.query("select email from public.identity_users where id=$1", [
        patient,
      ])
    ).rows[0].email,
    change.recipient,
  );
  assert.equal(
    (
      await owner.query(
        'select id from public.identity_sessions where "userId"=$1',
        [patient],
      )
    ).rowCount,
    0,
  );
  const ps2 = await session(patient);
  await assert.rejects(() => confirm(ps2, change), /already used/);
  pass("verified email change signs out all sessions and cannot be replayed");
  const old = await createLink(ps2, "email");
  await deliver(old);
  const newer = await createLink(ps2, "email");
  await deliver(newer);
  await assert.rejects(() => confirm(ps2, old), /already used/);
  pass("a newer email request invalidates the previous link");
  const other = await session(patient);
  await restricted.query("select private.account_sessions_revoke($1,$2)", [
    ps2,
    ss,
  ]);
  assert.equal(
    (
      await owner.query("select id from public.identity_sessions where id=$1", [
        ss,
      ])
    ).rowCount,
    1,
  );
  await assert.rejects(() =>
    restricted.query("select private.account_sessions_revoke($1,$2)", [
      ps2,
      ps2,
    ]),
  );
  await restricted.query("select private.account_sessions_revoke($1,null)", [
    ps2,
  ]);
  assert.equal(
    (
      await owner.query("select id from public.identity_sessions where id=$1", [
        other,
      ])
    ).rowCount,
    0,
  );
  assert.equal(
    (
      await owner.query("select id from public.identity_sessions where id=$1", [
        ps2,
      ])
    ).rowCount,
    1,
  );
  pass(
    "session revocation preserves the current session and other users' sessions",
  );
  const listed = (
    await restricted.query("select * from private.account_sessions_list($1)", [
      ps2,
    ])
  ).rows;
  assert.ok(
    listed.length && listed.every((row) => !Object.hasOwn(row, "token")),
  );
  pass("session lists do not expose authentication tokens");
  await owner.query(
    "update public.identity_sessions set \"expiresAt\"=now()-interval '1 minute' where id=$1",
    [ps2],
  );
  await assert.rejects(() => createLink(ps2, "email"), /Not permitted/);
  pass("expired sessions cannot request account changes");
  const audit = (
    await owner.query(
      "select distinct action from public.audit_log where actor=any($1::uuid[])",
      [ids],
    )
  ).rows.map((r) => r.action);
  for (const action of [
    "admin_invitation_created",
    "admin_invitation_accepted",
    "account_link_revoked",
    "email_change_requested",
    "email_changed",
    "sessions_revoked",
  ])
    assert.ok(audit.includes(action));
  pass("sensitive account and invitation operations have audit entries");
  console.log(`${checks} account security checks passed`);
} finally {
  if (ids.length) {
    await owner.query(
      "update public.profiles set active=false where id=any($1::uuid[])",
      [ids],
    );
    await owner.query(
      'delete from public.identity_sessions where "userId"=any($1::uuid[])',
      [ids],
    );
  }
  await Promise.all([restricted.end(), app.end(), close()]);
}
