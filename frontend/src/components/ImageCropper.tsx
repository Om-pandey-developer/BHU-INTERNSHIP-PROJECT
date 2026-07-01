"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Cropper from 'react-easy-crop';
import Button from './Button';

interface Point {
  x: number;
  y: number;
}

interface Area {
  width: number;
  height: number;
  x: number;
  y: number;
}

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedAreaPixels: Area) => void;
  onCancel: () => void;
  aspectRatio?: number;
  title?: string;
}

export default function ImageCropper({
  imageSrc,
  onCropComplete,
  onCancel,
  aspectRatio = 3 / 4,
  title = "Crop Photo (3:4 Ratio)",
}: ImageCropperProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropChange = (crop: Point) => {
    setCrop(crop);
  };

  const onZoomChange = (zoom: number) => {
    setZoom(zoom);
  };

  const onCropCompleteInternal = useCallback(
    (croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const handleSave = () => {
    if (croppedAreaPixels) {
      onCropComplete(croppedAreaPixels);
    }
  };

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-slide-up mx-4">
        <div className="p-4 border-b border-outline-variant flex justify-between items-center">
          <h3 className="text-lg font-bold text-foreground">{title}</h3>
          <button onClick={onCancel} className="text-outline hover:text-foreground">
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>
        
        <div className="relative w-full h-[400px] bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio}
            onCropChange={onCropChange}
            onCropComplete={onCropCompleteInternal}
            onZoomChange={onZoomChange}
            showGrid={true}
          />
        </div>
        
        <div className="p-4 bg-surface space-y-4">
          <div>
            <label className="text-xs font-semibold text-outline block mb-1">Zoom</label>
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>
          
          {croppedAreaPixels && (
            <div className="text-xs text-center text-outline">
              Cropped Size: <span className="font-semibold text-foreground">{croppedAreaPixels.width} x {croppedAreaPixels.height} pixels</span>
            </div>
          )}
          
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outlined" onClick={onCancel}>
              Cancel
            </Button>
            <Button icon="crop" onClick={handleSave}>
              Apply Crop
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
