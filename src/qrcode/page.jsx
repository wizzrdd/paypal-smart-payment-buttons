/* @flow */
/** @jsx h */

import { h, render, Fragment, Node } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { noop } from 'belter/src';
// import { ZalgoPromise } from 'zalgo-promise/src';

import { getBody } from '../lib';

import { QRCard } from './qrcard';
// import { useXProps } from './hooks';

const FADE_TIME = 150;

type PageProps = {|
    cspNonce : string,
    qrPath: string
|};

const style = `
    * {
        box-sizing: border-box;
    }

    html, body {
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
    }
`


function Page({ cspNonce, qrPath } : PageProps) : typeof Node {
    const [ visible, setVisible ] = useState(false);
    // useEffect(() => {
    // });
    const toggleVisible = () => {
        return setVisible(!visible);
    };


    return (
        <Fragment>
            <style nonce={ cspNonce }>
                { style }
            </style>
            <QRCard 
                cspNonce={ cspNonce }
                qrPath={ qrPath}
            />
        </Fragment>
    );
};

type RenderQRCodeOptions = {
    cspNonce? : string,
    qrPath : string
};

export function renderQRCode({ cspNonce = '', qrPath } : RenderQRCodeOptions) {
    render(
        <Page cspNonce={ cspNonce } qrPath={ qrPath } />, 
        getBody()
    );
}
 