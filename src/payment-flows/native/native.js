/* @flow */
/* eslint max-lines: off, max-nested-callbacks: off */

import { uniqueID, memoize, stringifyError,
    stringifyErrorMessage, cleanup, noop } from 'belter/src';
import { ZalgoPromise } from 'zalgo-promise/src';
import { FPTI_KEY } from '@paypal/sdk-constants/src';
import { EVENT } from 'zoid/src';
import { type CrossDomainWindowType } from 'cross-domain-utils/src';

import { updateButtonClientConfig } from '../../api';
import { getLogger, promiseNoop, isAndroidChrome, getStorageState, canUseVenmoDesktopPay } from '../../lib';
import { FPTI_STATE, FPTI_TRANSITION, FPTI_CUSTOM_KEY, TARGET_ELEMENT } from '../../constants';
import { type OnShippingChangeData } from '../../props/onShippingChange';
import { checkout } from '../checkout';
import type { PaymentFlow, PaymentFlowInstance, SetupOptions, InitOptions } from '../types';

import { isNativeEligible, isNativePaymentEligible, prefetchNativeEligibility } from './eligibility';
import { openNativePopup } from './popup';
import { getNativePopupUrl } from './url';
import { connectNative } from './socket';

let clean;

function setupNative({ props, serviceData } : SetupOptions) : ZalgoPromise<void> {
    console.log('x- payment-flows/native.js/setupNative');
    // debugger;
    return prefetchNativeEligibility({ props, serviceData }).then(noop);
}

function initNative({ props, components, config, payment, serviceData } : InitOptions) : PaymentFlowInstance {
    console.log('x- payment-flows/native.js/initNative');
    // debugger;


    const { onApprove, onCancel, onError,
        buttonSessionID, onShippingChange } = props;
    const { fundingSource } = payment;
    const { firebase: firebaseConfig } = config;

    const isVenmoDesktopPay = memoize(canUseVenmoDesktopPay(fundingSource));

    if (!firebaseConfig) {
        throw new Error(`Can not run native flow without firebase config`);
    }

    if (clean) {
        clean.all();
    }

    clean = cleanup();

    let approved = false;
    let cancelled = false;
    let didFallback = false;

    const destroy = memoize(() => {
        return clean.all();
    });

    const fallbackToWebCheckout = (fallbackWin? : ?CrossDomainWindowType) => {
        console.log('x- payment-flows/native.js/initNative -> fallbackToWebCheckout');
        // debugger;

        didFallback = true;
        const checkoutPayment = { ...payment, win: fallbackWin, isClick: false, isNativeFallback: true };
        const instance = checkout.init({ props, components, payment: checkoutPayment, config, serviceData });
        clean.register(() => instance.close());
        return instance.start();
    };

    const onApproveCallback = ({ data: { payerID, paymentID, billingToken } }) => {
        approved = true;
        getLogger().info(`${ isVenmoDesktopPay ? 'venmo_desktop' : 'native' }_message_onapprove`, { payerID, paymentID, billingToken })
            .track({
                [FPTI_KEY.TRANSITION]:      isVenmoDesktopPay ? FPTI_TRANSITION.VENMO_DESKTOP_PAY_ON_APPROVE : FPTI_TRANSITION.NATIVE_ON_APPROVE,
                [FPTI_CUSTOM_KEY.INFO_MSG]: `payerID: ${ payerID }, paymentID: ${ paymentID || 'undefined' }, billingToken: ${ billingToken || 'undefined' }`
            })
            .flush();

        const data = { payerID, paymentID, billingToken, forceRestAPI: true };
        const actions = { restart: () => fallbackToWebCheckout() };
        return ZalgoPromise.all([
            onApprove(data, actions).catch(err => {
                getLogger().info(`${ isVenmoDesktopPay ? 'venmo_desktop' : 'native' }_message_onapprove_error`, { payerID, paymentID, billingToken })
                    .track({
                        [FPTI_KEY.TRANSITION]:      isVenmoDesktopPay ? FPTI_TRANSITION.VENMO_DESKTOP_PAY_ON_APPROVE : FPTI_TRANSITION.NATIVE_ON_APPROVE_ERROR,
                        [FPTI_CUSTOM_KEY.INFO_MSG]: `Error: ${ stringifyError(err) }`
                    })
                    .flush();
                onError(err);
            }),
            destroy()
        ]).then(() => {
            return { buttonSessionID };
        });
    };

    const onCancelCallback = () => {
        console.log('x- payment-flows/native.js/initNative -> onCancelCallback');
        // debugger;
        cancelled = true;
        getLogger().info(`${ isVenmoDesktopPay ? 'venmo_desktop' : 'native' }_message_oncancel`)
            .track({
                [FPTI_KEY.TRANSITION]:  isVenmoDesktopPay ? FPTI_TRANSITION.VENMO_DESKTOP_PAY_ON_CANCEL : FPTI_TRANSITION.NATIVE_ON_CANCEL
            })
            .flush();

        return ZalgoPromise.all([
            onCancel(),
            destroy()
        ]).then(() => {
            return { buttonSessionID };
        });
    };

    const onErrorCallback = ({ data : { message } } : {| data : {| message : string |} |}) => {
        console.log('x- payment-flows/native.js/initNative -> onErrorCallback');
        // debugger;
        getLogger().info(`${ isVenmoDesktopPay ? 'venmo_desktop' : 'native' }_message_onerror`, { err: message })
            .track({
                [FPTI_KEY.TRANSITION]:       isVenmoDesktopPay ? FPTI_TRANSITION.VENMO_DESKTOP_PAY_ON_ERROR : FPTI_TRANSITION.NATIVE_ON_ERROR,
                [FPTI_CUSTOM_KEY.INFO_MSG]: `Error message: ${ message }`
            }).flush();

        return ZalgoPromise.all([
            onError(new Error(message)),
            destroy()
        ]).then(() => {
            return { buttonSessionID };
        });
    };

    const onShippingChangeCallback = ({ data } : {| data : OnShippingChangeData |}) => {
        return ZalgoPromise.try(() => {
            
            getLogger().info(`${ isVenmoDesktopPay ? 'venmo_desktop' : 'native' }_message_onshippingchange`)
                .track({
                    [FPTI_KEY.TRANSITION]:  isVenmoDesktopPay ? FPTI_TRANSITION.VENMO_DESKTOP_PAY_ON_SHIPPING_CHANGE : FPTI_TRANSITION.NATIVE_ON_SHIPPING_CHANGE
                }).flush();

            if (onShippingChange) {
                let resolved = true;
                const actions = {
                    resolve: () => {
                        return ZalgoPromise.try(() => {
                            resolved = true;
                        });
                    },
                    reject: () => {
                        return ZalgoPromise.try(() => {
                            resolved = false;
                        });
                    }
                };
                return onShippingChange({ ...data, forceRestAPI: true }, actions).then(() => {
                    return {
                        resolved
                    };
                });
            } else {
                return {
                    resolved: true
                };
            }
        });
    };

    const onFallbackCallback = () => {
        return ZalgoPromise.try(() => {
            getLogger().info(`${ isVenmoDesktopPay ? 'venmo_desktop' : 'native' }_message_onfallback`)
                .track({
                    [FPTI_KEY.TRANSITION]: isVenmoDesktopPay ? FPTI_TRANSITION.VENMO_DESKTOP_PAY_ON_FALLBACK : FPTI_TRANSITION.NATIVE_ON_FALLBACK
                }).flush();
            fallbackToWebCheckout();
            return { buttonSessionID };
        });
    };

    const detectAppSwitch = ({ sessionUID } : {| sessionUID : string |}) : ZalgoPromise<void> => {
        getStorageState(state => {
            const { lastAppSwitchTime = 0, lastWebSwitchTime = 0 } = state;

            if (lastAppSwitchTime > lastWebSwitchTime) {
                getLogger().info('app_switch_detect_with_previous_app_switch', {
                    lastAppSwitchTime: lastAppSwitchTime.toString(),
                    lastWebSwitchTime: lastWebSwitchTime.toString()
                });
            }

            if (lastWebSwitchTime > lastAppSwitchTime) {
                getLogger().info('app_switch_detect_with_previous_web_switch', {
                    lastAppSwitchTime: lastAppSwitchTime.toString(),
                    lastWebSwitchTime: lastWebSwitchTime.toString()
                });
            }

            if (!lastAppSwitchTime && !lastWebSwitchTime) {
                getLogger().info('app_switch_detect_with_no_previous_switch', {
                    lastAppSwitchTime: lastAppSwitchTime.toString(),
                    lastWebSwitchTime: lastWebSwitchTime.toString()
                });
            }

            state.lastAppSwitchTime = Date.now();
        });

        getLogger().info(`native_detect_app_switch`).track({
            [FPTI_KEY.TRANSITION]:      FPTI_TRANSITION.NATIVE_DETECT_APP_SWITCH
        }).flush();

        const connection = connectNative({
            props, serviceData, config, fundingSource, sessionUID,
            callbacks: {
                onApprove:        onApproveCallback,
                onCancel:         onCancelCallback,
                onError:          onErrorCallback,
                onFallback:       onFallbackCallback,
                onShippingChange: onShippingChangeCallback
            }
        });

        clean.register(connection.cancel);

        return connection.setProps();
    };
    

    const detectWebSwitch = ({ win } : {| win : CrossDomainWindowType |}) : ZalgoPromise<void> => {
        getStorageState(state => {
            const { lastAppSwitchTime = 0, lastWebSwitchTime = 0 } = state;

            if (lastAppSwitchTime > lastWebSwitchTime) {
                getLogger().info('web_switch_detect_with_previous_app_switch', {
                    lastAppSwitchTime: lastAppSwitchTime.toString(),
                    lastWebSwitchTime: lastWebSwitchTime.toString()
                });
            }

            if (lastWebSwitchTime > lastAppSwitchTime) {
                getLogger().info('web_switch_detect_with_previous_web_switch', {
                    lastAppSwitchTime: lastAppSwitchTime.toString(),
                    lastWebSwitchTime: lastWebSwitchTime.toString()
                });
            }

            if (!lastAppSwitchTime && !lastWebSwitchTime) {
                getLogger().info('web_switch_detect_with_no_previous_switch', {
                    lastAppSwitchTime: lastAppSwitchTime.toString(),
                    lastWebSwitchTime: lastWebSwitchTime.toString()
                });
            }

            state.lastWebSwitchTime = Date.now();
        });

        getLogger().info(`native_detect_web_switch`).track({
            [FPTI_KEY.TRANSITION]: FPTI_TRANSITION.NATIVE_DETECT_WEB_SWITCH
        }).flush();

        return fallbackToWebCheckout(win);
    };

    const onCloseCallback = () => {
        console.log('x- payment-flows/native.js/initNative -> onCloseCallback');
        // debugger;

        return ZalgoPromise.delay(1000).then(() => {
            console.log('x- payment-flows/native.js/initNative -> onCloseCallback -> in promise');
            debugger;
            if (!approved && !cancelled && !didFallback && !isAndroidChrome()) {
                return ZalgoPromise.all([
                    onCancel(),
                    destroy()
                ]);
            }
        }).then(noop);
    };

    const initPopupAppSwitch = ({ sessionUID } : {| sessionUID : string |}) => {
        console.log('x- payment-flows/native.js/initNative -> initPopupAppSwitch ');
        debugger;
        

        if (isVenmoDesktopPay) {
            
            const { QRCode } = components;
            getLogger().info(`VenmoDesktopPay_qrcode`).track({
                [FPTI_KEY.TRANSITION]:      FPTI_TRANSITION.VENMO_DESKTOP_PAY_QR_SHOWN
            }).flush();
            
            
            return new ZalgoPromise(() => {
                const url = getNativePopupUrl({ props, serviceData, fundingSource });
                // const domain = getNativePopupDomain({ props });
                const QRCodeComponentInstance = QRCode({
                    cspNonce: config.cspNonce,
                    qrPath:   url
                });
                const closeQRCode = (event : string) => {
                    getLogger().info(`VenmoDesktopPay_qrcode_closing_${ event }`).track({
                        [FPTI_KEY.STATE]:       FPTI_STATE.BUTTON,
                        [FPTI_KEY.TRANSITION]:  event ? `${ FPTI_TRANSITION.VENMO_DESKTOP_PAY_CLOSING_QR }_${ event }` : FPTI_TRANSITION.VENMO_DESKTOP_PAY_CLOSING_QR
                    }).flush();
                    // closeListener.cancel();
                    // nativePopupWin.close();
                    QRCodeComponentInstance.close();
                };

                QRCodeComponentInstance.event.on(EVENT.CLOSE, () => {
                    setTimeout(() => {
                        getLogger().info(`VenmoDesktopPay_qrcode_closed`).track({
                            [FPTI_KEY.STATE]:       FPTI_STATE.BUTTON,
                            [FPTI_KEY.TRANSITION]:  FPTI_TRANSITION.NATIVE_POPUP_CLOSED
                        }).flush();
                        onCloseCallback();
                    }, 500);
                });

                QRCodeComponentInstance.renderTo(window.xprops.getParent(), TARGET_ELEMENT.BODY);
    
                getLogger().info(`VenmoDesktopPay_qrcode_shown`)
                    .track({
                        [FPTI_KEY.STATE]:      FPTI_STATE.BUTTON,
                        [FPTI_KEY.TRANSITION]: FPTI_TRANSITION.VENMO_DESKTOP_PAY_QR_SHOWN
                    }).flush();

           
                //                const detectQRCodeScan = ({ sessionUID } : {| sessionUID : string |}) : ZalgoPromise<void> => {

                const onApproveQR = (data) => {
                    closeQRCode('onApprove');
                    return onApproveCallback(data);
                };
                const onCancelQR = () => {
                    closeQRCode('onCancel');
                    return onCancelCallback();
                };
                const onErrorQR = (data) => {
                    closeQRCode('onError');
                    return onErrorCallback(data);
                };
                    
            
                getLogger().info(`VenmoDesktopPay_qrcode`).track({
                    [FPTI_KEY.TRANSITION]:      FPTI_TRANSITION.VENMO_DESKTOP_PAY_DETECT_QR_SCAN
                }).flush();
            
                const connection = connectNative({
                    props, serviceData, config, fundingSource, sessionUID,
                    callbacks: {
                        onApprove:        onApproveQR,
                        onCancel:         onCancelQR,
                        onError:          onErrorQR,
                        onFallback:       onFallbackCallback,
                        onShippingChange: onShippingChangeCallback
                    }
                });
            
                clean.register(connection.cancel);
            
                connection.setProps();

                    
                // return {cancel, close }
                //                };

                // const qrCode = openQRCode({
                //     props, serviceData, config, fundingSource, sessionUID, QRCode,
                //     callbacks: {
                //         onDetectAppSwitch: () => detectAppSwitch({ sessionUID }).then(resolve, reject),
                //         onApprove:         (data)=>{ onApproveCallback(data)},
                //         onCancel:          onCancelCallback,
                //         onError:           onErrorCallback,
                //         // onFallback:        onFallbackCallback,
                //         onClose:           onCloseCallback,
                //         onDestroy:         destroy
                //     }
                // });
                // clean.register(qrCode.cancel);
            });
        } else {
            return new ZalgoPromise((resolve, reject) => {
                const nativePopup = openNativePopup({
                    props, serviceData, config, fundingSource, sessionUID,
                    callbacks: {
                        onDetectWebSwitch: ({ win }) => detectWebSwitch({ win }).then(resolve, reject),
                        onDetectAppSwitch: () => detectAppSwitch({ sessionUID }).then(resolve, reject),
                        onApprove:         onApproveCallback,
                        onCancel:          onCancelCallback,
                        onError:           onErrorCallback,
                        onFallback:        onFallbackCallback,
                        onClose:           onCloseCallback,
                        onDestroy:         destroy
                    }
                });
    
                clean.register(nativePopup.cancel);
            });
        }


    };
    

    const click = () => {
        console.log('x- payment-flows/native.js/initNative -> click ');
        debugger;
        
        return ZalgoPromise.try(() => {
            const sessionUID = uniqueID();
            return initPopupAppSwitch({ sessionUID });
            /*
            if (isVenmoDesktopPay){
                const { QRCode } = components;
                const { cspNonce } = config;
                const testURL = 'https://appswitch.url?query=params';
                const QRCodeModal = QRCode({cspNonce: cspNonce, qrPath: testURL})
                return QRCodeModal.renderTo(window.xprops.getParent(), TARGET_ELEMENT.BODY);
                
                //window.xprops.getParent()

            } else {
                return initPopupAppSwitch({ sessionUID });
            }
            */

            
        }).catch(err => {
            return destroy().then(() => {
                getLogger().error(`native_error`, { err: stringifyError(err) }).track({
                    [FPTI_KEY.TRANSITION]: FPTI_TRANSITION.NATIVE_ERROR,
                    [FPTI_KEY.ERROR_CODE]: 'native_error',
                    [FPTI_KEY.ERROR_DESC]: stringifyErrorMessage(err)
                }).flush();

                throw err;
            });
        });
    };

    const start = promiseNoop;

    return {
        click,
        start,
        close: destroy
    };
}

function updateNativeClientConfig({ orderID, payment, userExperienceFlow, buttonSessionID }) : ZalgoPromise<void> {
    console.log('x- payment-flows/native.js/updateNativeClientConfig');
    // debugger;

    return ZalgoPromise.try(() => {
        const { fundingSource } = payment;
        return updateButtonClientConfig({ fundingSource, orderID, inline: false, userExperienceFlow, buttonSessionID });
    });
}

export const native : PaymentFlow = {
    name:                   'native',
    setup:                  setupNative,
    isEligible:             isNativeEligible,
    isPaymentEligible:      isNativePaymentEligible,
    init:                   initNative,
    updateFlowClientConfig: updateNativeClientConfig,
    spinner:                true
};
