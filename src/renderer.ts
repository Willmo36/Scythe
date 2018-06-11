import { desktopCapturer, SourcesOptions, globalShortcut, ipcRenderer } from "electron";
import * as fs from "fs";
import * as path from "path";
import { formatRelative } from "date-fns";
import * as LRU from "./lru";

const opts: SourcesOptions = {
    types: ["window", "screen"]
};
desktopCapturer.getSources(opts, (err, sources) => {
    const tgt = sources[0];
    console.info(sources);
    console.info(tgt);
    const opts: any = {
        audio: false,
        video: {
            mandatory: {
                chromeMediaSource: "desktop",
                chromeMediaSourceId: tgt.id,
                minWidth: 800,
                maxWidth: 1280,
                minHeight: 600,
                maxHeight: 720
            }
        }
    };

    navigator.mediaDevices
        .getUserMedia(opts)
        .then(processStream)
        .catch(e => console.error(e));
});

function processStream(stream: MediaStream) {
    console.info("starting to process");
    const recorder = new MediaRecorder(stream, { bitsPerSecond: 100000 });

    let blobCache: LRU.LRU<Blob> = LRU.create(15, []);
    recorder.ondataavailable = d => {
        blobCache = LRU.insert(blobCache, d.data);
        //processBlob(d.data);
    };
    recorder.onerror = e => console.error("error", e);
    recorder.onstop = () => console.warn("stopped");
    recorder.start(1000);

    ipcRenderer.on("capture_start", () => {
        const blobs = blobCache.queue;
        blobCache = LRU.empty(blobCache);
        commitRecordings(blobs);
    });

    // setTimeout(() => {
    //     recorder.stop();
    //     const rawBlobs = blobs.queue.map(toArrayBuffer).map(pb => pb.then(toTypedArray));
    //     console.info(blobs);
    //     sequencePromiseArray(rawBlobs)
    //         .then(bs => bs.reduce(appendUnit8Array, new Uint8Array(0)))
    //         .then(b => {
    //             const p = path.join(__dirname, "../recordings/recording_.webm");
    //             return fs.writeFile(p, b, e => console.error(e));
    //         });
    // }, 9000);
}

function commitRecordings(blobs: Blob[]): Promise<void> {
    const rawBlobs = blobs.map(toArrayBuffer).map(pb => pb.then(toTypedArray));
    console.info(blobs);
    return sequencePromiseArray(rawBlobs)
        .then(bs => bs.reduce(appendUnit8Array, new Uint8Array(0)))
        .then(b => {
            const p = path.join(__dirname, `../recordings/recording_${Date.now().toString()}.webm`);
            return fs.writeFile(p, b, e => console.error(e));
        });
}

// function processBlob(blob: Blob) {
//     const p = path.join(__dirname, "../recordings/recording.webm");
//     toArrayBuffer(blob)
//         .then(toTypedArray)
//         .then(data => {
//             fs.writeFile(p, data, e => console.error(e));
//         });
// }

export function toArrayBuffer(blob: Blob) {
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

export function toTypedArray(ab: ArrayBuffer) {
    return new Uint8Array(ab);
}

// function appendBlobs(a: Blob, b: Blob): Promise<Uint8Array> {
//     return toArrayBuffer(a)
//         .then(toTypedArray)
//         .then(aRes =>
//             toArrayBuffer(b)
//                 .then(toTypedArray)
//                 .then(bRes => {
//                     let res = new Uint8Array(aRes.length + bRes.length);
//                     res.set(aRes, 0);
//                     res.set(bRes, aRes.length);
//                     return res;
//                 })
//         );
// }

function appendUnit8Array(a: Uint8Array, b: Uint8Array): Uint8Array {
    let res = new Uint8Array(a.length + b.length);
    res.set(a, 0);
    res.set(b, a.length);
    return res;
}

function apPromise<A, B>(srcP: Promise<A>, fnP: Promise<(a: A) => B>): Promise<B> {
    return fnP.then(fn => srcP.then(fn));
}

function sequencePromiseArray<A>(ps: Promise<A>[]): Promise<A[]> {
    return ps.reduce<Promise<A[]>>((acc, p) => {
        const f = p.then(a => (as: A[]): A[] => [...as, a]);
        return apPromise(acc, f);
    }, Promise.resolve([]));
}
