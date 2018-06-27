import { Task } from "fp-ts/lib/Task";
import { TaskEither, right, tryCatch } from "fp-ts/lib/TaskEither";
import { fromNullable } from "fp-ts/lib/Either";
import { create } from "@most/create";
import { CommandStreams } from "../commands";
import { Stream, fromPromise } from "most";
import * as path from "path";
import { writeBlobTask } from "../blob";
import { spy } from "fp-ts/lib/Trace";

type RecorderSetup = (streams: CommandStreams) => (ms: MediaStream) => Stream<Blob>;

export const getAllAudioInfo = new Task(() => navigator.mediaDevices.enumerateDevices());
export const getAllAudioInfoSafe = tryCatch(
    () => navigator.mediaDevices.enumerateDevices(),
    err => err as Error
);
export const getAudioInfo = new TaskEither<String, MediaDeviceInfo>(
    getAllAudioInfo
        .map(ds => ds.find(d => d.kind === "audioinput"))
        .map(fromNullable("No audio device info found"))
);

const getAudioMedia = (info: MediaDeviceInfo) =>
    new Task(() => navigator.mediaDevices.getUserMedia({ audio: { deviceId: info.deviceId } }));

export const getAudioMediaSafe = (id: string) =>
    tryCatch(
        () => navigator.mediaDevices.getUserMedia({ audio: { deviceId: id } }),
        err => err as Error
    );

export const tryGetAudioMedia = getAudioInfo.map(getAudioMedia).chain(right);

export const setupAudioRecording: RecorderSetup = commands => stream => {
    //todo, create recorder per captureStart4
    const recorder = new MediaRecorder(stream, {
        bitsPerSecond: 128000,
        mimeType: "audio/webm;codecs=opus"
    });

    const dataAvailable$ = create<Blob>((add, end) => {
        recorder.ondataavailable = d => {
            const b = new Blob([d.data], { type: "audio/webm" });
            add(b);
            end();
        };
    });

    return commands.captureStart$
        .tap(() => recorder.start())
        .chain(() => commands.captureStop$.tap(() => recorder.stop()))
        .chain(() => dataAvailable$);
};

const foo = (cmds: CommandStreams) => (stream: MediaStream) =>
    cmds.captureStart$.chain(() => {
        const recorder = new MediaRecorder(stream, {
            bitsPerSecond: 128000,
            mimeType: "audio/webm;codecs=opus"
        });

        const dataAvailable = new Promise<Blob>(res => {
            recorder.ondataavailable = d => res(d.data);
        });

        recorder.start();

        return cmds.captureStop$
            .tap(() => recorder.stop())
            .chain(() => fromPromise(dataAvailable))
            .tap(spy);
    });

export const setup = (cmds: CommandStreams) =>
    tryGetAudioMedia
        .fold(warn, foo(cmds))
        .map(blobs$ => blobs$.map(writeBlobTask(buildAudioPath())));

const warn = console.warn.bind(console);

const buildAudioPath = () =>
    path.join(process.cwd(), `/recording_tmp/audio_${Date.now().toString()}.webm`);
