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
