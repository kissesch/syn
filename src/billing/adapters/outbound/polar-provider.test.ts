import { beforeEach, describe, expect, it, vi } from "vitest";

import { errors } from "@polar-sh/sdk/2026-10";

const polarMocks = vi.hoisted(() => ({
	checkoutsCreate: vi.fn(),
	customersGetExternal: vi.fn(),
	customersCreate: vi.fn(),
	customerSessionsCreate: vi.fn(),
	subscriptionsUpdate: vi.fn(),
	createPolar: vi.fn(() => ({
		checkouts: { create: polarMocks.checkoutsCreate },
		customers: { getExternal: polarMocks.customersGetExternal, create: polarMocks.customersCreate },
		customerSessions: { create: polarMocks.customerSessionsCreate },
		subscriptions: { update: polarMocks.subscriptionsUpdate },
	})),
}));

vi.mock("@polar-sh/sdk/2026-10", async (importOriginal) => ({
	...await importOriginal<typeof import("@polar-sh/sdk/2026-10")>(),
	createPolar: polarMocks.createPolar,
}));

import {
	createPolarCheckout,
	createPolarCustomerPortalSession,
	updatePolarSubscriptionProduct,
} from "./polar-provider";

describe("createPolarCheckout", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		polarMocks.customersGetExternal.mockResolvedValue({ id: "customer-1" });
	});

	it("creates a starter checkout with organization metadata", async () => {
		polarMocks.checkoutsCreate.mockResolvedValueOnce({
			id: "checkout-1",
			url: "https://polar.example/checkout-1",
		});

		await expect(
			createPolarCheckout(
				{
					accessToken: "polar-token",
					wwwBaseUrl: "https://synch.example",
					sandbox: true,
				},
				{
					planId: "starter",
					billingInterval: "monthly",
					productId: "starter-product",
					organizationId: "org-1",
					userId: "user-1",
					email: "user@example.com",
				},
			),
		).resolves.toEqual({
			checkoutId: "checkout-1",
			url: "https://polar.example/checkout-1",
		});

		expect(polarMocks.createPolar).toHaveBeenCalledWith({
			accessToken: "polar-token",
			environment: "sandbox",
		});
		expect(polarMocks.checkoutsCreate).toHaveBeenCalledWith({
			products: ["starter-product"],
			customer_id: "customer-1",
			success_url: "https://synch.example/billing/success?checkout_id={CHECKOUT_ID}&organizationId=org-1",
			metadata: {
				referenceId: "org-1",
				organizationId: "org-1",
				userId: "user-1",
				planId: "starter",
				billingInterval: "monthly",
			},
		});
	});

	const checkoutInput = {
		planId: "starter" as const,
		billingInterval: "monthly" as const,
		productId: "starter-product",
		organizationId: "org-1",
		userId: "user-1",
		email: "user@example.com",
	};
	const missingCustomer = () => new errors.ResourceNotFound(404,
		{ error: "ResourceNotFound", detail: "Customer not found" },
	);
	const duplicateEmail = () => new errors.HTTPValidationError(422, {
		detail: [{ loc: ["body", "email"], type: "value_error", msg: "A customer with this email address already exists.", input: null }],
	});

	it("creates the organization customer before opening checkout", async () => {
		polarMocks.customersGetExternal.mockRejectedValueOnce(missingCustomer());
		polarMocks.customersCreate.mockResolvedValueOnce({ id: "new-customer" });
		polarMocks.checkoutsCreate.mockResolvedValueOnce({ id: "checkout-1", url: "https://polar.example/checkout-1" });

		await createPolarCheckout({ accessToken: "polar-token" }, checkoutInput);

		expect(polarMocks.customersGetExternal).toHaveBeenCalledWith("org-1");
		expect(polarMocks.customersCreate).toHaveBeenCalledWith({ external_id: "org-1", email: "user@example.com" });
		expect(polarMocks.checkoutsCreate).toHaveBeenCalledWith(expect.objectContaining({ customer_id: "new-customer" }));
		expect(polarMocks.checkoutsCreate.mock.calls[0][0]).not.toHaveProperty("customer_email");
	});

	it("reuses a stored legacy customer even when another admin pays", async () => {
		polarMocks.checkoutsCreate.mockResolvedValueOnce({ id: "checkout-1", url: "https://polar.example/checkout-1" });

		await createPolarCheckout({ accessToken: "polar-token" }, { ...checkoutInput, polarCustomerId: "legacy-customer", email: "other-admin@example.com" });

		expect(polarMocks.customersGetExternal).not.toHaveBeenCalled();
		expect(polarMocks.customersCreate).not.toHaveBeenCalled();
		expect(polarMocks.checkoutsCreate).toHaveBeenCalledWith(expect.objectContaining({ customer_id: "legacy-customer" }));
	});

	it("does not open checkout when the email belongs to another organization's customer", async () => {
		polarMocks.customersGetExternal.mockRejectedValue(missingCustomer());
		polarMocks.customersCreate.mockRejectedValueOnce(duplicateEmail());

		await expect(createPolarCheckout({ accessToken: "polar-token" }, checkoutInput))
			.rejects.toMatchObject({ code: "billing_email_unavailable" });

		expect(polarMocks.checkoutsCreate).not.toHaveBeenCalled();
	});

	it("reuses the same organization's customer after concurrent creation", async () => {
		polarMocks.customersGetExternal.mockRejectedValueOnce(missingCustomer())
			.mockResolvedValueOnce({ id: "concurrent-customer" });
		polarMocks.customersCreate.mockRejectedValueOnce(duplicateEmail());
		polarMocks.checkoutsCreate.mockResolvedValueOnce({ id: "checkout-1", url: "https://polar.example/checkout-1" });

		await createPolarCheckout({ accessToken: "polar-token" }, checkoutInput);

		expect(polarMocks.checkoutsCreate).toHaveBeenCalledWith(expect.objectContaining({ customer_id: "concurrent-customer" }));
	});

	it("does not treat lookup outages as a missing customer", async () => {
		polarMocks.customersGetExternal.mockRejectedValueOnce(new Error("polar unavailable"));

		await expect(createPolarCheckout({ accessToken: "polar-token" }, checkoutInput)).rejects.toThrow("polar unavailable");

		expect(polarMocks.customersCreate).not.toHaveBeenCalled();
		expect(polarMocks.checkoutsCreate).not.toHaveBeenCalled();
	});

	it("requires a Polar access token", async () => {
		await expect(
			createPolarCheckout(
				{
					wwwBaseUrl: "https://synch.example",
				},
				{
					planId: "starter",
					billingInterval: "monthly",
					productId: "starter-product",
					organizationId: "org-1",
					userId: "user-1",
					email: "user@example.com",
				},
			),
		).rejects.toThrow();
		expect(polarMocks.checkoutsCreate).not.toHaveBeenCalled();
	});

	it("throws Polar checkout failures", async () => {
		polarMocks.checkoutsCreate.mockRejectedValueOnce(new Error("polar unavailable"));

		await expect(
			createPolarCheckout(
				{
					accessToken: "polar-token",
					wwwBaseUrl: "https://synch.example",
				},
				{
					planId: "starter",
					billingInterval: "monthly",
					productId: "starter-product",
					organizationId: "org-1",
					userId: "user-1",
					email: "user@example.com",
				},
			),
		).rejects.toThrow("polar unavailable");
	});

	it("creates a customer portal session", async () => {
		polarMocks.customerSessionsCreate.mockResolvedValueOnce({
			customer_portal_url: "https://polar.example/portal/session-1",
		});

		await expect(
			createPolarCustomerPortalSession(
				{
					accessToken: "polar-token",
					sandbox: true,
				},
				{
					polarCustomerId: "customer-1",
					returnUrl: "https://synch.example/billing",
				},
			),
		).resolves.toEqual({
			url: "https://polar.example/portal/session-1",
		});

		expect(polarMocks.createPolar).toHaveBeenCalledWith({
			accessToken: "polar-token",
			environment: "sandbox",
		});
		expect(polarMocks.customerSessionsCreate).toHaveBeenCalledWith({
			customer_id: "customer-1",
			return_url: "https://synch.example/billing",
		});
	});

	it("requires a Polar access token for customer portal sessions", async () => {
		await expect(
			createPolarCustomerPortalSession(
				{},
				{
					polarCustomerId: "customer-1",
					returnUrl: "https://synch.example/billing",
				},
			),
		).rejects.toThrow();
		expect(polarMocks.customerSessionsCreate).not.toHaveBeenCalled();
	});
});

describe("updatePolarSubscriptionProduct", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("switches the subscription product with immediate proration", async () => {
		polarMocks.subscriptionsUpdate.mockResolvedValueOnce({
			id: "sub-1",
			product_id: "starter-annual-product",
			customer_id: "customer-1",
			checkout_id: "checkout-1",
			status: "active",
			current_period_start: "2026-05-01T00:00:00.000Z",
			current_period_end: "2027-05-01T00:00:00.000Z",
			cancel_at_period_end: false,
			metadata: {
				referenceId: "org-1",
				organizationId: "org-1",
			},
		});

		await expect(
			updatePolarSubscriptionProduct(
				{
					accessToken: "polar-token",
					sandbox: true,
				},
				{
					organizationId: "org-1",
					polarSubscriptionId: "sub-1",
					productId: "starter-annual-product",
				},
			),
		).resolves.toEqual({
			id: "polar-sub-sub-1",
			productId: "starter-annual-product",
			organizationId: "org-1",
			polarCustomerId: "customer-1",
			polarSubscriptionId: "sub-1",
			polarCheckoutId: "checkout-1",
			status: "active",
			periodStart: new Date("2026-05-01T00:00:00.000Z"),
			periodEnd: new Date("2027-05-01T00:00:00.000Z"),
			cancelAtPeriodEnd: false,
		});

		expect(polarMocks.createPolar).toHaveBeenCalledWith({
			accessToken: "polar-token",
			environment: "sandbox",
		});
		expect(polarMocks.subscriptionsUpdate).toHaveBeenCalledWith("sub-1", {
			product_id: "starter-annual-product",
			proration_behavior: "invoice",
		});
	});

	it("uses the trusted organization when the Polar response has no metadata", async () => {
		polarMocks.subscriptionsUpdate.mockResolvedValueOnce({
			id: "sub-1",
			product_id: "starter-annual-product",
			customer_id: "customer-1",
			checkout_id: "checkout-1",
			status: "active",
			current_period_start: "2026-05-01T00:00:00.000Z",
			current_period_end: "2027-05-01T00:00:00.000Z",
			cancel_at_period_end: false,
			metadata: {},
		});

		await expect(
			updatePolarSubscriptionProduct(
				{ accessToken: "polar-token" },
				{
					organizationId: "org-1",
					polarSubscriptionId: "sub-1",
					productId: "starter-annual-product",
				},
			),
		).resolves.toMatchObject({
			organizationId: "org-1",
			productId: "starter-annual-product",
			polarSubscriptionId: "sub-1",
		});
	});

	it("requires a Polar access token", async () => {
		await expect(
			updatePolarSubscriptionProduct(
				{},
				{
					organizationId: "org-1",
					polarSubscriptionId: "sub-1",
					productId: "starter-annual-product",
				},
			),
		).rejects.toThrow();
		expect(polarMocks.subscriptionsUpdate).not.toHaveBeenCalled();
	});

	it("maps already canceled subscription failures", async () => {
		polarMocks.subscriptionsUpdate.mockRejectedValueOnce(
			new errors.SubscriptionsUpdate403Error(403,
				{
					error: "AlreadyCanceledSubscription",
					detail: "subscription is canceled",
				},
			),
		);

		await expect(
			updatePolarSubscriptionProduct(
				{ accessToken: "polar-token" },
				{
					organizationId: "org-1",
					polarSubscriptionId: "sub-1",
					productId: "starter-annual-product",
				},
			),
		).rejects.toMatchObject({
			code: "subscription_canceled",
		});
	});

	it("maps payment failures", async () => {
		polarMocks.subscriptionsUpdate.mockRejectedValueOnce(
			new errors.SubscriptionsUpdate402Error(402,
				{
					error: "PaymentFailed",
					detail: "card declined",
				},
			),
		);

		await expect(
			updatePolarSubscriptionProduct(
				{ accessToken: "polar-token" },
				{
					organizationId: "org-1",
					polarSubscriptionId: "sub-1",
					productId: "starter-annual-product",
				},
			),
		).rejects.toMatchObject({
			code: "payment_failed",
		});
	});

	it("maps locked subscription failures", async () => {
		polarMocks.subscriptionsUpdate.mockRejectedValueOnce(
			new errors.SubscriptionsUpdate409Error(409,
				{
					error: "SubscriptionLocked",
					detail: "subscription is locked",
				},
			),
		);

		await expect(
			updatePolarSubscriptionProduct(
				{ accessToken: "polar-token" },
				{
					organizationId: "org-1",
					polarSubscriptionId: "sub-1",
					productId: "starter-annual-product",
				},
			),
		).rejects.toMatchObject({
			code: "subscription_locked",
		});
	});

	it("rethrows other Polar failures", async () => {
		polarMocks.subscriptionsUpdate.mockRejectedValueOnce(
			new Error("polar unavailable"),
		);

		await expect(
			updatePolarSubscriptionProduct(
				{ accessToken: "polar-token" },
				{
					organizationId: "org-1",
					polarSubscriptionId: "sub-1",
					productId: "starter-annual-product",
				},
			),
		).rejects.toThrow("polar unavailable");
	});
});
