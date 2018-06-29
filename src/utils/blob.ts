import * as fs from "fs";
import { taskify, TaskEither, tryCatch } from "fp-ts/lib/TaskEither";
import { sequenceTaskEitherArray } from "./task";

export const concatBlobsSafe = (bs: Blob[]): TaskEither<Error, Uint8Array> =>
    sequenceTaskEitherArray(bs.map(b => toArrayBufferSafe(b).map(toTypedArray))).map(arrs =>
        arrs.reduce(appendUnit8Array, new Uint8Array(0))
    );

const write_ = taskify(fs.writeFile);
export const writeSafe = (path: string) => (data: Uint8Array) =>
    write_(path, data)
        .mapLeft(err => err as Error) //TODO
        .map(() => path);

export const writeBlobSafe = (path: string) => (blob: Blob) =>
    toArrayBufferSafe(blob)
        .map(toTypedArray)
        .chain(writeSafe(path));

function toArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
    return new Promise<ArrayBuffer>((resolve, reject) => {
        let fileReader = new FileReader();
        fileReader.onload = function() {
            let arrayBuffer: ArrayBuffer = this.result;
            if (arrayBuffer) {
                resolve(arrayBuffer);
            } else {
                reject(new Error("Failed to convert Blob to ArrayBuffer"));
            }
        };
        fileReader.readAsArrayBuffer(blob);
    });
}

export function toArrayBufferSafe(blob: Blob): TaskEither<Error, ArrayBuffer> {
    return tryCatch(() => toArrayBuffer(blob), err => err as Error);
}

function toTypedArray(ab: ArrayBuffer) {
    return new Uint8Array(ab);
}

function appendUnit8Array(a: Uint8Array, b: Uint8Array): Uint8Array {
    let res = new Uint8Array(a.length + b.length);
    res.set(a, 0);
    res.set(b, a.length);
    return res;
}
