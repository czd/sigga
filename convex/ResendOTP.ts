import type { EmailConfig } from "@auth/core/providers";
import { ConvexError } from "convex/values";
import { isEmailAllowed, NOT_ALLOWED_MESSAGE } from "./whitelist";

const CODE_LENGTH = 6;
const CODE_TTL_SECONDS = 60 * 20;

function generateNumericCode(length: number): string {
	const bytes = new Uint8Array(length);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, (b) => (b % 10).toString()).join("");
}

function buildEmail(code: string) {
	const subject = "Innskráningarkóði í Sigga";
	const text = [
		"Halló,",
		"",
		"Þetta er innskráningarkóðinn þinn í Sigga:",
		"",
		`    ${code}`,
		"",
		"Kóðinn gildir í 20 mínútur. Sláðu hann inn í Sigga til að halda áfram.",
		"",
		"Ef þú baðst ekki um þennan kóða getur þú hunsað þetta skeyti.",
		"",
		"– Sigga",
	].join("\n");
	return { subject, text };
}

export const ResendOTP: EmailConfig = {
	id: "resend-otp",
	type: "email",
	name: "Email",
	maxAge: CODE_TTL_SECONDS,
	from: process.env.AUTH_EMAIL_FROM ?? "Sigga <onboarding@resend.dev>",
	apiKey: process.env.AUTH_RESEND_KEY,
	async generateVerificationToken() {
		return generateNumericCode(CODE_LENGTH);
	},
	async sendVerificationRequest({ identifier: email, token, provider }) {
		if (!isEmailAllowed(email)) {
			throw new ConvexError(NOT_ALLOWED_MESSAGE);
		}
		const apiKey = provider.apiKey ?? process.env.AUTH_RESEND_KEY;
		if (!apiKey) {
			throw new ConvexError(
				"AUTH_RESEND_KEY er ekki stillt. Hafðu samband við Nic.",
			);
		}
		const { subject, text } = buildEmail(token);
		const response = await fetch("https://api.resend.com/emails", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				from: provider.from,
				to: [email],
				subject,
				text,
			}),
		});
		if (!response.ok) {
			const detail = await response.text().catch(() => "");
			console.error("Resend send failed", response.status, detail);
			throw new ConvexError(
				"Ekki tókst að senda kóða. Reyndu aftur eftir augnablik.",
			);
		}
	},
	options: {},
};
