import React, { useState, useRef, useCallback, useEffect } from "react";
import { CropRegion } from "../types";

interface CropOverlayProps {
	crop: CropRegion;
	onCropChange: (crop: CropRegion) => void;
	containerRef: React.RefObject<HTMLDivElement>;
	videoRef: React.RefObject<HTMLVideoElement>;
	canvasRef?: React.RefObject<HTMLCanvasElement>;
	videoDisplaySize?: { width: number; height: number };
	shadowPadding?: number; // Shadow padding offset in pixels
}

type DragHandle =
	| "nw"
	| "ne"
	| "sw"
	| "se"
	| "n"
	| "s"
	| "e"
	| "w"
	| "move"
	| null;

const CropOverlay: React.FC<CropOverlayProps> = ({
	crop,
	onCropChange,
	containerRef,
	videoRef,
	canvasRef,
	videoDisplaySize,
	shadowPadding = 0,
}) => {
	const [isDragging, setIsDragging] = useState(false);
	const [dragHandle, setDragHandle] = useState<DragHandle>(null);
	const [dragStart, setDragStart] = useState({
		x: 0,
		y: 0,
		crop: { ...crop },
	});
	const [localCrop, setLocalCrop] = useState(crop); // Local state for immediate UI updates
	const dragBoundsRef = useRef<ReturnType<typeof getVideoBounds> | null>(
		null
	); // Store bounds at drag start
	const renderBoundsRef = useRef<ReturnType<typeof getVideoBounds> | null>(
		null
	); // Store bounds for rendering during drag
	const lastKnownGoodBoundsRef = useRef<ReturnType<
		typeof getVideoBounds
	> | null>(null); // Store last successful bounds calculation

	// Sync local crop with prop when not dragging
	useEffect(() => {
		if (!isDragging) {
			setLocalCrop(crop);
		}
	}, [crop, isDragging]);
	const maskIdRef = useRef(
		`crop-mask-${Math.random().toString(36).substr(2, 9)}`
	);

	const getVideoBounds = useCallback(() => {
		if (!containerRef.current) return null;
		const container = containerRef.current;
		const containerRect = container.getBoundingClientRect();

		// Use canvas if available, otherwise fall back to video
		const element = canvasRef?.current || videoRef.current;
		if (!element) return null;

		const elementRect = element.getBoundingClientRect();

		// If using canvas with shadow padding, adjust for the offset
		// The canvas CSS size includes shadow padding, and video is drawn at (shadowPadding, shadowPadding) within the canvas
		if (canvasRef?.current && shadowPadding > 0) {
			const canvas = canvasRef.current;
			// Wait for canvas to be properly sized (width/height should be > 0)
			if (canvas.width === 0 || canvas.height === 0) {
				// Return null instead of partial data to avoid flashing
				return null;
			}
			// Calculate scale factor between CSS size and internal resolution
			const scaleX = elementRect.width / canvas.width;
			const scaleY = elementRect.height / canvas.height;
			const scaledShadowPadding = shadowPadding * scaleX * 2;
			const scaledShadowPaddingY = shadowPadding * scaleY * 2;

			return {
				// Video position relative to container (accounting for shadow padding offset)
				videoX:
					elementRect.left - containerRect.left + scaledShadowPadding,
				videoY:
					elementRect.top - containerRect.top + scaledShadowPaddingY,
				// Video size is canvas CSS size minus shadow padding on both sides
				videoWidth: elementRect.width - scaledShadowPadding * 2,
				videoHeight: elementRect.height - scaledShadowPaddingY * 2,
			};
		}

		// No shadow padding, use element bounds directly
		return {
			// Element position relative to container
			videoX: elementRect.left - containerRect.left,
			videoY: elementRect.top - containerRect.top,
			videoWidth: elementRect.width,
			videoHeight: elementRect.height,
		};
	}, [shadowPadding, canvasRef, videoRef, containerRef]); // Removed refs from dependencies - they're stable and we access them directly

	const constrainCrop = useCallback((newCrop: CropRegion): CropRegion => {
		return {
			x: Math.max(0, Math.min(100 - newCrop.width, newCrop.x)),
			y: Math.max(0, Math.min(100 - newCrop.height, newCrop.y)),
			width: Math.max(5, Math.min(100 - newCrop.x, newCrop.width)),
			height: Math.max(5, Math.min(100 - newCrop.y, newCrop.height)),
		};
	}, []);

	// Use refs to store the latest handlers to avoid stale closures
	const handleMouseMoveRef = useRef<(e: MouseEvent) => void>();
	const handleMouseUpRef = useRef<() => void>();

	const handleMouseMove = useCallback(
		(e: MouseEvent) => {
			if (!isDragging || !dragHandle || !containerRef.current) return;

			// Use stored bounds from drag start to avoid recalculation during drag
			const bounds = dragBoundsRef.current;
			if (!bounds) return;

			const deltaX = e.clientX - dragStart.x;
			const deltaY = e.clientY - dragStart.y;

			// Convert pixel deltas to percentage deltas relative to video size
			const deltaXPercent = (deltaX / bounds.videoWidth) * 100;
			const deltaYPercent = (deltaY / bounds.videoHeight) * 100;

			let newCrop = { ...dragStart.crop };

			switch (dragHandle) {
				case "move":
					newCrop.x = dragStart.crop.x + deltaXPercent;
					newCrop.y = dragStart.crop.y + deltaYPercent;
					break;
				case "nw":
					newCrop.x = dragStart.crop.x + deltaXPercent;
					newCrop.y = dragStart.crop.y + deltaYPercent;
					newCrop.width = dragStart.crop.width - deltaXPercent;
					newCrop.height = dragStart.crop.height - deltaYPercent;
					break;
				case "ne":
					newCrop.y = dragStart.crop.y + deltaYPercent;
					newCrop.width = dragStart.crop.width + deltaXPercent;
					newCrop.height = dragStart.crop.height - deltaYPercent;
					break;
				case "sw":
					newCrop.x = dragStart.crop.x + deltaXPercent;
					newCrop.width = dragStart.crop.width - deltaXPercent;
					newCrop.height = dragStart.crop.height + deltaYPercent;
					break;
				case "se":
					newCrop.width = dragStart.crop.width + deltaXPercent;
					newCrop.height = dragStart.crop.height + deltaYPercent;
					break;
				case "n":
					newCrop.y = dragStart.crop.y + deltaYPercent;
					newCrop.height = dragStart.crop.height - deltaYPercent;
					break;
				case "s":
					newCrop.height = dragStart.crop.height + deltaYPercent;
					break;
				case "e":
					newCrop.width = dragStart.crop.width + deltaXPercent;
					break;
				case "w":
					newCrop.x = dragStart.crop.x + deltaXPercent;
					newCrop.width = dragStart.crop.width - deltaXPercent;
					break;
			}

			newCrop = constrainCrop(newCrop);

			// Only update local state during drag - don't notify parent until mouseup
			setLocalCrop(newCrop);
		},
		[isDragging, dragHandle, dragStart, constrainCrop]
	);

	const handleMouseUp = useCallback(() => {
		// Notify parent of final crop value
		if (localCrop) {
			onCropChange(localCrop);
		}

		setIsDragging(false);
		setDragHandle(null);
		dragBoundsRef.current = null; // Clear stored bounds
		renderBoundsRef.current = null; // Clear render bounds

		// Remove listeners when drag ends
		if (handleMouseMoveRef.current) {
			document.removeEventListener(
				"mousemove",
				handleMouseMoveRef.current
			);
		}
		if (handleMouseUpRef.current) {
			document.removeEventListener("mouseup", handleMouseUpRef.current);
		}
	}, [localCrop, onCropChange]);

	// Update refs with latest handlers
	useEffect(() => {
		handleMouseMoveRef.current = handleMouseMove;
		handleMouseUpRef.current = handleMouseUp;
	}, [handleMouseMove, handleMouseUp]);

	const handleMouseDown = useCallback(
		(e: React.MouseEvent, handle: DragHandle) => {
			e.preventDefault();
			e.stopPropagation();

			if (!containerRef.current) return;

			// Store bounds at drag start to avoid recalculation during drag
			const bounds = getVideoBounds();
			dragBoundsRef.current = bounds;
			renderBoundsRef.current = bounds; // Also store for rendering

			setIsDragging(true);
			setDragHandle(handle);
			setDragStart({
				x: e.clientX,
				y: e.clientY,
				crop: { ...crop },
			});

			// Attach listeners immediately to prevent losing drag on fast movement
			// Use refs to get the latest handlers without causing dependency issues
			const moveHandler = (e: MouseEvent) =>
				handleMouseMoveRef.current?.(e);
			const upHandler = () => handleMouseUpRef.current?.();

			document.addEventListener("mousemove", moveHandler);
			document.addEventListener("mouseup", upHandler);
		},
		[crop, getVideoBounds]
	);

	useEffect(() => {
		// Cleanup on unmount
		return () => {
			if (handleMouseMoveRef.current) {
				document.removeEventListener(
					"mousemove",
					handleMouseMoveRef.current
				);
			}
			if (handleMouseUpRef.current) {
				document.removeEventListener(
					"mouseup",
					handleMouseUpRef.current
				);
			}
		};
	}, []);

	const bounds = getVideoBounds();

	// Update last known good bounds if we got a valid result
	if (bounds) {
		lastKnownGoodBoundsRef.current = bounds;
	}

	// Use stored bounds during drag to prevent flashing, otherwise use fresh bounds (or last known good)
	const effectiveBounds = isDragging
		? renderBoundsRef.current
		: bounds || lastKnownGoodBoundsRef.current;

	if (!effectiveBounds) return null;

	const cropPixels = {
		x:
			effectiveBounds.videoX +
			(localCrop.x / 100) * effectiveBounds.videoWidth,
		y:
			effectiveBounds.videoY +
			(localCrop.y / 100) * effectiveBounds.videoHeight,
		width: (localCrop.width / 100) * effectiveBounds.videoWidth,
		height: (localCrop.height / 100) * effectiveBounds.videoHeight,
	};

	const handleSize = 12;
	const handleOffset = handleSize / 2;

	return (
		<div className="absolute inset-0 pointer-events-none">
			{/* Dark overlay outside crop area */}
			<svg
				className="absolute inset-0 pointer-events-none"
				style={{ width: "100%", height: "100%" }}
			>
				<defs>
					<mask id={maskIdRef.current}>
						<rect width="100%" height="100%" fill="white" />
						<rect
							x={cropPixels.x}
							y={cropPixels.y}
							width={cropPixels.width}
							height={cropPixels.height}
							fill="black"
						/>
					</mask>
				</defs>
				<rect
					width="100%"
					height="100%"
					fill="rgba(0,0,0,0.5)"
					mask={`url(#${maskIdRef.current})`}
				/>
			</svg>

			{/* Crop border */}
			<div
				className="absolute border-2 border-white pointer-events-auto"
				style={{
					left: cropPixels.x,
					top: cropPixels.y,
					width: cropPixels.width,
					height: cropPixels.height,
					boxShadow: "0 0 0 1px rgba(0,0,0,0.3)",
				}}
				onMouseDown={(e) => handleMouseDown(e, "move")}
			>
				{/* Corner handles */}
				<div
					className="absolute bg-white rounded-full border-2 border-indigo-500 cursor-nwse-resize"
					style={{
						left: -handleOffset,
						top: -handleOffset,
						width: handleSize,
						height: handleSize,
					}}
					onMouseDown={(e) => handleMouseDown(e, "nw")}
				/>
				<div
					className="absolute bg-white rounded-full border-2 border-indigo-500 cursor-nesw-resize"
					style={{
						right: -handleOffset,
						top: -handleOffset,
						width: handleSize,
						height: handleSize,
					}}
					onMouseDown={(e) => handleMouseDown(e, "ne")}
				/>
				<div
					className="absolute bg-white rounded-full border-2 border-indigo-500 cursor-nesw-resize"
					style={{
						left: -handleOffset,
						bottom: -handleOffset,
						width: handleSize,
						height: handleSize,
					}}
					onMouseDown={(e) => handleMouseDown(e, "sw")}
				/>
				<div
					className="absolute bg-white rounded-full border-2 border-indigo-500 cursor-nwse-resize"
					style={{
						right: -handleOffset,
						bottom: -handleOffset,
						width: handleSize,
						height: handleSize,
					}}
					onMouseDown={(e) => handleMouseDown(e, "se")}
				/>

				{/* Edge handles */}
				<div
					className="absolute bg-white rounded-full border-2 border-indigo-500 cursor-ns-resize"
					style={{
						left: "50%",
						top: -handleOffset,
						transform: "translateX(-50%)",
						width: handleSize,
						height: handleSize,
					}}
					onMouseDown={(e) => handleMouseDown(e, "n")}
				/>
				<div
					className="absolute bg-white rounded-full border-2 border-indigo-500 cursor-ns-resize"
					style={{
						left: "50%",
						bottom: -handleOffset,
						transform: "translateX(-50%)",
						width: handleSize,
						height: handleSize,
					}}
					onMouseDown={(e) => handleMouseDown(e, "s")}
				/>
				<div
					className="absolute bg-white rounded-full border-2 border-indigo-500 cursor-ew-resize"
					style={{
						left: -handleOffset,
						top: "50%",
						transform: "translateY(-50%)",
						width: handleSize,
						height: handleSize,
					}}
					onMouseDown={(e) => handleMouseDown(e, "w")}
				/>
				<div
					className="absolute bg-white rounded-full border-2 border-indigo-500 cursor-ew-resize"
					style={{
						right: -handleOffset,
						top: "50%",
						transform: "translateY(-50%)",
						width: handleSize,
						height: handleSize,
					}}
					onMouseDown={(e) => handleMouseDown(e, "e")}
				/>
			</div>
		</div>
	);
};

export default CropOverlay;
