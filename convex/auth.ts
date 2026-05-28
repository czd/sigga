import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import { FamilyCode } from "./FamilyCode";
import { isEmailAllowed, NOT_ALLOWED_MESSAGE } from "./whitelist";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
	// Google enforces the ALLOWED_EMAILS whitelist via createOrUpdateUser below.
	// FamilyCode resolves its own user from the access code, so it bypasses that
	// callback — issuing a code is the authorization.
	providers: [Google, FamilyCode],
	callbacks: {
		async createOrUpdateUser(ctx, args) {
			const email = args.profile.email as string | undefined;
			if (!isEmailAllowed(email)) {
				throw new ConvexError(NOT_ALLOWED_MESSAGE);
			}
			if (args.existingUserId) {
				return args.existingUserId;
			}
			return await ctx.db.insert("users", {
				email,
				name: args.profile.name,
				image: args.profile.image,
			});
		},
	},
});
