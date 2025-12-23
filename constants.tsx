import { GradientSettings, VideoConfig } from "./types";

export const PRESET_GRADIENTS: GradientSettings[] = [
	{ type: "linear", colors: ["#833ab4", "#fd1d1d", "#fcb045"], angle: 45 },
	{ type: "linear", colors: ["#4f46e5", "#7c3aed"], angle: 45 },
	{ type: "linear", colors: ["#ec4899", "#f43f5e"], angle: 135 },
	{ type: "linear", colors: ["#06b6d4", "#3b82f6"], angle: 225 },
	{ type: "linear", colors: ["#10b981", "#3b82f6"], angle: 0 },
	{ type: "linear", colors: ["#f59e0b", "#ef4444"], angle: 90 },
	{ type: "linear", colors: ["#000000", "#434343"], angle: 45 },
	{ type: "linear", colors: ["#00d2ff", "#3a7bd5"], angle: 45 },
];

export const DEFAULT_CONFIG: VideoConfig = {
	borderRadius: 24,
	padding: 60,
	shadow: 20,
	scale: 1,
	crop: {
		enabled: false,
		cropMode: false,
		region: { x: 0, y: 0, width: 100, height: 100 },
	},
};

export const DEFAULT_GRADIENT: GradientSettings = PRESET_GRADIENTS[0];
