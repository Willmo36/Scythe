export declare const URI = "RemoteData";
export declare type URI = typeof URI;
export declare type RemoteData<A> = NotStarted<A> | InProgress<A> | Completed<A> | Failed<A>;

export class NotStarted<A> {
    readonly _tag: "NotStarted" = "NotStarted";
    readonly _URI: URI = URI;
    fold<B>(
        whenNotStarted: () => B,
        whenInProgress: () => B,
        whenCompleted: (a: A) => B,
        whenFailed: () => B
    ): B {
        return whenNotStarted();
    }
    map(fn: (a: A) => A) {
        return this;
    }
}

export class InProgress<A> {
    readonly _tag: "InProgress" = "InProgress";
    readonly _URI: URI = URI;
    fold<B>(
        whenNotStarted: () => B,
        whenInProgress: () => B,
        whenCompleted: (a: A) => B,
        whenFailed: () => B
    ): B {
        return whenInProgress();
    }
    map(fn: (a: A) => A) {
        return this;
    }
}

export class Completed<A> {
    readonly _tag: "Completed" = "Completed";
    readonly _URI: URI = URI;
    constructor(public value: A) {}
    fold<B>(
        whenNotStarted: () => B,
        whenInProgress: () => B,
        whenCompleted: (a: A) => B,
        whenFailed: () => B
    ): B {
        return whenCompleted(this.value);
    }
    map(fn: (a: A) => A) {
        return completed(fn(a));
    }
}

export class Failed<A> {
    readonly _tag: "Failed" = "Failed";
    readonly _URI: URI = URI;
    fold<B>(
        whenNotStarted: () => B,
        whenInProgress: () => B,
        whenCompleted: (a: A) => B,
        whenFailed: () => B
    ): B {
        return whenFailed();
    }
    map(fn: (a: A) => A) {
        return this;
    }
}
export const notStarted = <A>() => new NotStarted<A>();
export const inProgress = <A>() => new InProgress<A>();
export const completed = <A>(a: A) => new Completed(a);
export const failed = <A>(err: any) => new Failed<A>();
