# Polar integration

Managed billing uses `@polar-sh/sdk/2026-10` and `@polar-sh/better-auth` 2.x.
The SDK import pins outgoing requests to `Polar-Version: 2026-10`; the Better Auth
adapter also uses the 2026-10 contract. Keep these versions aligned when upgrading.
Polar payloads use snake_case fields and ISO date strings. The outbound provider
converts them into Synch's existing billing DTOs, including `Date` values.

## Deploying the SDK 1.x migration

1. Validate checkout creation, product changes with immediate proration, customer
   portal sessions, and `subscription.updated` delivery in Polar Sandbox.
2. Deploy the API code, then set the existing Polar webhook endpoint's API version
   to `2026-10`. The endpoint remains `/api/auth/polar/webhooks`. Upgrading the SDK
   does not change the endpoint's version in Polar.
3. Keep the existing webhook secret. The SDK accepts both legacy Polar HMAC and
   Standard Webhooks signatures; secret rotation is not required for this upgrade.
4. Check webhook delivery results and confirm subscription status, billing dates,
   and organization policy updates. Previously created events retain their original
   API version when redelivered.

Production and Sandbox webhook endpoints must be checked separately. Review
[Polar's version lifecycle](https://polar.sh/docs/api-reference/2026-10/versioning)
and [API changelog](https://polar.sh/docs/changelog/api) before each quarterly
migration. The supported Current contract should be pinned explicitly; never
switch production to Next merely because a newer SDK package includes it.

Local regression coverage includes provider mapping, real SDK HTTP serialization
and error handling, and signed requests through Better Auth for both signing
schemes. These tests do not contact Polar or verify dashboard configuration.
