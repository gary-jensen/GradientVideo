import React, { useRef, useState, useEffect, useCallback } from "react";
import { EditorState } from "../types";
import CropOverlay from "./CropOverlay";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

// Video controls component
const VideoControls: React.FC<{
	videoRef: React.RefObject<HTMLVideoElement>;
}> = ({ videoRef }) => {
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [isPlaying, setIsPlaying] = useState(false);

	useEffect(() => {
		const video = videoRef.current;
		if (!video) return;

		const updateTime = () => setCurrentTime(video.currentTime);
		const updateDuration = () => {
			// Check if duration is valid (not Infinity, not NaN, and greater than 0)
			if (
				video.duration &&
				!isNaN(video.duration) &&
				isFinite(video.duration) &&
				video.duration > 0
			) {
				setDuration(video.duration);
			}
		};
		const updatePlaying = () => setIsPlaying(!video.paused);

		video.addEventListener("timeupdate", updateTime);
		video.addEventListener("loadedmetadata", updateDuration);
		video.addEventListener("durationchange", updateDuration);
		video.addEventListener("loadeddata", updateDuration);
		video.addEventListener("play", updatePlaying);
		video.addEventListener("pause", updatePlaying);

		// Try to get duration immediately if available
		updateDuration();

		return () => {
			video.removeEventListener("timeupdate", updateTime);
			video.removeEventListener("loadedmetadata", updateDuration);
			video.removeEventListener("durationchange", updateDuration);
			video.removeEventListener("loadeddata", updateDuration);
			video.removeEventListener("play", updatePlaying);
			video.removeEventListener("pause", updatePlaying);
		};
	}, [videoRef]);

	if (!videoRef.current) return null;

	return (
		<div
			className="absolute bottom-0 left-0 right-0 pointer-events-auto"
			style={{
				padding: "8px",
			}}
		>
			<div className="flex items-center gap-2 bg-black/50 rounded-lg p-2">
				<button
					onClick={() => {
						if (videoRef.current?.paused) {
							videoRef.current.play();
						} else {
							videoRef.current?.pause();
						}
					}}
					className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-white text-sm"
				>
					{isPlaying ? "⏸" : "▶"}
				</button>
				<input
					type="range"
					min="0"
					max={duration || 100}
					value={currentTime}
					onChange={(e) => {
						if (videoRef.current) {
							videoRef.current.currentTime = parseFloat(
								e.target.value
							);
						}
					}}
					className="flex-1"
				/>
				<span className="text-white text-xs">
					{duration > 0
						? `${Math.floor(currentTime)}s / ${Math.floor(
								duration
						  )}s`
						: `${Math.floor(currentTime)}s`}
				</span>
			</div>
		</div>
	);
};

interface VideoPreviewProps {
	state: EditorState;
	onCropChange: (crop: EditorState["config"]["crop"]["region"]) => void;
	onExportReady?: (
		exportFn: (
			quality: "720p" | "1080p" | "1440p",
			format: "mp4" | "webm",
			onStatusUpdate?: (status: string) => void,
			cancelRef?: React.MutableRefObject<boolean>
		) => Promise<void>
	) => void;
}

const VideoPreview: React.FC<VideoPreviewProps> = ({
	state,
	onCropChange,
	onExportReady,
}) => {
	const { videoUrl, gradient, config } = state;
	const containerRef = useRef<HTMLDivElement>(null);
	const videoRef = useRef<HTMLVideoElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [videoNaturalSize, setVideoNaturalSize] = useState({
		width: 0,
		height: 0,
	});
	const [videoDisplaySize, setVideoDisplaySize] = useState({
		width: 0,
		height: 0,
	});
	const [canvasReady, setCanvasReady] = useState(false); // Track when canvas is resized
	const animationFrameRef = useRef<number>();
	const ffmpegRef = useRef<FFmpeg | null>(null);

	// Calculate display size based on max-height and min-width constraints
	useEffect(() => {
		if (videoNaturalSize.width === 0 || videoNaturalSize.height === 0)
			return;

		const maxHeightPx = window.innerHeight * 0.7;
		const minWidthPx = 400; // Minimum width to ensure usability
		const aspectRatio = videoNaturalSize.width / videoNaturalSize.height;
		const isPortrait = videoNaturalSize.height > videoNaturalSize.width;

		let displayHeight = videoNaturalSize.height;
		let displayWidth = videoNaturalSize.width;

		// Constrain by height first
		if (displayHeight > maxHeightPx) {
			displayHeight = maxHeightPx;
			displayWidth = displayHeight * aspectRatio;
		}

		// For portrait videos, ensure minimum width
		if (isPortrait && displayWidth < minWidthPx) {
			displayWidth = minWidthPx;
			displayHeight = displayWidth / aspectRatio;
			// Re-check height constraint after width adjustment
			if (displayHeight > maxHeightPx) {
				displayHeight = maxHeightPx;
				displayWidth = displayHeight * aspectRatio;
			}
		}

		// Apply scale
		displayWidth *= config.scale;
		displayHeight *= config.scale;

		setVideoDisplaySize({ width: displayWidth, height: displayHeight });
	}, [videoNaturalSize, config.scale]);

	// Track video natural dimensions
	useEffect(() => {
		const video = videoRef.current;
		if (!video) return;

		const updateDimensions = () => {
			const naturalWidth = video.videoWidth || 0;
			const naturalHeight = video.videoHeight || 0;

			if (naturalWidth > 0 && naturalHeight > 0) {
				setVideoNaturalSize({
					width: naturalWidth,
					height: naturalHeight,
				});
			}
		};

		video.addEventListener("loadedmetadata", updateDimensions);
		video.addEventListener("loadeddata", updateDimensions);

		return () => {
			video.removeEventListener("loadedmetadata", updateDimensions);
			video.removeEventListener("loadeddata", updateDimensions);
		};
	}, [videoUrl]);

	// Draw video to canvas
	useEffect(() => {
		const video = videoRef.current;
		const canvas = canvasRef.current;
		if (!video || !canvas || videoDisplaySize.width === 0) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		// Enable high-quality image smoothing
		ctx.imageSmoothingEnabled = true;
		ctx.imageSmoothingQuality = "high";

		// Calculate canvas size immediately (before drawFrame) to ensure canvas is resized synchronously
		// When in crop mode, always show full video (ignore existing crop)
		const isInCropMode = config.crop.cropMode;
		const shouldApplyCrop = config.crop.enabled && !isInCropMode;

		let initialVideoWidth: number;
		let initialVideoHeight: number;
		let initialDisplayWidth: number;
		let initialDisplayHeight: number;

		if (shouldApplyCrop) {
			initialVideoWidth =
				(videoNaturalSize.width * config.crop.region.width) / 100;
			initialVideoHeight =
				(videoNaturalSize.height * config.crop.region.height) / 100;
			initialDisplayWidth =
				(videoDisplaySize.width * config.crop.region.width) / 100;
			initialDisplayHeight =
				(videoDisplaySize.height * config.crop.region.height) / 100;
		} else {
			initialVideoWidth = videoNaturalSize.width;
			initialVideoHeight = videoNaturalSize.height;
			initialDisplayWidth = videoDisplaySize.width;
			initialDisplayHeight = videoDisplaySize.height;
		}

		// Calculate shadow padding and canvas size immediately
		const initialScaleFactor = initialVideoWidth / initialDisplayWidth;
		const initialScaledPadding = config.padding * initialScaleFactor;
		const initialShadowPadding = initialScaledPadding;
		const initialCanvasWidth = initialVideoWidth + initialShadowPadding * 2;
		const initialCanvasHeight =
			initialVideoHeight + initialShadowPadding * 2;

		// Set canvas size immediately (synchronously) so crop overlay can read correct size
		canvas.width = initialCanvasWidth;
		canvas.height = initialCanvasHeight;

		// Mark canvas as ready after resize (use setTimeout to ensure it's after render)
		setTimeout(() => {
			setCanvasReady(true);
		}, 0);

		const drawFrame = () => {
			if (!video || !canvas || !ctx) return;

			// Calculate canvas size based on crop - use NATURAL resolution for quality
			// When in crop mode, always show full video (ignore existing crop)
			const isInCropMode = config.crop.cropMode;
			const shouldApplyCrop = config.crop.enabled && !isInCropMode;

			let videoWidth: number;
			let videoHeight: number;
			let displayWidth: number;
			let displayHeight: number;

			if (shouldApplyCrop) {
				// Use natural video dimensions for canvas internal resolution
				videoWidth =
					(videoNaturalSize.width * config.crop.region.width) / 100;
				videoHeight =
					(videoNaturalSize.height * config.crop.region.height) / 100;
				// Display size (for CSS)
				displayWidth =
					(videoDisplaySize.width * config.crop.region.width) / 100;
				displayHeight =
					(videoDisplaySize.height * config.crop.region.height) / 100;
			} else {
				// Use full natural video dimensions for canvas
				videoWidth = videoNaturalSize.width;
				videoHeight = videoNaturalSize.height;
				// Display size (for CSS)
				displayWidth = videoDisplaySize.width;
				displayHeight = videoDisplaySize.height;
			}

			// Source rectangle (what part of video to draw from natural size)
			let sourceXNatural = 0;
			let sourceYNatural = 0;
			let sourceWidthNatural = videoNaturalSize.width;
			let sourceHeightNatural = videoNaturalSize.height;

			if (shouldApplyCrop) {
				sourceXNatural =
					(videoNaturalSize.width * config.crop.region.x) / 100;
				sourceYNatural =
					(videoNaturalSize.height * config.crop.region.y) / 100;
				sourceWidthNatural =
					(videoNaturalSize.width * config.crop.region.width) / 100;
				sourceHeightNatural =
					(videoNaturalSize.height * config.crop.region.height) / 100;
			}

			// Scale shadow to natural resolution
			const scaleFactor = videoWidth / displayWidth;
			const radius = config.borderRadius * scaleFactor;

			// Shadow padding is fixed based on background padding (not shadow value)
			// This determines the space available for the shadow
			const scaledPadding = config.padding * scaleFactor;
			const shadowPadding = scaledPadding; // Use 80% of background padding for shadow space

			// Shadow blur and opacity scale with config.shadow value (0-20)
			// But are limited by the available shadow padding space
			const maxShadowBlur = shadowPadding * 0.9; // Max blur uses 90% of shadow padding space
			const shadowBlur = (config.shadow / 20) * maxShadowBlur; // Scale 0-20 to 0-maxBlur
			const shadowOffsetY = shadowBlur * 0.3; // Offset proportional to blur
			// Opacity increases with shadow value (0 = transparent, 20 = 0.7 opacity)
			const shadowOpacity = Math.min(0.7, (config.shadow / 20) * 0.7);

			// Canvas size = video size + fixed shadow padding (based on background padding)
			const canvasWidth = videoWidth + shadowPadding * 2;
			const canvasHeight = videoHeight + shadowPadding * 2;

			// Video position (centered in canvas with shadow padding)
			const videoX = shadowPadding;
			const videoY = shadowPadding;

			// Set canvas internal resolution (larger to accommodate shadow)
			canvas.width = canvasWidth;
			canvas.height = canvasHeight;

			// Clear canvas (transparent background so gradient shows through)
			ctx.clearRect(0, 0, canvasWidth, canvasHeight);

			// Create rounded rectangle path for video (at video position)
			const createRoundedRectPath = () => {
				ctx.beginPath();
				ctx.moveTo(videoX + radius, videoY);
				ctx.lineTo(videoX + videoWidth - radius, videoY);
				ctx.quadraticCurveTo(
					videoX + videoWidth,
					videoY,
					videoX + videoWidth,
					videoY + radius
				);
				ctx.lineTo(videoX + videoWidth, videoY + videoHeight - radius);
				ctx.quadraticCurveTo(
					videoX + videoWidth,
					videoY + videoHeight,
					videoX + videoWidth - radius,
					videoY + videoHeight
				);
				ctx.lineTo(videoX + radius, videoY + videoHeight);
				ctx.quadraticCurveTo(
					videoX,
					videoY + videoHeight,
					videoX,
					videoY + videoHeight - radius
				);
				ctx.lineTo(videoX, videoY + radius);
				ctx.quadraticCurveTo(videoX, videoY, videoX + radius, videoY);
				ctx.closePath();
			};

			// Draw shadow first (as a rounded rectangle at video position)
			// Shadow blur and opacity scale with config.shadow value
			if (config.shadow > 0) {
				ctx.save();
				ctx.shadowBlur = shadowBlur;
				ctx.shadowColor = `rgba(0, 0, 0, ${shadowOpacity})`;
				ctx.shadowOffsetX = 0;
				ctx.shadowOffsetY = shadowOffsetY;
				createRoundedRectPath();
				// Fill with black - this will be covered by the video but creates the shadow
				ctx.fillStyle = "#000000";
				ctx.fill();
				ctx.restore();
			}

			// Now draw the video with clipping for rounded corners
			ctx.save();
			if (config.borderRadius > 0) {
				createRoundedRectPath();
				ctx.clip();
			}

			// Draw video at 1:1 pixel mapping (full natural resolution, centered in canvas)
			ctx.drawImage(
				video,
				sourceXNatural,
				sourceYNatural,
				sourceWidthNatural,
				sourceHeightNatural,
				videoX,
				videoY,
				videoWidth,
				videoHeight
			);

			// Restore context
			ctx.restore();

			animationFrameRef.current = requestAnimationFrame(drawFrame);
		};

		// Start drawing
		if (video.readyState >= 2) {
			drawFrame();
		} else {
			video.addEventListener("loadeddata", drawFrame);
		}

		return () => {
			if (animationFrameRef.current) {
				cancelAnimationFrame(animationFrameRef.current);
			}
			video.removeEventListener("loadeddata", drawFrame);
			setCanvasReady(false); // Reset when effect cleanup runs
		};
	}, [
		videoUrl,
		videoDisplaySize,
		videoNaturalSize,
		config.crop.enabled,
		config.crop.cropMode,
		config.crop.region,
		config.scale,
		config.borderRadius,
		config.shadow,
		config.padding,
	]);

	// Export function - quality: '720p', '1080p', or '1440p', format: 'mp4' or 'webm'
	const exportVideo = useCallback(
		async (
			quality: "720p" | "1080p" | "1440p" = "1080p",
			format: "mp4" | "webm" = "webm",
			onStatusUpdate?: (status: string) => void,
			cancelRef?: React.MutableRefObject<boolean>
		) => {
			const updateStatus = (status: string) => {
				if (onStatusUpdate) onStatusUpdate(status);
			};

			const isCancelled = () => cancelRef?.current === true;
			updateStatus("Preparing export...");
			const video = videoRef.current;
			const canvas = canvasRef.current;

			if (!video || !canvas || videoNaturalSize.width === 0) {
				updateStatus("Export failed: Video not ready");
				throw new Error("Video or canvas not available for export");
			}

			// Create export canvas with padding and background
			const exportCanvas = document.createElement("canvas");
			const exportCtx = exportCanvas.getContext("2d");
			if (!exportCtx) {
				updateStatus("Export failed: Could not create canvas context");
				throw new Error("Failed to get canvas context");
			}

			// Enable high-quality image smoothing for export
			exportCtx.imageSmoothingEnabled = true;
			exportCtx.imageSmoothingQuality = "high";

			// Calculate export dimensions using natural video resolution for better quality
			// Scale proportionally to maintain aspect ratio
			let videoWidth: number;
			let videoHeight: number;
			let scaleFactor: number;
			let originalVideoWidth: number;
			let originalVideoHeight: number;

			if (config.crop.enabled) {
				// Use natural video dimensions for cropped region
				const croppedNaturalWidth =
					(videoNaturalSize.width * config.crop.region.width) / 100;
				const croppedNaturalHeight =
					(videoNaturalSize.height * config.crop.region.height) / 100;
				videoWidth = croppedNaturalWidth;
				videoHeight = croppedNaturalHeight;
				originalVideoWidth = croppedNaturalWidth;
				originalVideoHeight = croppedNaturalHeight;
				// Calculate scale factor from display to natural
				const displayWidth =
					(videoDisplaySize.width * config.crop.region.width) / 100;
				scaleFactor = videoWidth / displayWidth;
			} else {
				// Use full natural video dimensions
				videoWidth = videoNaturalSize.width;
				videoHeight = videoNaturalSize.height;
				originalVideoWidth = videoNaturalSize.width;
				originalVideoHeight = videoNaturalSize.height;
				// Calculate scale factor from display to natural
				scaleFactor = videoWidth / videoDisplaySize.width;
			}

			// Scale padding proportionally
			const scaledPadding = config.padding * scaleFactor;
			let totalWidth = videoWidth + scaledPadding * 2;
			let totalHeight = videoHeight + scaledPadding * 2;

			// Determine orientation based on original video dimensions (before padding and scaling)
			const isPortrait = originalVideoHeight > originalVideoWidth;

			// Limit based on quality setting - orientation-aware
			const qualityLimits: Record<
				"720p" | "1080p" | "1440p",
				{
					landscape: { width: number; height: number };
					portrait: { width: number; height: number };
				}
			> = {
				"720p": {
					landscape: { width: 1280, height: 720 },
					portrait: { width: 720, height: 1280 },
				},
				"1080p": {
					landscape: { width: 1920, height: 1080 },
					portrait: { width: 1080, height: 1920 },
				},
				"1440p": {
					landscape: { width: 2560, height: 1440 },
					portrait: { width: 1440, height: 2560 },
				},
			};
			const { width: maxWidth, height: maxHeight } = isPortrait
				? qualityLimits[quality].portrait
				: qualityLimits[quality].landscape;
			let canvasScale = 1;

			if (totalWidth > maxWidth || totalHeight > maxHeight) {
				const widthScale = maxWidth / totalWidth;
				const heightScale = maxHeight / totalHeight;
				canvasScale = Math.min(widthScale, heightScale);

				totalWidth = Math.round(totalWidth * canvasScale);
				totalHeight = Math.round(totalHeight * canvasScale);

				// Recalculate video dimensions and padding with the scale
				videoWidth = Math.round(videoWidth * canvasScale);
				videoHeight = Math.round(videoHeight * canvasScale);
				scaleFactor = scaleFactor * canvasScale;
			}

			exportCanvas.width = totalWidth;
			exportCanvas.height = totalHeight;

			// Create canvas gradient
			const createGradient = () => {
				if (gradient.colors.length === 1) {
					return gradient.colors[0];
				}

				let canvasGradient;
				if (gradient.type === "radial") {
					canvasGradient = exportCtx.createRadialGradient(
						totalWidth / 2,
						totalHeight / 2,
						0,
						totalWidth / 2,
						totalHeight / 2,
						Math.max(totalWidth, totalHeight) / 2
					);
				} else {
					// Linear gradient
					const angleRad = (gradient.angle * Math.PI) / 180;
					const x1 =
						totalWidth / 2 - (totalWidth / 2) * Math.cos(angleRad);
					const y1 =
						totalHeight / 2 -
						(totalHeight / 2) * Math.sin(angleRad);
					const x2 =
						totalWidth / 2 + (totalWidth / 2) * Math.cos(angleRad);
					const y2 =
						totalHeight / 2 +
						(totalHeight / 2) * Math.sin(angleRad);
					canvasGradient = exportCtx.createLinearGradient(
						x1,
						y1,
						x2,
						y2
					);
				}

				const step = 1 / (gradient.colors.length - 1);
				gradient.colors.forEach((color, i) => {
					canvasGradient.addColorStop(i * step, color);
				});

				return canvasGradient;
			};

			const canvasGradient = createGradient();

			// Draw video with scaled padding (recalculate after potential scaling)
			const finalScaledPadding = Math.round(config.padding * scaleFactor);
			const videoX = finalScaledPadding;
			const videoY = finalScaledPadding;

			// Draw frame function
			const drawFrame = () => {
				// Draw gradient background
				exportCtx.fillStyle = canvasGradient;
				exportCtx.fillRect(0, 0, totalWidth, totalHeight);

				// Draw video at full natural resolution
				if (config.crop.enabled) {
					const sourceXNatural =
						(videoNaturalSize.width * config.crop.region.x) / 100;
					const sourceYNatural =
						(videoNaturalSize.height * config.crop.region.y) / 100;
					const sourceWidthNatural =
						(videoNaturalSize.width * config.crop.region.width) /
						100;
					const sourceHeightNatural =
						(videoNaturalSize.height * config.crop.region.height) /
						100;

					if (config.borderRadius > 0) {
						exportCtx.save();
						// Scale border radius proportionally to natural resolution
						const radius = config.borderRadius * scaleFactor;
						exportCtx.beginPath();
						exportCtx.moveTo(videoX + radius, videoY);
						exportCtx.lineTo(videoX + videoWidth - radius, videoY);
						exportCtx.quadraticCurveTo(
							videoX + videoWidth,
							videoY,
							videoX + videoWidth,
							videoY + radius
						);
						exportCtx.lineTo(
							videoX + videoWidth,
							videoY + videoHeight - radius
						);
						exportCtx.quadraticCurveTo(
							videoX + videoWidth,
							videoY + videoHeight,
							videoX + videoWidth - radius,
							videoY + videoHeight
						);
						exportCtx.lineTo(videoX + radius, videoY + videoHeight);
						exportCtx.quadraticCurveTo(
							videoX,
							videoY + videoHeight,
							videoX,
							videoY + videoHeight - radius
						);
						exportCtx.lineTo(videoX, videoY + radius);
						exportCtx.quadraticCurveTo(
							videoX,
							videoY,
							videoX + radius,
							videoY
						);
						exportCtx.closePath();
						exportCtx.clip();
					}

					// Draw at full natural resolution (1:1 pixel mapping)
					exportCtx.drawImage(
						video,
						sourceXNatural,
						sourceYNatural,
						sourceWidthNatural,
						sourceHeightNatural,
						videoX,
						videoY,
						videoWidth,
						videoHeight
					);

					if (config.borderRadius > 0) {
						exportCtx.restore();
					}
				} else {
					if (config.borderRadius > 0) {
						exportCtx.save();
						// Scale border radius proportionally to natural resolution
						const radius = config.borderRadius * scaleFactor;
						exportCtx.beginPath();
						exportCtx.moveTo(videoX + radius, videoY);
						exportCtx.lineTo(videoX + videoWidth - radius, videoY);
						exportCtx.quadraticCurveTo(
							videoX + videoWidth,
							videoY,
							videoX + videoWidth,
							videoY + radius
						);
						exportCtx.lineTo(
							videoX + videoWidth,
							videoY + videoHeight - radius
						);
						exportCtx.quadraticCurveTo(
							videoX + videoWidth,
							videoY + videoHeight,
							videoX + videoWidth - radius,
							videoY + videoHeight
						);
						exportCtx.lineTo(videoX + radius, videoY + videoHeight);
						exportCtx.quadraticCurveTo(
							videoX,
							videoY + videoHeight,
							videoX,
							videoY + videoHeight - radius
						);
						exportCtx.lineTo(videoX, videoY + radius);
						exportCtx.quadraticCurveTo(
							videoX,
							videoY,
							videoX + radius,
							videoY
						);
						exportCtx.closePath();
						exportCtx.clip();
					}

					// Draw at full natural resolution (1:1 pixel mapping)
					exportCtx.drawImage(
						video,
						0,
						0,
						videoNaturalSize.width,
						videoNaturalSize.height,
						videoX,
						videoY,
						videoWidth,
						videoHeight
					);

					if (config.borderRadius > 0) {
						exportCtx.restore();
					}
				}
			};

			// Disable loop for export and ensure we have duration
			const wasLooping = video.loop;
			video.loop = false;

			// Wait for video metadata to ensure duration is available
			if (!video.duration || isNaN(video.duration)) {
				updateStatus("Loading video metadata...");
				await new Promise((resolve) => {
					video.addEventListener("loadedmetadata", resolve, {
						once: true,
					});
				});
			}

			if (isCancelled()) {
				video.loop = wasLooping;
				return;
			}

			// Get canvas stream and record
			updateStatus("Starting video recording...");
			const stream = exportCanvas.captureStream(30); // 30 fps

			// Check if MediaRecorder supports the mimeType
			let mimeType = "video/webm;codecs=vp9";
			if (!MediaRecorder.isTypeSupported(mimeType)) {
				mimeType = "video/webm;codecs=vp8";
				if (!MediaRecorder.isTypeSupported(mimeType)) {
					mimeType = "video/webm";
				}
			}

			const mediaRecorder = new MediaRecorder(stream, {
				mimeType: mimeType,
				videoBitsPerSecond: 10000000, // 10 Mbps for high quality
			});

			const chunks: Blob[] = [];
			let recordingStopped = false;
			let exportAnimationId: number | null = null;

			// Create a promise that resolves when recording is complete
			let recordingComplete: () => void;
			let recordingError: (error: Error) => void;
			const recordingPromise = new Promise<void>((resolve, reject) => {
				recordingComplete = resolve;
				recordingError = reject;
			});

			mediaRecorder.ondataavailable = (e) => {
				if (e.data && e.data.size > 0) {
					chunks.push(e.data);
				}
			};

			mediaRecorder.onerror = (e) => {
				recordingStopped = true;
				video.loop = wasLooping;
				if (recordingError) {
					recordingError(new Error("MediaRecorder error occurred"));
				}
			};

			mediaRecorder.onstop = async () => {
				video.loop = wasLooping;

				if (isCancelled()) {
					if (recordingError) {
						recordingError(new Error("Export cancelled"));
					}
					return;
				}

				if (chunks.length === 0) {
					updateStatus("Export failed: No video data recorded");
					if (recordingError) {
						recordingError(new Error("No video data recorded"));
					}
					return;
				}

				const webmBlob = new Blob(chunks, { type: "video/webm" });

				// If WebM format requested, skip conversion and download directly
				if (format === "webm") {
					updateStatus("Finalizing WebM export...");
					const url = URL.createObjectURL(webmBlob);
					const a = document.createElement("a");
					a.href = url;
					a.download = `gradient-video-${Date.now()}.webm`;
					document.body.appendChild(a);
					a.click();
					document.body.removeChild(a);
					URL.revokeObjectURL(url);
					updateStatus("Export complete!");
					if (recordingComplete) {
						recordingComplete();
					}
					return;
				}

				// Convert WebM to MP4 using ffmpeg.wasm
				try {
					updateStatus("Converting to MP4...");

					// Reuse existing FFmpeg instance or create new one
					if (!ffmpegRef.current) {
						ffmpegRef.current = new FFmpeg();
					}
					const ffmpeg = ffmpegRef.current;

					// Load ffmpeg only if not already loaded
					if (!ffmpeg.loaded) {
						updateStatus("Loading FFmpeg...");
						const version = "0.12.6";
						const baseURL = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${version}/dist/esm`;

						await ffmpeg.load({
							coreURL: await toBlobURL(
								`${baseURL}/ffmpeg-core.js`,
								"text/javascript"
							),
							wasmURL: await toBlobURL(
								`${baseURL}/ffmpeg-core.wasm`,
								"application/wasm"
							),
						});
					}

					if (isCancelled()) {
						throw new Error("Export cancelled");
					}

					// Write input file
					updateStatus("Preparing video for conversion...");
					await ffmpeg.writeFile(
						"input.webm",
						await fetchFile(webmBlob)
					);

					if (isCancelled()) {
						throw new Error("Export cancelled");
					}

					// Verify input file
					const inputStat = await ffmpeg.readFile("input.webm");
					if (
						inputStat instanceof Uint8Array &&
						inputStat.length === 0
					) {
						throw new Error("Input WebM file is empty!");
					}

					// Convert to MP4 (no audio since video is muted)
					updateStatus("Encoding MP4 (this may take a moment)...");

					try {
						// Use the same orientation detection and quality limits as calculated earlier
						// The scale filter ensures even dimensions (required for H.264) and caps at quality limits
						// Note: isPortrait is already determined above based on originalVideoHeight > originalVideoWidth
						// Recalculate orientation here using original dimensions to ensure consistency
						const ffmpegIsPortrait =
							originalVideoHeight > originalVideoWidth;
						const qualityLimits: Record<
							"720p" | "1080p" | "1440p",
							{
								landscape: { width: number; height: number };
								portrait: { width: number; height: number };
							}
						> = {
							"720p": {
								landscape: { width: 1280, height: 720 },
								portrait: { width: 720, height: 1280 },
							},
							"1080p": {
								landscape: { width: 1920, height: 1080 },
								portrait: { width: 1080, height: 1920 },
							},
							"1440p": {
								landscape: { width: 2560, height: 1440 },
								portrait: { width: 1440, height: 2560 },
							},
						};
						const limits = ffmpegIsPortrait
							? qualityLimits[quality].portrait
							: qualityLimits[quality].landscape;

						// Optimized FFmpeg command for speed without quality loss
						// Scale down large videos and ensure even dimensions in one pass
						// Orientation-aware: use appropriate width/height limits
						await ffmpeg.exec([
							"-i",
							"input.webm",
							"-vf",
							`scale='trunc(min(${limits.width},iw)/2)*2':'trunc(min(${limits.height},ih)/2)*2'`,
							"-c:v",
							"libx264",
							"-preset",
							"veryfast", // Faster encoding with minimal quality loss
							"-pix_fmt",
							"yuv420p",
							"-profile:v",
							"high",
							"-level",
							"4.2",
							"-an",
							"output.mp4",
						]);

						// Read output file
						const data = await ffmpeg.readFile("output.mp4");

						// Verify output
						if (
							!(data instanceof Uint8Array) ||
							data.length === 0
						) {
							throw new Error(
								"FFmpeg conversion produced empty output file"
							);
						}

						// Convert to Blob (handle SharedArrayBuffer if needed)
						const mp4Blob = new Blob([new Uint8Array(data)], {
							type: "video/mp4",
						});

						// Download MP4
						updateStatus("Finalizing MP4 export...");
						const url = URL.createObjectURL(mp4Blob);
						const a = document.createElement("a");
						a.href = url;
						a.download = `gradient-video-${Date.now()}.mp4`;
						document.body.appendChild(a);
						a.click();
						document.body.removeChild(a);
						URL.revokeObjectURL(url);
						updateStatus("Export complete!");

						// Cleanup (non-critical)
						try {
							await ffmpeg.deleteFile("input.webm");
							await ffmpeg.deleteFile("output.mp4");
						} catch (cleanupError) {
							// Ignore cleanup errors
						}

						if (recordingComplete) {
							recordingComplete();
						}
					} catch (error) {
						// Fallback to WebM
						const url = URL.createObjectURL(webmBlob);
						const a = document.createElement("a");
						a.href = url;
						a.download = `gradient-video-${Date.now()}.webm`;
						document.body.appendChild(a);
						a.click();
						document.body.removeChild(a);
						URL.revokeObjectURL(url);

						const errorMessage =
							error instanceof Error
								? error.message
								: String(error);
						alert(
							`MP4 conversion failed: ${errorMessage}. Downloaded as WebM instead.`
						);
						if (recordingComplete) {
							recordingComplete();
						}
					}
				} catch (error) {
					// Fallback to WebM
					const url = URL.createObjectURL(webmBlob);
					const a = document.createElement("a");
					a.href = url;
					a.download = `gradient-video-${Date.now()}.webm`;
					document.body.appendChild(a);
					a.click();
					document.body.removeChild(a);
					URL.revokeObjectURL(url);

					const errorMessage =
						error instanceof Error ? error.message : String(error);
					alert(
						`MP4 conversion failed: ${errorMessage}. Downloaded as WebM instead.`
					);
					if (recordingComplete) {
						recordingComplete();
					}
				}
			};

			// Reset video to start
			video.currentTime = 0;
			await new Promise((resolve) => {
				video.addEventListener("seeked", resolve, { once: true });
			});

			// Start recording with timeslice to ensure data is captured
			mediaRecorder.start(100); // Request data every 100ms

			// Record animation frames
			const recordFrame = () => {
				if (recordingStopped || isCancelled()) {
					if (exportAnimationId) {
						cancelAnimationFrame(exportAnimationId);
						exportAnimationId = null;
					}
					if (isCancelled() && mediaRecorder.state === "recording") {
						mediaRecorder.stop();
						video.loop = wasLooping;
						video.pause();
					}
					return;
				}

				drawFrame();

				// Only stop if video actually ended (not just paused)
				// Check if we've reached the full duration
				if (video.ended) {
					if (mediaRecorder.state === "recording") {
						mediaRecorder.stop();
					}
					if (exportAnimationId) {
						cancelAnimationFrame(exportAnimationId);
						exportAnimationId = null;
					}
					return;
				}

				exportAnimationId = requestAnimationFrame(recordFrame);
			};

			// Play video and record
			updateStatus("Recording video...");
			await video.play();
			recordFrame();

			// Stop when video ends
			const stopRecording = () => {
				if (!recordingStopped && mediaRecorder.state === "recording") {
					recordingStopped = true;
					mediaRecorder.stop();
					if (exportAnimationId) {
						cancelAnimationFrame(exportAnimationId);
						exportAnimationId = null;
					}
				}
			};

			video.addEventListener(
				"ended",
				() => {
					stopRecording();
				},
				{ once: true }
			);

			// Wait for recording to complete
			await recordingPromise;
		},
		[videoNaturalSize, videoDisplaySize, config, gradient, videoRef]
	);

	// Expose export function
	useEffect(() => {
		if (onExportReady && videoNaturalSize.width > 0) {
			onExportReady(exportVideo);
		}
	}, [onExportReady, exportVideo, videoNaturalSize.width]);

	if (!videoUrl) return null;

	const gradientString =
		gradient.colors.length === 1
			? gradient.colors[0]
			: `${gradient.type}-gradient(${
					gradient.angle
			  }deg, ${gradient.colors.join(", ")})`;

	// Calculate canvas container size
	// Account for padding in the wrapper
	const wrapperPadding = config.padding * 2;
	let canvasContainerStyle: React.CSSProperties = {
		borderRadius: `${config.borderRadius}px`,
		overflow: "visible",
		width: `calc(100% - ${wrapperPadding}px)`,
		height: `calc(100% - ${wrapperPadding}px)`,
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		margin: `${config.padding}px`,
	};

	// Calculate base video size
	// When in crop mode, always show full video (ignore existing crop)
	const isInCropMode = config.crop.cropMode;
	const shouldApplyCrop = config.crop.enabled && !isInCropMode;

	let baseVideoSize = {
		width: videoDisplaySize.width,
		height: videoDisplaySize.height,
	};
	if (shouldApplyCrop && videoDisplaySize.width > 0) {
		baseVideoSize.width =
			(videoDisplaySize.width * config.crop.region.width) / 100;
		baseVideoSize.height =
			(videoDisplaySize.height * config.crop.region.height) / 100;
	}

	// Shadow padding is fixed based on background padding (not shadow value)
	// This determines the space available for the shadow
	const shadowPadding = config.padding; // Use 80% of background padding for shadow space

	// Canvas display size = video size + fixed shadow padding
	const canvasSize = {
		width: baseVideoSize.width + shadowPadding * 2,
		height: baseVideoSize.height + shadowPadding * 2,
	};

	// Calculate canvas wrapper size
	// Determine if video is portrait for layout considerations
	const isPortrait = videoNaturalSize.height > videoNaturalSize.width;

	let canvasWrapperStyle: React.CSSProperties = {
		background: gradientString,
		// padding: `${config.padding}px`,
		width: `${canvasSize.width + config.padding * 2}px`,
		height: `${canvasSize.height + config.padding * 2}px`,
		maxWidth: "100%",
		maxHeight: "100%",
		minWidth: "400px",
		borderRadius: "16px",
		boxSizing: "border-box",
	};

	if (!config.crop.enabled) {
		canvasWrapperStyle.width = "auto";
		canvasWrapperStyle.height = "auto";
	}

	return (
		<div
			ref={containerRef}
			className="relative flex items-center justify-center shadow-2xl overflow-visible"
			style={{
				...canvasWrapperStyle,
				aspectRatio: `${canvasSize.width + config.padding * 2} / ${canvasSize.height + config.padding * 2}`,
			}}
		>
			{/* Hidden video element for source */}
			<video
				ref={videoRef}
				src={videoUrl}
				autoPlay
				loop
				muted
				playsInline
				preload="metadata"
				className="hidden"
			/>

			{/* Canvas for rendering */}
			<div style={canvasContainerStyle}>
				<canvas
					ref={canvasRef}
					className="block"
					style={{
						display: "block",
						// Canvas CSS size - use 100% to fill container, aspect-ratio maintains proportions
						width: "100%",
						height: "auto",
						aspectRatio: `${canvasSize.width} / ${canvasSize.height}`,
						maxWidth: "100%",
						maxHeight: "100%",
					}}
				/>
			</div>

			{/* Video controls - sync with hidden video */}
			<VideoControls videoRef={videoRef} />

			{/* Only render crop overlay when canvas is ready (resized) */}
			{config.crop.cropMode && canvasReady && (
				<CropOverlay
					crop={config.crop.region}
					onCropChange={onCropChange}
					containerRef={containerRef}
					videoRef={videoRef}
					canvasRef={canvasRef}
					videoDisplaySize={videoDisplaySize}
					shadowPadding={shadowPadding}
				/>
			)}
		</div>
	);
};

export default VideoPreview;
