import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const FONT_URL =
	"https://raw.githubusercontent.com/adobe-fonts/source-serif/release/OTF/SourceSerif4-Regular.otf";

async function loadFont(): Promise<ArrayBuffer | null> {
	try {
		const res = await fetch(FONT_URL);
		if (!res.ok) return null;
		return await res.arrayBuffer();
	} catch {
		return null;
	}
}

export default async function AppleIcon() {
	const fontData = await loadFont();
	return new ImageResponse(
		<div
			style={{
				width: "100%",
				height: "100%",
				background: "#6b7f5c",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				color: "#faf7f0",
				fontSize: 130,
				fontFamily: fontData ? "Source Serif 4" : "serif",
				fontWeight: 400,
				letterSpacing: "-2px",
			}}
		>
			S
		</div>,
		{
			...size,
			...(fontData
				? {
						fonts: [
							{
								name: "Source Serif 4",
								data: fontData,
								style: "normal",
								weight: 400,
							},
						],
					}
				: {}),
		},
	);
}
