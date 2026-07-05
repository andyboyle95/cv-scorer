// Broad audit log helper. Logs sign-ins AND admin actions (add user, revoke,
// role change, add/remove domain) to the same table so the admin activity
// tab can answer "who granted this access?" and not just "who signed in?".

import { prisma } from "./prisma";

export type AuditEventType =
  | "SIGN_IN"
  | "USER_ADDED"
  | "USER_REVOKED"
  | "USER_RESTORED"
  | "ROLE_CHANGED"
  | "DOMAIN_ADDED"
  | "DOMAIN_REMOVED";

interface AuditPayload {
  type: AuditEventType;
  actor: string;
  target?: string;
  meta?: Record<string, unknown>;
}

export async function logAudit({ type, actor, target, meta }: AuditPayload): Promise<void> {
  try {
    await prisma.auditEvent.create({
      data: {
        type,
        actor,
        target,
        meta: meta ? JSON.stringify(meta) : null,
      },
    });
  } catch (err) {
    // Never fail the caller because audit logging failed — but do surface it
    // in the server log so operational issues don't go silent.
    console.error("[audit] failed to log event", type, err);
  }
}
