// One instance per user/filter/preference scope, retained only during this visit.
export class QuestionPageCache<T> {
  private readonly pages = new Map<number, T>();
  private readonly pending = new Map<number, { controller: AbortController; promise: Promise<T> }>();

  constructor(
    private readonly fetchPage: (page: number, signal: AbortSignal) => Promise<T>,
    private readonly maxPages = 6,
  ) {}

  peek(page: number): T | undefined {
    const value = this.pages.get(page);
    if (this.pages.has(page)) {
      this.pages.delete(page);
      this.pages.set(page, value!);
    }
    return value;
  }

  load(page: number): Promise<T> {
    if (this.pages.has(page)) return Promise.resolve(this.peek(page)!);
    const existing = this.pending.get(page);
    if (existing) return existing.promise;

    const controller = new AbortController();
    const promise = Promise.resolve()
      .then(() => {
        if (controller.signal.aborted) throw new DOMException("Aborted", "AbortError");
        return this.fetchPage(page, controller.signal);
      })
      .then((data) => {
        // A superseded request must never populate the new scope, even if the
        // transport completed after cancellation.
        if (controller.signal.aborted) throw new DOMException("Aborted", "AbortError");
        this.pages.set(page, data);
        while (this.pages.size > this.maxPages) {
          this.pages.delete(this.pages.keys().next().value!);
        }
        return data;
      })
      .finally(() => {
        if (this.pending.get(page)?.promise === promise) this.pending.delete(page);
      });
    this.pending.set(page, { controller, promise });
    return promise;
  }

  dispose(): void {
    for (const { controller } of this.pending.values()) controller.abort();
    this.pending.clear();
    this.pages.clear();
  }
}
