export function getWishlistSnapshot(): string {
  if (typeof window === "undefined") return "[]";
  return localStorage.getItem("vibelock_wishlist") ?? "[]";
}

export function subscribeWishlist(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  window.addEventListener("wishlist-update", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("wishlist-update", callback);
  };
}

export function getWishlistServerSnapshot(): string {
  return "[]";
}

export function toggleWishlistSlug(slug: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem("vibelock_wishlist");
    const list: string[] = raw ? JSON.parse(raw) : [];
    const exists = list.includes(slug);
    const updated = exists ? list.filter((s) => s !== slug) : [...list, slug];
    localStorage.setItem("vibelock_wishlist", JSON.stringify(updated));
    window.dispatchEvent(new Event("wishlist-update"));
    return !exists;
  } catch {
    return false;
  }
}
