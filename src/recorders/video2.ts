import { desktopCapturer } from "electron";
import { Task, task } from "fp-ts/lib/Task";
import { tryCatch } from "fp-ts/lib/TaskEither";
import { fromPromise, periodic, Stream } from "most";
import { writeBlobTask, combineBlobs, writeFile2 } from "../blob";
import { CommandStreams } from "../commands";
import { create, insert } from "../lru";
import { logWith } from "../utils/log";
import {
    buildVideoPath,
    buildMergePartsCommand,
    execCommandIgnoreError,
    buildVideoPartPath
} from "./merger";
import { sequenceTaskArray } from "../utils/task";

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

/**
 * Create a MediaRecorder which emits a Blob after n seconds
 */
const createRecorderPromise = (stream: MediaStream): Promise<Blob> =>
    new Promise(res => {
        const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9" });
        recorder.ondataavailable = d => res(d.data);
        setTimeout(() => {
            recorder.stop();
        }, 10000); //todo parameterize
        recorder.start();
    });

/**
 * Create a new MediaRecorder every n second, outputing results via a single stream
 */
const createRecordingStream = (stream: MediaStream): Stream<Blob> =>
    periodic(1000)
        .take(1)
        .chain(() => fromPromise(createRecorderPromise(stream)));

/**
 * Setup via multiple MediaRecorder approach
 * WARNING very resource intensive!
 */
export const multiRecorderSetup = (cmds: CommandStreams, ms: MediaStream): Stream<Task<string>> =>
    createRecordingStream(ms)
        .sampleWith(cmds.captureStart$)
        .map(writeBlobTask(buildVideoPath()));

/**
 * Setup via a single MediaRecorder, combining the blobs in memory
 */
export const singleRecorderInMemorySetup = (cmds: CommandStreams, ms: MediaStream) =>
    createMovingRecorder(cmds, ms)
        .chain(bs => fromPromise(combineBlobs(bs)))
        .chain(arr => fromPromise(writeFile2(buildVideoPath(), arr)))
        .map(task.of); //temp, gonna need to wrap the above steps in tasks

/**
 * Setup via a single MediaRecorder, persisting each blob then using FFMPEG to merge
 */
export const singleRecorderViaDiskSetup = (cmds: CommandStreams, ms: MediaStream) =>
    createMovingRecorder(cmds, ms)
        .chain(addHeadBlob(ms))
        .map(combineBlobParts);

/**
 * Create a head blob and prepend it to the blobs from a single MediaStream
 */
const addHeadBlob = (ms: MediaStream) => (bs: Blob[]): Stream<Blob[]> =>
    createHeadBlob(ms).map(headBlob => [headBlob, ...bs]);

/**
 * Create a MediaRecorder for a single (tiny) blob. This blob will contain WebM metadata
 */
const createHeadBlob = (ms: MediaStream): Stream<Blob> =>
    fromPromise(
        new Promise(res => {
            const rec = new MediaRecorder(ms, { mimeType: "video/webm;codecs=vp9" });
            rec.ondataavailable = d => res(d.data);
            setTimeout(() => {
                rec.stop();
            }, 150);
            rec.start();
        })
    );

/**
 * 15x1s blobs in an LRU cache via a single MediaRecorder
 * Dumps data on captureStart$ request
 */
const createMovingRecorder = (cmds: CommandStreams, ms: MediaStream) => {
    let blobs = create<Blob>(5, []);
    const rec = new MediaRecorder(ms, { mimeType: "video/webm;codecs=vp9" });
    rec.ondataavailable = d => {
        blobs = insert(blobs, d.data);
    };
    rec.start();
    //tried requestData and start(1000), no difference
    setInterval(() => rec.requestData(), 1000);

    return cmds.captureStart$.map(() => blobs.queue);
};

/**
 * Write each blob to disk before using FFMPEG to merge them
 */
export const combineBlobParts = (bs: Blob[]): Task<string> => {
    const fullPath = buildVideoPath();
    const partPaths = sequenceTaskArray(bs.map((b, i) => writeBlobTask(buildVideoPartPath(i))(b)));
    const fullClipPath = partPaths
        .map(buildMergePartsCommand(fullPath))
        .chain(execCommandIgnoreError)
        .map(logWith("Command ran:"))
        .map(() => fullPath);

    return fullClipPath;
};
