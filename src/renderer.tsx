import { desktopCapturer, SourcesOptions, globalShortcut, ipcRenderer } from "electron";
import * as fs from "fs";
import * as path from "path";
import { formatRelative } from "date-fns";
import { h, render, Component } from "preact";
import { either, Either, fromNullable } from "fp-ts/lib/Either";
import { task, Task } from "fp-ts/lib/Task";
import { taskEither, TaskEither, taskify, right } from "fp-ts/lib/TaskEither";
import { spy } from "fp-ts/lib/Trace";
import * as most from "most";
import { create as createStream } from "@most/create";
import * as LRU from "./lru";

type WriteFn = (bs: Blob[]) => void;
type CommandStreams = { captureStart$: most.Stream<Event>; captureStop$: most.Stream<Event> };
type RecorderSetup = (streams: CommandStreams) => (ms: MediaStream) => most.Stream<Blob[]>;

namespace Video {
    const getSources = new Task(
        () =>
            new Promise<Electron.DesktopCapturerSource[]>((res, rej) =>
                desktopCapturer.getSources(
                    { types: ["window", "screen"] },
                    (err, srcs) => (!!err ? rej : res(srcs))
                )
            )
    ).map(spy);

    const getVideoMedia = getSources
        .map(s => s[0])
        .chain(src => {
            const opts: any = {
                audio: false,
                video: {
                    mandatory: {
                        chromeMediaSource: "desktop",
                        chromeMediaSourceId: src.id,
                        minWidth: 800,
                        maxWidth: 1280,
                        minHeight: 600,
                        maxHeight: 720
                    }
                }
            };

            return new Task(() => navigator.mediaDevices.getUserMedia(opts));
        })
        .map(spy);

    const setupVideoRecording: RecorderSetup = commands => stream => {
        let blobCache: LRU.LRU<Blob> = LRU.create(15, []);
        const recorder = new MediaRecorder(stream, { bitsPerSecond: 100000 });

        recorder.ondataavailable = d => {
            blobCache = LRU.insert(blobCache, d.data);
        };

        recorder.onerror = e => console.error("error", e);
        recorder.onstop = () => console.warn("stopped");
        recorder.start(1000);

        return commands.captureStart$.map(() => blobCache.queue);
    };

    export const start = (evs: CommandStreams) => getVideoMedia.map(setupVideoRecording(evs)).run();
}

namespace Audio {
    const getAllAudioInfo = new Task(() => navigator.mediaDevices.enumerateDevices());
    const getAudioInfo = new TaskEither<String, MediaDeviceInfo>(
        getAllAudioInfo
            .map(ds => ds.find(d => d.kind === "audioinput"))
            .map(fromNullable("No audio device info found"))
    );

    const getAudioMedia = (info: MediaDeviceInfo) =>
        new Task(() => navigator.mediaDevices.getUserMedia({ audio: { deviceId: info.deviceId } }));

    export const tryGetAudioMedia = getAudioInfo.map(getAudioMedia).chain(right);

    export const setupAudioRecording: RecorderSetup = commands => stream => {
        const recorder = new MediaRecorder(stream, {
            bitsPerSecond: 100000,
            mimeType: "audio/webm;codecs=opus"
        });

        const dataAvailable$ = createStream<Blob[]>((add, end) => {
            recorder.ondataavailable = d => {
                add([d.data]);
                end();
            };
        });

        return commands.captureStart$
            .tap(() => recorder.start())
            .chain(() => commands.captureStop$.tap(() => recorder.stop()))
            .chain(() => dataAvailable$);
    };

    export const start = (writeFn: WriteFn) =>
        tryGetAudioMedia.fold(warn, setupAudioRecording(writeFn)).run();
}

function start() {
    //bah this isn't going to work, because the audio & screen will commit at slightly different times
    //the request to write needs to provide the path
    //this will be much simpler to orchestrate with mostjs
    const write: WriteFn = bs => {
        const root = path.join(__dirname, "../recordings");
        const recDirPath = path.join(root, `${Date.now().toString()}`);
        fs.mkdirSync(recDirPath);
    };

    const captureStart$ = most.fromEvent("capture_start", ipcRenderer);
    const captureStop$ = most.fromEvent("capture_stop", ipcRenderer);
    const commands: CommandStreams = { captureStart$, captureStop$ };

    Video.start(commands);
    Audio.start(commands);

    /**
     * todo
     * turn ipc listeners into streams which emit a directory path (or just a write function?)
     * use mostjs for this
     */
}

function commitRecordings(blobs: Blob[], filePath: string): Promise<void> {
    const rawBlobs = blobs.map(toArrayBuffer).map(pb => pb.then(toTypedArray));
    return sequencePromiseArray(rawBlobs)
        .then(bs => bs.reduce(appendUnit8Array, new Uint8Array(0)))
        .then(
            b =>
                new Promise<void>((res, rej) =>
                    fs.writeFile(filePath, b, e => (!!e ? rej(e) : res()))
                )
        );
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

let warn = console.warn.bind(console);

start();
