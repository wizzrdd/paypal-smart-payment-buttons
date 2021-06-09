/* @flow */

import { ZalgoPromise } from 'zalgo-promise/src';
import { stringifyError } from 'belter/src';

import { upgradeFacilitatorAccessToken } from '../api';
import { getLogger } from '../lib';
import { LSAT_UPGRADE_EXCLUDED_MERCHANTS, LSAT_UPGRADE_RESULT_KEY } from '../constants';

import type { CreateOrder } from './createOrder';

export type XOnAuthDataType = {|
    accessToken : ?string
|};

export type OnAuth = (params : XOnAuthDataType) => ZalgoPromise<string | void>;

type GetOnAuthOptions = {|
    facilitatorAccessToken : string,
    createOrder : CreateOrder,
    clientID : string
|};

export function getOnAuth({ facilitatorAccessToken, createOrder, clientID } : GetOnAuthOptions) : OnAuth {
    const upgradeLSAT = LSAT_UPGRADE_EXCLUDED_MERCHANTS.indexOf(clientID) === -1;

    return ({ accessToken } : XOnAuthDataType) => {
        getLogger().info(`spb_onauth_access_token_${ accessToken ? 'present' : 'not_present' }`);

        return ZalgoPromise.try(() => {
            if (accessToken) {
                if (upgradeLSAT) {
                    return createOrder()
                        .then(orderID => {
                            if (window.xprops.createSubscription) {
                                return null;
                            }

                            return upgradeFacilitatorAccessToken(facilitatorAccessToken, { buyerAccessToken: accessToken, orderID });
                        })
                        .then(() => {
                            getLogger().info(`upgrade_lsat_success`);

                            return accessToken;
                        })
                        .catch(err => {
                            getLogger().warn('upgrade_lsat_failure', { error: stringifyError(err) });
                            window[LSAT_UPGRADE_RESULT_KEY] = false;

                            return accessToken;
                        });
                }
                return accessToken;
            }
        });
    };
}
