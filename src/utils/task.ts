import { Apply1 } from "fp-ts/lib/Apply";
import { Type, URIS } from "fp-ts/lib/HKT";
import { task } from "fp-ts/lib/Task";
import { Stream, zip } from "most";
import { append } from "ramda";
import { Applicative1 } from "fp-ts/lib/Applicative";

export const sequenceApplicativeArray = <F extends URIS>(A: Applicative1<F>) => <A>(
    as: Type<F, A>[]
): Type<F, A[]> => {
    const empty = A.of<A[]>([]);
    return as.reduce((fas, fa) => {
        const fab = A.map(fa, a => (as: A[]) => append(a, as));
        return A.ap(fab, fas);
    }, empty);
};

//heavily following https://github.com/gcanti/fp-ts/blob/master/HKT.md
export const zipApplyStreams = <F extends URIS>(A: Apply1<F>) => <T1, T2, U>(
    zipper: (a: T1) => (b: T2) => U,
    a$: Stream<Type<F, T1>>,
    b$: Stream<Type<F, T2>>
) => zip((fa, fb) => A.ap(A.map(fa, zipper), fb), a$, b$);

export const zipTaskStreams = zipApplyStreams(task);
export const sequenceTaskArray = sequenceApplicativeArray(task);
