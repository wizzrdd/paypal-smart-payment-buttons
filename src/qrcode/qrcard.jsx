/* @flow */
/** @jsx h */

import { h, render, Fragment, Node, Component } from 'preact';
import { useState } from 'preact/hooks';
// import { getBody } from '../lib/util';
// import {writeElementToWindow} from 'belter/src';
// import {assertSameDomain} from 'cross-domain-utils/src';
import { getBody } from '../lib';

import { QRCode } from './node-qrcode';
import {type NodeType, BLUE, InstructionIcon, Logo, VenmoMark, AuthMark, cardStyle, DemoWrapper } from './components';
import type {ZoidComponentInstance, ZoidComponent} from '../types';


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
    // 'scanned' > 'authorized' > 'error' 

    // const [scanned, setScanned] = useState(false);
    // const [authorized, setAuthorized] = useState(false);
    // const [inError, setInError] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);


    return (
        <Fragment> 
            <style nonce={ cspNonce }> { cardStyle } </style>    
            <div id="view-boxes" className={ processState }>
                {(processState === 'error') ?
                    <ErrorMessage message={errorMessage} resetFunc={()=>setProcessState(null)} /> :
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

            {demo ?                
                <div id="controls">
                    <style>{`
                        #controls {
                            position: fixed;
                            bottom: 1rem;
                            left: 1rem;
                            padding: 1rem;
                            border: 1px solid #888C94;
                            display: flex;
                            flex-wrap: wrap;
                        }
                        #controls button {min-width: 48px;}
                        #controls > * {margin: 0 0.5rem;}
                        #controls div {display: flex; flex-direction: column;}
                    `}</style>
                    <button disabled={processState==='error'} onClick={()=>{
                        switch (processState) {
                            case 'authorized': setProcessState(null); break;
                            case 'scanned' : setProcessState('authorized'); break;
                            default: setProcessState('scanned')
                        }}}> {{
                                'authorized': 'Reset',
                                'scanned': 'Auth',
                            }[processState] || 'Scan'
                        }
                    </button> 
                    
                    <button onClick={()=>setProcessState('error')}> Show Error </button>
                    <div>
                        <button onClick={()=>{
                            setErrorMessage(document.getElementById('errorMsg').value);
                            setProcessState('error');
                        }}> Set Error Value </button>
                        <input type="text" id="errorMsg"/>
                    </div>
                    <button style="font-weight:700" onClick={()=>{
                        setProcessState(null)
                        setErrorMessage('An issue has occurred');
                    }}> Reset </button>
                    <button onClick={()=>{console.log(`
                        errorMessage: ${errorMessage}
                        processState: ${processState}
                        possible states: 
                          null,
                          scanned,
                          authorized,
                          error                        
                    `)}}> Observe State </button>
                </div> : null
            }

        </Fragment>
    );
}
/*

<button onClick={()=>{console.log('fired')}}> ???? </button>
                </div> : null

                    
*/


type RenderQRCodeOptions = {
    cspNonce? : string,
    qrPath : string,
    demo? : boolean
};

export function renderQRCode({ cspNonce = '', qrPath, demo = false} : RenderQRCodeOptions) {
    const PropedCard = <QRCard cspNonce={ cspNonce } qrPath={ qrPath } demo={ demo } onRender={console.log('qrcard.jsx rendered')} /> 
    render(
        demo ?
            DemoWrapper(PropedCard) :
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