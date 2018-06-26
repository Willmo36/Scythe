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

// type ValidationBuilder<T extends keyof Config> = (
//     cb: ConfigBuilder
// ) => Validation<string[], (p: Partial<Config>) => Partial<Config> & { T: Config[T] }>;

class ValidationBuilder<K extends keyof Config> {
    constructor(
        public validate: (cb: ConfigBuilder) => Validation<string[], Config[K]>,
        private _append: <U>(myVal: Config[K]) => (prevVal: U) => U & Pick<Config, K>
    ) {}

    build<U>(
        cb: ConfigBuilder,
        prevVal: Validation<string[], U>
    ): Validation<string[], U & Pick<Config, K>> {
        return ap(this.validate(cb).map(myVal => this._append<U>(myVal)), prevVal);
    }
}

const checkVideoScreens2 = new ValidationBuilder<"videoScreens">(
    cb =>
        cb.videoScreens.fold<Validation<string[], DesktopCapturerSource[]>>(
            () => failure(["Not started looking for screens"]),
            () => failure(["Looking for available screens..."]),
            s => of(s),
            () => failure(["Failed to find any screens"])
        ),
    videoScreens => <T>(prevVal: T) => Object.assign({}, prevVal, { videoScreens })
);

const checkVideoScreens = <T>(cb: ConfigBuilder, val: Validation<string[], T>) =>
    ap(
        cb.videoScreens
            .fold<Validation<string[], DesktopCapturerSource[]>>(
                () => failure(["Not started looking for screens"]),
                () => failure(["Looking for available screens..."]),
                s => of(s),
                () => failure(["Failed to find any screens"])
            )
            .map(videoDevices => (partial: T) => Object.assign({}, partial, { videoDevices })),
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
    const val1 = ap(checkVideoScreens(cb), of({}));
    const val2 = checkAudioDevices(cb)(val1);
}

export const validateConfigToConfig2 = (vc: ValidateConfig): Either<string[], Config> => {};
