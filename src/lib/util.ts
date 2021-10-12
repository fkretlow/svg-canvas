import chroma from "chroma-js";


export function setDifference<T>(S1: Set<T>, S2: Set<T>): Set<T> {
    const D = new Set<T>(S1);
    for (let x of S2) D.delete(x);
    return D;
}


export function wait(ms: number): Promise<void> {
    return new Promise(fn => {
        window.setTimeout(fn, ms);
    });
}


export function randint(min: number, max: number) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min);
}


export function createSVGElement(
    tag: keyof SVGElementTagNameMap,
    options?: ElementCreationOptions
): SVGElement {
    const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
    return document.createElementNS(SVG_NAMESPACE, tag, options) as SVGElement;
}


function createColorInLuminanceRange(min: number, max: number): chroma.Color {
    let color = chroma.random();
    let luminance = min + Math.random() * (max - min);
    if (color.luminance() < luminance) {
        while (color.luminance() < luminance) {
            color = color.brighten();
        }
    } else {
        while (color.luminance() > luminance) {
            color = color.darken();
        }
    }
    return color;
}


const _names = [ "apple", "banana", "pear", "ape", "table", "monitor", "formula", "love", "sea", "leaf" ];

export function makeRandomRectangle(): IRectangle {
    let name = "";
    for (let i = 0; i < randint(2,6); ++i) name += _names[randint(0, _names.length)] + " ";
    return {
        name,
        x: randint(20, 500), y: randint(20, 500),
        width: 100, height: 40,
        color: createColorInLuminanceRange(.6, .8).hex(),
    };
}


/**
 * Given an array and a starting index, return the nearest previous or next element that satisfies
 * the give predicate, or null if none does.
 *
 * @param A             The array.
 * @param i             At what index to start the search. `-1` to include the first, `A.length` to
 *                      include the last element.
 * @param predicate     The predicate (if any) that the returned element must satisfy.
 * @return              The nearest element that satisfies the predicate or null.
 */

export function getNextElementInArray<T>(
    A: Array<T>, i: number,
    predicate?: (e: T) => boolean,
): T | null {
    if (!predicate) {
        return i < A.length - 1 ? A[i+1] : null;
    } else {
        for (++i; i < A.length; ++i) {
            if (predicate(A[i])) return A[i];
        }
        return null;
    }
}

export function getPreviousElementInArray<T>(
    A: Array<T>, i: number,
    predicate?: (e: T) => boolean,
): T | null {
    if (!predicate) {
        return i > 0 ? A[i-1] : null;
    } else {
        for (--i; i >= 0; --i) {
            if (predicate(A[i])) return A[i];
        }
        return null;
    }
}
