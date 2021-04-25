/* @flow */

import { clientErrorResponse, htmlResponse, allowFrame, defaultLogger, safeJSON, sdkMiddleware,
    isLocalOrTest, type ExpressMiddleware } from '../../lib';
import type { LoggerType, CacheType } from '../../types';

import { EVENT } from './constants';
import { getParams } from './params';
// import { getSmartMenuClientScript } from './script';

import { generateQRmodal } from '../../../src/qrcode/QRmodal'
import { QRCode }from '../../../src/qrcode/node-qrcode';
// import { svgToBase64 } from 'belter/src';

type QRcodeMiddlewareOptions = {|
    logger? : LoggerType,
    cache? : CacheType,
    cdn? : boolean
|};

export function getQRCodeMiddleware({ logger = defaultLogger, cache, cdn = !isLocalOrTest() } : QRcodeMiddlewareOptions = {}) : ExpressMiddleware {
    const useLocal = !cdn;

    return sdkMiddleware({ logger, cache }, {
        app: async ({ req, res, params, meta, logBuffer }) => {
            logger.info(req, EVENT.RENDER);

            const yo = getParams(params, req, res);
            const { cspNonce, qrPath, debug } = yo// = getParams(params, req, res);

            // const client = await getSmartMenuClientScript({ debug, logBuffer, cache, useLocal });

            // logger.info(req, `menu_client_version_${ client.version }`);
            // data-client-version="${ client.version }
            logger.info(req, `qrcode_params`, { params: JSON.stringify(params) });

            // generateQRmodal({})

            // if (!clientID) {
            //     return clientErrorResponse(res, 'Please provide a clientID query parameter');
            // }
            // const qrPathString = qrPath 
            // const qrPathString = 'https://venmo.com/go/purchase?facilitator=BT&intent=Continue&resource_id=cGF5bWVudGNvbnRleHRfMzhreDg4bTh5NWJmMjdjNiNkMTFmZDVkZS00NThjLTRjZDUtYTUzMy0wNThlNjM0YWQ3ZmY=&merchant_id=38kx88m8y5bf27c6&environment=SANDBOX'
            //let QRCodeDataURL = ''; 
    
            // const getQRCodeDataURL = () => {
            //     let dataUrl = '';
            //     QRCode.toDataURL(
            //         qrPath, 
            //         {
            //             color: {
            //                 dark:"#0074DE",
            //                 light:"#FFFFFF"
            //             } 
            //         },
            //         function(err,url) {
            //             dataUrl = url; 
            //         }
            //     );
            //     return dataUrl;
            // }
  
            QRCode.toString(qrPath, 
                {
                    type: 'svg',
                    color: {
                        dark:"#0074DE",
                        light:"#FFFFFF"
                      } 
                }).then(svg=>{
                    const style = `
                    body {
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
                        font-family: sans-serif;
                    }
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
                        justify-content: center;
                        flex-direction: column;                        
                        min-width: 280px;
                        min-height: 320px;                     
                    }
                    #instructions {        
                        background-color: #F5F5F5;
                        align-self: flex-end;
                        border-bottom-left-radius: 8px;
                        border-bottom-right-radius: 8px;
                        padding: 24px;
                        font-size: 12px;
                        line-height: 16px;
                        box-sizing: border-box;
                        width: 100%; 
                        
                    }
                    
                    `;
                
        
                    const pageHTML = `
                    <!DOCTYPE html>
                    <head>
                        <style nonce="${ cspNonce }"> ${ style } </style>
                    </head>
                    <body>
                    
                    <div id="qr-modal">
                        <div id="innercard">
                            ${svg}
                            <h1>Venmo</h1>
                            <div id="instructions">To scan QT code, Open your Venmo App</div>
                        </div>
                        
                    </div> 
        
                    </body>
                    `
                    allowFrame(res);
                    return htmlResponse(res, pageHTML);



                });
    
            
            // const qrCodeObj = QRCode.create(qrPath, 
            //     {
            //         color: {
            //             dark:"#0074DE",
            //             light:"#FFFFFF"
            //           } 
            //     }
            // );
            
            // const QRCodeDataURL = QRCode.toString(qrPath, 
            //     {
            //         type: 'svg',
            //         color: {
            //             dark:"#0074DE",
            //             light:"#FFFFFF"
            //           } 
            //     }
            // );

/*
            const style = `
            body {
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
            }`;
        

            const pageHTML = `
            <!DOCTYPE html>
            <head>
                <style nonce="${ cspNonce }"> ${ style } </style>
            </head>
            <body>
            
            <div id="qr-modal">
                <div>
                    <img src=${QRCodeDataURL} alt="QR Code" />
                    <h1>Venmo</h1>
                </div>
                <div id="instructions">To scan QT code, Open your Venmo App</div>
            </div> 
            <script>

            
            debugger;
            
            
            </script>

            </body>
            `
            allowFrame(res);
            return htmlResponse(res, pageHTML);
*/            
/*
            `
                <!DOCTYPE html>
                <head></head>
                <body data-nonce="${ cspNonce }" data-client-version="${ client.version }">
                    ${ meta.getSDKLoader({ nonce: cspNonce }) }
                    <script nonce="${ cspNonce }">${ client.script }</script>
                    <script nonce="${ cspNonce }">spb.setupMenu(${ safeJSON({ cspNonce }) })</script>
                </body>
            `;
*/

        }
    });
}
