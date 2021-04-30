/* @flow */
/** @jsx h */

import { h, render, Fragment, Node, Component } from 'preact';
import { useState } from 'preact/hooks';
import { getBody } from '../lib';
import { QRCode } from './node-qrcode';
import {type NodeType, BLUE, InstructionIcon, Logo, VenmoMark, AuthMark, cardStyle, DemoWrapper, DemoControls } from './components';

type QRPath = string;
type QRCardProps = {
    cspNonce : ?string,
    qrPath : QRPath,
    demo : boolean
};

class QRCodeElement extends Component<{qrPath: QRPath}, {dataURL: string}> {
    async componentDidMount() {
        const dataURL = await QRCode.toDataURL(
            this.props.qrPath, 
            {
                width: 160,
                color: {
                    dark: BLUE,
                    light: "#FFFFFF"
                } 
            }
        );
        this.setState({ dataURL });
    }
    render() {
        return (
            <img src={ this.state.dataURL } alt="QR Code" />
        );
    }
}



function ErrorMessage({
    message,
    resetFunc
} : {
    message? : string,
    resetFunc : function
}) : NodeType {
    return (
        <div id="venmo-error-view">
            <div className="error-message">{message || 'An issue has occurred' }</div>
            <button className="reset-button" onClick={resetFunc}>Try scanning again</button>
        </div>
    )
}

function QRCard({ 
    cspNonce,
    qrPath,
    demo
} : QRCardProps) : NodeType {
    const [processState, setProcessState] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);

    const isError = () => processState === 'error';
    const setState_error = () => setProcessState('error');
    const setState_scanned = () => setProcessState('scanned');
    const setState_authorized = () => setProcessState('authorized');
    const setState_default = () => setProcessState(null);

    return (
        <Fragment> 
            <style nonce={ cspNonce }> { cardStyle } </style>    
            <div id="view-boxes" className={ processState }>
                { isError() ?
                    <ErrorMessage message={errorMessage} resetFunc={()=>setState_default()} /> :
                    <div id="front-view"  className="card">
                        <QRCodeElement qrPath={qrPath} />
                        <Logo />
                        <div id="instructions">
                            <InstructionIcon className="instruction-icon" />
                            To scan QT code, Open your Venmo App
                        </div>
                    </div>              
                }
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
                    cspNonce={cspNonce}
                    processState={processState}
                    isError={isError}
                    setState_error={setState_error}
                    setState_scanned={setState_scanned}
                    setState_authorized={setState_authorized}
                    setState_default={setState_default}
                    setErrorMessage={setErrorMessage}
                /> : null
            }
        </Fragment>
    );
}

type RenderQRCodeOptions = {
    cspNonce? : string,
    qrPath : string,
    demo? : boolean
};

export function renderQRCode({ cspNonce = '', qrPath, demo = false} : RenderQRCodeOptions) {
    const PropedCard = <QRCard cspNonce={ cspNonce } qrPath={ qrPath } demo={ demo } onRender={console.log('qrcard.jsx rendered')} /> 
    render(
        demo ?
            DemoWrapper(PropedCard, cspNonce) :
            PropedCard , 
        getBody()
    );
}
 
// return render( content, targetElement )
// return content;
// export const checkout : PaymentFlow = {
//     name:                   'checkout',
//     setup:                  setupCheckout,
//     isEligible:             isCheckoutEligible,
//     isPaymentEligible:      isCheckoutPaymentEligible,
//     init:                   initCheckout,
//     updateFlowClientConfig: updateCheckoutClientConfig
// };

// -- 
/*

import { h, render, Fragment, Node } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { noop } from 'belter/src';

import { getBody } from '../lib';

import { QRCard } from './qrcard';

const FADE_TIME = 150;

type PageProps = {|
    cspNonce : string,
    qrPath: string,
    closeFunc: function
|};

const style = `

    #qrExperience{
        transition: opacity ${ (FADE_TIME / 1000).toFixed(2) }s ease-in-out;
        font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
        display: flex;
        position: fixed;
        width: 100%;
        height: 100%;
        top: 0;
        left: 0;
        z-index: 200000;
        margin: 0;
        padding: 0;
        align-items: center;
        justify-content: center;
        background-color: rgba(0, 0, 0, 0.4);                                
    }
`


function Page({ cspNonce, qrPath, closeFunc } : PageProps) : typeof Node {
    const [ visible, setVisible ] = useState(true);
    const toggleVisible = () => {
        return setVisible(!visible);
    };

    const close = () => {
        console.log(this.state.visible);
        return setVisible(false);
    }

    return (
        <Fragment>
        <style nonce={ cspNonce }>
            { style }
        </style>
        { visible ? 
            <div id="qrExperience">
                <QRCard 
                    cspNonce={ cspNonce }
                    qrPath={ qrPath }
                    closeFunc={ close }
                /> 
            </div> : 
            null
        }
        </Fragment>
    );
};

type RenderQRCodeOptions = {
    cspNonce? : string,
    qrPath : string
};

export function renderQRCode({ cspNonce = '', qrPath} : RenderQRCodeOptions) {
    render(
        <Page cspNonce={ cspNonce } qrPath={ qrPath } onRender={console.log('page.jsx rendered')} />, 
        getBody()
    );
}
*/