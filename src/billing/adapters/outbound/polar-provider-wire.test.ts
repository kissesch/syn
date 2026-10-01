import { afterEach, describe, expect, it, vi } from "vitest";
import { createPolarCheckout, createPolarCustomerPortalSession, updatePolarSubscriptionProduct } from "./polar-provider";

afterEach(() => vi.unstubAllGlobals());

describe("Polar 2026-10 wire contract", () => {
	it("pins sandbox checkout requests and binds the organization customer", async () => {
		const fetchMock = vi.fn()
			.mockResolvedValueOnce(Response.json({ id: "customer-1" }))
			.mockResolvedValueOnce(Response.json({ id: "checkout-1", url: "https://polar.example/checkout" }));
		vi.stubGlobal("fetch", fetchMock);
		await createPolarCheckout({ accessToken: "test-token", sandbox: true }, {
			organizationId: "org-1", userId: "user-1", email: "user@example.com",
			productId: "product-1", planId: "starter", billingInterval: "monthly",
		});
		expect(fetchMock.mock.calls[0][0]).toBe("https://sandbox-api.polar.sh/v1/customers/external/org-1");
		const [url, request] = fetchMock.mock.calls[1];
		expect(url).toBe("https://sandbox-api.polar.sh/v1/checkouts/");
		expect(new Headers(request.headers).get("Polar-Version")).toBe("2026-10");
		expect(JSON.parse(request.body)).toMatchObject({ customer_id: "customer-1", products: ["product-1"], metadata: { organizationId: "org-1" } });
	});

	it("reads the customer portal URL from the API response", async () => {
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ customer_portal_url: "https://polar.example/portal" })));
		await expect(createPolarCustomerPortalSession({ accessToken: "test-token" }, {
			polarCustomerId: "customer-1", returnUrl: "https://synch.example/billing",
		})).resolves.toEqual({ url: "https://polar.example/portal" });
	});

	it("serializes a prorated product change and converts response dates", async () => {
		const fetchMock = vi.fn().mockResolvedValue(Response.json({
			id: "sub-1", product_id: "product-1", customer_id: "customer-1", checkout_id: null,
			status: "active", current_period_start: "2026-09-01T00:00:00Z",
			current_period_end: "2026-10-01T00:00:00Z", cancel_at_period_end: false,
		}));
		vi.stubGlobal("fetch", fetchMock);
		await expect(updatePolarSubscriptionProduct({ accessToken: "test-token" }, {
			organizationId: "org-1", polarSubscriptionId: "sub-1", productId: "product-1",
		})).resolves.toMatchObject({
			organizationId: "org-1", productId: "product-1", polarSubscriptionId: "sub-1",
			periodStart: new Date("2026-09-01T00:00:00Z"), periodEnd: new Date("2026-10-01T00:00:00Z"),
		});
		const [url, request] = fetchMock.mock.calls[0];
		expect(url).toBe("https://api.polar.sh/v1/subscriptions/sub-1");
		expect(request.method).toBe("PATCH");
		expect(new Headers(request.headers).get("Polar-Version")).toBe("2026-10");
		expect(JSON.parse(request.body)).toEqual({ product_id: "product-1", proration_behavior: "invoice" });
	});

	it("preserves customer isolation when Polar rejects a duplicate email", async () => {
		const missing = () => Response.json({ error: "ResourceNotFound", detail: "missing" }, { status: 404 });
		const fetchMock = vi.fn().mockResolvedValueOnce(missing())
			.mockResolvedValueOnce(Response.json({ detail: [{ loc: ["body", "email"], type: "value_error", msg: "duplicate", input: null }] }, { status: 422 }))
			.mockResolvedValueOnce(missing());
		vi.stubGlobal("fetch", fetchMock);
		await expect(createPolarCheckout({ accessToken: "test-token" }, {
			organizationId: "org-1", userId: "user-1", email: "user@example.com",
			productId: "product-1", planId: "starter", billingInterval: "monthly",
		})).rejects.toMatchObject({ code: "billing_email_unavailable" });
		expect(fetchMock).toHaveBeenCalledTimes(3);
		expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ external_id: "org-1", email: "user@example.com" });
		expect(fetchMock.mock.calls.every(([url]) => !String(url).includes("/checkouts/"))).toBe(true);
	});

	it.each([
		[403, "AlreadyCanceledSubscription", "subscription_canceled"],
		[402, "PaymentFailed", "payment_failed"],
		[409, "SubscriptionLocked", "subscription_locked"],
	])("maps the actual SDK error for %s %s", async (status, error, code) => {
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ error, detail: "test" }, { status })));
		await expect(updatePolarSubscriptionProduct({ accessToken: "test-token" }, {
			organizationId: "org-1", polarSubscriptionId: "sub-1", productId: "product-1",
		})).rejects.toMatchObject({ code });
	});
});
