import { createSVGElement } from "$lib/util";

export class Overlay {
    constructor() {
        this.groupElement = this.createGroupElement();
        this.rectElement = this.createRectElement();
        this.groupElement.appendChild(this.rectElement);
    }

    private _isMounted: boolean = false;
    public get isMounted(): boolean { return this._isMounted; }
    private set isMounted(b: boolean) { this._isMounted = b; }

    public get element(): SVGGElement {
        return this.groupElement;
    }

    public mount(parent: SVGElement): Overlay {
        if (!this.isMounted) {
            parent.insertAdjacentElement("beforeend", this.element);
            this.isMounted = true;
        }
        return this;
    }

    public unmount(): Overlay {
        if (this.isMounted) {
            this.element.parentElement?.removeChild(this.element);
            this.isMounted = false;
        }
        return this;
    }

    public update(target: IRectangle): Overlay {
        this.rectElement.setAttribute("x", `${target.x}px`);
        this.rectElement.setAttribute("y", `${target.y}px`);
        this.rectElement.setAttribute("width", `${target.width}px`);
        this.rectElement.setAttribute("height", `${target.height}px`);
        return this;
    }

    private rectElement: SVGRectElement;
    private groupElement: SVGGElement;

    private createRectElement(): SVGRectElement {
        const rect = createSVGElement("rect") as SVGRectElement;
        rect.setAttribute("fill", "none");
        rect.setAttribute("stroke", "#007acc");
        rect.setAttribute("stroke-width", "2px");
        return rect;
    }

    private createGroupElement(): SVGGElement {
        return createSVGElement("g") as SVGGElement;
    }
}
