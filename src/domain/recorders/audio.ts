import { tryCatch } from "fp-ts/lib/TaskEither";
import { CommandStreams } from "../commands";
import { fromPromise } from "most";
import { writeBlobSafe } from "../../utils/blob";
import { buildAudioPath } from "../pathBuilders";

export const getAllAudioInfoSafe = tryCatch(
    () => navigator.mediaDevices.enumerateDevices(),
    err => err as Error
).map(dis => dis.filter(di => di.kind === "audioinput"));

export const getAudioMediaSafe = (id: string) =>
    tryCatch(
        () => navigator.mediaDevices.getUserMedia({ audio: { deviceId: id } }),
        err => err as Error
    );

const createRecordingStream = (cmds: CommandStreams, stream: MediaStream) =>
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
            .take(1)
            .tap(() => recorder.stop())
            .chain(() => fromPromise(dataAvailable));
    });

export const setup = (cmds: CommandStreams, ms: MediaStream) =>
    createRecordingStream(cmds, ms).map(writeBlobSafe(buildAudioPath()));
