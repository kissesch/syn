DROP TABLE `invitation_vault`;--> statement-breakpoint
ALTER TABLE `vault_membership` DROP COLUMN `explicit_access`;
--> statement-breakpoint
-- Sharing now follows organization membership, including vaults that previously
-- had no individual grants. Preserve all enrollment, wrappers and access versions.
INSERT INTO sharing_refresh (vault_id, revision, created_at)
SELECT v.id, lower(hex(randomblob(16))), cast((julianday('now') - 2440587.5)*86400000 as integer)
FROM vault v
WHERE v.deleted_at IS NULL AND v.shared_at IS NULL
  AND (SELECT count(*) FROM member m WHERE m.organization_id=v.organization_id)>1
ON CONFLICT (vault_id) DO UPDATE SET revision=excluded.revision, created_at=excluded.created_at;
--> statement-breakpoint
UPDATE vault SET shared_at=cast((julianday('now') - 2440587.5)*86400000 as integer)
WHERE deleted_at IS NULL AND shared_at IS NULL
  AND (SELECT count(*) FROM member m WHERE m.organization_id=vault.organization_id)>1;
