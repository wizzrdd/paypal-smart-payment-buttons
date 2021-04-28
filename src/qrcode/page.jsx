/* @flow */
/** @jsx h */

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
/*
    #${ uid } {
        display: flex;
        position: fixed;
        width: 100%;
        height: 100%;
        top: 0;
        left: 0;
        z-index: 200000;
        align-items: center;
        justify-content: center;
        background-color: rgba(0, 0, 0, 0.4);                                
        
    }
        #${ uid } > iframe {
        display: inline-block;
        position: absolute;
        width: 100%;
        height: 100%;
        top: 0;
        left: 0;
        transition: opacity .2s ease-in-out;
    }
    #${ uid } > iframe.${ CLASS.INVISIBLE } {
        opacity: 0;
    }
    #${ uid } > iframe.${ CLASS.VISIBLE } {
        opacity: 1;
    }
    
html,body {
    display: flex;
    position: fixed;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    z-index: 200000;
    align-items: center;
    justify-content: center;
}
*/

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
 