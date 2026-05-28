/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { beforeEach, describe, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

const ADMIN_EMAIL = "nic@sigga.is";

// getAuthUserId reads identity.subject.split("|")[0] — mimic the Convex Auth
// subject shape so the auth helpers resolve to our seeded user.
function identityFor(userId: Id<"users">) {
	return { subject: `${userId}|testsession` };
}

function makeT() {
	return convexTest(schema, modules);
}

async function seedUser(
	t: ReturnType<typeof makeT>,
	name: string,
	email?: string,
) {
	return t.run((ctx) => ctx.db.insert("users", { name, email }));
}

describe("accessCodes", () => {
	beforeEach(() => {
		process.env.ADMIN_EMAILS = ADMIN_EMAIL;
	});

	test("admin can create a code; it lands in the list as active", async () => {
		const t = makeT();
		const adminId = await seedUser(t, "Nic", ADMIN_EMAIL);
		const asAdmin = t.withIdentity(identityFor(adminId));

		const { code } = await asAdmin.mutation(api.accessCodes.add, {
			name: "Helga",
		});
		expect(code).toMatch(/^[a-z2-9]{4}-[a-z2-9]{4}$/);

		const list = await asAdmin.query(api.accessCodes.list);
		expect(list).toHaveLength(1);
		expect(list[0].name).toBe("Helga");
		expect(list[0].isActive).toBe(true);
		expect(list[0].lastUsedAt).toBeNull();
	});

	test("non-admin cannot manage codes", async () => {
		const t = makeT();
		const outsiderId = await seedUser(t, "Outsider", "outsider@example.com");
		const asOutsider = t.withIdentity(identityFor(outsiderId));

		await expect(
			asOutsider.mutation(api.accessCodes.add, { name: "Helga" }),
		).rejects.toThrow();
		await expect(asOutsider.query(api.accessCodes.list)).rejects.toThrow();
	});

	test("unauthenticated callers cannot manage codes", async () => {
		const t = makeT();
		await expect(
			t.mutation(api.accessCodes.add, { name: "Helga" }),
		).rejects.toThrow();
	});

	test("a valid code resolves to a stable user and stamps lastUsedAt", async () => {
		const t = makeT();
		const adminId = await seedUser(t, "Nic", ADMIN_EMAIL);
		const asAdmin = t.withIdentity(identityFor(adminId));
		const { code } = await asAdmin.mutation(api.accessCodes.add, {
			name: "Erla",
		});

		const userId = await t.mutation(internal.accessCodes.verifyAndResolveUser, {
			code,
		});
		expect(userId).not.toBeNull();

		const user = await t.run((ctx) => ctx.db.get(userId as Id<"users">));
		expect(user?.name).toBe("Erla");

		// Same code on the next sign-in resolves to the same identity.
		const again = await t.mutation(internal.accessCodes.verifyAndResolveUser, {
			code,
		});
		expect(again).toBe(userId);

		const list = await asAdmin.query(api.accessCodes.list);
		expect(list[0].lastUsedAt).not.toBeNull();
	});

	test("unknown code returns null", async () => {
		const t = makeT();
		const result = await t.mutation(internal.accessCodes.verifyAndResolveUser, {
			code: "zzzz-zzzz",
		});
		expect(result).toBeNull();
	});

	test("a paused code blocks sign-in", async () => {
		const t = makeT();
		const adminId = await seedUser(t, "Nic", ADMIN_EMAIL);
		const asAdmin = t.withIdentity(identityFor(adminId));
		const { id, code } = await asAdmin.mutation(api.accessCodes.add, {
			name: "Anna",
		});

		await asAdmin.mutation(api.accessCodes.setActive, {
			id,
			isActive: false,
		});

		const result = await t.mutation(internal.accessCodes.verifyAndResolveUser, {
			code,
		});
		expect(result).toBeNull();
	});

	test("rotating a code invalidates the old one", async () => {
		const t = makeT();
		const adminId = await seedUser(t, "Nic", ADMIN_EMAIL);
		const asAdmin = t.withIdentity(identityFor(adminId));
		const { id, code: oldCode } = await asAdmin.mutation(api.accessCodes.add, {
			name: "Elin",
		});

		const { code: newCode } = await asAdmin.mutation(api.accessCodes.rotate, {
			id,
		});
		expect(newCode).not.toBe(oldCode);

		expect(
			await t.mutation(internal.accessCodes.verifyAndResolveUser, {
				code: oldCode,
			}),
		).toBeNull();
		expect(
			await t.mutation(internal.accessCodes.verifyAndResolveUser, {
				code: newCode,
			}),
		).not.toBeNull();
	});

	test("a code whose email matches an existing user links to that user", async () => {
		const t = makeT();
		const adminId = await seedUser(t, "Nic", ADMIN_EMAIL);
		const asAdmin = t.withIdentity(identityFor(adminId));
		const existingId = await seedUser(t, "Helga", "helga@example.com");

		const { code } = await asAdmin.mutation(api.accessCodes.add, {
			name: "Helga (code)",
			email: "helga@example.com",
		});

		const resolved = await t.mutation(
			internal.accessCodes.verifyAndResolveUser,
			{ code },
		);
		expect(resolved).toBe(existingId);

		// No duplicate user was created for that email.
		const matches = await t.run((ctx) =>
			ctx.db
				.query("users")
				.filter((q) => q.eq(q.field("email"), "helga@example.com"))
				.collect(),
		);
		expect(matches).toHaveLength(1);
	});

	test("duplicate custom codes are rejected", async () => {
		const t = makeT();
		const adminId = await seedUser(t, "Nic", ADMIN_EMAIL);
		const asAdmin = t.withIdentity(identityFor(adminId));

		await asAdmin.mutation(api.accessCodes.add, {
			name: "First",
			code: "shared-code",
		});
		await expect(
			asAdmin.mutation(api.accessCodes.add, {
				name: "Second",
				code: "shared-code",
			}),
		).rejects.toThrow();
	});
});
