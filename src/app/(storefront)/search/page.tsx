import { redirect } from "next/navigation";

interface SearchPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SearchRedirectPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const searchParamsObj = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        for (const item of value) {
          searchParamsObj.append(key, item);
        }
      } else {
        searchParamsObj.set(key, value);
      }
    }
  }

  const query = searchParamsObj.toString();
  redirect(query ? `/products?${query}` : "/products");
}
