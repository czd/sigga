import { CalendarPlus, PenLine } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function QuickActions() {
	const t = useTranslations("dashboard.quickActions");

	return (
		<section
			aria-label={t("newAppointment")}
			className="grid grid-cols-2 gap-3"
		>
			<Link
				href="/timar"
				className="flex flex-col items-center justify-center gap-2 min-h-20 rounded-2xl border border-border bg-card p-4 text-center font-semibold text-base hover:bg-muted active:bg-muted"
			>
				<CalendarPlus size={28} aria-hidden className="text-accent" />
				<span>{t("newAppointment")}</span>
			</Link>
			<Link
				href="/dagbok"
				className="flex flex-col items-center justify-center gap-2 min-h-20 rounded-2xl border border-border bg-card p-4 text-center font-semibold text-base hover:bg-muted active:bg-muted"
			>
				<PenLine size={28} aria-hidden className="text-accent" />
				<span>{t("writeLog")}</span>
			</Link>
		</section>
	);
}
