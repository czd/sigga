"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

export type ConfirmVariant = "default" | "destructive";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	body: string;
	confirmLabel: string;
	confirmVariant?: ConfirmVariant;
	cancelLabel?: string;
	/**
	 * Called when the user taps confirm. If it throws, the dialog stays open
	 * (for retry) and `pending` resets. Callers are responsible for surfacing
	 * the error via Pattern 13 (inline banner / live-region) — the dialog
	 * itself never auto-surfaces errors to avoid double-rendering.
	 */
	onConfirm: () => void | Promise<void>;
};

/**
 * The canonical confirmation gate for destroy (Pattern 2) and commitment
 * (Pattern 19) actions. Thumb-safe layout: flex-col footer with primary
 * action first, cancel below — cancel is closer to the thumb so passing
 * taps resolve to dismiss.
 */
export function ConfirmDialog({
	open,
	onOpenChange,
	title,
	body,
	confirmLabel,
	confirmVariant = "default",
	cancelLabel,
	onConfirm,
}: Props) {
	const tCommon = useTranslations("common");
	const [pending, setPending] = useState(false);

	async function handleConfirm() {
		if (pending) return;
		setPending(true);
		try {
			await onConfirm();
			onOpenChange(false);
		} finally {
			setPending(false);
		}
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (pending) return;
				onOpenChange(next);
			}}
		>
			<DialogContent showCloseButton={false} className="max-w-sm">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{body}</DialogDescription>
				</DialogHeader>
				<DialogFooter className="flex-col gap-2 sm:flex-col">
					<Button
						variant={confirmVariant}
						size="touch"
						onClick={handleConfirm}
						disabled={pending}
						className="w-full"
					>
						{pending ? tCommon("saving") : confirmLabel}
					</Button>
					<Button
						variant="outline"
						size="touch"
						onClick={() => onOpenChange(false)}
						disabled={pending}
						className="w-full"
					>
						{cancelLabel ?? tCommon("cancel")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
