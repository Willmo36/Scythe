import { Setoid } from "fp-ts/lib/Setoid";

export declare const URI = "RecordState";
export declare type URI = typeof URI;
export declare type RecordState = None | Video | VideoAudio;

export class None {
    readonly _tag: "None" = "None";
    readonly _URI: URI = URI;
    fold<B>(whenNone: () => B, whenVideo: () => B, whenVideoAudio: () => B): B {
        return whenNone();
    }
    toString() {
        return "Not recording";
    }
}

export class Video {
    readonly _tag: "Video" = "Video";
    readonly _URI: URI = URI;
    fold<B>(whenNone: () => B, whenVideo: () => B, whenVideoAudio: () => B): B {
        return whenVideo();
    }
    toString() {
        return "Recording screen buffer";
    }
}

export class VideoAudio {
    readonly _tag: "VideoAudio" = "VideoAudio";
    readonly _URI: URI = URI;
    fold<B>(whenNone: () => B, whenVideo: () => B, whenVideoAudio: () => B): B {
        return whenVideoAudio();
    }
    toString() {
        return "Capturing audio";
    }
}

export const getSetoid: () => Setoid<RecordState> = () => ({
    equals: (a, b) => a._tag === b._tag
});

export const none = () => new None();
export const video = () => new Video();
export const videoAudio = () => new VideoAudio();
