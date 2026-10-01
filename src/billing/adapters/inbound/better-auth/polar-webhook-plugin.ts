import { polar, webhooks } from "@polar-sh/better-auth";
import { createPolarCore, type models } from "@polar-sh/sdk/2026-10";
import type { BetterAuthPlugin } from "better-auth";

import type { BillingProviderConfig } from "../../../application/dto/billing";
import type { BillingSubscriptionStore } from "../../../application/ports/outbound/billing-subscription-store";
import {
	organizationIdFromPolarSubscription,
	toPolarSubscriptionUpsertInput,
} from "../../outbound/polar-provider";

export function createPolarWebhookPlugin(
	config: BillingProviderConfig,
	store: BillingSubscriptionStore,
): BetterAuthPlugin | null {
	if (!config.accessToken || !config.webhookSecret) {
		return null;
	}

	const client = createPolarCore({
		accessToken: config.accessToken,
		environment: config.sandbox ? "sandbox" : "production",
	});
	const handleSubscription = async (payload: { data: models.Subscription }) => {
		const organizationId = organizationIdFromPolarSubscription(payload.data);
		if (!organizationId) {
			return;
		}
		await store.upsertPolarSubscription(
			toPolarSubscriptionUpsertInput(payload.data, organizationId),
		);
		await config.onSubscriptionUpsert?.(organizationId);
	};

	return polar({
		client,
		use: [
			webhooks({
				secret: config.webhookSecret,
				onSubscriptionUpdated: handleSubscription,
			}),
		],
	});
}
