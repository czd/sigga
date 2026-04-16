import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";

function isEmailAllowed(email: string | undefined | null): boolean {
	if (!email) return false;
	const raw = process.env.ALLOWED_EMAILS ?? "";
	const allowed = raw
		.split(",")
		.map((e) => e.trim().toLowerCase())
		.filter(Boolean);
	return allowed.includes(email.toLowerCase());
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
	providers: [Google],
	callbacks: {
		async createOrUpdateUser(ctx, args) {
			const email = args.profile.email as string | undefined;
			if (!isEmailAllowed(email)) {
				throw new ConvexError(
					"Þetta netfang hefur ekki aðgang. Hafðu samband við Nic.",
				);
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
