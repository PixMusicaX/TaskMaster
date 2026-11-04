// The data a page's server half hands its view as a promise (see app/(app)/home/page.tsx). On the
// client it arrives as React's own thenable, whose then() returns nothing, so it can't be chained
// (`.catch().then()` throws). This makes it a real promise, and one that never rejects: a failed
// head start is null, and the view loads its data itself.
export function headStart<T>(initial: PromiseLike<T | null> | null | undefined): Promise<T | null> {
  return Promise.resolve(initial).then(data => data ?? null, () => null);
}
