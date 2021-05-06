/* @flow */

import { noop } from 'belter';
import { compileLocalSmartQRCodeClientScript, getSmartQRCodeClientScript } from './script';
import { getQRCodeMiddleware } from './middleware';


jest.setTimeout(30000);

const cache = {
    // eslint-disable-next-line no-unused-vars
    get: (key) => Promise.resolve(),
    set: (key, value) => Promise.resolve(value)
};

const logBuffer = {
    debug: noop,
    info:  noop,
    flush: noop,
    warn:  noop,
    error: noop
};

describe('script.js', () => {
    it('compileLocalSmartQRCodeClientScript', async () => {
        const script = await compileLocalSmartQRCodeClientScript();

        if (!script) {
            throw new Error(`Expected a script from compileLocalSmartQRCodeClientScript`);
        }
    });
    it('getSmartQRCodeClientScript - base', async () => {
        const script = await getSmartQRCodeClientScript();

        if (!script) {
            throw new Error(`Expected a script from compileLocalSmartQRCodeClientScript`);
        }
    });
    it('getSmartQRCodeClientScript - debug', async () => {
        const debug = true;
        const script = await getSmartQRCodeClientScript({logBuffer, cache, debug});

        if (!script) {
            throw new Error(`Expected a script from compileLocalSmartQRCodeClientScript`);
        }
    });
})
