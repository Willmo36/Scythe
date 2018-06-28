import { desktopCapturer } from "electron";
import { CommandStreams } from "../commands";
import { writeBlobTask, combineBlobs, writeFileTask, writeFile2 } from "../blob";
import { buildVideoPath } from "./merger";
import { Stream, periodic, fromPromise } from "most";
import { tryCatch } from "fp-ts/lib/TaskEither";
import { Task, task } from "fp-ts/lib/Task";
import { create, insert } from "../lru";
import { logWith } from "../utils/log";

const makeVideoConstraints = (id: string) => ({
    audio: false,
    video: {
        mandatory: {
            maxWidth: 1280,
            maxHeight: 720,
            maxFrameRate: 20,
            chromeMediaSource: "desktop",
            chromeMediaSourceId: id
        }
    }
});

export const getSourcesSafe = tryCatch<Error, Electron.DesktopCapturerSource[]>(
    () =>
        new Promise((res, rej) =>
            desktopCapturer.getSources(
                { types: ["window", "screen"] },
                (err, srcs) => (!!err ? rej(err) : res(srcs))
            )
        ),
    err => err as Error
);

export const getVideoMediaSafe = (sourceId: string) =>
    tryCatch<Error, MediaStream>(
        () => navigator.mediaDevices.getUserMedia(makeVideoConstraints(sourceId) as any),
        err => err as Error
    );

const createRecorderPromise = (stream: MediaStream): Promise<Blob> =>
    new Promise(res => {
        const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9" });
        recorder.ondataavailable = d => res(d.data);
        setTimeout(() => {
            recorder.stop();
        }, 10000);
        recorder.start();
    });

const createRecordingStream = (stream: MediaStream): Stream<Blob> =>
    periodic(1000)
        .take(1)
        .chain(() => fromPromise(createRecorderPromise(stream)));

export const setup = (cmds: CommandStreams, ms: MediaStream): Stream<Task<string>> =>
    createRecordingStream(ms)
        .sampleWith(cmds.captureStart$)
        .map(writeBlobTask(buildVideoPath()));

export const setup2 = (cmds: CommandStreams, ms: MediaStream) =>
    fromPromise(createHeadBlob(ms))
        .tap(logWith("head blob"))
        .chain(headBlob => createMovingRecorder(cmds, ms).map(bs => [headBlob, ...bs]))
        .tap(logWith("all blobs"))
        .chain(bs => fromPromise(combineBlobs(bs)))
        .chain(data => fromPromise(writeFile2(buildVideoPath(), data)))
        .tap(logWith("path"))
        .map(task.of); //temp, gonna need to wrap the above steps in tasks

const createHeadBlob = (ms: MediaStream): Promise<Blob> =>
    new Promise(res => {
        const rec = new MediaRecorder(ms, { mimeType: "video/webm;codecs=vp9" });
        rec.ondataavailable = d => res(d.data);
        setTimeout(() => {
            rec.stop();
        }, 150);
        rec.start();
    });

const createMovingRecorder = (cmds: CommandStreams, ms: MediaStream) => {
    let blobs = create<Blob>(5, []);
    const rec = new MediaRecorder(ms, { mimeType: "video/webm;codecs=vp9" });
    rec.ondataavailable = d => {
        blobs = insert(blobs, d.data);
    };
    rec.start(1000);

    return cmds.captureStart$.map(() => blobs.queue);
};
