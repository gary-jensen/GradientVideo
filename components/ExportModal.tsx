import React, { useState } from "react";

export type ExportQuality = "720p" | "1080p" | "1440p";
export type ExportFormat = "webm" | "mp4";

interface ExportModalProps {
	isOpen: boolean;
	onClose: () => void;
	onExport: (quality: ExportQuality, format: ExportFormat) => void;
	isExporting: boolean;
}

const ExportModal: React.FC<ExportModalProps> = ({
	isOpen,
	onClose,
	onExport,
	isExporting,
}) => {
	const [quality, setQuality] = useState<ExportQuality>("1080p");
	const [format, setFormat] = useState<ExportFormat>("webm");

	if (!isOpen) return null;

	const qualityOptions: { value: ExportQuality; label: string }[] = [
		{ value: "720p", label: "720p" },
		{ value: "1080p", label: "1080p" },
		{ value: "1440p", label: "1440p" },
	];

	const formatOptions: {
		value: ExportFormat;
		label: string;
		description: string;
	}[] = [
		{ value: "webm", label: "WebM", description: "Faster, no conversion" },
		{
			value: "mp4",
			label: "MP4",
			description: "Better compatibility, slower",
		},
	];

	const handleExport = () => {
		onExport(quality, format);
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm !mt-0">
			<div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl shadow-2xl w-full max-w-md mx-4">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-zinc-800">
					<h2 className="text-xl font-bold text-white flex items-center gap-2">
						<i className="fa-solid fa-download text-indigo-500"></i>
						Export Settings
					</h2>
					<button
						onClick={onClose}
						disabled={isExporting}
						className="text-zinc-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<i className="fa-solid fa-xmark text-xl"></i>
					</button>
				</div>

				{/* Content */}
				<div className="p-6 space-y-6">
					{/* Quality Selection */}
					<div>
						<label className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3 block">
							Export Quality
						</label>
						<div className="space-y-2">
							{qualityOptions.map((option) => (
								<label
									key={option.value}
									className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
										quality === option.value
											? "border-indigo-500 bg-indigo-500/10"
											: "border-zinc-700 hover:border-zinc-600 bg-zinc-800/50"
									}`}
								>
									<input
										type="radio"
										name="quality"
										value={option.value}
										checked={quality === option.value}
										onChange={(e) =>
											setQuality(
												e.target.value as ExportQuality
											)
										}
										disabled={isExporting}
										className="w-4 h-4 text-indigo-500 focus:ring-indigo-500 focus:ring-2"
									/>
									<span className="text-white font-medium">
										{option.label}
									</span>
								</label>
							))}
						</div>
					</div>

					{/* Format Selection */}
					<div>
						<label className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3 block">
							Export Format
						</label>
						<div className="space-y-2">
							{formatOptions.map((option) => (
								<label
									key={option.value}
									className={`flex items-center justify-between gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
										format === option.value
											? "border-indigo-500 bg-indigo-500/10"
											: "border-zinc-700 hover:border-zinc-600 bg-zinc-800/50"
									}`}
								>
									<div className="flex items-center gap-3">
										<input
											type="radio"
											name="format"
											value={option.value}
											checked={format === option.value}
											onChange={(e) =>
												setFormat(
													e.target
														.value as ExportFormat
												)
											}
											disabled={isExporting}
											className="w-4 h-4 text-indigo-500 focus:ring-indigo-500 focus:ring-2"
										/>
										<span className="text-white font-medium">
											{option.label}
										</span>
									</div>
									<span className="text-xs text-zinc-400">
										{option.description}
									</span>
								</label>
							))}
						</div>
					</div>
				</div>

				{/* Footer */}
				<div className="flex gap-3 p-6 border-t border-zinc-800">
					<button
						onClick={onClose}
						disabled={isExporting}
						className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
					>
						Cancel
					</button>
					<button
						onClick={handleExport}
						disabled={isExporting}
						className="flex-1 py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
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
				</div>
			</div>
		</div>
	);
};

export default ExportModal;
