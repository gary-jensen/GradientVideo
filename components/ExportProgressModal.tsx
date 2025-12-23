import React from "react";

interface ExportProgressModalProps {
	isOpen: boolean;
	onCancel: () => void;
	status: string;
}

const ExportProgressModal: React.FC<ExportProgressModalProps> = ({
	isOpen,
	onCancel,
	status,
}) => {
	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
			<div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl shadow-2xl w-full max-w-md mx-4">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-zinc-800">
					<h2 className="text-xl font-bold text-white flex items-center gap-2">
						<i className="fa-solid fa-spinner fa-spin text-indigo-500"></i>
						Exporting Video
					</h2>
				</div>

				{/* Content */}
				<div className="p-6 space-y-4">
					<div className="flex items-center gap-3">
						<div className="flex-shrink-0">
							<div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
						</div>
						<div className="flex-1">
							<p className="text-white font-medium">{status}</p>
							<p className="text-sm text-zinc-400 mt-1">
								Please wait while we process your video...
							</p>
						</div>
					</div>
				</div>

				{/* Footer */}
				<div className="flex gap-3 p-6 border-t border-zinc-800">
					<button
						onClick={onCancel}
						className="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
					>
						<i className="fa-solid fa-xmark"></i>
						Cancel Export
					</button>
				</div>
			</div>
		</div>
	);
};

export default ExportProgressModal;

