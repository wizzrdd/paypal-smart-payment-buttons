/* @flow */
/** @jsx h */

import { h, render, Fragment, Component } from 'preact';
import { useState } from 'preact/hooks';

import { getBody } from '../lib';

import { QRCode } from './node-qrcode';
import { type NodeType, BLUE, InstructionIcon, Logo, VenmoMark, AuthMark, cardStyle, DemoWrapper, DemoControls } from './components';

type QRPath = string;
type QRCardProps = {|
    cspNonce : ?string,
    qrPath : QRPath,
    demo : boolean
|};

class QRCodeElement extends Component<{|qrPath : QRPath|}, {|dataURL : string|}> {
    async componentDidMount() {
        const { qrPath } = this.props;
        const dataURL = await QRCode.toDataURL(
            qrPath,
            {
                width: 160,
                color: {
                    dark:  BLUE,
                    light: '#FFFFFF'
                }
            }
        );
        // eslint-disable-next-line react/no-did-mount-set-state
        this.setState({ dataURL });
    }
    render() : NodeType {
        const { dataURL } = this.state;
        return (
            <img src={ dataURL } alt="QR Code" />
        );
    }
}

function ErrorMessage({
    message,
    resetFunc
} : {|
    message? : string,
    resetFunc : () => void
|}) : NodeType {
    return (
        <div id="venmo-error-view">
            <div className="error-message">{message || 'An issue has occurred' }</div>
            <button className="reset-button" type="button" onClick={ resetFunc }>Try scanning again</button>
        </div>
    );
}

function QRCard({
    cspNonce,
    qrPath,
    demo
} : QRCardProps) : NodeType {
    const [ processState, setProcessState ] = useState(null);
    const [ errorMessage, setErrorMessage ] = useState(null);

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
                    <ErrorMessage message={ errorMessage } resetFunc={ () => setState_default() } /> :
                    <div id="front-view" className="card">
                        <QRCodeElement qrPath={ qrPath } />
                        <Logo />
                        <div id="instructions">
                            <InstructionIcon stylingClass="instruction-icon" />
                            To scan QT code, Open your Venmo App
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
    qrPath : string,
    demo? : boolean
|};

export function renderQRCode({ cspNonce = '', qrPath, demo = false } : RenderQRCodeOptions) {
    const PropedCard = <QRCard cspNonce={ cspNonce } qrPath={ qrPath } demo={ demo } />;
    render(
        demo ?
            DemoWrapper(PropedCard, cspNonce) :
            PropedCard,
        getBody()
    );
}
