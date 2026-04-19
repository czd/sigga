type LogoProps = {
	size?: number;
	className?: string;
	title?: string;
};

export function Logo({ size = 32, className, title }: LogoProps) {
	const titled = typeof title === "string";
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 512 512"
			width={size}
			height={size}
			className={className}
			role={titled ? "img" : undefined}
			aria-hidden={titled ? undefined : true}
			aria-label={titled ? title : undefined}
		>
			<rect width="512" height="512" rx="112" fill="#6b7f5c" />
			<text
				x="256"
				y="256"
				textAnchor="middle"
				dominantBaseline="central"
				fontFamily="var(--font-serif-family), 'Source Serif 4', 'Source Serif Pro', Georgia, 'Times New Roman', serif"
				fontSize="340"
				fontWeight={400}
				fill="#faf7f0"
			>
				S
			</text>
			<rect
				x="211"
				y="420"
				width="90"
				height="5"
				rx="2.5"
				fill="#faf7f0"
				fillOpacity="0.55"
			/>
		</svg>
	);
}
