/// <reference types="@sveltejs/kit" />


type TId = string;

type TCSSStylesCollection = { [property: string]: string };

interface IPoint {
    x: number;
    y: number;
}

interface ISize {
    width: number;
    height: number;
}

interface IRectangle extends IPoint, ISize {
    color: string;
}


type TEventType = string;
type TEventDetail = any;
interface IEvent {
    type: TEventType;
    detail?: TEventDetail;
}

type TEventDispatcher = ((type: TEventType, detail?: TEventDetail) => void);

interface IEventSource {
    setEventDispatcher(dispatcher: TEventDispatcher): void;
    removeEventDispatcher(): void;
    eventTypes?: {
        sending?: Set<TEventType>,
    };
}

interface IEventListener {
    notify(event: IEvent): any;
    eventTypes?: {
        receiving?: Set<TEventType>,
    };
}

interface IEventTarget {
    on(type: TEventType, handler: Function): any;
    off(type: TEventType, handler?: Function): any;
}

interface IEventTargetMixin extends IEventTarget {
    emitEvent(type: TEventType, detail?: TEventDetail): Promise<void>;
}

type TMouseEventHandler = ((e: MouseEvent) => any);
type TCanvasItemGetter = ((id: TId) => ICanvasItem | null);

interface ICanvas {
    setTruth(data: Iterable<ICanvasSourceItem>): ICanvas;
    mount(parent: HTMLElement): ICanvas;
    unmount(): ICanvas;
    update(ids: Iterable<TId>): ICanvas;
    delete(ids: Iterable<TId>): ICanvas;
    select(ids: Iterable<TId>): ICanvas;
    setOptions(options: Partial<ICanvasOptions>): ICanvas;
}


interface ICanvasSourceItem {
    id: TId;
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    name?: string;
    parentId?: TId | null;
    childIds?: Iterable<TId> | null;
}


interface ICanvasOptions {
    styles: TCSSStylesCollection;
}


interface ICanvasItem {
    readonly id: TId;
    parentId: TId | null;

    readonly element: SVGElement;

    mount(parent: SVGElement): ICanvasItem;
    unmount(): ICanvasItem;
    destroy(): void;
    update(): ICanvasItem;
    select(): ICanvasItem;

    moveBy(delta: IPoint): ICanvasItem;

    css(styles: TCSSStylesCollection): ICanvasItem;

    showOverlay(options?: object): ICanvasItem;
    hideOverlay(): ICanvasItem;

    on(type: TEventType, handler: Function): ICanvasItem;
    off(type: TEventType, handler?: Function): ICanvasItem;
}


interface ICanvasContainer {
    childIds: Iterable<TId> | null;

    insertChildBefore(id: TId, beforeId: TId): ICanvasContainer;
    extractChild(id: TId): ICanvasContainer;
    appendChild(id: TId): ICanvasContainer;
    prependChild(id: TId): ICanvasContainer;

    getNextChild(id: TId): TId | null;
    getPreviousChild(id: TId): TId | null;
}


interface ICanvasChild {
    parentId: TId | null;

    insertIntoContainer(id: TId): ICanvasItem;
    extractFromContainer(): ICanvasItem;

    moveForwards(steps?: number): ICanvasItem;
    moveBackwards(steps?: number): ICanvasItem;
    moveToTheFront(): ICanvasItem;
    moveToTheBack(): ICanvasItem;
}


interface ICanvasRectangle extends ICanvasItem, IRectangle {
    x: number;
    y: number;
    width: number;
    height: number;
    resize(size: ISize): ICanvasRectangle;
    moveTo(pos: IPoint): ICanvasRectangle;
}


interface INamedCanvasItem extends ICanvasItem {
    name: string;
    rename(name: string): INamedCanvasItem;
}
