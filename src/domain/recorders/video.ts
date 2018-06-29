import { desktopCapturer } from "electron";
import { TaskEither, tryCatch } from "fp-ts/lib/TaskEither";
import { fromPromise, periodic, Stream } from "most";
import { create, insert } from "../../lru";
import { writeBlobSafe, concatBlobsSafe, writeSafe } from "../../utils/blob";
import { logWith } from "../../utils/log";
import { sequenceTaskEitherArray } from "../../utils/task";
import { CommandStreams } from "../commands";
import { buildMergePartsCommand, execCommandIgnoreErrorSafe } from "../ffmpegCommands";
import { buildVideoPartPath, buildVideoPath } from "../pathBuilders";

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
export const multiRecorderSetup = (
    cmds: CommandStreams,
    ms: MediaStream
): Stream<TaskEither<Error, string>> =>
    createRecordingStream(ms)
        .sampleWith(cmds.captureStart$)
        .map(writeBlobSafe(buildVideoPath()));

/**
 * Setup via a single MediaRecorder, combining the blobs in memory
 */
export const singleRecorderInMemorySetup = (
    cmds: CommandStreams,
    ms: MediaStream
): Stream<TaskEither<Error, string>> =>
    createMovingRecorder(cmds, ms)
        .map(concatBlobsSafe)
        .map(t => t.chain(writeSafe(buildVideoPath())));

/**
 * Setup via a single MediaRecorder, persisting each blob then using FFMPEG to merge
 */
export const singleRecorderViaDiskSetup = (
    cmds: CommandStreams,
    ms: MediaStream
): Stream<TaskEither<Error, string>> =>
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
export const combineBlobParts = (bs: Blob[]): TaskEither<Error, string> => {
    const fullPath = buildVideoPath();
    const partPaths = sequenceTaskEitherArray(
        bs.map((b, i) => writeBlobSafe(buildVideoPartPath(i))(b))
    );
    const fullClipPath = partPaths
        .map(buildMergePartsCommand(fullPath))
        .chain(execCommandIgnoreErrorSafe)
        .map(logWith("Command ran:"))
        .map(() => fullPath);

    return fullClipPath;
};
