/* @flow */
/** @jsx h */

import { h, render, Fragment } from 'preact';
import { useState, useEffect } from 'preact/hooks';

import {
    getBody
} from '../lib';
import { QRCODE_STATE } from '../constants';

import { type NodeType,
    ErrorMessage,
    QRCodeElement,
    InstructionIcon,
    Logo,
    VenmoMark,
    AuthMark,
    cardStyle,
} from './components';


function useXProps<T>() : T {
    const [ xprops, setXProps ] = useState(window.xprops);
    useEffect(() => xprops.onProps(newProps => {
        setXProps({ ...newProps });
    }), []);

    function setState (newState : $Values<typeof QRCODE_STATE>) {
        setXProps({
            ...xprops,
            state: newState
        });
    }

    return {
        ...xprops,
        setState
    };
}


function QRCard({
    cspNonce,
    svgString
} : {|
    cspNonce : ?string,
    svgString : string
|}) : NodeType {
    const { state, errorText, setState } = useXProps();
    const isError = () => {
        return state === QRCODE_STATE.ERROR;
    };

    const debugging_nextStateMap = new Map([
        [ QRCODE_STATE.DEFAULT, QRCODE_STATE.SCANNED ],
        [ QRCODE_STATE.ERROR, QRCODE_STATE.DEFAULT ],
        [ QRCODE_STATE.AUTHORIZED, QRCODE_STATE.ERROR ],
        [ QRCODE_STATE.SCANNED, QRCODE_STATE.AUTHORIZED ]
    ]);
    function debugging_nextState(currentState:$Values<typeof QRCODE_STATE>) {
        setState(debugging_nextStateMap.get(currentState));        
    }
    
    return (
        <Fragment>
            <style nonce={ cspNonce }> { cardStyle } </style>
            <div id="view-boxes" className={ state }>
                { isError() ?
                    <ErrorMessage
                        message={ errorText }
                        resetFunc={ () => setState(QRCODE_STATE.DEFAULT) }
                    /> :
                    <div id="front-view" className="card">
                        <QRCodeElement svgString={ svgString } />
                        <Logo />
                        <div id="instructions">
                            <InstructionIcon stylingClass="instruction-icon" />
                            To scan QR code, Open your Venmo App
                        </div>
                    </div>}
                <div className="card" id="back-view" >
                    <span className="mark">
                        <VenmoMark />
                        <AuthMark />
                    </span>
                    
                    <div className="auth-message">
                        Go to your Venmo app and authorize
                    </div>
                    <div className="success-message">
                        Venmo account authorized
                    </div>

                </div>
                <button className="debugCtrl" style="position:absolute;bottom:8px;right:8px;padding:4px" onClick={()=>debugging_nextState(state)}>Next State</button>
            </div>
        </Fragment>
    );
}

type RenderQRCodeOptions = {|
    cspNonce? : string,
    svgString : string
|};

export function renderQRCode({
    cspNonce = '',
    svgString
} : RenderQRCodeOptions) {
    render(
        <QRCard
            cspNonce={ cspNonce }
            svgString={ svgString }
        />,
        getBody()
    );
}
