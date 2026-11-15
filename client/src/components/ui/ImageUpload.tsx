"use client";

import { Camera, User } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { getInitials } from "@/lib/utils";

interface ImageUploadProps {
  value: File | null;
  previewUrl: string | null;
  name?: string;
  onChange: (file: File | null) => void;
  onRemoveExisting?: () => void;
  existingRemoved?: boolean;
}

export function ImageUpload({
  value,
  previewUrl,
  name = "",
  onChange,
  onRemoveExisting,
  existingRemoved = false,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const displayUrl = localPreview || (!existingRemoved ? previewUrl : null);

  const handleFile = (file: File | null) => {
    if (localPreview) URL.revokeObjectURL(localPreview);
    if (file) {
      setLocalPreview(URL.createObjectURL(file));
      onChange(file);
    } else {
      setLocalPreview(null);
      onChange(null);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative w-28 h-28 rounded-full overflow-hidden border-4 border-slate-100 bg-slate-50 shadow-inner group"
      >
        {displayUrl ? (
          <Image
            src={displayUrl}
            alt={name || "Patient photo"}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
            {name ? (
              <span className="text-2xl font-bold text-blue-600">
                {getInitials(name)}
              </span>
            ) : (
              <User size={36} className="text-slate-300" />
            )}
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Camera size={24} className="text-white" />
        </div>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />
      <div className="flex gap-2">
        <button
          type="button"
          className="text-xs text-blue-600 hover:underline"
          onClick={() => inputRef.current?.click()}
        >
          {displayUrl ? "Change photo" : "Upload photo"}
        </button>
        {displayUrl && (
          <button
            type="button"
            className="text-xs text-red-500 hover:underline"
            onClick={() => {
              handleFile(null);
              if (inputRef.current) inputRef.current.value = "";
              onRemoveExisting?.();
            }}
          >
            Remove
          </button>
        )}
      </div>
      <p className="text-xs text-slate-400">JPG, PNG or WEBP. Max 2MB.</p>
    </div>
  );
}
