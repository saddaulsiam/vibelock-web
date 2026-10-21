export default function RootLoading() {
  return (
    <div className="flex min-h-[50vh] flex-1 items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
        <p className="text-muted-foreground animate-pulse text-sm">Loading...</p>
      </div>
    </div>
  );
}
