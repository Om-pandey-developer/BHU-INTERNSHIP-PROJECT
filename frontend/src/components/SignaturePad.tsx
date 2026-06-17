"use client";

import React, { useRef, useState, useEffect } from "react";

interface SignaturePadProps {
  onSignatureCapture: (file: File, previewUrl: string) => void;
  onClear?: () => void;
  width?: number;
  height?: number;
}

/**
 * SignaturePad — Draw your signature directly on screen.
 * 
 * Uses HTML Canvas API for touch-optimized signature drawing.
 * Works on desktop (mouse), mobile, and tablet (touch/stylus).
 * Outputs a PNG File object + data URL preview.
 */
export default function SignaturePad({
  onSignatureCapture,
  onClear,
  width,
  height = 200,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [canvasWidth, setCanvasWidth] = useState(width || 400);

  // Responsive canvas sizing
  useEffect(() => {
    function updateWidth() {
      if (containerRef.current && !width) {
        setCanvasWidth(containerRef.current.offsetWidth - 2); // -2 for border
      }
    }
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, [width]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = "#1C1B1F";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, [canvasWidth]);

  function getPos(e: React.MouseEvent | React.TouchEvent): { x: number; y: number } {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ("touches" in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function startDrawing(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    setHasSignature(true);
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }

  function stopDrawing() {
    setIsDrawing(false);
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onClear?.();
  }

  function captureSignature() {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return;

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], "signature.png", { type: "image/png" });
      const previewUrl = canvas.toDataURL("image/png");
      onSignatureCapture(file, previewUrl);
    }, "image/png");
  }

  return (
    <div ref={containerRef} className="space-y-3">
      {/* Canvas Area */}
      <div
        className={`relative border-2 border-dashed rounded-xl overflow-hidden transition-colors ${
          isDrawing
            ? "border-primary bg-white"
            : hasSignature
              ? "border-success bg-white"
              : "border-outline-variant bg-white hover:border-primary/40"
        }`}
      >
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={height}
          className="w-full cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />

        {/* Placeholder text when empty */}
        {!hasSignature && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="material-symbols-rounded text-[32px] text-outline/30 mb-1">
              draw
            </span>
            <p className="text-sm text-outline/50">
              Draw your signature here
            </p>
            <p className="text-xs text-outline/30 mt-0.5">
              Use mouse or touch to sign
            </p>
          </div>
        )}

        {/* Signature line */}
        <div className="absolute bottom-8 left-8 right-8 border-b border-outline/20" />
        <p className="absolute bottom-2 left-8 text-[10px] text-outline/40 uppercase tracking-wider">
          Signature
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={clearCanvas}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-error hover:bg-error-container rounded-lg transition-colors cursor-pointer"
        >
          <span className="material-symbols-rounded text-[16px]">delete</span>
          Clear
        </button>

        <div className="flex-1" />

        <button
          type="button"
          onClick={captureSignature}
          disabled={!hasSignature}
          className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            hasSignature
              ? "bg-primary text-white hover:bg-primary-dark"
              : "bg-surface-variant text-outline cursor-not-allowed"
          }`}
        >
          <span className="material-symbols-rounded text-[16px]">check</span>
          Use This Signature
        </button>
      </div>
    </div>
  );
}
