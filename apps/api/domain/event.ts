import { DomainContext } from './context'

// 実際にドメインイベントを使う時はこの placeholder を置き換える
export type DomainEvent = { type: '__placeholder__' }

export type MaybeContainsDomainEvents<T, K extends DomainEvent['type'] = DomainEvent['type']> = T & {
  __domainEvents?: Extract<DomainEvent, { type: K }>[]
}

export type Listener<Tx, Data> = (ctx: DomainContext, tx: Tx, data: Data) => Promise<void> | void

export type DomainEventInternalListener<Tx> = Listener<
  Tx,
  [eventName: keyof DomainEvent['type'], listener: Listener<Tx, Array<unknown>>]
>

export class DomainEventEmitter<Tx> {
  // NOTE: ここの any は取り除きようがないので許容する
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  listeners: Map<DomainEvent['type'], Listener<Tx, any>[]> = new Map()

  on<K extends DomainEvent['type']>(type: K, handler: Listener<Tx, Extract<DomainEvent, { type: K }>>) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), handler])
  }

  async emit<K extends DomainEvent['type']>(
    ctx: DomainContext,
    tx: Tx,
    eventName: K,
    event: Extract<DomainEvent, { type: K }>,
  ) {
    const handlers = this.listeners.get(eventName)
    if (handlers != null) {
      await Promise.all(handlers.map((f) => f(ctx, tx, event)))
    }
  }
}
