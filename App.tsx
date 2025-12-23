import React, { useState, useRef } from "react";
import {
	EditorState,
	GradientSettings,
	VideoConfig,
	CropRegion,
} from "./types";
import { DEFAULT_CONFIG, DEFAULT_GRADIENT } from "./constants";
import Sidebar from "./components/Sidebar";
import VideoPreview from "./components/VideoPreview";
import FileUploader from "./components/FileUploader";
import ExportProgressModal from "./components/ExportProgressModal";

const App: React.FC = () => {
	const [state, setState] = useState<EditorState>({
		videoUrl: null,
		videoName: null,
		gradient: DEFAULT_GRADIENT,
		config: DEFAULT_CONFIG,
	});

	// Save the crop region when entering crop mode so we can revert on cancel
	const savedCropRegionRef = useRef<CropRegion | null>(null);
	const exportVideoRef = useRef<
		| ((
				quality: "720p" | "1080p" | "1440p",
				format: "mp4" | "webm",
				onStatusUpdate?: (status: string) => void,
				cancelRef?: React.MutableRefObject<boolean>
		  ) => Promise<void>)
		| null
	>(null);
	const [isExporting, setIsExporting] = useState(false);
	const [exportStatus, setExportStatus] = useState("Preparing export...");
	const exportCancelRef = useRef<boolean>(false);

	const handleFileSelect = (file: File) => {
		const url = URL.createObjectURL(file);
		setState((prev) => ({
			...prev,
			videoUrl: url,
			videoName: file.name,
		}));
	};

	const updateGradient = (updates: Partial<GradientSettings>) => {
		setState((prev) => ({
			...prev,
			gradient: { ...prev.gradient, ...updates },
		}));
	};

	const updateConfig = (updates: Partial<VideoConfig>) => {
		setState((prev) => ({
			...prev,
			config: { ...prev.config, ...updates },
		}));
	};

	const updateCrop = (region: EditorState["config"]["crop"]["region"]) => {
		setState((prev) => ({
			...prev,
			config: {
				...prev.config,
				crop: {
					...prev.config.crop,
					region,
				},
			},
		}));
	};

	const enterCropMode = () => {
		setState((prev) => {
			// Save the current crop region before entering crop mode
			savedCropRegionRef.current = prev.config.crop.enabled
				? prev.config.crop.region
				: { x: 0, y: 0, width: 100, height: 100 };

			return {
				...prev,
				config: {
					...prev.config,
					crop: {
						...prev.config.crop,
						cropMode: true,
						// Start with the saved region (current crop or full video)
						region: savedCropRegionRef.current,
					},
				},
			};
		});
	};

	const acceptCrop = () => {
		setState((prev) => ({
			...prev,
			config: {
				...prev.config,
				crop: {
					...prev.config.crop,
					enabled: true,
					cropMode: false,
				},
			},
		}));
		savedCropRegionRef.current = null;
	};

	const cancelCrop = () => {
		setState((prev) => ({
			...prev,
			config: {
				...prev.config,
				crop: {
					...prev.config.crop,
					cropMode: false,
					// Revert to the saved crop region from when we entered crop mode
					region: savedCropRegionRef.current || {
						x: 0,
						y: 0,
						width: 100,
						height: 100,
					},
				},
			},
		}));
		savedCropRegionRef.current = null;
	};

	const resetVideo = () => {
		if (state.videoUrl) {
			URL.revokeObjectURL(state.videoUrl);
		}
		setState((prev) => ({ ...prev, videoUrl: null, videoName: null }));
	};

	return (
		<div className="flex flex-col h-screen bg-[#0a0a0a] overflow-hidden">
			{/* Header */}
			<header className="h-16 border-b border-zinc-800 flex items-center justify-between px-6 bg-[#0a0a0a] shrink-0">
				<div className="flex items-center gap-2">
					<div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
						<i className="fa-solid fa-wand-magic-sparkles text-white"></i>
					</div>
					<h1 className="text-xl font-bold tracking-tight">
						GradientVideo
					</h1>
				</div>
				<div className="flex items-center gap-4">
					{state.videoUrl && (
						<button
							onClick={resetVideo}
							className="text-zinc-400 hover:text-white text-sm transition-colors"
						>
							Change Video
						</button>
					)}
					<a
						href="https://x.com/GaryJensen_"
						target="_blank"
						aria-label="Gary's Twitter/X"
						className="text-zinc-400 hover:text-white transition-colors"
					>
						<i className="fa-brands fa-twitter text-xl"></i>
					</a>
				</div>
			</header>

			{/* Main Layout */}
			<main className="flex-1 flex overflow-hidden">
				{!state.videoUrl ? (
					<div className="flex-1 flex items-center justify-center p-8">
						<div className="max-w-xl w-full">
							<div className="text-center mb-10">
								<h2 className="text-4xl font-extrabold mb-4 bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">
									Transform Your Video Backgrounds
								</h2>
								<p className="text-zinc-400 text-lg">
									Upload a video and instantly add beautiful
									gradients and smooth rounded corners.
								</p>
							</div>
							<FileUploader onFileSelect={handleFileSelect} />
						</div>
					</div>
				) : (
					<>
						<div className="flex-1 relative overflow-auto bg-zinc-900/50 flex flex-row items-center justify-center">
							<VideoPreview
								state={state}
								onCropChange={updateCrop}
								onExportReady={(exportFn) => {
									exportVideoRef.current = exportFn;
								}}
							/>
						</div>

						<Sidebar
							gradient={state.gradient}
							config={state.config}
							onUpdateGradient={updateGradient}
							onUpdateConfig={updateConfig}
							onEnterCropMode={enterCropMode}
							onAcceptCrop={acceptCrop}
							onCancelCrop={cancelCrop}
							onExport={async (quality, format) => {
								if (exportVideoRef.current && !isExporting) {
									setIsExporting(true);
									setExportStatus("Preparing export...");
									exportCancelRef.current = false;
									try {
										await exportVideoRef.current(
											quality,
											format,
											setExportStatus,
											exportCancelRef
										);
									} catch (error) {
										if (!exportCancelRef.current) {
											alert(
												"Export failed. Please try again."
											);
										}
									} finally {
										setIsExporting(false);
										exportCancelRef.current = false;
									}
								}
							}}
							isExporting={isExporting}
						/>
					</>
				)}
			</main>

			{/* Export Progress Modal */}
			<ExportProgressModal
				isOpen={isExporting}
				onCancel={() => {
					exportCancelRef.current = true;
					setIsExporting(false);
				}}
				status={exportStatus}
			/>
		</div>
	);
};

export default App;
