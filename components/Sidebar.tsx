import React from "react";
import { GradientSettings, VideoConfig, CropRegion } from "../types";
import { PRESET_GRADIENTS } from "../constants";
import ExportModal, { ExportQuality, ExportFormat } from "./ExportModal";

interface SidebarProps {
	gradient: GradientSettings;
	config: VideoConfig;
	onUpdateGradient: (updates: Partial<GradientSettings>) => void;
	onUpdateConfig: (updates: Partial<VideoConfig>) => void;
	onEnterCropMode: () => void;
	onAcceptCrop: () => void;
	onCancelCrop: () => void;
	onExport?: (quality: ExportQuality, format: ExportFormat) => void;
	isExporting?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
	gradient,
	config,
	onUpdateGradient,
	onUpdateConfig,
	onEnterCropMode,
	onAcceptCrop,
	onCancelCrop,
	onExport,
	isExporting = false,
}) => {
	const [isExportModalOpen, setIsExportModalOpen] = React.useState(false);

	const handleColorChange = (index: number, color: string) => {
		const newColors = [...gradient.colors];
		newColors[index] = color;
		onUpdateGradient({ colors: newColors });
	};

	const addColor = () => {
		onUpdateGradient({ colors: [...gradient.colors, "#ffffff"] });
	};

	const removeColor = (index: number) => {
		if (gradient.colors.length > 2) {
			const newColors = gradient.colors.filter((_, i) => i !== index);
			onUpdateGradient({ colors: newColors });
		}
	};

	const resetCrop = () => {
		onUpdateConfig({
			crop: {
				enabled: config.crop.enabled,
				region: { x: 0, y: 0, width: 100, height: 100 },
			},
		});
	};

	return (
		<aside
			className="w-80 bg-[#111111] border-l border-zinc-800 overflow-y-auto shrink-0 p-6 space-y-8"
			style={{ scrollbarGutter: "stable" }}
		>
			{/* Export Section */}
			<div>
				<button
					onClick={() => setIsExportModalOpen(true)}
					disabled={!onExport || isExporting}
					className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
				>
					{isExporting ? (
						<>
							<i className="fa-solid fa-spinner fa-spin"></i>
							Exporting...
						</>
					) : (
						<>
							<i className="fa-solid fa-download"></i>
							Export Video
						</>
					)}
				</button>
				<p className="text-xs text-zinc-500 mt-2 text-center">
					{isExporting
						? "Processing video... This may take a moment."
						: "Choose quality and format settings"}
				</p>
			</div>

			{/* Export Modal */}
			<ExportModal
				isOpen={isExportModalOpen}
				onClose={() => setIsExportModalOpen(false)}
				onExport={(quality, format) => {
					setIsExportModalOpen(false);
					if (onExport) {
						onExport(quality, format);
					}
				}}
				isExporting={isExporting}
			/>

			{/* Background Section */}
			<section>
				<h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-6 flex items-center gap-2">
					<i className="fa-solid fa-palette text-indigo-500"></i>
					Background
				</h3>

				{/* Preset Gradients */}
				<div className="grid grid-cols-4 gap-2 mb-6">
					{PRESET_GRADIENTS.map((preset, i) => (
						<button
							key={i}
							onClick={() => onUpdateGradient(preset)}
							className="w-full aspect-square rounded-lg border border-zinc-700 hover:border-white transition-all overflow-hidden"
							style={{
								background: `linear-gradient(${
									preset.angle
								}deg, ${preset.colors.join(", ")})`,
							}}
							title="Apply preset"
						/>
					))}
				</div>

				{/* Custom Colors */}
				<div className="space-y-3 mb-6">
					<label className="text-xs text-zinc-500 font-medium">
						GRADIENT COLORS
					</label>
					{gradient.colors.map((color, i) => (
						<div key={i} className="flex items-center gap-3">
							<div className="relative w-10 h-10 rounded-lg overflow-hidden border border-zinc-700">
								<input
									type="color"
									value={color}
									onChange={(e) =>
										handleColorChange(i, e.target.value)
									}
									className="absolute inset-0 w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 cursor-pointer"
								/>
							</div>
							<input
								type="text"
								value={color}
								onChange={(e) =>
									handleColorChange(i, e.target.value)
								}
								className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm font-mono uppercase focus:outline-none focus:border-indigo-500"
							/>
							{gradient.colors.length > 2 && (
								<button
									onClick={() => removeColor(i)}
									className="text-zinc-600 hover:text-red-500 transition-colors"
								>
									<i className="fa-solid fa-circle-minus"></i>
								</button>
							)}
						</div>
					))}
					<button
						onClick={addColor}
						className="w-full py-2 border border-dashed border-zinc-700 rounded-lg text-xs text-zinc-500 hover:border-zinc-500 hover:text-zinc-300 transition-all"
					>
						+ Add Color
					</button>
				</div>

				{/* Angle Slider */}
				<div className="space-y-2">
					<div className="flex justify-between items-center">
						<label className="text-xs text-zinc-500 font-medium">
							GRADIENT ANGLE
						</label>
						<span className="text-xs text-zinc-400 font-mono">
							{gradient.angle}°
						</span>
					</div>
					<input
						type="range"
						min="0"
						max="360"
						value={gradient.angle}
						onChange={(e) =>
							onUpdateGradient({
								angle: parseInt(e.target.value),
							})
						}
						className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
					/>
				</div>
			</section>

			{/* Video Settings Section */}
			<section>
				<h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-6 flex items-center gap-2">
					<i className="fa-solid fa-video text-indigo-500"></i>
					Video Canvas
				</h3>

				<div className="space-y-6">
					{/* Border Radius */}
					<div className="space-y-2">
						<div className="flex justify-between items-center">
							<label className="text-xs text-zinc-500 font-medium">
								ROUNDED CORNERS
							</label>
							<span className="text-xs text-zinc-400 font-mono">
								{config.borderRadius}px
							</span>
						</div>
						<input
							type="range"
							min="0"
							max="100"
							value={config.borderRadius}
							onChange={(e) =>
								onUpdateConfig({
									borderRadius: parseInt(e.target.value),
								})
							}
							className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
						/>
					</div>

					{/* Padding */}
					<div className="space-y-2">
						<div className="flex justify-between items-center">
							<label className="text-xs text-zinc-500 font-medium">
								BACKGROUND PADDING
							</label>
							<span className="text-xs text-zinc-400 font-mono">
								{config.padding}px
							</span>
						</div>
						<input
							type="range"
							min="0"
							max="200"
							value={config.padding}
							onChange={(e) =>
								onUpdateConfig({
									padding: parseInt(e.target.value),
								})
							}
							className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
						/>
					</div>

					{/* Shadow */}
					<div className="space-y-2">
						<div className="flex justify-between items-center">
							<label className="text-xs text-zinc-500 font-medium">
								CANVAS SHADOW
							</label>
							<span className="text-xs text-zinc-400 font-mono">
								{config.shadow}px
							</span>
						</div>
						<input
							type="range"
							min="0"
							max="100"
							value={config.shadow}
							onChange={(e) =>
								onUpdateConfig({
									shadow: parseInt(e.target.value),
								})
							}
							className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
						/>
					</div>

					{/* Scale */}
					{/* <div className="space-y-2">
						<div className="flex justify-between items-center">
							<label className="text-xs text-zinc-500 font-medium">
								VIDEO SCALE
							</label>
							<span className="text-xs text-zinc-400 font-mono">
								{Math.round(config.scale * 100)}%
							</span>
						</div>
						<input
							type="range"
							min="0.5"
							max="1.5"
							step="0.01"
							value={config.scale}
							onChange={(e) =>
								onUpdateConfig({
									scale: parseFloat(e.target.value),
								})
							}
							className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
						/>
					</div> */}
				</div>
			</section>

			{/* Crop Section */}
			<section>
				<h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-6 flex items-center gap-2">
					<i className="fa-solid fa-crop text-indigo-500"></i>
					Crop Video
				</h3>

				<div className="space-y-4">
					{!config.crop.cropMode ? (
						<>
							{/* Crop Button */}
							<button
								onClick={onEnterCropMode}
								className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
							>
								<i className="fa-solid fa-crop"></i>
								Crop Video
							</button>

							{/* Show current crop status if enabled */}
							{/* {config.crop.enabled && (
                <div className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                  <p className="text-xs text-zinc-400 mb-2">
                    Crop is currently applied.
                  </p>
                  <div className="text-xs text-zinc-500 space-y-1">
                    <div>X: {Math.round(config.crop.region.x)}%</div>
                    <div>Y: {Math.round(config.crop.region.y)}%</div>
                    <div>Width: {Math.round(config.crop.region.width)}%</div>
                    <div>Height: {Math.round(config.crop.region.height)}%</div>
                  </div>
                </div>
              )} */}
						</>
					) : (
						<>
							{/* Crop Mode Active */}
							<div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
								<p className="text-xs text-indigo-300 mb-3 font-medium">
									Crop Mode Active
								</p>
								<p className="text-xs text-zinc-400 mb-3">
									Drag the crop handles on the video to adjust
									the crop area.
								</p>
								<div className="text-xs text-zinc-500 space-y-1 mb-3">
									<div>
										X: {Math.round(config.crop.region.x)}%
									</div>
									<div>
										Y: {Math.round(config.crop.region.y)}%
									</div>
									<div>
										Width:{" "}
										{Math.round(config.crop.region.width)}%
									</div>
									<div>
										Height:{" "}
										{Math.round(config.crop.region.height)}%
									</div>
								</div>
							</div>

							{/* Action Buttons */}
							<div className="flex gap-2">
								<button
									onClick={onCancelCrop}
									className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-xs text-zinc-300 hover:text-white transition-all"
								>
									Cancel
								</button>
								<button
									onClick={onAcceptCrop}
									className="flex-1 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-xs font-medium transition-colors"
								>
									Accept
								</button>
							</div>

							<button
								onClick={resetCrop}
								className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-xs text-zinc-300 hover:text-white transition-all"
							>
								<i className="fa-solid fa-rotate-left mr-2"></i>
								Reset to Full Video
							</button>
						</>
					)}
				</div>
			</section>
		</aside>
	);
};

export default Sidebar;
