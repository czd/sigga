"use client";

import { useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

const NO_DRIVER = "__none__";

type DriverPickerProps = {
	id?: string;
	value: Id<"users"> | null;
	onChange: (value: Id<"users"> | null) => void;
	disabled?: boolean;
};

export function DriverPicker({
	id,
	value,
	onChange,
	disabled,
}: DriverPickerProps) {
	const t = useTranslations("timar.fields");
	const users = useQuery(api.users.list);

	const stringValue = value ?? NO_DRIVER;

	return (
		<Select
			value={stringValue}
			onValueChange={(next) => {
				onChange(next === NO_DRIVER ? null : (next as Id<"users">));
			}}
			disabled={disabled}
		>
			<SelectTrigger id={id} className="h-12 text-base">
				<SelectValue placeholder={t("noDriver")} />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value={NO_DRIVER}>{t("noDriver")}</SelectItem>
				{users?.map((user) => (
					<SelectItem key={user._id} value={user._id}>
						{user.name ?? user.email ?? "—"}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
