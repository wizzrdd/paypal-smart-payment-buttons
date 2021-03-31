/* @flow */
/* eslint max-lines: off, max-nested-callbacks: off */

import { cleanup, memoize, request, stringifyError, stringifyErrorMessage } from 'belter/src';
import { FPTI_KEY } from '@paypal/sdk-constants/src';
import { ZalgoPromise } from 'zalgo-promise/src';

import { getDetailedOrderInfo } from '../../api';
import { getLogger, promiseNoop, unresolvedPromise } from '../../lib';
import { FPTI_STATE, FPTI_TRANSITION } from '../../constants';
import type { ApplePayPayment, ApplePayShippingMethod, ApplePayPaymentContact, ApplePayPaymentRequest, PaymentFlow, PaymentFlowInstance, IsEligibleOptions, SetupOptions, InitOptions } from '../types';

import { getApplePayShippingMethods, getSupportedNetworksFromIssuers, getShippingContactFromAddress } from './utils';

let clean;

let applePaymentEligible : boolean;
function setupApplePay({ props } : SetupOptions) : ZalgoPromise<void> {
    const { clientID } = props;
    const validClients = [];

    return ZalgoPromise.try(() => {
        applePaymentEligible = validClients.indexOf(clientID) !== -1;
    });
}

function isApplePayEligible({ props } : IsEligibleOptions) : boolean {
    const { branded, onShippingChange } = props;

    if (branded || onShippingChange) {
        return false;
    }

    return true;
}

function isApplePayPaymentEligible() : boolean {
    return applePaymentEligible;
}

function initApplePay({ props, payment } : InitOptions) : PaymentFlowInstance {
    const { createOrder, onApprove, onCancel, onError, onClick, merchantDomain, locale, applePay } = props;

    const { fundingSource } = payment;

    if (clean) {
        clean.all();
    }

    clean = cleanup();
    const close = memoize(() => {
        return clean.all();
    });

    const validate = memoize(() => {
        return ZalgoPromise.try(() => {
            return onClick ? onClick({ fundingSource }) : true;
        });
    });

    function initApplePaySession() {
        const validatePromise = validate().then(valid => {
            if (!valid) {
                getLogger().info(`native_onclick_invalid`).track({
                    [FPTI_KEY.STATE]:       FPTI_STATE.BUTTON,
                    [FPTI_KEY.TRANSITION]:  FPTI_TRANSITION.NATIVE_ON_CLICK_INVALID
                }).flush();
            }

            return valid;
        });
        
        const orderPromise = validatePromise.then(valid => {
            if (valid) {
                return createOrder();
            }

            return unresolvedPromise();
        });

        const validateMerchant = (url) => {
            request({ url })
                .then(res => res.body)
                .then(merchantSession => {
                    return merchantSession;
                }).catch(err => {
                    onError(err);
                    return null;
                });
        };

        orderPromise.then(orderID => {
            const country = locale.country;
            getDetailedOrderInfo(orderID, country).then(order => {
                const {
                    allowedCardIssuers,
                    cart: {
                        amounts: {
                            total: {
                                currencyCode,
                                currencyValue
                            }
                        },
                        shippingAddress,
                        shippingMethods
                    }
                } = order.checkoutSession;

                const shippingContact : ApplePayPaymentContact = getShippingContactFromAddress(shippingAddress);
                const supportedNetworks = getSupportedNetworksFromIssuers(allowedCardIssuers);
                const applePayShippingMethods : $ReadOnlyArray<ApplePayShippingMethod> = getApplePayShippingMethods(shippingMethods);

                const merchantCapabilities = [
                    'supports3DS',
                    'supportsCredit'
                ];
                if (supportedNetworks && supportedNetworks.indexOf('chinaunionpay') !== -1) {
                    merchantCapabilities.push('supportsEMV');
                }

                // set order details into ApplePayRequest
                const applePayRequest : ApplePayPaymentRequest = {
                    countryCode:     locale.country,
                    currencyCode,
                    merchantCapabilities,
                    shippingContact,
                    shippingMethods: applePayShippingMethods,
                    supportedNetworks,
                    total:           {
                        amount: currencyValue,
                        label:  merchantDomain,
                        type:   'final'
                    }
                };

                // create Apple Pay Session
                const applePaySession = applePay(3, applePayRequest);
                applePaySession.addEventListener('onvalidateMerchant', async (e) => {
                    const merchantSession = await validateMerchant(e.validationURL);
                    if (merchantSession) {
                        merchantSession.completeMerchantValidation(merchantSession);
                    } else {
                        // instrument
                    }
                });

                applePaySession.addEventListener('onpaymentmethodselected', () => {
                    const update = {};
                    applePaySession.completePaymentMethodSelection(update);
                });

                applePaySession.addEventListener('onshippingmethodselected', () => {
                    const update = {};
                    applePaySession.completeShippingMethodSelection(update);
                });

                applePaySession.addEventListener('onshippingcontactselected', () => {
                    const update = {};
                    applePaySession.completeShippingContactSelection(update);
                });

                applePaySession.addEventListener('onpaymentauthorized', (e) => {
                    const applePayPayment : ApplePayPayment = e.payment;
                    const { token, billingContact, shippingContact } = applePayPayment;
                    // pass token to backend to confirm / validate
                    // call onApprove when successful
                    onApprove({});
                    const result = window.ApplePaySession.STATUS_SUCCESS;
                    applePaySession.completePayment(result);
                });

                applePaySession.addEventListener('oncancel', () => {
                    if (onCancel) {
                        onCancel();
                    }
                });

                applePaySession.begin();
            });
        });
    }

    const click = () => {
        return ZalgoPromise.try(() => {
            return initApplePaySession();
        }).catch(err => {
            return close().then(() => {
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
        close
    };
}

export const applepay : PaymentFlow = {
    name:              'applepay',
    setup:             setupApplePay,
    isEligible:        isApplePayEligible,
    isPaymentEligible: isApplePayPaymentEligible,
    init:              initApplePay,
    spinner:           false
};
