import Image from "next/image";

type UserAvatarProps = {
	name?: string | null;
	email?: string | null;
	imageUrl?: string | null;
	size?: number;
};

function initialsFrom(name?: string | null, email?: string | null): string {
	const source = name?.trim() || email?.trim() || "";
	if (!source) return "?";
	const parts = source.split(/\s+/).filter(Boolean);
	if (parts.length >= 2) {
		return (parts[0][0] + parts[1][0]).toUpperCase();
	}
	return source[0].toUpperCase();
}

export function UserAvatar({
	name,
	email,
	imageUrl,
	size = 40,
}: UserAvatarProps) {
	const initials = initialsFrom(name, email);
	if (imageUrl) {
		return (
			<Image
				src={imageUrl}
				alt={name ?? email ?? ""}
				width={size}
				height={size}
				className="rounded-full object-cover"
			/>
		);
	}
	return (
		<div
			aria-hidden
			className="rounded-full bg-accent text-accent-foreground flex items-center justify-center font-semibold"
			style={{ width: size, height: size, fontSize: size * 0.4 }}
		>
			{initials}
		</div>
	);
}
