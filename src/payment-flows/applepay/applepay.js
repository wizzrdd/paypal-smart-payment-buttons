/* @flow */
/* eslint max-lines: off, max-nested-callbacks: off */

import { cleanup, memoize, stringifyError, stringifyErrorMessage } from 'belter/src';
import { FPTI_KEY, FUNDING } from '@paypal/sdk-constants/src';
import { ZalgoPromise } from 'zalgo-promise/src';

import { getDetailedOrderInfo, approveApplePayPayment, getApplePayMerchantSession } from '../../api';
import { getLogger, promiseNoop, unresolvedPromise } from '../../lib';
import { FPTI_CUSTOM_KEY, FPTI_STATE, FPTI_TRANSITION } from '../../constants';
import type { ApplePayPayment, PaymentFlow, PaymentFlowInstance, IsEligibleOptions, IsPaymentEligibleOptions, SetupOptions, InitOptions } from '../types';

import { createApplePayRequest, getMerchantStoreName } from './utils';

const SUPPORTED_VERSION = 3;

let clean;
let applePaymentEligible;
function setupApplePay({ serviceData } : SetupOptions) : ZalgoPromise<void> {
    const { fundingEligibility } = serviceData;
    
    return ZalgoPromise.try(() => {
        applePaymentEligible = fundingEligibility && fundingEligibility[FUNDING.APPLEPAY] && fundingEligibility[FUNDING.APPLEPAY].eligible;
    });
}

function isApplePayEligible({ props } : IsEligibleOptions) : boolean {
    const { branded, onShippingChange, createBillingAgreement, createSubscription } = props;

    if (branded || onShippingChange || createBillingAgreement || createSubscription) {
        return false;
    }

    return true;
}

function isApplePayPaymentEligible({ payment } : IsPaymentEligibleOptions) : boolean {
    const { fundingSource } = payment;

    if (fundingSource !== FUNDING.APPLEPAY) {
        return false;
    }

    if (applePaymentEligible && applePaymentEligible[fundingSource] && applePaymentEligible[fundingSource].eligibility) {
        return true;
    }

    return applePaymentEligible;
}

function initApplePay({ props, payment } : InitOptions) : PaymentFlowInstance {
    const { createOrder, onApprove, onCancel, onError, onClick, locale, clientID, merchantDomain, applePay } = props;

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
        
        const setupApplePaySession = () => {
            orderPromise.then(orderID => {
                const country = locale.country;
                getDetailedOrderInfo(orderID, country).then(order => {
                    // set order details into ApplePayRequest
                    const applePayRequest = createApplePayRequest(country, order);

                    // create Apple Pay Session
                    const {
                        begin,
                        addEventListener,
                        completeMerchantValidation,
                        completeShippingContactSelection,
                        completePaymentMethodSelection,
                        completeShippingMethodSelection,
                        completePayment
                    } = applePay(SUPPORTED_VERSION, applePayRequest);

                    addEventListener('validateMerchant', (e) => {
                        logApplePayEvent(e);

                        const merchantStoreName = getMerchantStoreName(order) || 'PayPal';
                        getApplePayMerchantSession({ url: e.validationURL, clientID, orderID, merchantDomain, merchantStoreName })
                            .then(merchantSession => {
                                try {
                                    const session = atob(merchantSession.session);
                                    completeMerchantValidation(JSON.parse(session));
                                } catch (err) {
                                    getLogger().info(`applepay_merchant_valiation_error`)
                                        .track({
                                            [FPTI_KEY.TRANSITION]:      FPTI_TRANSITION.APPLEPAY_VALIDATE_MERCHANT_ERROR,
                                            [FPTI_CUSTOM_KEY.ERR_DESC]: `Error: ${ stringifyError(err) }`
                                        })
                                        .flush();
                                    onError(err);
                                    close();
                                }
                            })
                            .catch(err => {
                                getLogger().info(`applepay_merchant_valiation_error`)
                                    .track({
                                        [FPTI_KEY.TRANSITION]:      FPTI_TRANSITION.APPLEPAY_VALIDATE_MERCHANT_ERROR,
                                        [FPTI_CUSTOM_KEY.ERR_DESC]: `Error: ${ stringifyError(err) }`
                                    })
                                    .flush();
                                onError(err);
                                close();
                            });
                    });

                    addEventListener('paymentmethodselected', (e) => {
                        logApplePayEvent(e);

                        const { amount, label } = applePayRequest.total;
                        const newTotal = {
                            amount,
                            label
                        };

                        const update = { newTotal };
                        completePaymentMethodSelection(update);
                    });

                    addEventListener('shippingmethodselected', (e) => {
                        logApplePayEvent(e);
                        completeShippingMethodSelection({});
                    });

                    addEventListener('shippingcontactselected', (e) => {
                        logApplePayEvent(e);
                        completeShippingContactSelection({});
                    });

                    addEventListener('paymentauthorized', (e) => {
                        logApplePayEvent(e);

                        const applePayPayment : ApplePayPayment = e.payment;
                        if (!applePayPayment) {
                            throw new Error('No payment received from Apple.');
                        }
                        
                        // call graphQL mutation passing in token, billingContact and shippingContact
                        approveApplePayPayment(orderID, clientID, applePayPayment)
                            .then(validatedPayment => {
                                if (validatedPayment) {
                                    // call onApprove when successful
                                    const data = {};
                                    const actions = { restart: () => ZalgoPromise.try(setupApplePaySession) };
                                    ZalgoPromise.all([
                                        onApprove(data, actions)
                                            .then(() => {
                                                const result = window.ApplePaySession.STATUS_SUCCESS;
                                                completePayment(result);
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
                                }
                            });
                    });

                    addEventListener('oncancel', (e) => {
                        logApplePayEvent(e);

                        if (onCancel) {
                            onCancel();
                        }
                    });

                    begin();
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
        };

        setupApplePaySession();
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
