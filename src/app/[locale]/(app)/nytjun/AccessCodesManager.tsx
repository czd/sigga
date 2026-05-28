"use client";

import { useMutation, useQuery } from "convex/react";
import { Check, Copy } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { LoadingLine } from "@/components/shared/LoadingLine";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { formatAbsoluteWithTime } from "@/lib/formatDate";

type CodeRow = {
	_id: Id<"accessCodes">;
	code: string;
	name: string;
	email: string | null;
	isActive: boolean;
	lastUsedAt: number | null;
};

export function AccessCodesManager() {
	const t = useTranslations("admin.codes");
	const locale = useLocale();
	const codes = useQuery(api.accessCodes.list);
	const add = useMutation(api.accessCodes.add);
	const rotate = useMutation(api.accessCodes.rotate);
	const setActive = useMutation(api.accessCodes.setActive);
	const remove = useMutation(api.accessCodes.remove);

	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [adding, setAdding] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [copiedId, setCopiedId] = useState<Id<"accessCodes"> | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<CodeRow | null>(null);

	async function handleAdd(event: React.FormEvent) {
		event.preventDefault();
		const trimmed = name.trim();
		if (!trimmed) {
			setError(t("nameRequired"));
			return;
		}
		setError(null);
		setAdding(true);
		try {
			await add({ name: trimmed, email: email.trim() || undefined });
			setName("");
			setEmail("");
		} catch {
			setError(t("error"));
		} finally {
			setAdding(false);
		}
	}

	async function handleCopy(row: CodeRow) {
		try {
			await navigator.clipboard.writeText(row.code);
			setCopiedId(row._id);
			setTimeout(() => setCopiedId(null), 1500);
		} catch {
			// Clipboard unavailable — the code is shown in plain text anyway.
		}
	}

	return (
		<section className="flex flex-col gap-3">
			<div className="flex flex-col gap-1">
				<h2 className="font-serif text-xl font-normal">{t("heading")}</h2>
				<p className="text-base text-ink-soft">{t("subtitle")}</p>
			</div>

			<Card size="sm">
				<CardContent>
					<form onSubmit={handleAdd} className="flex flex-col gap-3">
						<Input
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder={t("namePlaceholder")}
							className="h-12 text-base"
						/>
						<Input
							type="email"
							inputMode="email"
							autoCapitalize="none"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder={t("emailPlaceholder")}
							className="h-12 text-base"
						/>
						{error ? (
							<p className="text-base text-destructive" role="alert">
								{error}
							</p>
						) : null}
						<Button type="submit" size="touch" disabled={adding}>
							{adding ? t("adding") : t("addButton")}
						</Button>
					</form>
				</CardContent>
			</Card>

			{codes === undefined ? (
				<LoadingLine />
			) : codes.length === 0 ? (
				<p className="text-ink-soft">{t("empty")}</p>
			) : (
				<ul className="flex flex-col gap-2">
					{codes.map((row) => (
						<li key={row._id}>
							<Card size="sm">
								<CardContent className="flex flex-col gap-3">
									<div className="flex items-start justify-between gap-3">
										<div className="flex flex-col gap-0.5">
											<span className="text-base font-medium">{row.name}</span>
											{row.email ? (
												<span className="text-xs text-ink-soft">
													{row.email}
												</span>
											) : null}
										</div>
										<span
											className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
												row.isActive
													? "bg-sage/20 text-ink"
													: "bg-muted text-ink-soft"
											}`}
										>
											{row.isActive ? t("active") : t("paused")}
										</span>
									</div>

									<div className="flex items-center gap-2">
										<code className="flex-1 rounded-lg bg-muted/60 px-3 py-2 font-mono text-lg tracking-wide">
											{row.code}
										</code>
										<Button
											type="button"
											variant="outline"
											size="icon"
											onClick={() => handleCopy(row)}
											aria-label={t("copy")}
										>
											{copiedId === row._id ? <Check /> : <Copy />}
										</Button>
									</div>

									<p className="text-xs text-ink-soft">
										{t("lastUsed")}:{" "}
										{row.lastUsedAt === null
											? t("neverUsed")
											: formatAbsoluteWithTime(row.lastUsedAt, locale)}
									</p>

									<div className="flex flex-wrap gap-2">
										<Button
											type="button"
											variant="outline"
											size="default"
											onClick={() => rotate({ id: row._id })}
										>
											{t("rotate")}
										</Button>
										<Button
											type="button"
											variant="outline"
											size="default"
											onClick={() =>
												setActive({ id: row._id, isActive: !row.isActive })
											}
										>
											{row.isActive ? t("pause") : t("activate")}
										</Button>
										<Button
											type="button"
											variant="destructive"
											size="default"
											onClick={() => setDeleteTarget(row)}
										>
											{t("remove")}
										</Button>
									</div>
								</CardContent>
							</Card>
						</li>
					))}
				</ul>
			)}

			<ConfirmDialog
				open={deleteTarget !== null}
				onOpenChange={(open) => {
					if (!open) setDeleteTarget(null);
				}}
				title={t("removeConfirm.title", { name: deleteTarget?.name ?? "" })}
				body={t("removeConfirm.body")}
				confirmLabel={t("remove")}
				confirmVariant="destructive"
				onConfirm={async () => {
					if (deleteTarget) await remove({ id: deleteTarget._id });
				}}
			/>
		</section>
	);
}
