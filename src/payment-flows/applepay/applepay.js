/* @flow */
/* eslint max-lines: off, max-nested-callbacks: off */

import { cleanup, memoize, stringifyError, stringifyErrorMessage } from 'belter/src';
import { FPTI_KEY, FUNDING } from '@paypal/sdk-constants/src';
import { ZalgoPromise } from 'zalgo-promise/src';

import { getDetailedOrderInfo, approveApplePayPayment, getApplePayMerchantSession } from '../../api';
import { getLogger, promiseNoop, unresolvedPromise } from '../../lib';
import { FPTI_CUSTOM_KEY, FPTI_STATE, FPTI_TRANSITION } from '../../constants';
import type { ApplePayPaymentMethodUpdate, ApplePayLineItem, PaymentFlow, PaymentFlowInstance, IsEligibleOptions, IsPaymentEligibleOptions, InitOptions } from '../types';

import { createApplePayRequest } from './utils';

const SUPPORTED_VERSION = 3;

let clean;
function setupApplePay() : ZalgoPromise<void> {
    return ZalgoPromise.resolve();
}

function isApplePayEligible({ props, serviceData } : IsEligibleOptions) : boolean {
    const { branded, onShippingChange, createBillingAgreement, createSubscription } = props;
    const { fundingEligibility } = serviceData;

    if (branded || onShippingChange || createBillingAgreement || createSubscription) {
        return false;
    }

    return fundingEligibility &&
           fundingEligibility[FUNDING.APPLEPAY] &&
           fundingEligibility[FUNDING.APPLEPAY].eligible ?
        fundingEligibility[FUNDING.APPLEPAY].eligible :
        false;
}

function isApplePayPaymentEligible({ payment } : IsPaymentEligibleOptions) : boolean {
    return payment.fundingSource === FUNDING.APPLEPAY;
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
        getLogger().info(`${ FPTI_TRANSITION.APPLEPAY_EVENT }_${ event }`)
            .track({
                [FPTI_KEY.TRANSITION]: `${ FPTI_TRANSITION.APPLEPAY_EVENT }_${ event }`
            })
            .flush();
    }

    function handleApplePayError(eventName, error) : ZalgoPromise<void> {
        getLogger().info(eventName)
            .track({
                [FPTI_KEY.TRANSITION]:      eventName,
                [FPTI_CUSTOM_KEY.ERR_DESC]: `Error: ${ stringifyError(error) }`
            })
            .flush();
        return close().then(() => {
            return onError(error);
        });
    }

    function initApplePaySession() : ZalgoPromise<void> {
        const validatePromise = validate().then(valid => {
            if (!valid) {
                getLogger().info(`native_onclick_invalid`).track({
                    [FPTI_KEY.STATE]:       FPTI_STATE.BUTTON,
                    [FPTI_KEY.TRANSITION]:  FPTI_TRANSITION.APPLEPAY_ON_CLICK_INVALID
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
            return orderPromise.then(orderID => {
                const country = locale.country;

                return getDetailedOrderInfo(orderID, country).then(order => {
                    // set order details into ApplePayRequest
                    const applePayRequest = createApplePayRequest(country, order);
                    
                    // create Apple Pay Session
                    return applePay(SUPPORTED_VERSION, applePayRequest).then(response => {
                        const {
                            begin,
                            addEventListener,
                            completeMerchantValidation,
                            completeShippingContactSelection,
                            completePaymentMethodSelection,
                            completeShippingMethodSelection,
                            completePayment
                        } = response;

                        function validateMerchant({ validationURL }) {
                            logApplePayEvent('validatemerchant');

                            getApplePayMerchantSession({ url: validationURL, clientID, orderID, merchantDomain })
                                .then(merchantSession => {
                                    try {
                                        const session = atob(merchantSession.session);
                                        completeMerchantValidation(JSON.parse(session));
                                    } catch (err) {
                                        handleApplePayError(FPTI_TRANSITION.APPLEPAY_MERCHANT_VALIDATION_COMPLETION_ERROR, err);
                                    }
                                })
                                .catch(err => {
                                    handleApplePayError(FPTI_TRANSITION.APPLEPAY_MERCHANT_VALIDATION_ERROR, err);
                                });
                        }

                        function paymentMethodSelected() {
                            logApplePayEvent('paymentmethodselected');

                            const { amount, label } = applePayRequest.total;
                            const newTotal : ApplePayLineItem = {
                                amount,
                                label
                            };

                            const update : ApplePayPaymentMethodUpdate = { newTotal };
                            completePaymentMethodSelection(update);
                        }

                        function shippingMethodSelected() {
                            logApplePayEvent('shippingmethodselected');
                            completeShippingMethodSelection({});
                        }

                        function shippingContactSelected() {
                            logApplePayEvent('shippingcontactselected');
                            completeShippingContactSelection({});
                        }

                        function paymentAuthorized(applePayPayment) {
                            logApplePayEvent('paymentauthorized');

                            if (!applePayPayment) {
                                throw new Error('No payment received from Apple.');
                            }
                            
                            // call graphQL mutation passing in token, billingContact and shippingContact
                            approveApplePayPayment(orderID, clientID, applePayPayment)
                                .then(validatedPayment => {
                                    if (validatedPayment) {
                                        completePayment(window.ApplePaySession.STATUS_SUCCESS);

                                        const data = {};
                                        const actions = { restart: () => ZalgoPromise.try(setupApplePaySession) };
                                        
                                        return ZalgoPromise.all([
                                            onApprove(data, actions),
                                            close()
                                        ]);
                                    }
                                })
                                .catch(err => {
                                    completePayment(window.ApplePaySession.STATUS_FAILURE);
                                    handleApplePayError(FPTI_TRANSITION.APPLEPAY_PAYMENT_ERROR, err);
                                });
                        }

                        function cancel() {
                            logApplePayEvent('cancel');

                            if (onCancel) {
                                onCancel();
                            }
                        }

                        ZalgoPromise.all([
                            addEventListener('validatemerchant', validateMerchant),
                            addEventListener('paymentmethodselected', paymentMethodSelected),
                            addEventListener('shippingmethodselected', shippingMethodSelected),
                            addEventListener('shippingcontactselected', shippingContactSelected),
                            addEventListener('paymentauthorized', paymentAuthorized),
                            addEventListener('cancel', cancel)
                        ]).then(() => {
                            begin();
                        });
                    }).catch(err => {
                        handleApplePayError(FPTI_TRANSITION.APPLEPAY_GET_DETAILS_ERROR, err);
                    });
                });
            }).catch(err => {
                handleApplePayError(FPTI_TRANSITION.APPLEPAY_CREATE_ORDER_ERROR, err);
            });
        };

        return setupApplePaySession();
    }

    const click = () => {
        return ZalgoPromise.try(() => {
            return initApplePaySession();
        }).catch(err => {
            return close().then(() => {
                getLogger().error(`applepay_flow_error`, { err: stringifyError(err) }).track({
                    [FPTI_KEY.TRANSITION]: FPTI_TRANSITION.APPLEPAY_FLOW_ERROR,
                    [FPTI_KEY.ERROR_CODE]: 'applepay_error',
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
    spinner:           true
};
