import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type UserAvatarProps = {
	name?: string | null;
	email?: string | null;
	imageUrl?: string | null;
	className?: string;
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
	className,
}: UserAvatarProps) {
	const initials = initialsFrom(name, email);
	const alt = name ?? email ?? "";
	return (
		<Avatar className={cn("size-10", className)}>
			{imageUrl ? <AvatarImage src={imageUrl} alt={alt} /> : null}
			<AvatarFallback className="bg-primary/10 text-primary font-semibold">
				{initials}
			</AvatarFallback>
		</Avatar>
	);
}
