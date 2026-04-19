"use client";

import { useMutation, useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { api } from "@/../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function LogComposer() {
	const t = useTranslations("dagbok.composer");
	const tCommon = useTranslations("common");
	const me = useQuery(api.users.me);
	const addEntry = useMutation(api.logEntries.add);
	const [content, setContent] = useState("");
	const [pending, setPending] = useState(false);
	const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);

	const storageKey = me?._id ? `sigga.logDraft.${me._id}` : null;

	// Load draft on mount
	useEffect(() => {
		if (!storageKey || typeof window === "undefined") return;
		const saved = window.localStorage.getItem(storageKey);
		if (saved) setContent(saved);
	}, [storageKey]);

	// Save draft on content change (debounced minimally via effect)
	useEffect(() => {
		if (!storageKey || typeof window === "undefined") return;
		if (content.length === 0) {
			window.localStorage.removeItem(storageKey);
			setDraftSavedAt(null);
			return;
		}
		const timer = setTimeout(() => {
			window.localStorage.setItem(storageKey, content);
			setDraftSavedAt(Date.now());
		}, 500);
		return () => clearTimeout(timer);
	}, [content, storageKey]);

	async function submit() {
		const trimmed = content.trim();
		if (trimmed.length === 0 || pending) return;
		setPending(true);
		try {
			await addEntry({ content: trimmed });
			setContent("");
			if (storageKey && typeof window !== "undefined") {
				window.localStorage.removeItem(storageKey);
			}
			setDraftSavedAt(null);
		} finally {
			setPending(false);
		}
	}

	function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
		if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
			e.preventDefault();
			void submit();
		}
	}

	return (
		<div className="flex flex-col gap-3">
			<Textarea
				value={content}
				onChange={(e) => setContent(e.target.value)}
				onKeyDown={handleKeyDown}
				placeholder={t("placeholder")}
				rows={5}
				className="resize-none"
			/>
			<div className="flex items-center justify-between gap-3">
				<span className="text-xs text-ink-soft">
					{draftSavedAt ? t("draftSaved") : ""}
					{draftSavedAt ? " · " : ""}
					<span>{t("submitHint")}</span>
				</span>
				<Button
					size="touch"
					onClick={submit}
					disabled={content.trim().length === 0 || pending}
				>
					{pending ? tCommon("saving") : t("submit")}
				</Button>
			</div>
		</div>
	);
}
