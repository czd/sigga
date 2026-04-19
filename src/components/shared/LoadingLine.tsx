import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type LoadingLineProps = {
	className?: string;
	label?: string;
};

export function LoadingLine({ className, label }: LoadingLineProps) {
	const tCommon = useTranslations("common");
	return (
		<p
			role="status"
			className={cn(
				"font-serif italic text-ink-soft text-center py-6 motion-safe:animate-[loading-breath_1.8s_ease-in-out_infinite]",
				className,
			)}
		>
			{label ?? tCommon("loading")}
		</p>
	);
}
