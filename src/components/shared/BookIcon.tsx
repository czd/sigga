type IconKind =
	| "today"
	| "care"
	| "people"
	| "docs"
	| "pill"
	| "book"
	| "pulse"
	| "plus"
	| "chevron"
	| "back"
	| "sparkle"
	| "time";

type BookIconProps = {
	kind: IconKind;
	size?: number;
	strokeWidth?: number;
	filled?: boolean;
	className?: string;
};

export function BookIcon({
	kind,
	size = 24,
	strokeWidth = 1.6,
	filled = false,
	className,
}: BookIconProps) {
	const svgProps = {
		width: size,
		height: size,
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: "currentColor",
		strokeLinecap: "round" as const,
		strokeLinejoin: "round" as const,
		className,
	};

	switch (kind) {
		case "today":
			return (
				<svg {...svgProps} aria-hidden="true" strokeWidth={strokeWidth}>
					<circle
						cx="12"
						cy="12"
						r="4"
						fill={filled ? "currentColor" : "none"}
						stroke={filled ? "none" : "currentColor"}
					/>
					<path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
				</svg>
			);
		case "care":
			return (
				<svg {...svgProps} aria-hidden="true" strokeWidth={strokeWidth}>
					<path
						d="M12 21s-7-4.5-7-10a4.5 4.5 0 0 1 7-3.7A4.5 4.5 0 0 1 19 11c0 5.5-7 10-7 10z"
						fill={filled ? "currentColor" : "none"}
					/>
				</svg>
			);
		case "people":
			return (
				<svg {...svgProps} aria-hidden="true" strokeWidth={strokeWidth}>
					<circle cx="9" cy="9" r="3.2" />
					<path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
					<circle cx="17" cy="8" r="2.5" />
					<path d="M21 18c0-2.5-2-4.5-4.5-4.5" />
				</svg>
			);
		case "docs":
			return (
				<svg {...svgProps} aria-hidden="true" strokeWidth={strokeWidth}>
					<path d="M7 3h8l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
					<path d="M14 3v4h4" />
					<path d="M9 12h7M9 16h5" />
				</svg>
			);
		case "pill":
			return (
				<svg {...svgProps} aria-hidden="true" strokeWidth={strokeWidth}>
					<rect x="3" y="9" width="18" height="6" rx="3" />
					<path d="M12 9v6" />
				</svg>
			);
		case "book":
			return (
				<svg {...svgProps} aria-hidden="true" strokeWidth={strokeWidth}>
					<path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4z" />
					<path d="M5 17a3 3 0 0 1 3-3h10" />
				</svg>
			);
		case "pulse":
			return (
				<svg {...svgProps} aria-hidden="true" strokeWidth={strokeWidth}>
					<path d="M3 12h4l2-6 4 12 2-6h6" />
				</svg>
			);
		case "plus":
			return (
				<svg {...svgProps} aria-hidden="true" strokeWidth={2}>
					<path d="M12 5v14M5 12h14" />
				</svg>
			);
		case "chevron":
			return (
				<svg {...svgProps} aria-hidden="true" strokeWidth={strokeWidth}>
					<path d="M9 6l6 6-6 6" />
				</svg>
			);
		case "back":
			return (
				<svg {...svgProps} aria-hidden="true" strokeWidth={strokeWidth}>
					<path d="M15 6l-6 6 6 6" />
				</svg>
			);
		case "sparkle":
			return (
				<svg {...svgProps} aria-hidden="true" strokeWidth={strokeWidth}>
					<path d="M12 4v3M12 17v3M4 12h3M17 12h3M6.5 6.5l2 2M15.5 15.5l2 2M6.5 17.5l2-2M15.5 8.5l2-2" />
				</svg>
			);
		case "time":
			return (
				<svg {...svgProps} aria-hidden="true" strokeWidth={strokeWidth}>
					<circle cx="12" cy="12" r="9" />
					<path d="M12 7v5l3 2" />
				</svg>
			);
	}
}
