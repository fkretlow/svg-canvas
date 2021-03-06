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
    name?: string;
    color?: string;
}

interface IFontStyle {
    "font-size"?: number | string;
    "font-family"?: string;
    "font-style"?: string;
    "font-weight"?: number | string;
    "font-variant"?: string;
    "line-height"?: number;
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

interface IEventHandlerRecord {
    target: EventTarget;
    type: string;
    handler: any;
    capture: boolean;
}


type TCanvasItemGetter = ((id: TId) => ICanvasItem | null);

interface ICanvasTruth {
    elements: Map<TId, any>;
    lanes: Iterable<any>;
}


interface ICanvas {
    setTruth(data: ICanvasTruth): ICanvas;
    mount(parent: Element): ICanvas;
    unmount(): ICanvas;
    update(ids: Iterable<TId>): ICanvas;
    deleteItem(ids: Iterable<TId>): ICanvas;
    select(ids: Iterable<TId>): ICanvas;
    setOptions(options: Partial<ICanvasOptions>): ICanvas;
}


interface ICanvasSourceItem {
    id: TId;
    type: "snippet" | "block";
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    name?: string;
    laneId?: TId | null;
    parentId?: TId | null;
    childIds?: Iterable<TId> | null;
}


interface ICanvasOptions {
    styles?: TCSSStylesCollection;
}


interface ICanvasItem {
    readonly id: TId;

    readonly element: SVGElement;

    laneId?: TId;
    parentId?: TId;
    childIds?: Iterable<TId>;

    mount(parent: Element): ICanvasItem;
    unmount(): ICanvasItem;
    destroy(): void;

    css(styles: TCSSStylesCollection): ICanvasItem;

    update?(): ICanvasItem;

    select?(): ICanvasItem;
    deselect?(): ICanvasItem;

    highlight?(level?: number): ICanvasItem;

    showOverlay?(options?: object): ICanvasItem;
    hideOverlay?(): ICanvasItem;

    readonly x: number;
    readonly y: number;
    setCoordinates?(pos: IPoint): ICanvasItem;
    moveBy?(delta: IPoint): ICanvasItem;

    readonly width: number;
    readonly height: number;
    resize?(delta: IPoint, anchor: string): ICanvasItem;

    readonly name?: string;
    rename?(name: string): ICanvasItem;

    moveForwards?(): ICanvasItem;
    moveBackwards?(): ICanvasItem;
    moveToTheFront?(): ICanvasItem;
    moveToTheBack?(): ICanvasItem;
}


type TCanvasOverlayHandleAnchor = "n" | "e" | "s" | "w" | "nw" | "ne" | "se" | "sw" | "rotate";

interface ICanvasOverlayOptions {
    stroke: string;
    fill: string;
    fillOpacity: number;
    strokeOpacity: number;
    showHandles: boolean;
    strokeWidth: number;
}
