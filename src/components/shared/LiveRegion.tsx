"use client";

import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";

/**
 * Polite live-region for status announcements (mutation errors, save
 * confirmations). Pattern 11 of docs/ux-patterns.md — the project explicitly
 * chose live-region + inline banners over toasts for the 60+ audience, so this
 * is the shared mechanism.
 *
 * Usage: `const { announce } = useLiveRegion(); announce("Vistað.");`
 * The message clears after 5 s so repeat announcements with the same text
 * still get re-announced.
 */
const LiveRegionContext = createContext<{
	announce: (message: string) => void;
} | null>(null);

export function LiveRegionProvider({ children }: { children: ReactNode }) {
	const [message, setMessage] = useState("");

	const announce = useCallback((next: string) => {
		// Force a re-announce even if the text is unchanged: clear first,
		// then set on next frame.
		setMessage("");
		requestAnimationFrame(() => setMessage(next));
	}, []);

	useEffect(() => {
		if (!message) return;
		const t = setTimeout(() => setMessage(""), 5000);
		return () => clearTimeout(t);
	}, [message]);

	return (
		<LiveRegionContext.Provider value={{ announce }}>
			{children}
			<div
				role="status"
				aria-live="polite"
				aria-atomic="true"
				className="sr-only"
			>
				{message}
			</div>
		</LiveRegionContext.Provider>
	);
}

export function useLiveRegion() {
	const ctx = useContext(LiveRegionContext);
	// Graceful fallback: components outside the provider get a no-op, so
	// storybook / unit contexts work without setup.
	return (
		ctx ?? {
			announce: () => {
				/* no-op */
			},
		}
	);
}
