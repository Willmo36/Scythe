import * as fs from "fs";
import { Task } from "fp-ts/lib/Task";
import { sequencePromiseArray } from "./promise";
import { taskify, TaskEither, taskEither, tryCatch } from "fp-ts/lib/TaskEither";
import { sequenceTaskEitherArray } from "./task";

export const concatBlobs = (blobs: Blob[]) =>
    sequencePromiseArray(blobs.map(toArrayBuffer).map(b => b.then(toTypedArray))).then(arrs =>
        arrs.reduce(appendUnit8Array, new Uint8Array(0))
    );

export const concatBlobsSafe = (bs: Blob[]): TaskEither<Error, Uint8Array> =>
    sequenceTaskEitherArray(bs.map(b => toArrayBufferSafe(b).map(toTypedArray))).map(arrs =>
        arrs.reduce(appendUnit8Array, new Uint8Array(0))
    );

export const writeBlobTask = (path: string) => (blob: Blob): Task<string> =>
    new Task(() => toArrayBuffer(blob)).map(toTypedArray).chain(writeUnit8ArrayTask(path));

export const writeUnit8ArrayTask = (p: string) => (d: Uint8Array): Task<string> =>
    new Task(() => writeUnit8Array(p, d));

export const writeUnit8Array = (p: string, d: Uint8Array): Promise<string> =>
    new Promise((res, rej) => fs.writeFile(p, d, e => (!!e ? rej(e) : res(p))));

const write_ = taskify(fs.writeFile);
export const writeSafe = (path: string) => (data: Uint8Array) =>
    write_(path, data)
        .mapLeft(err => err as Error) //just for now
        .map(() => path);

export const writeBlobSafe = (path: string) => (blob: Blob) =>
    toArrayBufferSafe(blob)
        .map(toTypedArray)
        .chain(writeSafe(path));

function toArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
    return new Promise<ArrayBuffer>((resolve, reject) => {
        let fileReader = new FileReader();
        fileReader.onload = function(ev) {
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
