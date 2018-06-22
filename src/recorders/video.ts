import { Task } from "fp-ts/lib/Task";
import { desktopCapturer } from "electron";
import { Stream } from "most";
import { CommandStreams } from "../commands";
import * as LRU from "../LRU";
import { writeBlobTask } from "../blob";
import { sequenceTaskArray } from "../utils/task";
import {
    buildMergePartsCommand,
    execCommandIgnoreError,
    buildVideoPath,
    buildVideoPartPath
} from "./merger";
import { spy, traceM } from "fp-ts/lib/Trace";
import { logWith } from "../utils/log";

type RecorderSetup = (streams: CommandStreams) => (ms: MediaStream) => Stream<Blob[]>;

const getSources = new Task(
    () =>
        new Promise<Electron.DesktopCapturerSource[]>((res, rej) =>
            desktopCapturer.getSources(
                { types: ["window", "screen"] },
                (err, srcs) => (!!err ? rej : res(srcs))
            )
        )
);

const getVideoMedia = getSources.map(s => s[0]).chain(src => {
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
});

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
    getVideoMedia.map(setupVideoRecording(evs)).map(blobs$ => blobs$.map(combineBlobParts));

const combineBlobParts = (bs: Blob[]): Task<string> => {
    console.info(`${bs.length} parts to write`);
    const fullPath = buildVideoPath();
    const partPaths = sequenceTaskArray(bs.map((b, i) => writeBlobTask(buildVideoPartPath(i))(b)));
    const fullClipPath = partPaths
        .map(logWith("Parts written"))
        .map(buildMergePartsCommand(fullPath))
        .map(logWith("Command to exec: "))
        .chain(execCommandIgnoreError)
        .map(logWith("Command ran"))
        .map(() => fullPath);

    return fullClipPath;
};
