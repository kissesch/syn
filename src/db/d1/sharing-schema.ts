import {
	index,
	integer,
	sqliteTable,
	text,
} from "drizzle-orm/sqlite-core";
import { organization, user } from "./auth-schema";
import { vault } from "./vault-schema";

export const vaultKeyRequest = sqliteTable(
	"vault_key_request",
	{
		id: text("id").primaryKey(),
		vaultId: text("vault_id")
			.notNull()
			.references(() => vault.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		purpose: text("purpose").notNull(),
		accessVersion: integer("access_version").notNull(),
		publicKey: text("public_key").notNull(),
		status: text("status").notNull(),
		envelopeJson: text("envelope_json"),
		approvedBy: text("approved_by").references(() => user.id),
		createdAt: integer("created_at").notNull(),
		expiresAt: integer("expires_at").notNull(),
	},
	(t) => [
		index("vault_key_request_vault_status_idx").on(t.vaultId, t.status),
		index("vault_key_request_user_idx").on(t.userId),
	],
);

export const sharingAudit = sqliteTable(
	"sharing_audit",
	{
		id: text("id").primaryKey(),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		actorId: text("actor_id").notNull(),
		action: text("action").notNull(),
		targetId: text("target_id").notNull(),
		createdAt: integer("created_at").notNull(),
	},
	(t) => [index("sharing_audit_org_idx").on(t.organizationId, t.createdAt)],
);

// Durable delivery records are retried by management reads and scheduled work.
export const sharingRefresh = sqliteTable("sharing_refresh", {
	vaultId: text("vault_id")
		.primaryKey()
		.references(() => vault.id, { onDelete: "cascade" }),
	revision: text("revision").notNull(),
	createdAt: integer("created_at").notNull(),
});
