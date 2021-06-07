/* @flow */
/** @jsx h */

import { h, render, Fragment } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { ZalgoPromise } from 'zalgo-promise/src';
import { type CrossDomainWindowType, getDomain } from 'cross-domain-utils/src';
import { cleanup } from 'belter/src';

import {
    getBody,
    onPostMessage,
    getPostRobot,
    briceLog
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
    DemoWrapper,
    DemoControls
} from './components';


function discernWindow () : CrossDomainWindowType {
    return (window.xprops && window.xprops.getParent()) || window;
}
function discernDomain () : string {
    return (window.xprops && window.xprops.getParentDomain()) || getDomain(window) || getDomain();
}

export function updateQRCodeComponent ({
    componentWindow,
    newState,
    errorMessageText
} : {|
    componentWindow : CrossDomainWindowType,
    newState? : $Values<typeof QRCODE_STATE>,
    errorMessageText? : string
|}) : ZalgoPromise<void> {
    const errorMessagePayload = (newState === QRCODE_STATE.ERROR && errorMessageText) && { errorMessage: errorMessageText };
    const postRobot = getPostRobot();

    return postRobot.send(
        componentWindow,
        newState ? newState : QRCODE_STATE.DEFAULT,
        errorMessagePayload ? errorMessagePayload : {},
        { domain: discernDomain()  }
    ).then(({ data }) => data);
}


function QRCard({
    cspNonce,
    svgString,
    demo,
    state,
    errorText = 'An issue has occurred'
} : {|
    cspNonce : ?string,
    svgString : string,
    demo : boolean,
    state? : $Values<typeof QRCODE_STATE>,
    errorText? : string
|}) : NodeType {
    const [ processState, setProcessState ] = useState(state || null);
    const [ errorMessage, setErrorMessage ] = useState(errorText);
    const clean = cleanup();
    const isError = () => processState === QRCODE_STATE.ERROR;
    const win = discernWindow();
    const domain = discernDomain();
    function setupListeners () {
        const onAuthorizedListener = onPostMessage(win, domain, QRCODE_STATE.AUTHORIZED, (data) => {
            briceLog('in onPostMessage listener - onAuthorizedListener');
            console.log(data); // eslint-disable-line no-console
            clean.all();
            if (processState !== QRCODE_STATE.AUTHORIZED) {
                setProcessState(QRCODE_STATE.AUTHORIZED);
            } else {
                setupListeners();
            }
        });
        const onScannedListener = onPostMessage(win, domain, QRCODE_STATE.SCANNED, (data) => {
            briceLog('in onPostMessage listener - onScannedListener');
            console.log(data); // eslint-disable-line no-console
            clean.all();
            if (processState !== QRCODE_STATE.SCANNED) {
                setProcessState(QRCODE_STATE.SCANNED);
            } else {
                setupListeners();
            }
        });
        const onDefaultListener = onPostMessage(win, domain, QRCODE_STATE.DEFAULT, (data) => {
            briceLog('in onPostMessage listener - onDefaultListener');
            console.log(data); // eslint-disable-line no-console
            clean.all();
            if (processState && processState !== QRCODE_STATE.DEFAULT) {
                setProcessState(QRCODE_STATE.DEFAULT);
            } else {
                setupListeners();
            }
        });
        const onErrorListener = onPostMessage(win, domain, QRCODE_STATE.ERROR, (data) => {
            briceLog('in onPostMessage listener - onErrorListener');
            console.log(data); // eslint-disable-line no-console
            const postedErrorMessage = data.data.errorMessage;
            clean.all();
            if (processState !== QRCODE_STATE.ERROR || errorMessage !== postedErrorMessage) {
                setProcessState(QRCODE_STATE.ERROR);
                setErrorMessage(postedErrorMessage);
            } else {
                setupListeners();
            }
        });
        clean.register(onAuthorizedListener.cancel);
        clean.register(onScannedListener.cancel);
        clean.register(onDefaultListener.cancel);
        clean.register(onErrorListener.cancel);
    }

    useEffect(() => {
        briceLog('in QRCard.useEffect()');
        setupListeners();
    });

    /* -- looped style of implementation
    for (const STATE in QRCODE_STATE) {
        if (Object.prototype.hasOwnProperty.call(QRCODE_STATE, STATE)) {
            const stateValue = QRCODE_STATE[STATE];
            const listener = onPostMessage(win, domain, stateValue, (data) => {
                briceLog('in onPostMessage listener');
                briceLog(stateValue);
                console.log(data); // eslint-disable-line no-console

                if (stateValue === QRCODE_STATE.ERROR && data.errorMessagePayload) {
                    setErrorMessage(data.errorMessagePayload);
                }

                if (stateValue !== QRCODE_STATE.DEFAULT) {
                    setProcessState(stateValue);
                } else {
                    setProcessState(null);
                }

                
                // $FlowFixMe
                for (const listener in listeners) {
                    listeners[listener].cancel
                    cancelArray.push();
                    

                }

                ZalgoPromise.all(cancelArray).then(noop);

            });
            listeners.push(listener);

            // window.addEventListener(stateValue, () => {
            //     if (stateValue !== QRCODE_STATE.DEFAULT) { setProcessState(stateValue); } else { setProcessState(null);}
            // });
            // QRCODE_STATE_EVENTS[STATE] = event;
        }
    }
*/

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
                    <ErrorMessage message={ errorMessage } resetFunc={ () => updateQRCodeComponent({ componentWindow: win, newState: QRCODE_STATE.DEFAULT }) } /> :
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
                    setState_error={ (str) => { updateQRCodeComponent({ componentWindow: win, newState: QRCODE_STATE.ERROR, errorMessageText: str }); } }
                    setState_scanned={ () => { updateQRCodeComponent({ componentWindow: win, newState: QRCODE_STATE.SCANNED }); } }
                    setState_authorized={ () => { updateQRCodeComponent({ componentWindow: win, newState: QRCODE_STATE.AUTHORIZED }); } }
                    setState_default={ () => { updateQRCodeComponent({ componentWindow: win, newState: QRCODE_STATE.DEFAULT }); } }
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
