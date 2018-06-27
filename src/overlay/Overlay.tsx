import * as React from "react";
import { OverlayState, Transition } from "./overlayState";
import { RemoteData } from "../domain/RemoteData";
import { DesktopCapturerSource } from "electron";
import { tryBuildConfig } from "../domain/config";

export class Overlay extends React.Component<
    { state: OverlayState; dispatch: (t: Transition) => void },
    {}
> {
    render() {
        const configVal = tryBuildConfig(this.props.state.configBuilder).fold(
            msgs => <ConfigValidationMessages val={msgs} />,
            () => null
        );

        return (
            <div className="container font-sans bg-indigo p-1">
                {configVal}
                <div className="mb-4">
                    <label className="block text-sm font-bold mb-2">Screens</label>
                    {listScreens(this.props.state.configBuilder.videoScreens, id =>
                        this.props.dispatch({ type: "CHOOSE_SCREEN", payload: id })
                    )}
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-bold mb-2">Screens</label>
                    {listMicrophones(this.props.state.configBuilder.audioDevices)}
                </div>
            </div>
        );
    }
}

const ScreenList: React.SFC<{
    screens: DesktopCapturerSource[];
    handleChange: (id: string) => void;
}> = props =>
    props.screens.length === 0 ? (
        <p>No screens found</p>
    ) : (
        <select
            className="shadow border rounded w-full py-2 px-3 leading-tight"
            onChange={e => props.handleChange(e.target.value)}
        >
            {props.screens.map(sc => <option value={sc.id}>{sc.name}</option>)}
        </select>
    );

const listScreens = (
    screens: RemoteData<DesktopCapturerSource[]>,
    handleChange: (id: string) => void
) =>
    screens.fold(
        () => <p>Not yet started</p>,
        () => <p>Fetching screens</p>,
        screens_ => <ScreenList screens={screens_} handleChange={handleChange} />,
        () => <p>Something went wrong</p>
    );

const MicrophoneList: React.SFC<{ devices: MediaDeviceInfo[] }> = props =>
    props.devices.length === 0 ? (
        <p>No microphones found</p>
    ) : (
        <select className="shadow border rounded w-full py-2 px-3 leading-tight">
            {props.devices.map(d => <option value={d.deviceId}>{d.label}</option>)}
        </select>
    );

const listMicrophones = (devices: RemoteData<MediaDeviceInfo[]>) =>
    devices.fold(
        () => <p>Not yet started</p>,
        () => <p>Fetching screens</p>,
        ds => <MicrophoneList devices={ds} />,
        () => <p>Something went wrong</p>
    );

const ConfigValidationMessages: React.SFC<{ val: string[] }> = props => (
    <div className="bg-orange-lightest border-l-4 border-orange text-orange-dark p-4" role="alert">
        <p className="font-bold">Config incomplete</p>
        <ul>{props.val.map(msg => <li key={msg}>{msg}</li>)}</ul>
    </div>
);
