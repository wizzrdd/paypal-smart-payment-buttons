/* @flow */

import type { ZalgoPromise } from 'zalgo-promise/src';
import { PLATFORM, ENV, FUNDING } from '@paypal/sdk-constants/src';
import { supportsPopups } from 'belter/src';

import { type NativeEligibility, getNativeEligibility } from '../../api';
import { isIOSSafari, isAndroidChrome, getLogger } from '../../lib';
import { AMPLITUDE_API_KEY } from '../../config';
import type { ButtonProps, ServiceData } from '../../button/props';
import type { IsEligibleOptions, IsPaymentEligibleOptions } from '../types';

import { NATIVE_CHECKOUT_URI, NATIVE_CHECKOUT_POPUP_URI, NATIVE_CHECKOUT_FALLBACK_URI } from './config';

let prefetchedNativeEligibility : NativeEligibility;

export function isTestGroup(fundingSource : $Values<typeof FUNDING>) : boolean {
    const fundingEligibility = prefetchedNativeEligibility && prefetchedNativeEligibility[fundingSource];

    if (fundingEligibility && fundingEligibility.eligibility) {
        return true;
    }

    return false;
}

export function isControlGroup(fundingSource : $Values<typeof FUNDING>) : boolean {
    const fundingEligibility = prefetchedNativeEligibility && prefetchedNativeEligibility[fundingSource];

    if (fundingEligibility && !fundingEligibility.eligibility && fundingEligibility.ineligibilityReason === 'experimentation_ineligibility') {
        return true;
    }

    return false;
}

export function isNativeOptedIn({ props } : {| props : ButtonProps |}) : boolean {
    const { enableNativeCheckout } = props;

    if (enableNativeCheckout) {
        return true;
    }

    try {
        if (window.localStorage.getItem('__native_checkout__')) {
            return true;
        }
    } catch (err) {
        // pass
    }

    return false;
}

type PrefetchNativeEligibilityOptions = {|
    props : ButtonProps,
    serviceData : ServiceData
|};

export function prefetchNativeEligibility({ props, serviceData } : PrefetchNativeEligibilityOptions) : ZalgoPromise<void> {
    const { clientID, onShippingChange, currency, platform, env,
        vault, buttonSessionID, enableFunding, merchantDomain } = props;
    const { merchantID, buyerCountry, cookies } = serviceData;

    const shippingCallbackEnabled = Boolean(onShippingChange);

    return getNativeEligibility({
        vault, platform, shippingCallbackEnabled, clientID, buyerCountry, currency, buttonSessionID, cookies, enableFunding,
        stickinessID: null,
        skipElmo:     true,
        merchantID:   merchantID[0],
        domain:       merchantDomain
    }).then(result => {
        prefetchedNativeEligibility = result;

        if (isTestGroup(FUNDING.PAYPAL) || isTestGroup(FUNDING.VENMO) || isControlGroup(FUNDING.PAYPAL) || isControlGroup(FUNDING.VENMO) || isNativeOptedIn({ props })) {
            getLogger().configure({
                amplitudeApiKey: AMPLITUDE_API_KEY[env]
            });
        }
    });
}

export function isNativeEligible({ props, config, serviceData } : IsEligibleOptions) : boolean {

    const { platform, onShippingChange, createBillingAgreement, createSubscription, env } = props;
    const { firebase: firebaseConfig } = config;
    const { merchantID } = serviceData;

    if (platform !== PLATFORM.MOBILE) {
        return false;
    }

    if (onShippingChange && !isNativeOptedIn({ props })) {
        return false;
    }

    if (createBillingAgreement || createSubscription) {
        return false;
    }

    if (!supportsPopups()) {
        return false;
    }

    if (!firebaseConfig) {
        return false;
    }

    if (!isIOSSafari() && !isAndroidChrome()) {
        return false;
    }

    if (isNativeOptedIn({ props })) {
        return true;
    }

    if (env === ENV.LOCAL || env === ENV.STAGE) {
        return false;
    }

    if (merchantID.length > 1) {
        return false;
    }

    return true;
}

export function isNativePaymentEligible({ payment } : IsPaymentEligibleOptions) : boolean {
    const { win, fundingSource } = payment;

    if (win) {
        return false;
    }

    if (!NATIVE_CHECKOUT_URI[fundingSource] || !NATIVE_CHECKOUT_POPUP_URI[fundingSource] || !NATIVE_CHECKOUT_FALLBACK_URI[fundingSource]) {
        return false;
    }

    return true;
}