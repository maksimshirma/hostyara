export interface SharedStateAccessor<T> {
  get(): Readonly<T>;
  subscribe(listener: (state: Readonly<T>) => void): () => void;
  set(patch: Partial<T>): void;
}
