import type { EventBus } from "@suplai/module-sdk"

type Handler = (payload: unknown) => void

class InProcessEventBus implements EventBus {
  private listeners = new Map<string, Set<Handler>>()

  emit(event: string, payload: unknown): void {
    this.listeners.get(event)?.forEach((handler) => handler(payload))
  }

  on(event: string, handler: Handler): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(handler)
  }

  off(event: string, handler: Handler): void {
    this.listeners.get(event)?.delete(handler)
  }
}

export const eventBus: EventBus = new InProcessEventBus()
