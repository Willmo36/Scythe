import { Alternative1 } from "fp-ts/lib/Alternative";
import { Monad1 } from "fp-ts/lib/Monad";
import { Monoid } from "fp-ts/lib/Monoid";
import * as most from "most";

declare module "most" {
    interface Stream<A> {
        _URI: URI;
        _A: A;
    }
}

declare module "fp-ts/lib/HKT" {
    interface URI2HKT<A> {
        Stream: most.Stream<A>;
    }
}

export const URI = "Stream";
export type URI = typeof URI;

export const getMonoid = <A = never>(): Monoid<most.Stream<A>> => {
    return {
        concat: (x, y) => most.merge(x, y),
        empty: most.empty()
    };
};

export const stream: Monad1<URI> & Alternative1<URI> = {
    URI,
    map: (fa, f) => fa.map(f),
    chain: (fa, f) => fa.chain(f),
    of: most.of,
    ap: most.ap,
    zero: most.empty,
    alt: most.merge
};
