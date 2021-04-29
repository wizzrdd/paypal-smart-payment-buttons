/* @flow */
/** @jsx h */

import { h, render, Fragment, Node, Component } from 'preact';
import { useState } from 'preact/hooks';
// import { getBody } from '../lib/util';
// import {writeElementToWindow} from 'belter/src';
// import {assertSameDomain} from 'cross-domain-utils/src';
import { getBody } from '../lib';

import { QRCode } from './node-qrcode';
import { InstructionIcon, Logo, Mark, cardStyle, DemoWrapper } from './assets';
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
                    dark:"#0074DE",
                    light:"#FFFFFF"
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

function ErrorMessage({message: string}) : typeof Node {
    return (
        <div id="venmo-error-view">
            <div id="venmo-error__message"></div>
            <button id="venmo-error__button">Try scanning again</button>
        </div>
    )
}

function QRCard({ 
    cspNonce,
    qrPath,
    demo
} : QRCardProps) : typeof Node {
    const [flipped, setFlipped] = useState(false);
    const [inError, setInError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('An issue has occurred');



    return (
        <Fragment> 
            <style nonce={ cspNonce }> { cardStyle } </style>    
            <div id="view-boxes" className={ flipped ?  'is-flipped' : null }>
                <div id="front-view"  className="card">
                    <QRCodeElement qrPath={qrPath} />
                    <Logo />
                    <div id="instructions">
                        <InstructionIcon className="instruction-icon" />
                        To scan QT code, Open your Venmo App
                    </div>
                </div>
                <div className="card" id="back-view">
                    <Mark />
                </div>
            </div>

            {demo ?

                <div id="controls" style={`
                    position: fixed;
                    bottom: 5vw;
                    padding: 1rem;
                    border: 1px solid #888C94;
                `}>
                    <button onClick={()=>setFlipped(!flipped)}> Flip </button>
                </div> : null
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