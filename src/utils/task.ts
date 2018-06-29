import { Apply1 } from "fp-ts/lib/Apply";
import { Type, URIS, URIS2, Type2 } from "fp-ts/lib/HKT";
import { task } from "fp-ts/lib/Task";
import { Stream, zip } from "most";
import { append } from "ramda";
import { Applicative1, Applicative2 } from "fp-ts/lib/Applicative";
import { taskEither } from "fp-ts/lib/TaskEither";

export const sequenceApplicative1Array = <F extends URIS>(A: Applicative1<F>) => <A>(
    as: Type<F, A>[]
): Type<F, A[]> => {
    const empty = A.of<A[]>([]);
    return as.reduce((fas, fa) => {
        const fab = A.map(fa, a => (as: A[]) => append(a, as));
        return A.ap(fab, fas);
    }, empty);
};

export const sequenceApplicative2Array = <F extends URIS2>(A: Applicative2<F>) => <A, B>(
    as: Type2<F, A, B>[]
): Type2<F, A, B[]> => {
    const empty = A.of<A, B[]>([]);
    return as.reduce((fbs, fb) => {
        const fab = A.map(fb, b => (bs: B[]) => append(b, bs));
        return A.ap(fab, fbs);
    }, empty);
};

//heavily following https://github.com/gcanti/fp-ts/blob/master/HKT.md
export const zipApply1Streams = <F extends URIS>(A: Apply1<F>) => <T1, T2, U>(
    zipper: (a: T1) => (b: T2) => U,
    a$: Stream<Type<F, T1>>,
    b$: Stream<Type<F, T2>>
) => zip((fa, fb) => A.ap(A.map(fa, zipper), fb), a$, b$);

export const zipTaskStreams = zipApply1Streams(task);
export const sequenceTaskArray = sequenceApplicative1Array(task);
export const sequenceTaskEitherArray = sequenceApplicative2Array(taskEither);
