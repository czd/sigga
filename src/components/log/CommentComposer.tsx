"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type CommentComposerProps = {
	/** Submit handler. Rejecting keeps the text so the user can retry. */
	onSubmit: (content: string) => Promise<void>;
	/** Prefilled text when editing an existing comment. */
	initialValue?: string;
	/** Shown (with a cancel button) when in edit mode. */
	editing?: boolean;
	onCancel?: () => void;
};

/**
 * The pinned composer at the bottom of the comment thread. Reused for both
 * new comments and editing one's own (Pattern 4 — data entry; Pattern 13 —
 * inline error, never a silent catch).
 */
export function CommentComposer({
	onSubmit,
	initialValue = "",
	editing = false,
	onCancel,
}: CommentComposerProps) {
	const t = useTranslations("discussion");
	const tCommon = useTranslations("common");
	const [value, setValue] = useState(initialValue);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		setValue(initialValue);
		setError(null);
	}, [initialValue]);

	const trimmed = value.trim();

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		if (trimmed.length === 0 || pending) return;
		setPending(true);
		setError(null);
		try {
			await onSubmit(trimmed);
			setValue("");
		} catch (err) {
			console.error(err);
			setError(t("errors.generic"));
		} finally {
			setPending(false);
		}
	}

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-2">
			<Textarea
				value={value}
				onChange={(e) => setValue(e.target.value)}
				placeholder={t("placeholder")}
				aria-label={t("write")}
				rows={2}
				className="min-h-12 resize-none text-base"
			/>
			{error ? (
				<p role="alert" className="text-base text-destructive">
					{error}
				</p>
			) : null}
			<div className="flex gap-2">
				{editing ? (
					<Button
						type="button"
						variant="outline"
						size="touch"
						className="flex-1"
						onClick={onCancel}
						disabled={pending}
					>
						{tCommon("cancel")}
					</Button>
				) : null}
				<Button
					type="submit"
					size="touch"
					className={editing ? "flex-1" : "w-full"}
					disabled={pending || trimmed.length === 0}
				>
					{pending ? tCommon("saving") : editing ? tCommon("save") : t("send")}
				</Button>
			</div>
		</form>
	);
}
