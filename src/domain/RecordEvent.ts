import { Setoid } from "fp-ts/lib/Setoid";

export declare const URI = "RecordEvent";
export declare type URI = typeof URI;
export declare type RecordEvent<A, B> = RecordEvent_<A, B>;

export class RecordEvent_<A, B> {
    readonly _tag: "RecordEvent_" = "RecordEvent_";
    readonly _URI: URI = URI;
    constructor(private a: A, private b: B) {}
    fold<T>(whenRecordEvent_: (a: A, b: B) => T): T {
        return whenRecordEvent_(this.a, this.b);
    }
}

export const RecordEvent = <A, B>(a: A, b: B) => new RecordEvent_(a, b);
