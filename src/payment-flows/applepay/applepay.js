/* @flow */
/* eslint max-lines: off, max-nested-callbacks: off */

import { cleanup, memoize, request, stringifyError, stringifyErrorMessage } from 'belter/src';
import { type CrossDomainWindowType } from 'cross-domain-utils/src';
import { FPTI_KEY } from '@paypal/sdk-constants/src';
import { ZalgoPromise } from 'zalgo-promise/src';

import { checkout } from '../checkout';
import { getDetailedOrderInfo } from '../../api';
import { getLogger, promiseNoop, unresolvedPromise } from '../../lib';
import { FPTI_CUSTOM_KEY, FPTI_STATE, FPTI_TRANSITION } from '../../constants';
import type { ApplePayPayment, ApplePayPaymentRequest, PaymentFlow, PaymentFlowInstance, IsEligibleOptions, SetupOptions, InitOptions } from '../types';

import { getApplePayShippingMethods, getMerchantCapabilities, getSupportedNetworksFromIssuers, getShippingContactFromAddress } from './utils';

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

function initApplePay({ components, config, props, payment, serviceData } : InitOptions) : PaymentFlowInstance {
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

    function logApplePayEvent(event) {
        getLogger().info(`${ FPTI_TRANSITION.APPLEPAY_EVENT }_${ event.type }`)
            .track({
                [FPTI_KEY.TRANSITION]: `${ FPTI_TRANSITION.APPLEPAY_EVENT }_${ event.type }`
            })
            .flush();
    }

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
            request({
                url:    'https://',
                method: 'post',
                body:   JSON.stringify({
                    validationURL: url
                })
            }).then(res => res.body)
                .then(merchantSession => {
                    return merchantSession;
                }).catch(err => {
                    getLogger().info('applepay_validateMerchant_error')
                        .track({
                            [FPTI_KEY.TRANSITION]: FPTI_TRANSITION.APPLEPAY_VALIDATE_MERCHANT_ERROR,
                            [FPTI_KEY.ERROR_DESC]: stringifyErrorMessage(err)
                        })
                        .flush();
                    onError(err);
                });
        };

        const fallbackToWebCheckout = (fallbackWin? : ?CrossDomainWindowType) => {
            const checkoutPayment = { ...payment, win: fallbackWin, isClick: false, isNativeFallback: true };
            const instance = checkout.init({ props, components, payment: checkoutPayment, config, serviceData });
            clean.register(() => instance.close());
            return instance.start();
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
                    },
                    fundingOptions
                } = order.checkoutSession;

                const supportedNetworks = getSupportedNetworksFromIssuers(allowedCardIssuers);
                const shippingContact = getShippingContactFromAddress(shippingAddress);
                const applePayShippingMethods = getApplePayShippingMethods(shippingMethods);
                const merchantCapabilities = getMerchantCapabilities(supportedNetworks, fundingOptions);

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
                    logApplePayEvent(e);

                    const merchantSession = await validateMerchant(e.validationURL);
                    if (merchantSession) {
                        merchantSession.completeMerchantValidation(merchantSession);
                    }
                });

                applePaySession.addEventListener('onpaymentmethodselected', (e) => {
                    logApplePayEvent(e);
                    applePaySession.completePaymentMethodSelection({});
                });

                applePaySession.addEventListener('onshippingmethodselected', (e) => {
                    logApplePayEvent(e);
                    applePaySession.completeShippingMethodSelection({});
                });

                applePaySession.addEventListener('onshippingcontactselected', (e) => {
                    logApplePayEvent(e);
                    applePaySession.completeShippingContactSelection({});
                });

                applePaySession.addEventListener('onpaymentauthorized', (e) => {
                    logApplePayEvent(e);

                    const applePayPayment : ApplePayPayment = e.payment;
                    const { token, billingContact, shippingContact } = applePayPayment;
                    // call graphQL mutation passing in token, billingContact and shippingContact
                    
                    // call onApprove when successful
                    const data = {};
                    const actions = { restart: () => fallbackToWebCheckout() };
                    ZalgoPromise.all([
                        onApprove(data, actions)
                            .then(() => {
                                const result = window.ApplePaySession.STATUS_SUCCESS;
                                applePaySession.completePayment(result);
                            })
                            .catch(err => {
                                getLogger().info(`applepay_message_onapprove_error`)
                                    .track({
                                        [FPTI_KEY.TRANSITION]:      FPTI_TRANSITION.NATIVE_ON_APPROVE_ERROR,
                                        [FPTI_CUSTOM_KEY.INFO_MSG]: `Error: ${ stringifyError(err) }`
                                    })
                                    .flush();
                                onError(err);
                            }),
                        close()
                    ]);
                });

                applePaySession.addEventListener('oncancel', (e) => {
                    logApplePayEvent(e);

                    if (onCancel) {
                        onCancel();
                    }
                });

                applePaySession.begin();
            });
        }).catch(err => {
            getLogger().info(`applepay_create_order_error`)
                .track({
                    [FPTI_KEY.TRANSITION]:      FPTI_TRANSITION.APPLEPAY_CREATE_ORDER_ERROR,
                    [FPTI_KEY.ERROR_DESC]:      stringifyError(err)
                }).flush();

            return close().then(() => {
                return onError(err);
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
