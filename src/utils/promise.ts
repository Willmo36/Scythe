export function apPromise<A, B>(srcP: Promise<A>, fnP: Promise<(a: A) => B>): Promise<B> {
    return fnP.then(fn => srcP.then(fn));
}

export function sequencePromiseArray<A>(ps: Promise<A>[]): Promise<A[]> {
    return ps.reduce<Promise<A[]>>((acc, p) => {
        const f = p.then(a => (as: A[]): A[] => [...as, a]);
        return apPromise(acc, f);
    }, Promise.resolve([]));
}
