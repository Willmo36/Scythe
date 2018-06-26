import { Config, initializeConfig } from "../domain/config";

export type OverlayState = {
    config: Config;
};

export const initializeState = (): OverlayState => ({
    config: initializeConfig()
});
