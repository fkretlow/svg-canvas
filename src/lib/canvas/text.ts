import { createSVGElement } from "./../util";

interface ITextWrapOptions {
    width: number;
}

export function measureText(text: string, style?: IFontStyle): TextMetrics {
    style = Object.assign({
        "font-size": 10,
        "font-family": "sans-serif",
        "font-style": "normal",
        "font-weight": 400,
        "font-variant": "normal"
    }, style);

    const context = document.createElement("canvas").getContext("2d");

    const font = [];
    font.push(style["font-style"]);
    font.push(style["font-variant"]);
    font.push(style["font-weight"]);
    font.push(typeof style["font-size"] === "string" ? style["font-size"] : `${style["font-size"]}px`);
    font.push(style["font-family"]);

    context.font = font.join(" ");

    return context.measureText(text);
}


export function textWrap(text: string, options: ITextWrapOptions, style?: IFontStyle): string[] {
    const words = text.split(" ");
    const sizes = words.map(word => measureText(word, style).width);
    const spaceSize = measureText(" ", style).width;

    const lines: string[] = [];
    let currentWidth: number;

    lines.push(words[0]);
    currentWidth = sizes[0];

    for (let i = 1; i < words.length; ++i) {
        const word = words[i];
        const wordSize = sizes[i]
        if (currentWidth + spaceSize + wordSize <= options.width) {
            lines[lines.length-1] += " " + word;
            currentWidth += spaceSize + wordSize;
        } else {
            lines.push(word);
            currentWidth = wordSize;
        }
    }

    return lines;
}


export const DEFAULT_FONT_STYLE: IFontStyle = {
    "font-size": "12px",
    "font-family": "Helvetica, Arial, sans-serif",
    "font-style": "normal",
    "font-weight": 400,
    "font-variant": "normal",
    "line-height": 15,
};


export class TextBlock {
    constructor() {
        this.containerElement = this.createContainerElement();
    }

    public update(text: string, shape: IRectangle) {
        this.x = shape.x;
        this.y = shape.y;
        this.width = shape.width;
        this.height = shape.height;
        this.text = text;
        this.wrap();
    }

    public setCoordinates(coordinates: IPoint): TextBlock {
        this.x = coordinates.x;
        this.y = coordinates.y;
        return this;
    }

    public moveBy(delta: IPoint): TextBlock {
        this.x += delta.x;
        this.y += delta.y;
        return this;
    }

    public resize(size: ISize): TextBlock {
        this.width = size.width;
        this.height = size.height;
        this.wrap();
        return this;
    }

    public setText(text: string): TextBlock {
        this.text = text;
        return this;
    }

    public get element(): SVGElement {
        return this.containerElement;
    }

    private containerElement: SVGGElement;

    private createContainerElement(): SVGGElement {
        const group = createSVGElement("g") as SVGGElement;
        for (let [ attr, val ] of Object.entries(this.style)) {
            group.setAttribute(attr, val);
        }
        group.style.setProperty("pointer-events", "none");
        group.style.setProperty("user-select", "none");
        return group;
    }

    private wrap(): void {
        this.lines = textWrap(this.text, { width: this.width-10 }, this.style);

        while (this.containerElement.children.length > 0) {
            this.containerElement.removeChild(this.containerElement.children[0]);
        }

        if (this.lines.length === 0) return;

        const ascent = measureText(this.lines[0], this.style).actualBoundingBoxAscent;

        for (let i = 0; i < this.lines.length; ++i) {
            const line = this.lines[i];
            const text = createSVGElement("text");
            text.textContent = line;
            text.setAttribute("fill", "black");
            text.setAttribute("x", `${this.x + this.padding.left}px`);
            text.setAttribute("y", `${this.y + ascent + this.padding.top}px`);
            text.setAttribute("dy", `${i * this.style["line-height"]}px`);
            this.containerElement.appendChild(text);
        }
    }

    private _text: string = "";
    public get text(): string {
        return this._text;
    }
    private set text(text: string) {
        this._text = text;
    }

    private _lines: string[] = [];
    public get lines(): string[] { return this._lines; }
    private set lines(lines: string[]) {
        this._lines = lines;
    }

    private _style: IFontStyle = DEFAULT_FONT_STYLE;
    public get style(): IFontStyle { return this._style; }
    public set style(style: IFontStyle) { this._style = style; }

    private _x: number = 0;
    public get x(): number { return this._x; }
    private set x(x: number) {
        this._x = x;
        for (let i = 0; i < this.containerElement.children.length; ++i) {
            const text = this.containerElement.children[i];
            text.setAttribute("x", `${x + this.padding.left}px`);
        }
    }

    private _y: number = 0;
    public get y(): number { return this._y; }
    private set y(y: number) {
        this._y = y;
        if (this.lines.length === 0) return;
        const ascent = measureText(this.lines[0], this.style).actualBoundingBoxAscent;
        for (let i = 0; i < this.containerElement.children.length; ++i) {
            const text = this.containerElement.children[i];
            text.setAttribute("y", `${y + ascent + this.padding.top}px`);
        }
    }

    private _width: number = 0;
    public get width(): number { return this._width; }
    private set width(width: number) {
        this._width = width;
        this.lines = textWrap(this.text, { width: this.width }, this.style);
    }

    private _height: number = 0;
    public get height(): number { return this._height; }
    private set height(height: number) {
        this._height = height;
    }

    private padding: {
        top: number,
        right: number,
        bottom: number,
        left: number,
    } = {
        top: 5,
        right: 5,
        bottom: 5,
        left: 5,
    }
}
