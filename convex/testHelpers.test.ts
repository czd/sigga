/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import type { Doc, Id } from "./_generated/dataModel";
import schema from "./schema";

/**
 * Seed a user row and return both the user id and a `t` scoped to that
 * identity. Pass the same modules glob you'd pass to `convexTest`.
 *
 * `@convex-dev/auth`'s `getAuthUserId` pulls the user id from the JWT
 * subject, so we set `subject: userId` on the test identity.
 *
 * The return type is inferred — consumers get `t` (full test instance,
 * supports `.withIdentity` / `.registerComponent`) and `authed` (the
 * identity-scoped narrower accessor).
 */
export async function createAuthedTest(
	modules: Record<string, () => Promise<unknown>>,
	overrides: Partial<Doc<"users">> = {},
) {
	const t = convexTest(schema, modules);
	const userId: Id<"users"> = await t.run(async (ctx) => {
		return await ctx.db.insert("users", {
			name: overrides.name ?? "Helga",
			email: overrides.email ?? "helga@example.test",
			image: overrides.image ?? undefined,
		});
	});
	const authed = t.withIdentity({ subject: userId });
	return { t, userId, authed };
}
