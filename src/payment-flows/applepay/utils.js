/* @flow */

import type { ApplePayPaymentContact, ApplePaySupportedNetworks, ApplePayShippingMethod, ShippingAddress, ShippingMethod } from '../types';

const validNetworks = {
    discover:       'discover',
    visa:           'visa',
    mastercard:     'masterCard',
    amex:           'amex',
    jcb:            'jcb',
    chinaunionpay:  'chinaUnionPay'
};

export function getSupportedNetworksFromIssuers(issuers : $ReadOnlyArray<string>) : $ReadOnlyArray<ApplePaySupportedNetworks> {
    if (!issuers || (issuers && issuers.length === 0)) {
        return [];
    }

    issuers.filter(issuer => {
        const network = issuer.toLowerCase().replace(/_/g, '');
        if (Object.keys(validNetworks).indexOf(network) !== -1) {
            return validNetworks[network];
        }

        return false;
    });
}

export function getShippingContactFromAddress(shippingAddress : ?ShippingAddress) : ApplePayPaymentContact {
    if (!shippingAddress) {
        return {
            givenName:          '',
            familyName:         '',
            addressLines:       [],
            locality:           '',
            administrativeArea: '',
            postalCode:         '',
            country:            ''
        };
    }

    const { firstName, lastName, line1, line2, city, state, postalCode, country } = shippingAddress;

    return {
        givenName:    firstName,
        familyName:   lastName,
        addressLines: [
            line1,
            line2
        ],
        locality:           city,
        administrativeArea: state,
        postalCode,
        country
    };
}

export function getApplePayShippingMethods(shippingMethods : ?$ReadOnlyArray<ShippingMethod>) : $ReadOnlyArray<ApplePayShippingMethod> {
    if (!shippingMethods || shippingMethods.length === 0) {
        return [];
    }

    return shippingMethods.map(method => {
        return {
            amount:     method.amount && method.amount.currencyValue ? method.amount.currencyValue : '',
            detail:     '',
            identifier: method.type,
            label:      method.label
        };
    });
}
