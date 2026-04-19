"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		Sentry.captureException(error);
	}, [error]);

	return (
		<html lang="is">
			<body
				style={{
					minHeight: "100vh",
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					padding: "2rem",
					fontFamily: "system-ui, -apple-system, sans-serif",
					background: "#f5f1e8",
					color: "#2b2a28",
					textAlign: "center",
				}}
			>
				<h1
					style={{
						fontSize: "1.75rem",
						fontWeight: 400,
						marginBottom: "0.75rem",
					}}
				>
					Eitthvað fór úrskeiðis
				</h1>
				<p
					style={{
						fontSize: "1.125rem",
						marginBottom: "1.5rem",
						maxWidth: "28rem",
					}}
				>
					Við höfum skráð villuna. Reyndu aftur eða hlaðið síðuna upp á nýtt.
				</p>
				<button
					type="button"
					onClick={reset}
					style={{
						minHeight: "56px",
						padding: "0 2rem",
						fontSize: "1.125rem",
						borderRadius: "999px",
						border: "none",
						background: "#6b7f5e",
						color: "white",
						cursor: "pointer",
					}}
				>
					Reyna aftur
				</button>
			</body>
		</html>
	);
}
