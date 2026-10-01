import { createHmac } from "node:crypto";
import { betterAuth } from "better-auth";
import { describe, expect, it, vi } from "vitest";
import { createPolarWebhookPlugin } from "./polar-webhook-plugin";
import type { BillingSubscriptionStore } from "../../../application/ports/outbound/billing-subscription-store";

const secretBytes = Buffer.from("polar-webhook-test-secret");
const secret = `whsec_${secretBytes.toString("base64")}`;

function setup() {
	const store = { upsertPolarSubscription: vi.fn(), readOrganizationSubscriptionStatuses: vi.fn() } satisfies BillingSubscriptionStore;
	const refresh = vi.fn();
	const plugin = createPolarWebhookPlugin({
		accessToken: "test-token", webhookSecret: secret, sandbox: true,
		publicBaseUrl: "http://localhost:3000", wwwBaseUrl: "http://localhost:3000", onSubscriptionUpsert: refresh,
	}, store)!;
	const auth = betterAuth({
		baseURL: "http://localhost:3000", secret: "test-auth-secret-that-is-long-enough-for-better-auth",
		plugins: [plugin], logger: { level: "error" },
	});
	return { store, refresh, auth };
}

function request(scheme: "legacy" | "standard", organizationId: string | null = "org-1", tampered = false, apiVersion = "2026-10") {
	const body = JSON.stringify({ type: "subscription.updated", api_version: apiVersion, timestamp: new Date().toISOString(), data: {
		id: "sub-1", product_id: "product-1", customer_id: "customer-1", checkout_id: null,
		status: "active", current_period_start: "2026-09-01T00:00:00Z", current_period_end: "2026-10-01T00:00:00Z",
		cancel_at_period_end: false, metadata: organizationId ? { organizationId } : {},
	} });
	const timestamp = Math.floor(Date.now() / 1000).toString();
	const signature = createHmac("sha256", scheme === "legacy" ? Buffer.from(secret) : secretBytes)
		.update(`event-1.${timestamp}.${body}`).digest("base64");
	return new Request("http://localhost:3000/api/auth/polar/webhooks", {
		method: "POST", body: tampered ? body.replace("product-1", "product-2") : body,
		headers: { "content-type": "application/json", "webhook-id": "event-1", "webhook-timestamp": timestamp, "webhook-signature": `v1,${signature}` },
	});
}

describe("Polar subscription webhooks", () => {
	it.each(["legacy", "standard"] as const)("accepts %s signatures and persists dates before refreshing policy", async (scheme) => {
		const { auth, store, refresh } = setup();
		const response = await auth.handler(request(scheme));
		expect(response.status).toBe(200);
		expect(store.upsertPolarSubscription).toHaveBeenCalledWith({
			id: "polar-sub-sub-1", productId: "product-1", organizationId: "org-1",
			polarCustomerId: "customer-1", polarSubscriptionId: "sub-1", polarCheckoutId: null,
			status: "active", periodStart: new Date("2026-09-01T00:00:00Z"), periodEnd: new Date("2026-10-01T00:00:00Z"), cancelAtPeriodEnd: false,
		});
		expect(refresh).toHaveBeenCalledWith("org-1");
		expect(store.upsertPolarSubscription.mock.invocationCallOrder[0]).toBeLessThan(refresh.mock.invocationCallOrder[0]);
	});

	it("rejects tampered events without updating subscriptions", async () => {
		const { auth, store } = setup();
		expect((await auth.handler(request("standard", "org-1", true))).status).toBe(403);
		expect(store.upsertPolarSubscription).not.toHaveBeenCalled();
	});

	it("ignores events without an organization binding", async () => {
		const { auth, store, refresh } = setup();
		expect((await auth.handler(request("standard", null))).status).toBe(200);
		expect(store.upsertPolarSubscription).not.toHaveBeenCalled();
		expect(refresh).not.toHaveBeenCalled();
	});
	it("accepts a redelivered event created under the previous API version", async () => {
		const { auth, store } = setup();
		expect((await auth.handler(request("legacy", "org-1", false, "2026-04"))).status).toBe(200);
		expect(store.upsertPolarSubscription).toHaveBeenCalledOnce();
	});

	it("returns an error for retry when subscription persistence fails", async () => {
		const { auth, store, refresh } = setup();
		store.upsertPolarSubscription.mockRejectedValueOnce(new Error("storage unavailable"));
		expect((await auth.handler(request("standard"))).status).toBe(500);
		expect(refresh).not.toHaveBeenCalled();
	});

});
