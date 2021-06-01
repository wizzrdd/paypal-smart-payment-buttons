/* @flow */
/** @jsx h */

import { h, render, Fragment } from 'preact';
import { useState } from 'preact/hooks';

import { getBody } from '../lib';
import { QRCODE_STATE } from '../constants';

import { type NodeType, InstructionIcon, Logo, VenmoMark, AuthMark, cardStyle, DemoWrapper, DemoControls } from './components';

type QRCardProps = {|
    cspNonce : ?string,
    svgString : string,
    demo : boolean,
    state? : $Values<typeof QRCODE_STATE>,
    errorText? : string
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
    errorText = 'An issue has occurred'
} : QRCardProps) : NodeType {
    const [ processState, setProcessState ] = useState(state || null);
    const [ errorMessage, setErrorMessage ] = useState(errorText);
    const isError = () => processState === QRCODE_STATE.ERROR;
    let QRCODE_STATE_EVENTS = {};

    for (const STATE in QRCODE_STATE) {
        const stateValue = QRCODE_STATE[STATE];
        const event = new Event(stateValue);

        window.addEventListener( stateValue, () => {
            // stateValue !== QRCODE_STATE.DEFAULT ? 
            if ( stateValue !== QRCODE_STATE.DEFAULT) {
                setProcessState(stateValue) 
            } else {
                setProcessState(null)
            }        
            debugger;
        });
        QRCODE_STATE_EVENTS[STATE] = event;    
    }


    // const errorEvent =new 
    // window.addEventListener(errorEvent, ()=>setProcessState(QRCODE_STATE.ERROR));

    // window.addEventListener(QRCODE_STATE.SCANNED, ()=>setProcessState(QRCODE_STATE.SCANNED));
    // window.addEventListener(QRCODE_STATE.AUTHORIZED, ()=>setProcessState(QRCODE_STATE.AUTHORIZED));
    // window.addEventListener(QRCODE_STATE.DEFAULT, ()=>setProcessState(null));

    return (
        <Fragment>
            <style nonce={ cspNonce }> { cardStyle } </style>
            <div id="view-boxes" className={ processState }>
                { isError() ?
                    <ErrorMessage message={ errorMessage } resetFunc={ () => setProcessState(null) } /> :
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
                    errorMessage={ errorMessage }
                    isError={ isError() }
                    setState_error={ 
                        ()=>{ window.dispatchEvent(QRCODE_STATE_EVENTS.ERROR); }
                    }
                    setState_scanned={ 
                        ()=>{ window.dispatchEvent(QRCODE_STATE_EVENTS.SCANNED); }
                    }
                    setState_authorized={ 
                        ()=>{ window.dispatchEvent(QRCODE_STATE_EVENTS.AUTHORIZED); }
                    }
                    setState_default={ 
                        ()=>{ window.dispatchEvent(QRCODE_STATE_EVENTS.DEFAULT); }
                    }
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
        errorText={ errorText }
    />);
    render(
        demo ?
            DemoWrapper(PropedCard, cspNonce) :
            PropedCard,
        getBody()
    );
}
