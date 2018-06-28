import { Task, task } from "fp-ts/lib/Task";
import { append } from "ramda";
import { Stream, zip, fromPromise } from "most";

export const sequenceTaskArray = <T>(ts: Task<T>[]): Task<T[]> =>
    ts.reduce((acc, t) => {
        const y = t.map(x => (ts: T[]) => append(x, ts));
        return acc.ap(y);
    }, task.of<T[]>([]));

export const zipTaskStreams = <T, U>(
    a$: Stream<Task<T>>,
    b$: Stream<Task<T>>,
    mergeFn: (a: T) => (b: T) => U
) => zip((a, b) => b.ap(a.map(mergeFn)), a$, b$);

export const runAsStream = <T>(task: Task<T>): Stream<T> => fromPromise(task.run());
