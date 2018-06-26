import * as path from "path";
import { DesktopCapturerSource } from "electron";
import { RemoteData, notStarted } from "./RemoteData";

export type Config = {
    video: {
        screens: RemoteData<DesktopCapturerSource[]>;
        media: RemoteData<MediaStream>;
    };
    audio: {
        devices: RemoteData<MediaDeviceInfo[]>;
        media: RemoteData<MediaStream>;
    };
    outputPath: string;
    recordingLength: number;
};

export const initializeConfig = (): Config => ({
    video: {
        screens: notStarted<DesktopCapturerSource[]>(),
        media: notStarted<MediaStream>()
    },
    audio: {
        devices: notStarted<MediaDeviceInfo[]>(),
        media: notStarted<MediaStream>()
    },
    outputPath: path.join(process.cwd(), `/output/`),
    recordingLength: 10
});
