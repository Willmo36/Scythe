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
import { CommandStreams, commands } from "./commands";
import { writeBlobs } from "./blob";

type WriteFn = (bs: Blob[]) => void;
type RecorderSetup = (streams: CommandStreams) => (ms: MediaStream) => most.Stream<Blob[]>;

const warn = console.warn.bind(console);
//this is defo wrong
function runAll<T>(task$: most.Stream<Task<T>>) {
    return new Task(() => task$.forEach(t => t.run()));
}

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
        getVideoMedia.map(setupVideoRecording(evs)).map(blobs$ => blobs$.map(writeBlobs("mp4")));
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
            .map(blobs$ => blobs$.map(writeBlobs("mp3")));
}

//turn Video & Audio into "recorder" semigroups
const audio = Audio.setup(commands).chain(runAll);
const video = Video.setup(commands).chain(runAll);
const recorders = [video, audio];
Promise.all(recorders.map(r => r.run())).catch(e => console.error("app error"));

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
