import { createSVGElement } from "./../util";


export class Canvas implements ICanvas {
    constructor(parent: HTMLElement | null, options?: Partial<ICanvasOptions>) {
        if (options) this.setOptions(options);
        this.svg = this.createSvgElement();
        if (parent) this.mount(parent);
    }

    private truth: Iterable<ICanvasSourceItem> | null = null;
    private readonly items = new Map<TId, ICanvasItem>();
    private readonly svg: SVGElement;
    private eventHandlers = new Map<string, Function>();
    private dispatchEvent(type: string, detail: any): void {
        const handler = this.eventHandlers.get(type);
        handler?.({ type, detail });
    }

    private readonly options: ICanvasOptions = {
        styles: {
            width: "1000px",
            height: "800px",
            "background-color": "#edc",
            "border": "1px solid black",
        }
    };

    private createSvgElement(): SVGElement {
        const svg = createSVGElement("svg") as SVGElement;
        this.applyStyles(svg);
        return svg;
    }

    private applyStyles(svg: SVGElement): void {
        for (let [ property, value ] of Object.entries(this.options.styles)) {
            svg.style.setProperty(property, value);
        }
    }

    public on(type: string, handler: Function): Canvas {
        this.eventHandlers.set(type, handler);
        return this;
    }

    public off(type: string): Canvas {
        this.eventHandlers.delete(type);
        return this;
    }

    public setTruth(data: Iterable<ICanvasSourceItem>): Canvas {
        this.truth = data;
        return this;
    }

    public update(): Canvas {
        return this;
    }

    public select(id: TId): Canvas { return this; }

    public setOptions(options: Partial<ICanvasOptions>): Canvas {
        Object.assign(this.options.styles, options.styles);
        if (this.svg) this.applyStyles(this.svg);
        return this;
    }

    public mount(parent: HTMLElement): Canvas {
        parent.appendChild(this.svg);
        return this;
    }

    public unmount(): Canvas {
        this.svg.parentElement?.removeChild(this.svg);
        return this;
    }

    private setupItemEventHandlers(item: ICanvasItem & ICanvasRectangle): void {
        item.on("mousedown", (e: MouseEvent) => {
            this.dispatchEvent("grab", { id: item.id });
            const _onmousemove = (e: MouseEvent) => {
                const delta = { x: e.movementX, y: e.movementY };
                item.moveBy(delta);
                this.dispatchEvent("drag", { id: item.id, delta })
            };
            const _onmouseup = (e: MouseEvent) => {
                window.removeEventListener("mousemove", _onmousemove, true);
                window.removeEventListener("mouseup", _onmouseup, true);
                this.dispatchEvent("drop", { id: item.id, position: { x: item.x, y: item.y }});
            };
            window.addEventListener("mousemove", _onmousemove, true);
            window.addEventListener("mouseup", _onmouseup, true);
        });
        item.on("click", (e: MouseEvent) => {
            this.dispatchEvent("click", {
                id: item.id,
                shiftKey: e.shiftKey,
                altKey: e.altKey,
                ctrlKey: e.ctrlKey,
            });
        });
    }
}
