import { CalendarPlus, PenLine } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";

export function QuickActions() {
	const t = useTranslations("dashboard.quickActions");

	return (
		<section aria-labelledby="quick-actions-heading">
			<h2 id="quick-actions-heading" className="sr-only">
				{t("title")}
			</h2>
			<div className="grid grid-cols-2 gap-3">
				<Card className="ring-0 border border-border p-0 transition-colors hover:bg-muted active:bg-muted">
					<Link
						href="/timar"
						className="flex flex-col items-center justify-center gap-2 min-h-20 p-4 text-center font-semibold text-base"
					>
						<CalendarPlus size={28} aria-hidden className="text-primary" />
						<span>{t("newAppointment")}</span>
					</Link>
				</Card>
				<Card className="ring-0 border border-border p-0 transition-colors hover:bg-muted active:bg-muted">
					<Link
						href="/dagbok"
						className="flex flex-col items-center justify-center gap-2 min-h-20 p-4 text-center font-semibold text-base"
					>
						<PenLine size={28} aria-hidden className="text-primary" />
						<span>{t("writeLog")}</span>
					</Link>
				</Card>
			</div>
		</section>
	);
}
