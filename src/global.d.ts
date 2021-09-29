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
