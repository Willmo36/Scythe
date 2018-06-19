import { desktopCapturer, SourcesOptions, globalShortcut, ipcRenderer } from "electron";
import * as fs from "fs";
import * as path from "path";
import { formatRelative } from "date-fns";
import { h, render, Component } from "preact";
import { either, Either, fromNullable } from "fp-ts/lib/Either";
import { task, Task } from "fp-ts/lib/Task";
import { taskEither, TaskEither, taskify, right } from "fp-ts/lib/TaskEither";
import { spy } from "fp-ts/lib/Trace";
import * as most from "most";
import { create as createStream } from "@most/create";
import * as LRU from "../lru";
import { CommandStreams, commands } from "../commands";
import { writeBlobs } from "../blob";
import * as Video from "../recorders/video";
import * as Audio from "../recorders/audio";
import { OverlayProps, Overlay } from "../overlay/Overlay";
import * as RS from "../domain/RecordState";

//this is defo wrong
function runAll<T>(task$: most.Stream<Task<T>>) {
    return new Task(() => task$.forEach(t => t.run()));
}

function updateUI(state: RS.RecordState) {
    const appDiv = document.querySelector("#app")!;
    render(<Overlay state={state} />, appDiv, appDiv.lastChild as Element);
}

function start() {
    //turn Video & Audio into "recorder" semigroups
    const audio = Audio.setup(commands).chain(runAll);
    const video = Video.setup(commands).chain(runAll);
    const recorders = [video, audio];

    Promise.all(recorders.map(r => r.run())).catch(e => console.error("Recorder error", e));

    const state$: most.Stream<RS.RecordState> = most
        .of<RS.RecordState>(RS.video())
        .merge(commands.captureStart$.map<RS.RecordState>(() => RS.videoAudio()))
        .merge(commands.captureStop$.map<RS.RecordState>(() => RS.video()));

    state$.forEach(updateUI);
}

start();
