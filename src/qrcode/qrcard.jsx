/* @flow */
/** @jsx h */

import { h, render, Fragment, Node, Component } from 'preact';
// import { getBody } from '../lib/util';
// import {writeElementToWindow} from 'belter/src';
// import {assertSameDomain} from 'cross-domain-utils/src';

import { QRCode } from './node-qrcode';
import { InstructionIcon, Logo } from './assets';
import type {ZoidComponentInstance, ZoidComponent} from '../types';

type QRPath = string;
type QRCardProps = {
    cspNonce : ?string,
    qrPath : QRPath    
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

export function QRCard({ 
    cspNonce,
    qrPath,
} : QRCardProps) : typeof Node {
    const style = `
    #qr-modal {
        background: #2F3033;
        box-shadow: 0px 0px 8px rgba(0, 0, 0, 0.4);
        border-radius: 16px;                        
        width: 720px;
        height: 480px;  
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
    }
    #qr-modal h1 {
        margin: 0;
        padding: 0;
        color: #0074DE;
        text-align: center;
        padding:0 24px 24px; 
    }
    #innercard {
        border: 1px solid #888C94;
        border-radius: 8px;
        background-color: white;
        display: inline-flex;
        align-items: center;
        justify-content: space-between;
        flex-direction: column;                        
        width: 280px;
        height: 320px;                     
    }
    #innercard > img,
    #innercard > svg {${
        'padding: 16px 16px 8px;'
        /*
        padding: 24px 24px 12px;
        width: 100%;
        height: 100%;
        */  
    }}
    #instructions {
        background-color: #F5F5F5;
        border-bottom-left-radius: 8px;
        border-bottom-right-radius: 8px;
        padding: 16px;
        display: flex;
        align-items: center;
        font-size: 12px;
        line-height: 16px;
        box-sizing: border-box;
        width: 100%;
    }
    .instruction-icon {
        min-width: 68px;
        min-height: 46px;
        margin-right: 16px;
    }
    `;

    return (
        <Fragment> 
            <style nonce={ cspNonce }> { style } </style>
            <div id="qr-modal">
                <div id="innercard">
                    <QRCodeElement qrPath={qrPath} />
                    <Logo />
                    <div id="instructions">
                        <InstructionIcon className="instruction-icon" />
                        To scan QT code, Open your Venmo App
                    </div>
                </div>
                
            </div> 
        </Fragment>
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