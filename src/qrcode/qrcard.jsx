/* @flow */
/** @jsx h */

import { h, render, Fragment, Node, Component } from 'preact';
// import { getBody } from '../lib/util';
// import {writeElementToWindow} from 'belter/src';
// import {assertSameDomain} from 'cross-domain-utils/src';

import { QRCode } from './node-qrcode';
import type {ZoidComponentInstance, ZoidComponent} from '../types';



// import {VenmoLogo} from '@paypal/sdk-logos/src/logos/venmo';

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
    // const logo = () => VenmoLogo

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
    #qr-modal img,
    #qr-modal svg {
        padding: 24px 24px 12px;
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
        min-width: 280px;
        min-height: 320px;                     
    }
    #instructions {        
        background-color: #F5F5F5;
        border-bottom-left-radius: 8px;
        border-bottom-right-radius: 8px;
        padding: 24px;
        font-size: 12px;
        line-height: 16px;
        box-sizing: border-box;
        width: 100%; 
        
    }
    `;

    return (
        <Fragment> 
            <style nonce={ cspNonce }> { style } </style>
            <div id="qr-modal">
                <div id="innercard">
                    <QRCodeElement qrPath={qrPath} />
                    <h1>Venmo</h1>
                    <div id="instructions">To scan QT code, Open your Venmo App</div>
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