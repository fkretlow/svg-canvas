export class EventBus {
    private listeners: {
        listener: IEventListener,
        types: Set<TEventType> | null,
    }[] = [];

    private sources: {
        source: IEventSource,
        types: Set<TEventType> | null,
    }[] = [];

    private isEventOk(type: TEventType, source: IEventSource): boolean {
        const registered = this.sources.find(s => Object.is(s.source, source));
        if (!registered) {
            console.error(`received event of type '${type}' from unregistered source`, source);
            return false;
        } else if (registered.types && !registered.types.has(type)) {
            console.error(`received event of unregistered type '${type}' from source`, source);
            return false;
        } else {
            return true;
        }
    }

    dispatch(event: IEvent, source: IEventSource): boolean {
        if (!this.isEventOk(event.type, source)) return false;
        for (let { listener, types } of this.listeners) {
            if (!types || types.has(event.type)) listener.notify(event);
        }
        return true;
    }

    registerSource(source: IEventSource): boolean {
        if (this.sources.find(s => Object.is(s.source, source))) return false;
        this.sources.push({ source, types: source.eventTypes?.sending || null });
        source.setEventDispatcher((type: TEventType, detail?: TEventDetail) => {
            this.dispatch({ type, detail }, source);
        });
        return true;
    }

    unregisterSource(source: IEventSource): boolean {
        const i = this.sources.findIndex(s => Object.is(s.source, source));
        if (i === -1) return false;
        this.sources.splice(i, 1);
        source.removeEventDispatcher();
        return true;
    }

    registerListener(listener: IEventListener): boolean {
        if (this.listeners.find(s => Object.is(s.listener, listener))) return false;
        this.listeners.push({ listener, types: listener.eventTypes?.receiving || null });
        return true;
    }

    unregisterListener(listener: IEventListener): boolean {
        const i = this.listeners.findIndex(l => Object.is(l.listener, listener));
        if (i === -1) return false;
        this.listeners.splice(i, 1);
        return true;
    }
}


export class EventReceiver implements IEventListener {
    constructor(types?: Iterable<TEventType>) {
        if (types) this.eventTypes = { receiving: new Set(types) };
    }

    public readonly eventTypes: { receiving: Set<TEventType> } | null = null;
    private handlers = new Map<TEventType, Function>();

    notify(event: IEvent): void {
        const handler = this.handlers.get(event.type);
        handler?.(event);
    }

    on(type: TEventType, handler: Function): void {
        this.handlers.set(type, handler);
    }

    off(type: TEventType): void {
        this.handlers.delete(type);
    }
}


export class EventTargetMixin implements IEventTargetMixin {
    protected eventHandlers: Map<string, Set<Function>> = new Map();

    public getHandlers(type: TEventType): Set<Function> | null {
        return this.eventHandlers.get(type) || null;
    }

    public async emitEvent(type: TEventType, detail?: TEventDetail): Promise<void> {
        this.eventHandlers.get("*")?.forEach(handler => handler({ type, detail }));
        this.eventHandlers.get(type)?.forEach(handler => handler({ type, detail }));
    }

    public on(type: string, handler: Function): void {
        const handlers = this.eventHandlers.get(type);
        if (handlers) {
            handlers.add(handler);
        } else {
            this.eventHandlers.set(type, new Set([ handler ]));
        }
    }

    public off(type: string, handler?: Function): void {
        if (handler) {
            const handlers = this.eventHandlers.get(type);
            handlers.delete(handler);
        } else {
            this.eventHandlers.delete(type);
        }
    }
}


export class EventListenerRegistry {
    private listeners = new Map<string, DynamicEventListener>();

    public registerEventListener(key: string, listener: DynamicEventListener) {
        this.listeners.set(key, listener);
    }

    public unregisterEventListener(key: string) {
        this.listeners.delete(key);
    }

    public activate(key: string)    { this.listeners.get(key)?.activate(); }

    public deactivate(key: string)  { this.listeners.get(key)?.deactivate(); }

    public setEventMask(keys: Iterable<string>) {
        if (!(keys instanceof Set)) keys = new Set(keys);
        this.listeners.forEach((listener, key) => {
            if ((<Set<string>>keys).has(key)) {
                listener.activate();
            } else {
                listener.deactivate();
            }
        });
    }
}


export class DynamicEventListener {
    constructor(
        readonly target: EventTarget,
        readonly type: string,
        readonly listener: EventListenerOrEventListenerObject,
        readonly options?: EventListenerOptions,
    ){}

    private _isActive: boolean = false;
    public get isActive(): boolean { return this._isActive; }
    private set isActive(a: boolean) { this._isActive = a; }

    public activate(): void {
        if (this.isActive) return;
        this.target.addEventListener(this.type, this.listener, this.options);
        this.isActive = true;
    }

    public deactivate(): void {
        if (!this.isActive) return;
        this.target.removeEventListener(this.type, this.listener, this.options);
        this.isActive = false;
    }
}
