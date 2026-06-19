export interface EventBus {
  emit(event: string, payload: unknown): void
  on(event: string, handler: (payload: unknown) => void): void
  off(event: string, handler: (payload: unknown) => void): void
}
