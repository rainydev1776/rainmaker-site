"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Camera, X } from "lucide-react";
import Image from "next/image";
import Cropper from "react-easy-crop";
import type { Area, Point } from "react-easy-crop";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ProfileSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentImage?: string;
  currentDisplayName?: string;
  onSave?: (data: { displayName: string; croppedImage?: string }) => void | Promise<void>;
}

// Helper function to create cropped image
const createCroppedImage = async (
  imageSrc: string,
  pixelCrop: Area
): Promise<string> => {
  const image = new window.Image();
  image.src = imageSrc;

  return new Promise((resolve, reject) => {
    image.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("No 2d context"));
        return;
      }

      // Set canvas size to the crop area
      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;

      // Draw the cropped image
      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
      );

      // Convert to data URL
      resolve(canvas.toDataURL("image/jpeg", 0.9));
    };

    image.onerror = () => {
      reject(new Error("Failed to load image"));
    };
  });
};

export const ProfileSettingsDialog = ({
  open,
  onOpenChange,
  currentImage,
  currentDisplayName = "",
  onSave,
}: ProfileSettingsDialogProps) => {
  const [displayName, setDisplayName] = useState(currentDisplayName);
  const [previewImage, setPreviewImage] = useState<string | null>(
    currentImage || null
  );
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setSaveErr(null);
    setSaving(false);
    setDisplayName(String(currentDisplayName || "").slice(0, 9));
    setPreviewImage(currentImage || null);
  }, [open, currentDisplayName, currentImage]);

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageToCrop(e.target?.result as string);
        setIsCropping(true);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
      };
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = useCallback(
    (_croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const handleCropApply = async () => {
    if (!imageToCrop || !croppedAreaPixels) return;

    try {
      const croppedImage = await createCroppedImage(
        imageToCrop,
        croppedAreaPixels
      );
      setPreviewImage(croppedImage);
      setIsCropping(false);
      setImageToCrop(null);
    } catch (error) {
      console.error("Error cropping image:", error);
    }
  };

  const handleCropCancel = () => {
    setIsCropping(false);
    setImageToCrop(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    setSaveErr(null);
    setSaving(true);
    try {
      await onSave?.({
        displayName,
        croppedImage: previewImage || undefined,
      });
      onOpenChange(false);
    } catch (e: any) {
      const msg = e?.message ? String(e.message) : String(e);
      setSaveErr(msg || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveImage = () => {
    setPreviewImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[420px] border-0 p-0"
        style={{
          borderRadius: "12px",
          background:
            "linear-gradient(0deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.02) 100%), #0D0D0F",
          boxShadow: "0 0 0 1px #292929, 0 0 0 2px #0A0A0A",
        }}
      >
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-lg font-semibold text-white">
            {isCropping ? "Adjust Image" : "Profile Settings"}
          </DialogTitle>
        </DialogHeader>

        <div className="p-6">
          {isCropping && imageToCrop ? (
            /* Image Cropper View */
            <div className="space-y-4">
              <div
                className="relative h-72 w-full overflow-hidden rounded-xl"
                style={{ background: "#000" }}
              >
                <Cropper
                  image={imageToCrop}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                  style={{
                    containerStyle: {
                      borderRadius: "12px",
                    },
                  }}
                />
              </div>

              {/* Zoom Slider */}
              <div className="flex items-center gap-3 px-2">
                <span className="text-xs text-[#757575]">Zoom</span>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-1 h-1 appearance-none rounded-full bg-zinc-700 accent-cyan-500 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-500"
                />
              </div>

              <p className="text-center text-xs text-[#757575]">
                Drag to reposition • Use slider to zoom
              </p>

              {/* Cropper Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleCropCancel}
                  className="flex-1 rounded-full py-3 text-sm font-medium text-zinc-400 transition-all hover:text-white"
                  style={{
                    background: "rgba(255, 255, 255, 0.02)",
                    boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.10) inset",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCropApply}
                  className="flex-1 rounded-full py-3 text-sm font-medium text-white transition-all hover:brightness-110"
                  style={{
                    background: "#0EA5E9",
                    boxShadow: "0 1px 0 0 rgba(14, 165, 233, 0.10) inset",
                  }}
                >
                  Apply
                </button>
              </div>
            </div>
          ) : (
            /* Normal Settings View */
            <div className="space-y-6">
              {/* Profile Image */}
              <div className="flex flex-col items-center">
                <p className="mb-3 text-sm text-[#757575]">Profile Image</p>
                <div className="relative">
                  <button
                    onClick={handleImageClick}
                    className="group relative h-24 w-24 overflow-hidden rounded-full transition-all hover:ring-2 hover:ring-cyan-500/50"
                  >
                    <Image
                      src={previewImage || "/rainmaker-pfp.png"}
                      alt="Profile"
                      fill
                      sizes="96px"
                      quality={100}
                      className="object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                      <Camera className="h-6 w-6 text-white" />
                    </div>
                  </button>
                  {previewImage && (
                    <button
                      onClick={handleRemoveImage}
                      className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white transition-colors hover:bg-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <p className="mt-2 text-xs text-[#757575]">
                  Click to upload a new image
                </p>
              </div>

              {/* Display Name */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm text-[#757575]">Display Name</label>
                  <span className={`text-[10px] ${displayName.length >= 9 ? "text-[#FF0066]" : "text-[#757575]"}`}>
                    {displayName.length}/9
                  </span>
                </div>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value.slice(0, 9))}
                  maxLength={9}
                  placeholder="Enter a name"
                  className="w-full rounded-xl px-4 py-3 text-white placeholder:text-[#757575] outline-none transition-all focus:ring-1 focus:ring-cyan-500/50"
                  style={{
                    background: "rgba(255, 255, 255, 0.02)",
                    boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.10) inset",
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => onOpenChange(false)}
                  disabled={saving}
                  className="flex-1 rounded-full py-3 text-sm font-medium text-zinc-400 transition-all hover:text-white"
                  style={{
                    background: "rgba(255, 255, 255, 0.02)",
                    boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.10) inset",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 rounded-full py-3 text-sm font-medium text-white transition-all hover:brightness-110"
                  style={{
                    background: "#0EA5E9",
                    boxShadow: "0 1px 0 0 rgba(14, 165, 233, 0.10) inset",
                  }}
                >
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
              {saveErr && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                  {saveErr}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
