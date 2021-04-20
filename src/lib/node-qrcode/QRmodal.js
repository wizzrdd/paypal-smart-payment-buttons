/* @flow */
/** @jsx h */

import { h, render, Fragment, Node } from 'preact';
import { getBody } from '../util';
import {writeElementToWindow} from 'belter/src';
import {assertSameDomain} from 'cross-domain-utils/src';
// import { getModalComponent } from '@paypal/checkout-components/src/zoid/modal';\
// import {Modal} from '@paypal/checkout-components';
import { QRCode } from './node-qrcode';
import type {ZoidComponentInstance, ZoidComponent} from '../../types';

// import type { CrossDomainWindowType, SameDomainWindowType } from 'cross-domain-utils/src';
// import { fragment } from 'typed-graphqlify';

import {VenmoLogo} from '@paypal/sdk-logos';

type PageProps = {
    cspNonce : ?string,
    // window: SameDomainWindowType | ?CrossDomainWindowType,
    targetElement : any,
    qrPath ?: string    
};
// const Modal = getModalComponent(); 

        // <style nonce={ cspNonce }>    
// export function generateQRpage() : typeof Node {
export function generateQRmodal({ 
    cspNonce, 
    // window,
    targetElement,
    qrPath,
} : PageProps) : typeof Node {
    
    const qrPathString = qrPath || 'abce';
    // const logo = () => VenmoLogo


const style = `
    #qr-modal {
        border: 1px solid #888C94;
        border-radius: 8px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;

    }
    #qr-modal h1 {
        color: #0074DE;
        text-align: center
    }
    #qr-modal > div {
        padding: 24px;
    }
    #instructions {        
        background-color: #F5F5F5;
        align-self: flex-end;
        width: 100%;
        z-index: -1;
    }

`


    

    let QRCodeDataURL; 
    
    QRCode.toDataURL(qrPathString, 
        {
            color: {
                dark:"#0074DE",
                light:"#FFFFFF"
              } 
        },
        function(err,url) {
        // console.log(url);
            QRCodeDataURL = url; 
        }
    );
    // console.log('fired');
    // console.log(QRCodeDataURL());
    

    const content = ( <Fragment> 
        <style nonce={ cspNonce }> { style } </style>
        <div id="qr-modal">
            <div>
                <img src={QRCodeDataURL} alt="QR Code" />
                <h1>Venmo</h1>
            </div>
            <div id="instructions">To scan QT code, Open your Venmo App</div>
        </div> 
    </Fragment>);

    return render( content, targetElement )
    /*
    const Page = () =>{

        return render(
            <Modal>
                <h1>QR CODE</h1>
                <p>
                    {`qrPath: ${qrPathString}`}
                </p>
            </Modal>
        )
    }
    */
        
/*
        return render (
        <Fragment>
        <style nonce={ cspNonce }>
            {`
                * {
                    box-sizing: border-box;
                }

                html, body {
                    background-color: pink !important;
                }

                body {
                    padding: 5px 20px;
                    display: inline-block;
                    width: 100%;
                }
            `}
        </style>
        <h1>QR CODE</h1>
        <p>
            {`qrPath: ${qrPathString}`}
        </p>
        </Fragment>
        
    )};
    // debugger;
    if (window){
        writeElementToWindow(assertSameDomain(window), Page());
    } else {
        //noo window :( 
    }
*/
}

// export function generateQRpage({cspNonce}){}