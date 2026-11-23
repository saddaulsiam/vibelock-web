"use client";

import * as React from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Globe, ImagePlus, Star, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export type ProductImageItem = {
  id: string;
  url: string;
  file?: File;
  isExisting?: boolean;
  isLandscape?: boolean;
};

interface ProductImageUploaderProps {
  initialImages?: { url: string; alt?: string | null; isPrimary?: boolean }[];
  onImagesChange?: (images: { url: string; isPrimary: boolean }[]) => void;
}

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_IMAGES = 12;

// Client-side image pre-compression for large images (>1MB) to prevent Vercel upload timeouts
async function compressImageFile(file: File): Promise<File> {
  if (file.size <= 1024 * 1024 || file.type === "image/svg+xml" || file.type === "image/gif") {
    return file;
  }
  if (typeof window === "undefined" || !window.document) {
    return file;
  }

  return new Promise((resolve) => {
    const img = new window.Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const maxDim = 2000;
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            resolve(file);
            return;
          }
          const originalName = file.name.replace(/\.[^.]+$/, "");
          const compressed = new File([blob], `${originalName}.webp`, {
            type: "image/webp",
            lastModified: Date.now(),
          });
          resolve(compressed);
        },
        "image/webp",
        0.85
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };
    img.src = objectUrl;
  });
}

function checkImageOrientation(url: string): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      resolve(img.naturalWidth > img.naturalHeight * 1.25);
    };
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

export function ProductImageUploader({
  initialImages = [],
  onImagesChange,
}: ProductImageUploaderProps) {
  const [images, setImages] = React.useState<ProductImageItem[]>(() =>
    initialImages.map((img, index) => ({
      id: `init-${index}-${img.url}`,
      url: img.url,
      isExisting: true,
    }))
  );

  React.useEffect(() => {
    onImagesChange?.(
      images.map((item, index) => ({
        url: item.url,
        isPrimary: index === 0,
      }))
    );
  }, [images, onImagesChange]);

  const [useUrlInput, setUseUrlInput] = React.useState(false);
  const [externalUrlText, setExternalUrlText] = React.useState("");
  const [isDragging, setIsDragging] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Synchronize DataTransfer with file input element whenever images change
  const syncFileInput = React.useCallback((currentImages: ProductImageItem[]) => {
    if (!fileInputRef.current) return;
    try {
      const dt = new DataTransfer();
      currentImages.forEach((item) => {
        if (item.file) {
          dt.items.add(item.file);
        }
      });
      fileInputRef.current.files = dt.files;
    } catch {
      // In older headless test environments DataTransfer might not be available
    }
  }, []);

  const handleFiles = async (fileList: FileList | File[]) => {
    const filesArray = Array.from(fileList);
    if (!filesArray.length) return;

    if (images.length + filesArray.length > MAX_IMAGES) {
      toast.error(`You can only upload up to ${MAX_IMAGES} images in total.`);
    }

    const availableSlots = Math.max(0, MAX_IMAGES - images.length);
    const filesToProcess = filesArray.slice(0, availableSlots);

    const newItems: ProductImageItem[] = [];

    for (const file of filesToProcess) {
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        toast.error(
          `"${file.name}" is not a supported format. Please use JPG, PNG, WebP, GIF, or AVIF.`
        );
        continue;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast.error(`"${file.name}" exceeds 5MB limit. Please compress or choose a smaller image.`);
        continue;
      }

      let processedFile = file;
      if (file.size > 1024 * 1024) {
        try {
          const compressed = await compressImageFile(file);
          if (compressed.size < file.size) {
            const savedPct = Math.round((1 - compressed.size / file.size) * 100);
            toast.info(
              `"${file.name}" optimized (-${savedPct}% size reduction for faster upload).`
            );
            processedFile = compressed;
          }
        } catch {
          // Keep original file on error
        }
      }

      const objectUrl = URL.createObjectURL(processedFile);
      const isLandscape = await checkImageOrientation(objectUrl);

      newItems.push({
        id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        url: objectUrl,
        file: processedFile,
        isLandscape,
      });
    }

    if (newItems.length > 0) {
      const updated = [...images, ...newItems];
      setImages(updated);
      syncFileInput(updated);
      toast.success(
        newItems.length === 1
          ? "Image added to gallery."
          : `${newItems.length} images added to gallery.`
      );
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleAddExternalUrls = async () => {
    const lines = externalUrlText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (!lines.length) {
      toast.error("Please enter at least one image URL.");
      return;
    }

    const validUrls: string[] = [];
    for (const line of lines) {
      if (line.startsWith("/uploads/") || /^https?:\/\//i.test(line)) {
        validUrls.push(line);
      } else {
        toast.error(`Invalid URL: ${line}`);
      }
    }

    if (images.length + validUrls.length > MAX_IMAGES) {
      toast.error(`A product can have at most ${MAX_IMAGES} images.`);
    }

    const availableSlots = Math.max(0, MAX_IMAGES - images.length);
    const urlsToAdd = validUrls.slice(0, availableSlots);

    const newEntries: ProductImageItem[] = [];
    for (const url of urlsToAdd) {
      const isLandscape = await checkImageOrientation(url);
      newEntries.push({
        id: `url-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        url,
        isLandscape,
      });
    }

    if (newEntries.length > 0) {
      const updated = [...images, ...newEntries];
      setImages(updated);
      syncFileInput(updated);
      setExternalUrlText("");
      toast.success(
        newEntries.length === 1
          ? "External image added."
          : `${newEntries.length} external images added.`
      );
    }
  };

  const handleRemove = (index: number) => {
    const itemToRemove = images[index];
    if (itemToRemove?.url.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(itemToRemove.url);
      } catch {
        // Safe fallback
      }
    }

    const updated = images.filter((_, i) => i !== index);
    setImages(updated);
    syncFileInput(updated);
  };

  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null);

  const handleMakePrimary = (index: number) => {
    if (index === 0) return;
    const target = images[index];
    const rest = images.filter((_, i) => i !== index);
    const updated = [target, ...rest];
    setImages(updated);
    syncFileInput(updated);
    toast.success("Set as primary lookbook cover!");
  };

  const handleMoveImage = (index: number, direction: "left" | "right") => {
    const targetIndex = direction === "left" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= images.length) return;
    const next = [...images];
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;
    setImages(next);
    syncFileInput(next);
  };

  const handleTileDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleTileDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleTileDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }
    const next = [...images];
    const [moved] = next.splice(draggedIndex, 1);
    next.splice(dropIndex, 0, moved);
    setImages(next);
    syncFileInput(next);
    setDraggedIndex(null);
    setDragOverIndex(null);
    toast.success("Images reordered!");
  };

  const handleTileDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Generate image manifest for server-side reconstruction
  const imageManifest = React.useMemo(() => {
    let fileCounter = 0;
    return images.map((item) => {
      if (item.file) {
        const fileIndex = fileCounter++;
        return { type: "file" as const, fileIndex };
      }
      return { type: "url" as const, value: item.url };
    });
  }, [images]);

  // URLs for backward-compatibility or direct form submission
  const existingOrExternalUrls = React.useMemo(() => {
    return images.filter((i) => !i.file).map((i) => i.url);
  }, [images]);

  return (
    <fieldset className="border-vl-dark-900/10 space-y-5 rounded-sm border bg-white p-5 shadow-xs sm:p-6">
      {/* Hidden inputs to feed formData */}
      <input
        ref={fileInputRef}
        id="product-image-files"
        type="file"
        name="imageFiles"
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        onChange={handleFileChange}
        className="sr-only"
      />
      <input type="hidden" name="imageUrls" value={existingOrExternalUrls.join("\n")} />
      <input type="hidden" name="imageManifest" value={JSON.stringify(imageManifest)} />

      {/* Header with Title and Mode Toggle */}
      <div className="border-vl-dark-900/10 flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div className="flex items-center gap-2.5">
          <span className="bg-vl-dark-900 flex size-6.5 items-center justify-center rounded-sm font-mono text-[11px] font-bold text-white shadow-2xs">
            02
          </span>
          <div>
            <legend className="text-vl-dark-900 font-heading text-base font-bold tracking-tight">
              Media &amp; Lookbook Gallery
            </legend>
            <p className="text-muted-foreground text-xs">
              Upload product gallery and thumbnail images. First image is used as primary lookbook
              cover.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="2xs"
          onClick={() => setUseUrlInput((prev) => !prev)}
        >
          {useUrlInput ? (
            <>
              <Upload className="size-3.5" /> Upload local files instead
            </>
          ) : (
            <>
              <Globe className="size-3.5" /> Use external image URLs
            </>
          )}
        </Button>
      </div>

      {/* File Upload Mode (Drag & Drop / Click zone) */}
      {!useUrlInput ? (
        <div>
          <label
            htmlFor="product-image-files"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-sm border-2 border-dashed p-7 text-center transition-all ${
              isDragging
                ? "border-vl-cyan bg-vl-cyan-50 scale-[1.01]"
                : "border-vl-dark-900/20 hover:border-vl-cyan bg-vl-white-100/60 hover:bg-vl-white-200/60"
            }`}
          >
            <div className="border-vl-dark-900/10 text-vl-dark-900 flex size-12 items-center justify-center rounded-full bg-white shadow-2xs">
              <ImagePlus className="text-vl-dark-900/70 size-6" />
            </div>
            <span className="text-vl-dark-900 font-heading mt-3 text-sm font-bold tracking-tight">
              {images.length > 0
                ? "Add more product images"
                : "Click or drag to upload lookbook photos"}
            </span>
            <span className="text-muted-foreground mt-1 text-xs">
              Uploads directly to Cloudinary CDN • Supports JPG, PNG, WebP, GIF, or AVIF (Max 5MB
              each, up to 12 images)
            </span>
          </label>
        </div>
      ) : (
        /* External URL Input Mode */
        <div className="space-y-2">
          <label className="text-vl-dark-900 block text-xs font-semibold">
            Paste Image URLs (One URL per line)
            <div className="mt-1.5">
              <Textarea
                className="min-h-24 resize-y font-mono text-xs"
                value={externalUrlText}
                onChange={(e) => setExternalUrlText(e.target.value)}
                placeholder="https://res.cloudinary.com/.../front.webp&#10;https://res.cloudinary.com/.../back.webp"
              />
            </div>
          </label>
          <div className="flex justify-end">
            <Button type="button" variant="primary" size="sm" onClick={handleAddExternalUrls}>
              Add to gallery
            </Button>
          </div>
        </div>
      )}

      {/* Live Previews Gallery Grid */}
      {images.length > 0 && (
        <div className="space-y-2.5 pt-2">
          <div className="text-muted-foreground flex items-center justify-between text-xs">
            <span>
              Gallery preview ({images.length} of {MAX_IMAGES} images) •{" "}
              <span className="text-vl-dark-900 font-medium">Drag &amp; drop to reorder</span>
            </span>
            <span className="text-[11px]">First image is Primary</span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {images.map((item, index) => {
              const isPrimary = index === 0;
              const isBeingDragged = draggedIndex === index;
              const isDragOver = dragOverIndex === index;

              return (
                <div
                  key={item.id}
                  draggable={true}
                  onDragStart={(e) => handleTileDragStart(e, index)}
                  onDragOver={(e) => handleTileDragOver(e, index)}
                  onDrop={(e) => handleTileDrop(e, index)}
                  onDragEnd={handleTileDragEnd}
                  className={`group bg-vl-white-300 relative aspect-square cursor-grab overflow-hidden rounded border shadow-xs transition-all active:cursor-grabbing ${
                    isPrimary ? "border-vl-dark-900 ring-vl-cyan ring-2" : "border-vl-dark-900/20"
                  } ${isBeingDragged ? "scale-95 opacity-30" : ""} ${
                    isDragOver
                      ? "ring-vl-cyan border-vl-cyan scale-[1.02] ring-2 ring-offset-2"
                      : ""
                  }`}
                >
                  <Image
                    src={item.url}
                    alt={`Product image ${index + 1}`}
                    fill
                    unoptimized={item.url.startsWith("blob:") || item.url.startsWith("/uploads/")}
                    className="object-cover"
                  />

                  {/* Gradient overlays */}
                  <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-black/60 via-transparent to-black/70" />

                  {/* Top Badge & Reorder Arrows */}
                  <div className="absolute top-2 right-2 left-2 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {isPrimary ? (
                        <span className="bg-vl-dark-900 text-vl-cyan inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase shadow-xs backdrop-blur-sm">
                          <Star className="fill-vl-cyan size-3" /> Primary
                        </span>
                      ) : (
                        <span className="rounded bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                          #{index + 1}
                        </span>
                      )}

                      {item.file && (
                        <span className="rounded bg-blue-600/90 px-1.5 py-0.5 text-[9px] font-medium text-white backdrop-blur-sm">
                          New
                        </span>
                      )}

                      {item.isLandscape && (
                        <span
                          title="Landscape image detected. 4:5 portrait or 1:1 square is recommended for streetwear lookbooks."
                          className="inline-flex items-center gap-0.5 rounded bg-amber-600/90 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-xs backdrop-blur-sm"
                        >
                          ⚠️ Landscape
                        </span>
                      )}
                    </div>

                    {/* Order adjustment buttons */}
                    <div className="flex items-center gap-1">
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => handleMoveImage(index, "left")}
                          title="Move image earlier"
                          className="flex size-6 items-center justify-center rounded bg-black/75 text-white shadow-xs backdrop-blur-sm transition-colors hover:bg-black"
                        >
                          <ChevronLeft className="size-3.5" />
                        </button>
                      )}
                      {index < images.length - 1 && (
                        <button
                          type="button"
                          onClick={() => handleMoveImage(index, "right")}
                          title="Move image later"
                          className="flex size-6 items-center justify-center rounded bg-black/75 text-white shadow-xs backdrop-blur-sm transition-colors hover:bg-black"
                        >
                          <ChevronRight className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Bottom Action Bar */}
                  <div className="absolute right-2 bottom-2 left-2 flex items-center justify-between gap-1">
                    {!isPrimary ? (
                      <Button
                        type="button"
                        size="xs"
                        variant="secondary"
                        onClick={() => handleMakePrimary(index)}
                        className="h-6 rounded bg-black/75 px-2 text-[10px] font-semibold text-white shadow-xs backdrop-blur-sm hover:bg-black"
                      >
                        Set primary
                      </Button>
                    ) : (
                      <span className="text-[10px] font-medium text-white/80">Main cover</span>
                    )}

                    <Button
                      type="button"
                      size="xs"
                      variant="destructive"
                      onClick={() => handleRemove(index)}
                      title="Remove image"
                      className="inline-flex h-6 items-center gap-1 rounded px-2 text-[10px] font-semibold text-white shadow-xs backdrop-blur-sm"
                    >
                      <Trash2 className="size-3" />
                      <span>Remove</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </fieldset>
  );
}
