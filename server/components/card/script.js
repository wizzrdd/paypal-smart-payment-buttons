/* @flow */

import { join } from 'path';

import { noop } from 'belter';
import { ENV } from '@paypal/sdk-constants';

import type { CacheType, InstanceLocationInformation } from '../../types';
import { CARD_CLIENT_JS, CARD_CLIENT_MIN_JS, WEBPACK_CONFIG, ACTIVE_TAG, SMART_BUTTONS_MODULE } from '../../config';
import { isLocalOrTest, compileWebpack, babelRequire, resolveScript, dynamicRequire, type LoggerBufferType } from '../../lib';
import { getPayPalSmartPaymentButtonsWatcher } from '../../watchers';

const ROOT = join(__dirname, '../../..');

type SmartCardClientScript = {|
    script : string,
    version : string
|};

export async function compileLocalSmartCardClientScript() : Promise<?SmartCardClientScript> {
    const webpackScriptPath = resolveScript(join(ROOT, WEBPACK_CONFIG));

    if (webpackScriptPath && isLocalOrTest()) {
        const { WEBPACK_CONFIG_CARD_DEBUG } = babelRequire(webpackScriptPath);
        const script = await compileWebpack(WEBPACK_CONFIG_CARD_DEBUG, ROOT);
        return { script, version: ENV.LOCAL };
    }

    const distScriptPath = resolveScript(join(SMART_BUTTONS_MODULE, CARD_CLIENT_JS));

    if (distScriptPath) {
        const script = dynamicRequire(distScriptPath);
        return { script, version: ENV.LOCAL };
    }
}

type GetSmartCardClientScriptOptions = {|
    debug : boolean,
    logBuffer : ?LoggerBufferType,
    cache : ?CacheType,
    useLocal? : boolean,
    locationInformation : InstanceLocationInformation
|};

export async function getSmartCardClientScript({ logBuffer, cache, debug = false, useLocal = isLocalOrTest(), locationInformation } : GetSmartCardClientScriptOptions = {}) : Promise<SmartCardClientScript> {
    if (useLocal) {
        const script = await compileLocalSmartCardClientScript();

        if (script) {
            return script;
        }
    }

    const { getTag, getDeployTag, read } = getPayPalSmartPaymentButtonsWatcher({ logBuffer, cache, locationInformation });
    const { version } = await getTag();
    const script = await read(debug ? CARD_CLIENT_JS : CARD_CLIENT_MIN_JS, ACTIVE_TAG);

    // non-blocking download of the DEPLOY_TAG
    getDeployTag().catch(noop);

    return { script, version };
}
