/* @flow */
/* eslint max-lines: off, max-nested-callbacks: off */

import { cleanup, memoize, stringifyError, stringifyErrorMessage } from 'belter/src';
import { FPTI_KEY, FUNDING } from '@paypal/sdk-constants/src';
import { ZalgoPromise } from 'zalgo-promise/src';

import { getDetailedOrderInfo, approveApplePayPayment, getApplePayMerchantSession } from '../../api';
import { getLogger, promiseNoop, unresolvedPromise } from '../../lib';
import { FPTI_CUSTOM_KEY, FPTI_STATE, FPTI_TRANSITION } from '../../constants';
import { type OnShippingChangeData } from '../../props/onShippingChange';
import type { ApplePayShippingContactUpdate, PaymentFlow, PaymentFlowInstance, IsEligibleOptions, IsPaymentEligibleOptions, InitOptions } from '../types';

import { createApplePayRequest, isJSON } from './utils';

const SUPPORTED_VERSION = 3;

let clean;
function setupApplePay() : ZalgoPromise<void> {
    return ZalgoPromise.resolve();
}

function isApplePayEligible({ props, serviceData } : IsEligibleOptions) : boolean {
    const { branded, createBillingAgreement, createSubscription } = props;
    const { fundingEligibility } = serviceData;

    if (branded || createBillingAgreement || createSubscription) {
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
    const { createOrder, onApprove, onCancel, onError, onClick, onShippingChange, locale, clientID, merchantDomain, currency, applePay } = props;

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

    function logApplePayEvent(event, payload) {
        const data = isJSON(payload) ? payload : {};
        getLogger().info(`${ FPTI_TRANSITION.APPLEPAY_EVENT }_${ event }`, data)
            .track({
                [FPTI_KEY.TRANSITION]:      `${ FPTI_TRANSITION.APPLEPAY_EVENT }_${ event }`,
                [FPTI_CUSTOM_KEY.INFO_MSG]: JSON.stringify(data)
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
        let shippingLabel;

        const onShippingChangeCallback = ({ orderID, billingToken, shippingContact, shippingMethod = null }) : ZalgoPromise<ApplePayShippingContactUpdate> => {
            if (onShippingChange) {
                const data : OnShippingChangeData = {
                    orderID,
                    buyerAccessToken: billingToken || '',
                    shipping_address: {
                        city:         shippingContact.locality,
                        state:        shippingContact.administrativeArea,
                        country_code: shippingContact.country,
                        postal_code:  shippingContact.postalCode
                    }
                };

                if (shippingMethod) {
                    data.selected_shipping_option = {
                        label:  shippingMethod.label,
                        type:   shippingMethod.identifier,
                        amount: {
                            currency_code: currency,
                            value:         shippingMethod.amount
                        }
                    };
                }
                const actions = {
                    resolve: () => {
                        return ZalgoPromise.resolve();
                    },
                    reject: () => {
                        return ZalgoPromise.reject();
                    }
                };
                return onShippingChange({ ...data, forceRestAPI: true }, actions)
                    .then(() => {
                        return getDetailedOrderInfo(orderID, locale.country).then(updatedOrder => {
                            const {
                                cart: {
                                    amounts: {
                                        shippingAndHandling: {
                                            currencyValue: updatedShippingValue
                                        },
                                        tax: {
                                            currencyValue: updatedTaxValue
                                        },
                                        total: {
                                            currencyValue: updatedTotalValue
                                        }
                                    }
                                }
                            } = updatedOrder.checkoutSession;

                            const update = {
                                newTotal: {
                                    label:  'Total',
                                    amount: updatedTotalValue
                                },
                                newLineItems: [
                                    {
                                        label:  'Sales Tax',
                                        amount: updatedTaxValue
                                    },
                                    {
                                        label:  shippingLabel,
                                        amount: updatedShippingValue
                                    }
                                ]
                            };

                            return update;
                        });
                    }).catch(err => {
                        throw err;
                    });
            } else {
                throw new Error('"onShippingChange" not implemented.  Provide "onShippingChange" callback in button props to handle shipping changes.');
            }
        };

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
                    const {
                        cart: {
                            billingToken,
                            amounts: {
                                shippingAndHandling: {
                                    currencyValue: shippingValue
                                },
                                tax: {
                                    currencyValue: taxValue
                                },
                                total: {
                                    currencyValue: totalValue
                                }
                            }
                        }
                    } = order.checkoutSession;
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
                            logApplePayEvent('validatemerchant', { validationURL });

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

                        function paymentMethodSelected({ paymentMethod }) {
                            logApplePayEvent('paymentmethodselected', paymentMethod);

                            const newTotal = { ...applePayRequest.total };
                            const update = {
                                newTotal,
                                newLineItems: []
                            };

                            if (taxValue && taxValue.length) {
                                update.newLineItems.push({
                                    label:  'Sales Tax',
                                    amount: taxValue
                                });
                            }

                            if (shippingValue && shippingValue.length) {
                                update.newLineItems.push({
                                    label: 'Shipping',
                                    amount: shippingValue
                                });
                            }

                            completePaymentMethodSelection(update);
                        }
                        
                        function shippingMethodSelected({ shippingMethod }) {
                            logApplePayEvent('shippingmethodselected');

                            const { label, amount } = shippingMethod;
                            const newAmount = parseFloat(totalValue) + parseFloat(amount);

                            shippingLabel = label || 'Shipping';

                            const update = {
                                newTotal: {
                                    label:  'Total',
                                    amount: newAmount.toString()
                                },
                                newLineItems: [
                                    {
                                        label:  'Sales Tax',
                                        amount: taxValue
                                    },
                                    {
                                        label: shippingLabel,
                                        amount
                                    }
                                ]
                            };
                            // patch updated amount
                            completeShippingMethodSelection(update);
                        }

                        function shippingContactSelected({ shippingContact }) {
                            logApplePayEvent('shippingcontactselected', shippingContact);

                            // patch updated shipping contact information
                            onShippingChangeCallback({ orderID, billingToken, shippingContact })
                            .then(update => {
                                completeShippingContactSelection(update);
                            })
                            .catch(err => {
                                // const update = {
                                //     errors: [
                                //         new ApplePayError();
                                //     ]
                                // };
                                completeShippingContactSelection({});
                            });
                        }

                        function paymentAuthorized({ payment: applePayPayment }) {
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
