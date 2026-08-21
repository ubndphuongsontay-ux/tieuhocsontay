import { sql } from "@/lib/db";

export async function writeAudit(input: {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown>;
}) {
  await sql`
    insert into audit_logs (actor_id, action, entity_type, entity_id, before_data, after_data, metadata)
    values (
      ${input.actorId}::uuid,
      ${input.action},
      ${input.entityType},
      ${input.entityId ?? null}::uuid,
      ${input.before ? JSON.stringify(input.before) : null}::jsonb,
      ${input.after ? JSON.stringify(input.after) : null}::jsonb,
      ${JSON.stringify(input.metadata ?? {})}::jsonb
    )
  `;
}

export async function notify(input: {
  profileId: string;
  title: string;
  body?: string;
  href?: string;
  kind?: string;
}) {
  await sql`
    insert into notifications (profile_id, title, body, href, kind)
    values (
      ${input.profileId}::uuid,
      ${input.title},
      ${input.body ?? null},
      ${input.href ?? null},
      ${input.kind ?? "info"}
    )
  `;
}
