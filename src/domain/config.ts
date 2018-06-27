import * as path from "path";
import { DesktopCapturerSource } from "electron";
import { Validation, failure, getApplicative } from "fp-ts/lib/Validation";
import { getArrayMonoid } from "fp-ts/lib/Monoid";
import { RemoteData, notStarted } from "./RemoteData";

export type Config = {
    videoScreens: DesktopCapturerSource[];
    videoMediaStream: MediaStream;

    audioDevices: MediaDeviceInfo[];
    audioMediaStream: MediaStream;

    outputPath: string;
    recordingLength: number;
};

export type ConfigBuilder = {
    videoScreens: RemoteData<DesktopCapturerSource[]>;
    videoMediaStream: RemoteData<MediaStream>;

    audioDevices: RemoteData<MediaDeviceInfo[]>;
    audioMediaStream: RemoteData<MediaStream>;

    outputPath: string;
    recordingLength: number;
};

export const initializeConfigBuilder = (): ConfigBuilder => ({
    videoScreens: notStarted<DesktopCapturerSource[]>(),
    videoMediaStream: notStarted<MediaStream>(),

    audioDevices: notStarted<MediaDeviceInfo[]>(),
    audioMediaStream: notStarted<MediaStream>(),

    outputPath: path.join(process.cwd(), `/output/`),
    recordingLength: 10
});

const { of, ap } = getApplicative(getArrayMonoid<string>());
const checkVideoScreens = <T>(cb: ConfigBuilder, val: Validation<string[], T>) =>
    ap(
        cb.videoScreens
            .fold<Validation<string[], DesktopCapturerSource[]>>(
                () => failure(["Not started looking for screens"]),
                () => failure(["Looking for available screens..."]),
                s => of(s),
                () => failure(["Failed to find any screens"])
            )
            .map(videoScreens => (partial: T) => Object.assign({}, partial, { videoScreens })),
        val
    );

const checkVideoMediaStream = <T>(cb: ConfigBuilder, val: Validation<string[], T>) =>
    ap(
        cb.videoMediaStream
            .fold<Validation<string[], MediaStream>>(
                () => failure(["Waiting for screen to be chosen"]),
                () => failure(["Requesting video stream..."]),
                s => of(s),
                () => failure(["Failed to get video stream"])
            )
            .map(videoMediaStream => (partial: T) =>
                Object.assign({}, partial, { videoMediaStream })
            ),
        val
    );

const checkAudioDevices = <T>(cb: ConfigBuilder, val: Validation<string[], T>) =>
    ap(
        cb.audioDevices
            .fold<Validation<string[], MediaDeviceInfo[]>>(
                () => failure(["Not started looking for microphones"]),
                () => failure(["Looking for available microphones..."]),
                s => of(s),
                () => failure(["Failed to find any microphones"])
            )
            .map(audioDevices => (partial: T) => Object.assign({}, partial, { audioDevices })),
        val
    );

const checkAudioMediaStream = <T>(cb: ConfigBuilder, val: Validation<string[], T>) =>
    ap(
        cb.audioMediaStream
            .fold<Validation<string[], MediaStream>>(
                () => failure(["Waiting for microphone to be chosen"]),
                () => failure(["Requesting microphone stream"]),
                s => of(s),
                () => failure(["Failed to get microphone stream"])
            )
            .map(audioMediaStream => (partial: T) =>
                Object.assign({}, partial, { audioMediaStream })
            ),
        val
    );

const checkOutputPath = <T>(cb: ConfigBuilder, val: Validation<string[], T>) =>
    ap(
        of(cb.outputPath).map(outputPath => (partial: T) =>
            Object.assign({}, partial, { outputPath })
        ),
        val
    );

const checkRecordingLength = <T>(cb: ConfigBuilder, val: Validation<string[], T>) =>
    ap(
        of(cb.recordingLength).map(recordingLength => (partial: T) =>
            Object.assign({}, partial, { recordingLength })
        ),
        val
    );

export function tryBuildConfig(cb: ConfigBuilder): Validation<string[], Config> {
    const v1 = checkVideoScreens(cb, of({}));
    const v2 = checkAudioDevices(cb, v1);
    const v3 = checkVideoMediaStream(cb, v2);
    const v4 = checkAudioMediaStream(cb, v3);
    const v5 = checkOutputPath(cb, v4);
    const v6 = checkRecordingLength(cb, v5);
    return v6;
}
