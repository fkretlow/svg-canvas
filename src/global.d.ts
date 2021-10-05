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

type TMouseEventHandler = ((e: MouseEvent) => any);
type TCanvasItemGetter = ((id: TId) => ICanvasItem | null);

interface ICanvas {
    setTruth(data: Iterable<ICanvasSourceItem>): ICanvas;
    update(): ICanvas;
    select(id: TId): ICanvas;
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


interface ICanvasContainer extends ICanvasItem {
    childIds: Iterable<TId> | null;

    insertChildBefore(id: TId, beforeId: TId): ICanvasContainer;
    extractChild(id: TId): ICanvasContainer;
    appendChild(id: TId): ICanvasContainer;
    prependChild(id: TId): ICanvasContainer;

    getNextChild(id: TId): TId | null;
    getPreviousChild(id: TId): TId | null;
}


interface ICanvasItem {
    id: TId;
    parentId: TId | null;

    element: SVGElement;

    destroy(): void;

    moveBy(delta: IPoint): ICanvasItem;

    insertIntoContainer(id: TId): ICanvasItem;
    extractFromContainer(): ICanvasItem;

    // lift(): ICanvasItem;
    moveForwards(steps?: number): ICanvasItem;
    moveBackwards(steps?: number): ICanvasItem;
    moveToTheFront(): ICanvasItem;
    moveToTheBack(): ICanvasItem;

    style(styles: TCSSStylesCollection): ICanvasItem;

    showOverlay(options?: object): ICanvasItem;
    hideOverlay(): ICanvasItem;

    on(type: TEventType, handler: Function): ICanvasItem;
    off(type: TEventType, handler?: Function): ICanvasItem;
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
