/* @flow */

import { html } from 'jsx-pragmatic';
import { COUNTRY, LANG, FUNDING, FPTI_KEY } from '@paypal/sdk-constants';
import { stringifyError, noop } from 'belter';

import { clientErrorResponse, htmlResponse, allowFrame, defaultLogger, safeJSON, sdkMiddleware, type ExpressMiddleware,
    graphQLBatch, type GraphQL, javascriptResponse, emptyResponse, promiseTimeout, isLocalOrTest } from '../../lib';
import { resolveFundingEligibility, resolveMerchantID, resolveWallet, resolvePersonalization } from '../../service';
import { EXPERIMENT_TIMEOUT, TIMEOUT_ERROR_MESSAGE, FPTI_STATE } from '../../config';
import type { LoggerType, CacheType, ExpressRequest, FirebaseConfig, InstanceLocationInformation, SDKLocationInformation } from '../../types';
import type { ContentType, Wallet } from '../../../src/types';

import { getSmartPaymentButtonsClientScript, getPayPalSmartPaymentButtonsRenderScript } from './script';
import { getButtonParams, getButtonPreflightParams } from './params';
import { buttonStyle } from './style';
import { setRootTransaction } from './instrumentation';

type InlineGuestElmoParams = {|
    merchantID : string,
    buttonSessionID : string,
    locale : {|
        lang : $Values<typeof COUNTRY>,
        country : $Values<typeof LANG>
    |},
    buyerCountry : $Values<typeof COUNTRY>
|};

type BrandedFundingSourceElmoParam = {|
    clientID : string,
    fundingSource : ?$Values<typeof FUNDING>,
    wallet : Wallet
|};

type ButtonMiddlewareOptions = {|
    logger : LoggerType,
    graphQL : GraphQL,
    getAccessToken : (ExpressRequest, string) => Promise<string>,
    getMerchantID : (ExpressRequest, string) => Promise<string>,
    getInlineGuestExperiment? : (req : ExpressRequest, params : InlineGuestElmoParams) => Promise<boolean>,
    cache : CacheType,
    firebaseConfig? : FirebaseConfig,
    content : {
        [$Values<typeof COUNTRY>] : {
            [$Values<typeof LANG>] : ContentType
        }
    },
    tracking : (ExpressRequest) => void,
    getPersonalizationEnabled : (ExpressRequest) => boolean,
    cdn? : boolean,
    isFundingSourceBranded : (req : ExpressRequest, params : BrandedFundingSourceElmoParam) => Promise<boolean>,
    getInstanceLocationInformation : () => InstanceLocationInformation,
    getSDKLocationInformation : (req : ExpressRequest, env : string) => Promise<SDKLocationInformation>
|};

export function getButtonMiddleware({
    logger = defaultLogger, content: smartContent, graphQL, getAccessToken, cdn = !isLocalOrTest(),
    getMerchantID, cache, getInlineGuestExperiment = () => Promise.resolve(false), firebaseConfig, tracking,
    getPersonalizationEnabled = () => false, isFundingSourceBranded, getInstanceLocationInformation, getSDKLocationInformation
} : ButtonMiddlewareOptions = {}) : ExpressMiddleware {
    const useLocal = !cdn;

    const locationInformation = getInstanceLocationInformation();

    return sdkMiddleware({ logger, cache, locationInformation }, {
        app: async ({ req, res, params, meta, logBuffer, sdkMeta }) => {
            logger.info(req, 'smart_buttons_render');

            for (const name of Object.keys(req.cookies || {})) {
                logger.info(req, `smart_buttons_cookie_${ name || 'unknown' }`);
            }

            tracking(req);

            const { env, clientID, buttonSessionID, cspNonce, debug, buyerCountry, disableFunding, disableCard, userIDToken, amount, renderedButtons,
                merchantID: sdkMerchantID, currency, intent, commit, vault, clientAccessToken, basicFundingEligibility, locale,
                correlationID, cookies, enableFunding, style, paymentMethodToken, branded, fundingSource } = getButtonParams(params, req, res);

            const { label, period, tagline } = style;
            logger.info(req, `button_params`, { params: JSON.stringify(params) });

            const sdkLocationInformation = await getSDKLocationInformation(req, params.env);

            if (!clientID) {
                return clientErrorResponse(res, 'Please provide a clientID query parameter');
            }

            const gqlBatch = graphQLBatch(req, graphQL, { env });
            const content = smartContent[locale.country][locale.lang] || {};

            const facilitatorAccessTokenPromise = getAccessToken(req, clientID);
            const merchantIDPromise = facilitatorAccessTokenPromise.then(facilitatorAccessToken => resolveMerchantID(req, { merchantID: sdkMerchantID, getMerchantID, facilitatorAccessToken }));
            const clientPromise = getSmartPaymentButtonsClientScript({ debug, logBuffer, cache, useLocal, locationInformation });
            const renderPromise = getPayPalSmartPaymentButtonsRenderScript({ logBuffer, cache, useLocal, locationInformation, sdkLocationInformation });

            const isCardFieldsExperimentEnabledPromise = promiseTimeout(
                merchantIDPromise.then(merchantID =>
                    getInlineGuestExperiment(req, { merchantID: merchantID[0], locale, buttonSessionID, buyerCountry })),
                EXPERIMENT_TIMEOUT
            ).catch((err) => {
                if (err.message && err.message.includes(TIMEOUT_ERROR_MESSAGE)) {
                    logger.track(req, {
                        [FPTI_KEY.STATE]:           FPTI_STATE.BUTTON,
                        [FPTI_KEY.TRANSITION]:      'is_card_fields_experiment_enabled_promise_timeout',
                        [FPTI_KEY.CONTEXT_ID]:      buttonSessionID,
                        [FPTI_KEY.CONTEXT_TYPE]:    'button_session_id',
                        [FPTI_KEY.FEED]:            'payments_sdk'
                    }, {});
                }
            });

            const fundingEligibilityPromise = resolveFundingEligibility(req, gqlBatch, {
                logger, clientID, merchantID: sdkMerchantID, buttonSessionID, currency, intent, commit, vault,
                disableFunding, disableCard, clientAccessToken, buyerCountry, basicFundingEligibility, enableFunding
            });

            const walletPromise = resolveWallet(req, gqlBatch, {
                logger, clientID, merchantID: sdkMerchantID, buttonSessionID, currency, intent, commit, vault, amount,
                disableFunding, disableCard, clientAccessToken, buyerCountry, userIDToken, paymentMethodToken, branded
            }).catch(noop);

            const personalizationEnabled = getPersonalizationEnabled(req);
            const personalizationPromise = resolvePersonalization(req, gqlBatch, {
                logger, clientID, buyerCountry, locale, buttonSessionID, currency, intent, commit,
                vault, label, period, tagline, personalizationEnabled, renderedButtons
            });

            gqlBatch.flush();

            let facilitatorAccessToken;

            try {
                facilitatorAccessToken = await facilitatorAccessTokenPromise;
            } catch (err) {
                if (err && err.statusCode && err.statusCode >= 400 && err.statusCode < 500) {
                    return clientErrorResponse(res, 'Invalid clientID');
                }

                throw err;
            }

            const render = await renderPromise;
            const client = await clientPromise;
            const fundingEligibility = await fundingEligibilityPromise;
            const merchantID = await merchantIDPromise;
            const isCardFieldsExperimentEnabled = await isCardFieldsExperimentEnabledPromise;
            const wallet = await walletPromise;
            const personalization = await personalizationPromise;
            const brandedDefault = await isFundingSourceBranded(req, { clientID, fundingSource, wallet });

            const eligibility = {
                cardFields: isCardFieldsExperimentEnabled
            };

            logger.info(req, `button_render_version_${ render.version }`);
            logger.info(req, `button_client_version_${ client.version }`);

            const buttonProps = {
                ...params, nonce: cspNonce, csp: { nonce: cspNonce },
                fundingEligibility, content, wallet, personalization
            };

            try {
                if (render.button.validateButtonProps) {
                    render.button.validateButtonProps(buttonProps);
                }

            } catch (err) {
                return clientErrorResponse(res, err.stack || err.message);
            }

            const buttonHTML = render.button.Buttons(buttonProps).render(html());

            const setupParams = {
                fundingEligibility, buyerCountry, cspNonce, merchantID, sdkMeta, wallet, correlationID,
                firebaseConfig, facilitatorAccessToken, eligibility, content, cookies, personalization,
                brandedDefault
            };

            const pageHTML = `
                <!DOCTYPE html>
                <head></head>
                <body data-nonce="${ cspNonce }" data-client-version="${ client.version }" data-render-version="${ render.version }">
                    <style nonce="${ cspNonce }">${ buttonStyle }</style>

                    <div id="buttons-container" class="buttons-container" role="main" aria-label="PayPal">${ buttonHTML }</div>

                    ${ meta.getSDKLoader({ nonce: cspNonce }) }
                    <script nonce="${ cspNonce }">${ client.script }</script>
                    <script nonce="${ cspNonce }">spb.setupButton(${ safeJSON(setupParams) })</script>
                </body>
            `;

            setRootTransaction(req, { userIDToken, clientAccessToken });
            allowFrame(res);
            return htmlResponse(res, pageHTML);
        },

        script: async ({ req, res, params, logBuffer }) => {
            logger.info(req, 'smart_buttons_script_render');

            const { debug } = getButtonParams(params, req, res);
            const { script } = await getSmartPaymentButtonsClientScript({ debug, logBuffer, cache, useLocal, locationInformation });

            return javascriptResponse(res, script);
        },

        preflight: ({ req, res, params, logBuffer }) => {
            const { clientID, merchantID, currency, userIDToken, amount } = getButtonPreflightParams(params);

            const gqlBatch = graphQLBatch(req, graphQL);

            resolveWallet(req, gqlBatch, {
                logger, clientID, merchantID, currency, amount, userIDToken
            }).catch(err => {
                logBuffer.warn('preflight_error', { err: stringifyError(err) });
            });

            gqlBatch.flush();

            return emptyResponse(res);
        }
    });
}
