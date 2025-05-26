/**
 * EventBus
 *
 * Implementation of the event bus pattern for domain events.
 * Provides publish-subscribe functionality for loose coupling between components.
 */
export class EventBus {
  private static instance: EventBus;
  private handlers: Map<string, Function[]> = new Map();

  private constructor() {}

  /**
   * Gets the singleton instance of EventBus.
   * @returns EventBus instance
   */
  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /**
   * Registers an event handler for a specific event type.
   * @param eventType The event type to subscribe to
   * @param handler The handler function to be called when the event occurs
   */
  public subscribe(eventType: string, handler: Function): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }

    const eventHandlers = this.handlers.get(eventType)!;
    if (!eventHandlers.includes(handler)) {
      eventHandlers.push(handler);
    }
  }

  /**
   * Unregisters an event handler for a specific event type.
   * @param eventType The event type to unsubscribe from
   * @param handler The handler function to be removed
   */
  public unsubscribe(eventType: string, handler: Function): void {
    if (!this.handlers.has(eventType)) {
      return;
    }

    const eventHandlers = this.handlers.get(eventType)!;
    const index = eventHandlers.indexOf(handler);
    if (index !== -1) {
      eventHandlers.splice(index, 1);
    }

    // Remove the event type if there are no more handlers
    if (eventHandlers.length === 0) {
      this.handlers.delete(eventType);
    }
  }

  /**
   * Publishes an event to all registered handlers.
   * @param eventType The type of event to publish
   * @param event The event data
   */
  public publish(eventType: string, event: any): void {
    if (!this.handlers.has(eventType)) {
      return;
    }

    const eventHandlers = this.handlers.get(eventType)!;
    for (const handler of eventHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error(`Error in event handler for ${eventType}:`, error);
      }
    }
  }

  /**
   * Clears all event handlers.
   */
  public clear(): void {
    this.handlers.clear();
  }
}
