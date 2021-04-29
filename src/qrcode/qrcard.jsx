/* @flow */
/** @jsx h */

import { h, render, Fragment, Node, Component } from 'preact';
// import { getBody } from '../lib/util';
// import {writeElementToWindow} from 'belter/src';
// import {assertSameDomain} from 'cross-domain-utils/src';

import { QRCode } from './node-qrcode';
import { InstructionIcon, Logo, Mark, cardStyle } from './assets';
import type {ZoidComponentInstance, ZoidComponent} from '../types';

type QRPath = string;
type QRCardProps = {
    cspNonce : ?string,
    qrPath : QRPath,
    closeFunc : function
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
    closeFunc,
} : QRCardProps) : typeof Node {




    return (
        <Fragment> 
            <style nonce={ cspNonce }> { style } </style>
            <div id="qr-modal">
                <a href="#" id="close" aria-label="close" role="button" onClick={closeFunc}></a>
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