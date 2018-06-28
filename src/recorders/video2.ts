import { desktopCapturer } from "electron";
import { CommandStreams } from "../commands";
import { writeBlobTask } from "../blob";
import { buildVideoPath } from "./merger";
import { Stream, periodic, fromPromise } from "most";
import { tryCatch } from "fp-ts/lib/TaskEither";

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

export const setup = (cmds: CommandStreams, ms: MediaStream) =>
    createRecordingStream(ms)
        .sampleWith(cmds.captureStart$)
        .map(writeBlobTask(buildVideoPath()));
