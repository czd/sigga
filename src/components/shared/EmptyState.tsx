import type { ReactNode } from "react";

type EmptyStateProps = {
	icon?: ReactNode;
	title: string;
	description?: string;
	action?: ReactNode;
};

export function EmptyState({
	icon,
	title,
	description,
	action,
}: EmptyStateProps) {
	return (
		<div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-paper ring-1 ring-foreground/10 px-4 py-10 text-center">
			{icon ? (
				<div className="text-muted-foreground" aria-hidden>
					{icon}
				</div>
			) : null}
			<p className="text-lg font-medium text-foreground">{title}</p>
			{description ? (
				<p className="text-base text-muted-foreground">{description}</p>
			) : null}
			{action ? <div className="mt-2">{action}</div> : null}
		</div>
	);
}
