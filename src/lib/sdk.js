/* @flow */

import postRobot from 'post-robot';

export type PostRobot = typeof postRobot;

type PayPal = {|
    postRobot : PostRobot,
    version : string
|};

export function getPayPal() : PayPal {
    if (!window.paypal) {
        throw new Error(`paypal not found`);
    }

    return window.paypal;
}

export function getPostRobot() : PostRobot {
    let robot;
    try {
        const paypal = getPayPal();
        if (!paypal.postRobot) {
            throw new Error(`paypal.postRobot not found`);
        }
        robot = paypal.postRobot;
    } catch (error) {
        robot = postRobot;
    }
    return robot;
    
}

export function getSDKVersion() : string {
    return getPayPal().version;
}
