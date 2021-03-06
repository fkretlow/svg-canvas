import { v4 as uuid } from "uuid";
import chroma from "chroma-js";
import {isPointInRectangle} from "./util";



export class Model implements IEventSource {
    constructor() {
        this.addLane({ name: "Lane 1" });
        this.addLane({ name: "Lane 2" });
        this.addItem({ type: "snippet", x: 50, y: 60 });
        this.addItem({ type: "snippet", x: 70, y: 150 });
        this.addItem({ type: "snippet", x: 200, y: 30 });
    }

    public readonly lanes = new Array<Lane>();
    public elements = new Map<TId, Snippet | Block>();

    public addItem(data: {
        type: "snippet" | "block",
        id?: TId,
        laneId?: TId,
        x: number,
        y: number,
        width?: number,
        height?: number,
    }) {
        let item: Snippet | Block;
        if (data.laneId === undefined) {
            if (this.lanes.length === 0)
                throw new Error(`Model.addItem: there's no lane`);
            data.laneId = this.lanes[0].id;
        }
        if (data.type === "snippet") {
            item = new Snippet(data as any);
        } else if (data.type === "block") {
            item = new Block(data as any);
        }
        this.elements.set(item.id, item);
        this.insertIntoLane(item.id, item.laneId);
        this.dispatchEvent?.("item-added", { id: item.id });
    }

    public getLane(id: TId): Lane | null {
        for (let lane of this.lanes) {
            if (lane.id === id) return lane;
        }
        return null;
    }

    public addLane(data: {
        id?: TId,
        name?: string,
        color?: string,
    }) {
        const lane = new Lane(data);
        this.lanes.push(lane);
    }

    public insertIntoLane(childId: TId, laneId: TId) {
        const item = this.elements.get(childId) as Snippet | Block;
        const lane = this.getLane(laneId);
        item.laneId = laneId;
        lane.itemIds.push(childId);
    }

    public extractFromLane(childId: TId) {
        const item = this.elements.get(childId) as Snippet | Block;
        if (item.laneId === null) return;
        const lane = this.getLane(item.laneId);
        lane.itemIds = lane.itemIds.filter(id => id !== childId);
        item.laneId = null;
    }

    public insertIntoContainer(childId: TId, containerId: TId) {
        const child = this.elements.get(childId) as Snippet;
        const container = this.elements.get(containerId) as Block;
        if (!(container instanceof Block))
            throw new Error(`Model.insertIntoContainer: not a Block`);
        child.parentId = containerId;
        container.childIds.push(childId);
    }

    public extractFromContainer(childId: TId) {
        const child = this.elements.get(childId) as Snippet;
        if (!child.parentId) return;
        const container = this.elements.get(child.parentId) as Block;
        container.childIds = container.childIds.filter(id => id !== childId);
        child.parentId = null;
    }

    public delete(id: TId): boolean {
        const rv = this.elements.delete(id);
        this.dispatchEvent?.("item-deleted", { id });
        return rv;
    }

    public move(id: TId, laneId: TId, to: IPoint): boolean {
        const rect = this.elements.get(id);
        if (rect === undefined) return false;
        Object.assign(rect, to);
        this.dispatchEvent?.("item-moved", { id, to });

        if (rect instanceof Snippet) {
            if (rect.parentId !== null) this.extractFromContainer(id);
            const blockId = this.getBlockAt(to);
            if (blockId) this.insertIntoContainer(id, blockId);
        }

        this.extractFromLane(id);
        this.insertIntoLane(id, laneId);

        return true;
    }

    public resize(id: TId, size: IRectangle): boolean {
        const rect = this.elements.get(id);
        if (rect === undefined) return false;
        Object.assign(rect, size);
        this.dispatchEvent?.("item-resized", { id });
        return true;
    }

    public changeColor(id: TId, color?: string): boolean {
        const rect = this.elements.get(id);
        if (rect === undefined) return false;
        color = color || chroma.random().hex();
        rect.color = color;
        this.dispatchEvent?.("item-edited", { id, color });
        return true;
    }

    private getBlockAt(pos: IPoint): TId | null {
        for (let item of this.elements.values()) {
            if (item instanceof Block && isPointInRectangle(pos.x, pos.y, item)) return item.id;
        }
        return null;
    }

    private dispatchEvent: TEventDispatcher | null = null;
    public setEventDispatcher(dispatcher: TEventDispatcher): void {
        this.dispatchEvent = dispatcher;
    }
    public removeEventDispatcher(): void {
        this.dispatchEvent = null;
    }
}


export class Snippet implements IRectangle {
    readonly type = "snippet";

    constructor(data: {
        id?: TId,
        laneId?: TId,
        x: number, y: number,
        name?: string,
        color?: string,
    }) {
        this.x = data.x;
        this.y = data.y;
        if (data.id) this.id = data.id;
        if (data.laneId) this.laneId = data.laneId;
        if (data.name) this.name = data.name;
        if (data.color) this.color = data.color;
    }

    id = uuid();
    laneId: TId | null;
    parentId: TId | null = null;
    name: string = "Snippet";
    x: number;
    y: number;
    width = 100;
    height = 40;
    color = "orange";
}


export class Block implements IRectangle {
    readonly type = "block";

    constructor(data: {
        id?: TId,
        laneId?: TId,
        x: number, y: number,
        name?: string,
        color?: string,
    }) {
        this.x = data.x;
        this.y = data.y;
        if (data.id) this.id = data.id;
        if (data.laneId) this.laneId = data.laneId;
        if (data.name) this.name = data.name;
        if (data.color) this.color = data.color;
    }

    id = uuid();
    laneId: TId | null = null;
    childIds: TId[] = [];
    name: string = "Block";
    x: number;
    y: number;
    width = 200;
    height = 150;
    color = "lightgray"
}


export class Lane {
    readonly type = "lane";

    constructor(data: {
        id?: TId,
        name?: string,
        color?: string,
    }) {
        if (data.id) this.id = data.id;
        if (data.name) this.name = data.name;
        if (data.color) this.color = data.color;
    }

    id = uuid();
    itemIds: TId[] = [];
    name: string = "Lane";
    color = "gray";
}
