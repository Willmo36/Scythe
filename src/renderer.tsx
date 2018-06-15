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

const warn = console.warn.bind(console);
const runAll = (task$: most.Stream<Task<any>>) => new Task(() => task$.forEach(t => t.run()));

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

    export const setup = (evs: CommandStreams) =>
        getVideoMedia
            .map(setupVideoRecording(evs))
            .map(blobs$ => blobs$.map(createCommitRecordingsTask("mp4")));
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

    export const setup = (cmds: CommandStreams) =>
        tryGetAudioMedia
            .fold(warn, setupAudioRecording(cmds))
            .map(blobs$ => blobs$.map(createCommitRecordingsTask("mp3")));
}

const captureStart$ = most.fromEvent("capture_start", ipcRenderer);
const captureStop$ = most.fromEvent("capture_stop", ipcRenderer);
const commands: CommandStreams = { captureStart$, captureStop$ };

//turn Video & Audio into "recorder" semigroups
const video = Video.setup(commands).chain(runAll);
const audio = Audio.setup(commands).chain(runAll);

//audio desn't work if I run this task :/
const recorders = video.chain(() => audio);

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

const createCommitRecordingsTask = (ext: string) => (bs: Blob[]): Task<void> =>
    new Task(() =>
        commitRecordings(bs, path.join(__dirname, `../recordings/${Date.now().toString()}.${ext}`))
    );

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

video.run();
audio.run();
