import { Task } from "fp-ts/lib/Task";
import { desktopCapturer } from "electron";
import { CommandStreams } from "../commands";
import { writeBlobTask } from "../blob";
import { buildVideoPath } from "./merger";
import { Stream, periodic, fromPromise } from "most";
import { tryCatch } from "fp-ts/lib/TaskEither";

export const getSources = new Task(
    () =>
        new Promise<Electron.DesktopCapturerSource[]>((res, rej) =>
            desktopCapturer.getSources(
                { types: ["window", "screen"] },
                (err, srcs) => (!!err ? rej : res(srcs))
            )
        )
);

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

const getVideoMedia = getSources.map(s => s[0]).chain(src => {
    const opts: any = {
        audio: false,
        video: {
            mandatory: {
                chromeMediaSource: "desktop",
                chromeMediaSourceId: src.id
            }
        }
    };

    return new Task(() => navigator.mediaDevices.getUserMedia(opts));
});

export const getVideoMediaSafe = (sourceId: string) =>
    tryCatch<Error, MediaStream>(
        () =>
            navigator.mediaDevices.getUserMedia({
                audio: false,
                video: {
                    mandatory: { chromeMediaSource: "desktop", chromeMediaSourceId: sourceId }
                }
            } as any),
        err => err as Error
    );

const createRecorderPromise = (stream: MediaStream): Promise<Blob> =>
    new Promise(res => {
        const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9" });
        recorder.ondataavailable = d => res(d.data);
        setTimeout(() => {
            recorder.stop();
        }, 5000);
        recorder.start();
    });

const createRecordingStream = (stream: MediaStream): Stream<Blob> =>
    periodic(1000).chain(() => fromPromise(createRecorderPromise(stream)));

const setupRecorders = (cmds: CommandStreams) =>
    getVideoMedia.map(createRecordingStream).map(r$ => r$.sampleWith(cmds.captureStart$));

export const setup = (evs: CommandStreams) =>
    setupRecorders(evs).map(blob$ => blob$.map(writeBlobTask(buildVideoPath())));

export const setup2 = (cmds: CommandStreams, ms: MediaStream) =>
    createRecordingStream(ms)
        .sampleWith(cmds.captureStart$)
        .map(writeBlobTask(buildVideoPath()));
