import { desktopCapturer, SourcesOptions, globalShortcut, ipcRenderer } from "electron";
import * as fs from "fs";
import * as path from "path";
import { formatRelative } from "date-fns";
import { h, render, Component } from "preact";
import { either, Either, fromNullable } from "fp-ts/lib/Either";
import { task, Task } from "fp-ts/lib/Task";
import { taskEither, TaskEither, taskify, right } from "fp-ts/lib/TaskEither";
import * as LRU from "./lru";

const opts: SourcesOptions = {
    types: ["window", "screen", "audio"]
};
desktopCapturer.getSources(opts, (err, sources) => {
    console.log("sources", sources);
    const tgt = sources[0];
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
        .then(setupScreenRecording)
        .catch(e => console.error(e));
});

const getAllAudioInfo = new Task(() => navigator.mediaDevices.enumerateDevices());
const getAudioInfo = new TaskEither<String, MediaDeviceInfo>(
    getAllAudioInfo
        .map(ds => ds.find(d => d.kind === "audioinput"))
        .map(fromNullable("No audio device info found"))
);
const getAudioMedia = (info: MediaDeviceInfo) =>
    new Task(() => navigator.mediaDevices.getUserMedia({ audio: { deviceId: info.deviceId } }));
const tryGetAudioMedia = getAudioInfo.map(getAudioMedia).chain(right);

tryGetAudioMedia.fold(console.log.bind(console), setupAudioRecording).run();

function setupAudioRecording(stream: MediaStream) {
    console.info("starting to process audio");
    const recorder = new MediaRecorder(stream, { bitsPerSecond: 100000 });

    let blobs: Blob[] = [];
    recorder.ondataavailable = d => {
        console.log("audio blob", d.data);
        blobs.push(d.data);
    };
    recorder.onerror = e => console.error("error", e);
    recorder.onstop = () => console.warn("stopped");
    recorder.start();
    setTimeout(() => recorder.stop(), 3000);
}

function setupScreenRecording(stream: MediaStream) {
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
    updateUI({ text: "Watching" });

    ipcRenderer.on("capture_start", () => {
        const blobs = blobCache.queue;
        blobCache = LRU.empty(blobCache);
        commitRecordings(blobs);
        updateUI({ text: "Saving..." });
    });
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

type AppProps = { text: string };
class App extends Component<AppProps> {
    render(props: AppProps) {
        return <div>{props.text}</div>;
    }
}
const appDiv = document.querySelector("#app")!;
render(<App text="init" />, appDiv);

function updateUI(state: AppProps) {
    render(<App {...state} />, appDiv, appDiv.lastChild as Element);
}
