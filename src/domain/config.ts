import * as path from "path";
import { DesktopCapturerSource } from "electron";
import { Validation, failure, getApplicative } from "fp-ts/lib/Validation";
import { getArrayMonoid } from "fp-ts/lib/Monoid";
import { Either, left, right } from "fp-ts/lib/Either";
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

type ValidatedKeys<T> = { [K in keyof T]: Either<string[], T[K]> };
export type ValidateConfig = ValidatedKeys<Config>;

export const initializeConfigBuilder = (): ConfigBuilder => ({
    videoScreens: notStarted<DesktopCapturerSource[]>(),
    videoMediaStream: notStarted<MediaStream>(),

    audioDevices: notStarted<MediaDeviceInfo[]>(),
    audioMediaStream: notStarted<MediaStream>(),

    outputPath: path.join(process.cwd(), `/output/`),
    recordingLength: 10
});

const { of, ap } = getApplicative(getArrayMonoid<string>());

type ValidationBuilder = (
    cb: ConfigBuilder
) => Validation<string[], (vc: ValidateConfig) => ValidateConfig>;

const checkVideoScreens: ValidationBuilder = cb =>
    cb.videoScreens
        .fold<Validation<string[], DesktopCapturerSource[]>>(
            () => failure(["Not started looking for screens"]),
            () => failure(["Looking for available screens..."]),
            s => of(s),
            () => failure(["Failed to find any screens"])
        )
        .map(vs => (vc: ValidateConfig): ValidateConfig => ({
            ...vc,
            videoScreens: right(vs)
        }));

const checkAudioDevices: ValidationBuilder = cb =>
    cb.audioDevices
        .fold<Validation<string[], MediaDeviceInfo[]>>(
            () => failure(["Not started looking for microphones"]),
            () => failure(["Looking for available microphones..."]),
            s => of(s),
            () => failure(["Failed to find any microphones"])
        )
        .map(audioDevices => (vc: ValidateConfig): ValidateConfig => ({
            ...vc,
            audioDevices: right(audioDevices)
        }));

const checks: ValidationBuilder[] = [checkVideoScreens, checkAudioDevices];

export function validate(cb: ConfigBuilder) {
    const validateConfig: ValidateConfig = {
        videoScreens: left([]),
        videoMediaStream: left([]),
        audioDevices: left([]),
        audioMediaStream: left([]),
        outputPath: left([]),
        recordingLength: left([])
    };

    const initialValidation = of(validateConfig);
    const result = checks.reduce((acc, check) => ap(check(cb), acc), initialValidation);
}

export const validateConfigToConfig = (vc: ValidateConfig): Either<string[], Config> =>
    vc.videoScreens.chain(videoScreens =>
        vc.videoMediaStream.chain(videoMediaStream =>
            vc.audioDevices.chain(audioDevices =>
                vc.audioMediaStream.chain(audioMediaStream =>
                    vc.outputPath.chain(outputPath =>
                        vc.recordingLength.chain(recordingLength =>
                            right<string[], Config>({
                                videoScreens,
                                videoMediaStream,
                                audioDevices,
                                audioMediaStream,
                                outputPath,
                                recordingLength
                            })
                        )
                    )
                )
            )
        )
    );

export const validateConfigToConfig2 = (vc: ValidateConfig): Either<string[], Config> => {
    vc.videoScreens.map(videoScreens => ({ videoScreens }));
};
