import * as React from "react";
import { State, Transition } from "../state";
import { RemoteData } from "../../domain/RemoteData";
import { DesktopCapturerSource } from "electron";
import { tryBuildConfig } from "../../domain/config";

export class ConfigEditor extends React.Component<
    { state: State; dispatch: (t: Transition) => void },
    {}
> {
    render() {
        const configValidation = tryBuildConfig(this.props.state.configBuilder);
        const configAction = configValidation.fold(
            msgs => <ConfigValidationMessages val={msgs} />,
            config =>
                commitButton(() => this.props.dispatch({ type: "COMMIT_CONFIG", payload: config }))
        );

        return (
            <div className="container font-sans bg-indigo p-1">
                <div className="mb-4">{configAction}</div>
                <div className="mb-4">
                    <label className="block text-sm font-bold mb-2">Choose window:</label>
                    {listScreens(this.props.state.configBuilder.videoScreens, id =>
                        this.props.dispatch({ type: "CHOOSE_SCREEN", payload: id })
                    )}
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-bold mb-2">Choose microphone:</label>
                    {listMicrophones(this.props.state.configBuilder.audioDevices, id =>
                        this.props.dispatch({ type: "CHOOSE_AUDIO", payload: id })
                    )}
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

const MicrophoneList: React.SFC<{
    devices: MediaDeviceInfo[];
    handleChange: (id: string) => void;
}> = props =>
    props.devices.length === 0 ? (
        <p>No microphones found</p>
    ) : (
        <select
            className="shadow border rounded w-full py-2 px-3 leading-tight"
            onChange={e => props.handleChange(e.target.value)}
        >
            {props.devices.map(d => <option value={d.deviceId}>{d.label}</option>)}
        </select>
    );

const listMicrophones = (
    devices: RemoteData<MediaDeviceInfo[]>,
    handleChange: (id: string) => void
) =>
    devices.fold(
        () => <p>Not yet started</p>,
        () => <p>Fetching screens</p>,
        ds => <MicrophoneList devices={ds} handleChange={handleChange} />,
        () => <p>Something went wrong</p>
    );

const ConfigValidationMessages: React.SFC<{ val: string[] }> = props => (
    <div className="bg-orange-lightest border-l-4 border-orange text-orange-dark p-4" role="alert">
        <p className="font-bold">Config incomplete</p>
        <ul>{props.val.map(msg => <li key={msg}>{msg}</li>)}</ul>
    </div>
);

const commitButton = (handleSubmit: () => void) => (
    <button
        onClick={handleSubmit}
        className="bg-blue hover:bg-blue-dark text-white font-bold py-2 px-4 rounded"
        type="button"
    >
        Save & Restart
    </button>
);
