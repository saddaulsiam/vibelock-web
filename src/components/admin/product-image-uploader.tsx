"use client";

import * as React from "react";
import Image from "next/image";
import { Globe, ImagePlus, Star, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

export type ProductImageItem = {
  id: string;
  url: string;
  file?: File;
  isExisting?: boolean;
};

interface ProductImageUploaderProps {
  initialImages?: { url: string; alt?: string | null; isPrimary?: boolean }[];
  onImagesChange?: (images: { url: string; isPrimary: boolean }[]) => void;
}

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_IMAGES = 12;

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

  const handleFiles = (fileList: FileList | File[]) => {
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

      const objectUrl = URL.createObjectURL(file);
      newItems.push({
        id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        url: objectUrl,
        file,
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

  const handleAddExternalUrls = () => {
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

    const newEntries: ProductImageItem[] = urlsToAdd.map((url) => ({
      id: `url-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      url,
    }));

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

  const handleMakePrimary = (index: number) => {
    if (index === 0) return;
    const target = images[index];
    const rest = images.filter((_, i) => i !== index);
    const updated = [target, ...rest];
    setImages(updated);
    syncFileInput(updated);
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

  const fieldClass =
    "mt-1.5 min-h-11 w-full border border-[#101114]/20 bg-white px-3 py-2 text-sm text-[#101114] outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF]";

  return (
    <fieldset className="space-y-4 border border-[#101114]/15 bg-[#FBF9F5] p-4 sm:p-5">
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <legend className="px-1 text-sm font-semibold text-[#101114]">Product images</legend>
          <p className="text-muted-foreground px-1 text-xs">
            Upload product gallery and thumbnail images. The first image is used as the primary
            display.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setUseUrlInput((prev) => !prev)}
          className="text-muted-foreground inline-flex items-center gap-1.5 text-xs font-semibold underline underline-offset-4 hover:text-[#101114]"
        >
          {useUrlInput ? (
            <>
              <Upload className="size-3.5" /> Upload local files instead
            </>
          ) : (
            <>
              <Globe className="size-3.5" /> Or use external image URLs
            </>
          )}
        </button>
      </div>

      {/* File Upload Mode (Drag & Drop / Click zone) */}
      {!useUrlInput ? (
        <div>
          <label
            htmlFor="product-image-files"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex cursor-pointer flex-col items-center justify-center rounded border-2 border-dashed p-6 text-center transition-all ${
              isDragging
                ? "scale-[1.01] border-[#00D9FF] bg-[#00D9FF]/10"
                : "border-[#101114]/20 bg-white/50 hover:border-[#00D9FF] hover:bg-white/70"
            }`}
          >
            <div className="flex size-12 items-center justify-center rounded-full bg-[#101114]/5 text-[#101114]">
              <ImagePlus className="size-6 text-[#101114]/70" />
            </div>
            <span className="mt-3 text-sm font-semibold text-[#101114]">
              {images.length > 0 ? "Add more product images" : "Click or drag to upload images"}
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
          <label className="block text-xs font-semibold text-[#101114]">
            Paste Image URLs (One URL per line)
            <textarea
              className={`${fieldClass} min-h-24 resize-y font-mono text-xs`}
              value={externalUrlText}
              onChange={(e) => setExternalUrlText(e.target.value)}
              placeholder="https://res.cloudinary.com/.../front.webp&#10;https://res.cloudinary.com/.../back.webp"
            />
          </label>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleAddExternalUrls}
              className="inline-flex h-9 items-center border border-[#101114] bg-[#101114] px-3.5 text-xs font-medium text-[#F3F0E8] transition-colors hover:bg-black/85"
            >
              Add to gallery
            </button>
          </div>
        </div>
      )}

      {/* Live Previews Gallery Grid */}
      {images.length > 0 && (
        <div className="space-y-2.5 pt-2">
          <div className="text-muted-foreground flex items-center justify-between text-xs">
            <span>
              Gallery preview ({images.length} of {MAX_IMAGES} images)
            </span>
            <span className="text-[11px]">First image is Primary</span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {images.map((item, index) => {
              const isPrimary = index === 0;
              return (
                <div
                  key={item.id}
                  className={`group relative aspect-square overflow-hidden rounded border bg-[#F3F0E8] shadow-xs transition-all ${
                    isPrimary ? "border-[#101114] ring-2 ring-[#00D9FF]" : "border-[#101114]/20"
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

                  {/* Top Badge */}
                  <div className="absolute top-2 right-2 left-2 flex items-center justify-between">
                    {isPrimary ? (
                      <span className="inline-flex items-center gap-1 rounded bg-[#101114] px-2 py-0.5 text-[10px] font-bold tracking-wider text-[#00D9FF] uppercase shadow-xs backdrop-blur-sm">
                        <Star className="size-3 fill-[#00D9FF]" /> Primary
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
                  </div>

                  {/* Bottom Action Bar */}
                  <div className="absolute right-2 bottom-2 left-2 flex items-center justify-between gap-1">
                    {!isPrimary ? (
                      <button
                        type="button"
                        onClick={() => handleMakePrimary(index)}
                        className="rounded bg-black/75 px-2 py-1 text-[10px] font-semibold text-white shadow-xs backdrop-blur-sm transition hover:bg-black"
                      >
                        Set primary
                      </button>
                    ) : (
                      <span className="text-[10px] font-medium text-white/80">Main cover</span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleRemove(index)}
                      title="Remove image"
                      className="inline-flex items-center gap-1 rounded bg-red-600/90 px-2 py-1 text-[10px] font-semibold text-white shadow-xs backdrop-blur-sm transition hover:bg-red-600"
                    >
                      <Trash2 className="size-3" />
                      <span>Remove</span>
                    </button>
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
