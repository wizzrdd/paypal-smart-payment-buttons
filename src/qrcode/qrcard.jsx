/* @flow */
/** @jsx h */

import { h, render, Fragment } from 'preact';
import { useState } from 'preact/hooks';

import { getBody } from '../lib';

import { type NodeType, InstructionIcon, Logo, VenmoMark, AuthMark, cardStyle, DemoWrapper, DemoControls } from './components';

const QRCODE_STATE = {
    ERROR:      'error',
    SCANNED:    'scanned',
    AUTHORIZED: 'authorized'
};

type QRCardProps = {|
    cspNonce : ?string,
    svgString : string,
    demo : boolean,
    state : ?$Values<typeof QRCODE_STATE>,
    errorText : ?string
|};

function ErrorMessage({
    message,
    resetFunc
} : {|
    message? : string,
    resetFunc : () => void
|}) : NodeType {
    return (
        <div id="error-view">
            <div className="error-message">{message || 'An issue has occurred' }</div>
            <button className="reset-button" type="button" onClick={ resetFunc }>Try scanning again</button>
        </div>
    );
}

function QRCodeElement({ svgString } : {| svgString : string |}) : NodeType {
    
    const src = `data:image/svg+xml;base64,${ btoa(svgString) }`;
    return (<img id="qr-code" src={ src } alt="QR Code" />);
}

function QRCard({
    cspNonce,
    svgString,
    demo,
    state,
    errorText
} : QRCardProps) : NodeType {
    const [ processState, setProcessState ] = useState(state || null);
    const [ errorMessage, setErrorMessage ] = useState(errorText || null);

    const isError = () => processState === QRCODE_STATE.ERROR;
    const setState_error = () => setProcessState(QRCODE_STATE.ERROR);
    const setState_scanned = () => setProcessState(QRCODE_STATE.SCANNED);
    const setState_authorized = () => setProcessState(QRCODE_STATE.AUTHORIZED);

    const setState_default = () => setProcessState(null);

    return (
        <Fragment>
            <style nonce={ cspNonce }> { cardStyle } </style>
            <div id="view-boxes" className={ processState }>
                { isError() ?
                    <ErrorMessage message={ errorMessage } resetFunc={ () => setState_default() } /> :
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
            </div>

            { demo ?
                <DemoControls
                    cspNonce={ cspNonce }
                    processState={ processState }
                    isError={ isError }
                    setState_error={ setState_error }
                    setState_scanned={ setState_scanned }
                    setState_authorized={ setState_authorized }
                    setState_default={ setState_default }
                    setErrorMessage={ setErrorMessage }
                /> : null}
        </Fragment>
    );
}

type RenderQRCodeOptions = {|
    cspNonce? : string,
    svgString : string,
    demo? : boolean,
    state? : $Values<typeof QRCODE_STATE>,
    errorText? : string
|};

export function renderQRCode({ cspNonce = '', svgString, demo = false, state = null, errorText = null } : RenderQRCodeOptions) {
    const PropedCard = (<QRCard
        cspNonce={ cspNonce }
        svgString={ svgString }
        demo={ demo }
        state={ state }
        errorText={ null }
    />);
    render(
        demo ?
            DemoWrapper(PropedCard, cspNonce) :
            PropedCard,
        getBody()
    );
}
