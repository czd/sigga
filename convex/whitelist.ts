export function isEmailAllowed(email: string | undefined | null): boolean {
	if (!email) return false;
	const raw = process.env.ALLOWED_EMAILS ?? "";
	const allowed = raw
		.split(",")
		.map((e) => e.trim().toLowerCase())
		.filter(Boolean);
	return allowed.includes(email.toLowerCase());
}

export const NOT_ALLOWED_MESSAGE =
	"Þetta netfang hefur ekki aðgang. Hafðu samband við Nic.";
