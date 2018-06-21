import * as path from "path";
import * as fs from "fs";
import { Task } from "fp-ts/lib/Task";
import { sequencePromiseArray } from "./utils/promise";

export const writeBlobs = (ext: string) => (blobs: Blob[]): Task<void> =>
    new Task(() => {
        const p = path.join(__dirname, `../recordings/${Date.now().toString()}.${ext}`);
        const rawBlobs = blobs.map(toArrayBuffer).map(pb => pb.then(toTypedArray));
        return sequencePromiseArray(rawBlobs)
            .then(bs => bs.reduce(appendUnit8Array, new Uint8Array(0)))
            .then(
                b =>
                    new Promise<void>((res, rej) => fs.writeFile(p, b, e => (!!e ? rej(e) : res())))
            )
            .then(x => {
                console.info("Write complete");

                //temp do the ffmpeg thingy here
                //then change video/audio apis to return a stream instead of a Task

                return x;
            });
    });

function toArrayBuffer(blob: Blob) {
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

function toTypedArray(ab: ArrayBuffer) {
    return new Uint8Array(ab);
}

function appendUnit8Array(a: Uint8Array, b: Uint8Array): Uint8Array {
    let res = new Uint8Array(a.length + b.length);
    res.set(a, 0);
    res.set(b, a.length);
    return res;
}
