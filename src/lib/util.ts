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


export function makeRandomRectangle(): IRectangle {
    return {
        x: randint(20, 500), y: randint(20, 500),
        width: randint(20,100), height: randint(10,80),
        color: chroma.random().hex(),
    };
}

