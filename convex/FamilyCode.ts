import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import type { ConvexCredentialsConfig } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import { internal } from "./_generated/api";

export const WRONG_CODE_MESSAGE =
	"Kóðinn er rangur eða útrunninn. Hafðu samband við Nic.";

// Explicit type annotation breaks the inference cycle: this module imports
// `internal`, and the generated API references this module — without the
// annotation TypeScript reports TS7022 ("referenced in its own initializer").
export const FamilyCode: ConvexCredentialsConfig = ConvexCredentials({
	id: "family-code",
	authorize: async (credentials, ctx) => {
		const code =
			typeof credentials.code === "string" ? credentials.code.trim() : "";
		if (code.length === 0) {
			throw new ConvexError(WRONG_CODE_MESSAGE);
		}
		const userId = await ctx.runMutation(
			internal.accessCodes.verifyAndResolveUser,
			{ code },
		);
		if (userId === null) {
			throw new ConvexError(WRONG_CODE_MESSAGE);
		}
		return { userId };
	},
});
