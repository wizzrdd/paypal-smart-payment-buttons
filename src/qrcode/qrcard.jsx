/* @flow */
/** @jsx h */

import { h, render, Fragment, Node, Component } from 'preact';
// import { getBody } from '../lib/util';
// import {writeElementToWindow} from 'belter/src';
// import {assertSameDomain} from 'cross-domain-utils/src';
// import { getModalComponent } from '@paypal/checkout-components/src/zoid/modal';\
// import {Modal} from '@paypal/checkout-components';
import { QRCode } from './node-qrcode';
import type {ZoidComponentInstance, ZoidComponent} from '../types';

// import type { CrossDomainWindowType, SameDomainWindowType } from 'cross-domain-utils/src';
// import { fragment } from 'typed-graphqlify';

// import {VenmoLogo} from '@paypal/sdk-logos/src/logos/venmo';

type QRPath = string;
type PageProps = {
    cspNonce : ?string,
    // window: SameDomainWindowType | ?CrossDomainWindowType,
    // targetElement : any,
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
    // window,
    qrPath,
} : PageProps) : typeof Node {
    
    // const qrPathString = qrPath;
    // const logo = () => VenmoLogo

/*
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
*/

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

// const generateQR = async text => {
//     try {
//       console.log(await QRCode.toDataURL(text))
//     } catch (err) {
//       console.error(err)
//     }
//   }
/*
const getQRCodeDataURL  = async qrPath => {
    try {
        return await QRCode.toDataURL(qrPath, 
            {
                color: {
                    dark:"#0074DE",
                    light:"#FFFFFF"
                    } 
            }
        )
    } catch (err) {
        console.error(err)
        return '';
    }
}
*/
    // console.log('fired');
    // console.log(QRCodeDataURL());
    
    // const CodeSVG =  QRCode.toString(qrPath, {
    //     type: 'svg',
    //     color: {
    //         dark:"#0074DE",
    //         light:"#FFFFFF"
    //         } 
    // });
    
    // let content;
    // QRCode.toDataURL(qrPath, 
    //     {
    //         color: {
    //             dark:"#0074DE",
    //             light:"#FFFFFF"
    //             } 
    //     }
    // ).then(dataURL=>{

        // const content = ( <Fragment> 
        //     <style nonce={ cspNonce }> { style } </style>
        //     <div id="qr-modal">
        //         <div id="innercard">
        //             <img src={ 'abce' } alt="QR Code" />                
        //             <h1>Venmo</h1>
        //             <div id="instructions">To scan QT code, Open your Venmo App</div>
        //         </div>
                
        //     </div> 
        // </Fragment>);
/*        
        const content = () => QRCode.toString(qrPath, {
                type: 'svg',
                color: {
                    dark:"#0074DE",
                    light:"#FFFFFF"
                    } 
            }).then(svg=>{
                //<img src={ 'abce' } alt="QR Code" />
                return ( <Fragment> 
                    <style nonce={ cspNonce }> { style } </style>
                    <div id="qr-modal">
                        <div id="innercard">
                            {svg}
                            <h1>Venmo</h1>
                            <div id="instructions">To scan QT code, Open your Venmo App</div>
                        </div>
                        
                    </div> 
                </Fragment>);

            });
*/        
        
    //     return content;
    // });
    // return content();
   
    // const QRImg = () =>{
    //     QRCode.toDataURL(qrPath, 
    //         {
    //             color: {
    //                 dark:"#0074DE",
    //                 light:"#FFFFFF"
    //                 } 
    //         }
    //     ).then(dataURL=>{
    //         return (<img src={dataURL} alt="QR Code" />)
    //     });
    // }
    // = async => {
    
    
    // async function generateQR () {
    //     //const url = 
    //     return await QRCode.toDataURL(qrPath,
    //         {
    //             color: {
    //                 dark:"#0074DE",
    //                 light:"#FFFFFF"
    //                 } 
    //         })
    //     // console.log(url);
    //     //return url;             
    //         //.then(dataURL=>{ return dataURL; })
    //     // try {
    //     //     console.log('in try');
            
    //     // }
    //     //const dataUrl = 
    // }
    
    // const taco = generateQR();
    // console.log(taco);

    // <QRImg />

    // return QRCode.toDataURL(qrPath,
    //     {
    //         color: {
    //             dark:"#0074DE",
    //             light:"#FFFFFF"
    //             } 
    //     },function (err,url){
    //         return (<Fragment> 
    //             <style nonce={ cspNonce }> { style } </style>
    //             <div id="qr-modal">
    //                 <div id="innercard">
    //                     <QRCodeElement qrPath={qrPath} />
    //                     <h1>Venmo</h1>
    //                     <div id="instructions">To scan QT code, Open your Venmo App</div>
    //                 </div>
    //             </div> 
    //         </Fragment>);            
    //     }
    // )

    return (<Fragment> 
        <style nonce={ cspNonce }> { style } </style>
        <div id="qr-modal">
            <div id="innercard">
                <QRCodeElement qrPath={qrPath} />
                <h1>Venmo</h1>
                <div id="instructions">To scan QT code, Open your Venmo App</div>
            </div>
            
        </div> 
    </Fragment>);


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