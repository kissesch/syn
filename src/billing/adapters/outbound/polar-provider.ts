import { createPolar, errors, type models, type Polar } from "@polar-sh/sdk/2026-10";

import type { BillingProvider } from "../../application/ports/outbound/billing-provider";
import type {
	BillingProviderConfig,
	PolarSubscriptionUpsertInput,
} from "../../application/dto/billing";
import { BillingApplicationError } from "../../application/errors/billing-errors";

type Subscription = models.Subscription;

export class PolarBillingProvider implements BillingProvider {
	constructor(private readonly config: BillingProviderConfig) {}

	async createCheckout(input: Parameters<BillingProvider["createCheckout"]>[0]): Promise<{ checkoutId: string; url: string }> {
		if (!this.config.accessToken) {
			throw new Error("POLAR_ACCESS_TOKEN is not configured");
		}
		const client = this.client();
		const customerId = await this.checkoutCustomerId(client, input);
		const checkout = await client.checkouts.create({
			products: [input.productId],
			customer_id: customerId,
			success_url: new URL(
				`/billing/success?checkout_id={CHECKOUT_ID}&organizationId=${encodeURIComponent(input.organizationId)}`,
				this.config.wwwBaseUrl,
			).toString(),
			metadata: {
				referenceId: input.organizationId,
				organizationId: input.organizationId,
				userId: input.userId,
				planId: input.planId,
				billingInterval: input.billingInterval,
			},
		});
		return { checkoutId: checkout.id, url: checkout.url };
	}

	private async checkoutCustomerId(
		client: Polar,
		input: Parameters<BillingProvider["createCheckout"]>[0],
	): Promise<string> {
		// The persisted binding also preserves customers created before external
		// customer IDs changed from user IDs to organization IDs.
		if (input.polarCustomerId) return input.polarCustomerId;
		const existing = await this.findOrganizationCustomerId(client, input.organizationId);
		if (existing) return existing;

		// An unbound checkout falls back to email matching in Polar. Create the
		// customer first so a duplicate email fails before any checkout is opened.
		try {
			const customer = await client.customers.create({
				external_id: input.organizationId,
				email: input.email,
			});
			return customer.id;
		} catch (error) {
			if (!(error instanceof errors.HTTPValidationError)) throw error;
			// Another request may have just created this same organization's customer.
			const concurrent = await this.findOrganizationCustomerId(client, input.organizationId);
			if (concurrent) return concurrent;
			if (error.error.detail?.some((detail) => detail.loc.join(".") === "body.email")) {
				throw new BillingApplicationError("billing_email_unavailable");
			}
			throw error;
		}
	}

	private async findOrganizationCustomerId(client: Polar, organizationId: string): Promise<string | null> {
		try {
			return (await client.customers.getExternal(organizationId)).id;
		} catch (error) {
			if (error instanceof errors.ResourceNotFound) return null;
			throw error;
		}
	}

	async updateSubscriptionProduct(input: {
		organizationId: string;
		polarSubscriptionId: string;
		productId: string;
	}): Promise<PolarSubscriptionUpsertInput> {
		if (!this.config.accessToken) {
			throw new Error("POLAR_ACCESS_TOKEN is not configured");
		}

		let subscription: Subscription;
		try {
			subscription = await this.client().subscriptions.update(input.polarSubscriptionId, {
				product_id: input.productId,
				proration_behavior: "invoice",
			});
		} catch (error) {
			if (error instanceof errors.SubscriptionsUpdate403Error && error.error.error === "AlreadyCanceledSubscription") {
				throw new BillingApplicationError("subscription_canceled");
			}
			if (error instanceof errors.SubscriptionsUpdate402Error && error.error.error === "PaymentFailed") {
				throw new BillingApplicationError("payment_failed");
			}
			if (error instanceof errors.SubscriptionsUpdate409Error && error.error.error === "SubscriptionLocked") {
				throw new BillingApplicationError("subscription_locked");
			}
			throw error;
		}

		return toPolarSubscriptionUpsertInput(subscription, input.organizationId);
	}

	async createCustomerPortalSession(input: {
		polarCustomerId: string;
		returnUrl: string;
	}): Promise<{ url: string }> {
		if (!this.config.accessToken) {
			throw new Error("POLAR_ACCESS_TOKEN is not configured");
		}
		const session = await this.client().customerSessions.create({
			customer_id: input.polarCustomerId,
			return_url: input.returnUrl,
		});
		return { url: session.customer_portal_url };
	}

	client(): Polar {
		if (!this.config.accessToken) {
			throw new Error("POLAR_ACCESS_TOKEN is not configured");
		}
		return createPolar({
			accessToken: this.config.accessToken,
			environment: this.config.sandbox ? "sandbox" : "production",
		});
	}
}

// Adapter-level function exports keep provider tests focused on the wire
// mapping while the application depends on BillingProvider.
export type PolarClientConfig = Pick<
	BillingProviderConfig,
	"accessToken" | "sandbox"
> & { wwwBaseUrl?: string };

export function createPolarCheckout(
	config: PolarClientConfig,
	input: Parameters<BillingProvider["createCheckout"]>[0],
) {
	return new PolarBillingProvider({
		...config,
		publicBaseUrl: config.wwwBaseUrl ?? "https://synch.example",
		wwwBaseUrl: config.wwwBaseUrl ?? "https://synch.example",
	}).createCheckout(input);
}

export function updatePolarSubscriptionProduct(
	config: PolarClientConfig,
	input: Parameters<BillingProvider["updateSubscriptionProduct"]>[0],
) {
	return new PolarBillingProvider({
		...config,
		publicBaseUrl: config.wwwBaseUrl ?? "https://synch.example",
		wwwBaseUrl: config.wwwBaseUrl ?? "https://synch.example",
	}).updateSubscriptionProduct(input);
}

export function createPolarCustomerPortalSession(
	config: PolarClientConfig,
	input: Parameters<BillingProvider["createCustomerPortalSession"]>[0],
) {
	return new PolarBillingProvider({
		...config,
		publicBaseUrl: config.wwwBaseUrl ?? "https://synch.example",
		wwwBaseUrl: config.wwwBaseUrl ?? "https://synch.example",
	}).createCustomerPortalSession(input);
}

export function toPolarSubscriptionUpsertInput(
	subscription: Subscription,
	organizationId: string,
): PolarSubscriptionUpsertInput {
	return {
		id: `polar-sub-${subscription.id}`,
		productId: subscription.product_id,
		organizationId,
		polarCustomerId: subscription.customer_id,
		polarSubscriptionId: subscription.id,
		polarCheckoutId: subscription.checkout_id,
		status: subscription.status,
		periodStart: new Date(subscription.current_period_start),
		periodEnd: new Date(subscription.current_period_end),
		cancelAtPeriodEnd: subscription.cancel_at_period_end,
	};
}

export function organizationIdFromPolarSubscription(
	subscription: Subscription,
): string | null {
	const referenceId = subscription.metadata.referenceId;
	const organizationId = subscription.metadata.organizationId;
	for (const value of [referenceId, organizationId]) {
		if (typeof value === "string" && value.trim()) {
			return value;
		}
	}
	return null;
}
