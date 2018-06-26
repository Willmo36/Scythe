import { Config, initializeConfig } from "../domain/config";
import { create } from "@most/create";
import { Stream, merge } from "most";
import { createInitHandler } from "./handlers/init";

export type OverlayState = {
    config: Config;
};

export type StateUpdate = (o: OverlayState) => OverlayState;

export const initializeState = (): OverlayState => ({
    config: initializeConfig()
});

export type Transition = { type: "INIT" };

//this isn't great but I don't understand most-subject yet
export function createDispatcher() {
    let dispatch: (a: Transition) => void;

    const transition$ = create<Transition>(add => {
        dispatch = add;
    });

    //@ts-ignore
    return { dispatch, transition$ };
}

export const isTransition = (type: Transition["type"]) => (action: Transition) =>
    action.type === type;

const createStateStream = (t$: Stream<Transition>): Stream<OverlayState> =>
    merge(createInitHandler(t$)).scan<OverlayState>((s, update) => update(s), initializeState());
