
import React, { useRef, useState } from 'react';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFileSelect }) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('video/')) {
      onFileSelect(files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`
        relative border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all duration-300
        ${isDragging ? 'border-indigo-500 bg-indigo-500/10' : 'border-zinc-700 bg-zinc-900/50 hover:border-zinc-500 hover:bg-zinc-800/50'}
      `}
    >
      <input 
        ref={inputRef}
        type="file" 
        accept="video/*" 
        className="hidden" 
        onChange={handleChange}
      />
      <div className="mb-6">
        <div className="w-20 h-20 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <i className="fa-solid fa-cloud-arrow-up text-3xl text-indigo-400"></i>
        </div>
      </div>
      <h3 className="text-xl font-semibold mb-2">Drop your video here</h3>
      <p className="text-zinc-500 mb-6">Or click to browse from your device</p>
      <div className="inline-flex items-center px-4 py-2 bg-indigo-600 rounded-xl text-sm font-medium hover:bg-indigo-500 transition-colors">
        Choose File
      </div>
      
      <div className="mt-8 grid grid-cols-2 gap-4 text-left">
        <div className="flex items-center gap-2 text-zinc-500 text-sm">
          <i className="fa-solid fa-check text-indigo-500"></i>
          MP4, MOV, WEBM
        </div>
        <div className="flex items-center gap-2 text-zinc-500 text-sm">
          <i className="fa-solid fa-check text-indigo-500"></i>
          Max 100MB
        </div>
      </div>
    </div>
  );
};

export default FileUploader;
