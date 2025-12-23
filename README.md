# GradientVideo

A modern, browser-based video editor that lets you add beautiful gradient backgrounds, rounded corners, shadows, and custom padding to your videos. All processing happens entirely in your browser - no server required.

## ✨ Features

### 🎨 Visual Enhancements

-   **Gradient Backgrounds**: Choose from preset gradients or create custom linear/radial gradients with multiple colors
-   **Rounded Corners**: Adjustable border radius for a modern, polished look
-   **Drop Shadows**: Customizable shadow with adjustable blur, spread, and opacity
-   **Padding Control**: Fine-tune the spacing around your video

### ✂️ Video Cropping

-   **Interactive Crop Tool**: Drag handles to crop your video with real-time preview
-   **Crop Mode**: Enter crop mode to adjust existing crops or create new ones
-   **Accept/Cancel**: Preview your crop before applying or cancel to revert changes

### 📤 Export Options

-   **Multiple Formats**: Export as WebM (fast) or MP4 (compatible)
-   **Quality Presets**: Choose from 720p, 1080p, or 1440p
-   **High Quality**: Full-resolution canvas rendering for crisp exports
-   **Progress Tracking**: Real-time export progress with cancellation support

### 🎯 Additional Features

-   **Real-time Preview**: See changes instantly as you adjust settings
-   **Video Controls**: Play, pause, and scrub through your video
-   **Responsive Design**: Works on desktop and tablet devices
-   **No Upload Required**: All processing happens client-side

## 🚀 Getting Started

### Prerequisites

-   **Node.js** (v18 or higher recommended)
-   **npm** or **yarn**

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd VidBG
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

4. Open your browser and navigate to the URL shown in the terminal (typically `http://localhost:5173`)

## 📦 Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory, ready to be deployed to any static hosting service.

## 🛠️ Tech Stack

-   **React 19** - UI framework
-   **TypeScript** - Type safety
-   **Vite** - Build tool and dev server
-   **Tailwind CSS** - Styling
-   **FFmpeg.wasm** - Video processing and conversion
-   **Canvas API** - Video rendering and effects

## 📁 Project Structure

```
VidBG/
├── components/
│   ├── CropOverlay.tsx      # Interactive crop tool
│   ├── ExportModal.tsx       # Export settings modal
│   ├── ExportProgressModal.tsx # Export progress indicator
│   ├── FileUploader.tsx      # Video file upload
│   ├── Sidebar.tsx           # Settings panel
│   └── VideoPreview.tsx      # Main video preview and canvas
├── App.tsx                   # Main application component
├── types.ts                  # TypeScript type definitions
├── constants.tsx             # Default values and presets
└── vite.config.ts            # Vite configuration
```

## 🎮 Usage

1. **Upload a Video**: Click the upload area or drag and drop a video file
2. **Customize Background**:
    - Choose a preset gradient or create a custom one
    - Adjust gradient type (linear/radial) and angle
    - Add or remove gradient color stops
3. **Adjust Video Canvas**:
    - Set border radius for rounded corners
    - Adjust padding around the video
    - Control shadow blur and opacity
    - Scale the video if needed
4. **Crop Video** (optional):
    - Click "Enter Crop Mode"
    - Drag handles to adjust the crop area
    - Click "Accept" to apply or "Cancel" to revert
5. **Export**:
    - Click "Export Video"
    - Choose quality (720p, 1080p, or 1440p)
    - Select format (WebM or MP4)
    - Wait for processing and download

## ⚙️ Configuration

Default settings can be modified in `constants.tsx`:

-   `DEFAULT_CONFIG`: Default video canvas settings
-   `DEFAULT_GRADIENT`: Default gradient configuration
-   `PRESET_GRADIENTS`: Available preset gradients

## 🔧 Development

### Available Scripts

-   `npm run dev` - Start development server
-   `npm run build` - Build for production
-   `npm run preview` - Preview production build locally

### Key Implementation Details

-   **Canvas-based Rendering**: Videos are rendered to a canvas for pixel-perfect control over effects
-   **Shadow Rendering**: Shadows are drawn directly on the canvas, not via CSS, for accurate export
-   **Orientation-aware**: Automatically handles portrait and landscape videos
-   **High-quality Export**: Uses video's natural resolution for best quality

## 📝 Notes

-   **WebM Support**: WebM files may show "Infinity" duration until metadata loads
-   **Large Videos**: Very large videos may take longer to process
-   **Browser Compatibility**: Requires modern browsers with Canvas API and MediaRecorder support
-   **FFmpeg Loading**: First MP4 export loads FFmpeg.wasm from CDN (may take a moment)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

[Add your license here]

---

Built with ❤️ using React and modern web technologies.
