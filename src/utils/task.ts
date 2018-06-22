import { Task, task } from "fp-ts/lib/Task";
import { append } from "ramda";

export const sequenceTaskArray = <T>(ts: Task<T>[]): Task<T[]> =>
    ts.reduce((acc, t) => {
        const y = t.map(x => (ts: T[]) => append(x, ts));
        return acc.ap(y);
    }, task.of<T[]>([]));
