import { Task } from "fp-ts/lib/Task";
import { desktopCapturer } from "electron";
import { Stream } from "most";
import { CommandStreams } from "../commands";
import * as LRU from "../LRU";
import { writeBlobTask } from "../blob";
import * as path from "path";

type RecorderSetup = (streams: CommandStreams) => (ms: MediaStream) => Stream<Blob>;

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

    return commands.captureStart$.map(() => new Blob(blobCache.queue, { type: "video/webm" }));
};

export const setup = (evs: CommandStreams) =>
    getVideoMedia
        .map(setupVideoRecording(evs))
        .map(blobs$ => blobs$.map(writeBlobTask(buildVideoPath())));

const buildVideoPath = () =>
    path.join(process.cwd(), `/recording_tmp/video_${Date.now().toString()}.webm`);
