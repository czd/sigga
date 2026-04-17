import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";
import { query } from "./_generated/server";

type UserSummary = {
	_id: Id<"users">;
	name: string | null;
	email: string | null;
	image: string | null;
};

export const me = query({
	args: {},
	handler: async (ctx) => {
		const userId = await getAuthUserId(ctx);
		if (userId === null) {
			return null;
		}
		return await ctx.db.get(userId);
	},
});

export const list = query({
	args: {},
	handler: async (ctx): Promise<UserSummary[]> => {
		const users = await ctx.db.query("users").collect();
		return users.map((user) => ({
			_id: user._id,
			name: user.name ?? null,
			email: user.email ?? null,
			image: user.image ?? null,
		}));
	},
});
