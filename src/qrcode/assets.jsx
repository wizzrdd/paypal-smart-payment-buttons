/* @flow */
/** @jsx h */

import {html} from 'jsx-pragmatic';
import { h, Fragment, Node } from 'preact';
import {VenmoLogo, LOGO_COLOR} from '@paypal/sdk-logos/src';

export function Logo() : typeof Node {
    return (<span innerHTML={`
        ${ VenmoLogo({logoColor:LOGO_COLOR.DEFAULT}).render(html()) }
    `} />)
}

export function InstructionIcon({className="instruction-icon"} : {className? : string }) : typeof Node {
    return (
        <svg className={className} width="68" height="46" viewBox="0 0 68 46" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="49" cy="25" r="18" fill="white" stroke="#888C94" stroke-width="2"/>
            <path fill-rule="evenodd" clip-rule="evenodd" d="M56.7188 15.5H51.9688C50.985 15.5 50.1875 16.2975 50.1875 17.2812V22.0312C50.1875 23.015 50.985 23.8125 51.9688 23.8125H56.7188C57.7025 23.8125 58.5 23.015 58.5 22.0312V17.2812C58.5 16.2975 57.7025 15.5 56.7188 15.5ZM51.375 17.2812C51.375 16.9533 51.6408 16.6875 51.9688 16.6875H56.7188C57.0467 16.6875 57.3125 16.9533 57.3125 17.2812V22.0312C57.3125 22.3592 57.0467 22.625 56.7188 22.625H51.9688C51.6408 22.625 51.375 22.3592 51.375 22.0312V17.2812ZM41.875 18.5083C41.875 18.1585 42.1585 17.875 42.5083 17.875H44.8042C45.154 17.875 45.4375 18.1585 45.4375 18.5083V20.8042C45.4375 21.154 45.154 21.4375 44.8042 21.4375H42.5083C42.1585 21.4375 41.875 21.154 41.875 20.8042V18.5083ZM52.5625 18.5083C52.5625 18.1585 52.846 17.875 53.1958 17.875H55.4917C55.8415 17.875 56.125 18.1585 56.125 18.5083V20.8042C56.125 21.154 55.8415 21.4375 55.4917 21.4375H53.1958C52.846 21.4375 52.5625 21.154 52.5625 20.8042V18.5083ZM50.8208 26.1875C50.471 26.1875 50.1875 26.471 50.1875 26.8208V27.9292C50.1875 28.279 50.471 28.5625 50.8208 28.5625H51.9292C52.279 28.5625 52.5625 28.279 52.5625 27.9292V26.8208C52.5625 26.471 52.279 26.1875 51.9292 26.1875H50.8208ZM50.1875 32.7583C50.1875 32.4085 50.471 32.125 50.8208 32.125H51.9292C52.279 32.125 52.5625 32.4085 52.5625 32.7583V33.8667C52.5625 34.2165 52.279 34.5 51.9292 34.5H50.8208C50.471 34.5 50.1875 34.2165 50.1875 33.8667V32.7583ZM56.7583 26.1875C56.4085 26.1875 56.125 26.471 56.125 26.8208V27.9292C56.125 28.279 56.4085 28.5625 56.7583 28.5625H57.8667C58.2165 28.5625 58.5 28.279 58.5 27.9292V26.8208C58.5 26.471 58.2165 26.1875 57.8667 26.1875H56.7583ZM56.125 32.7583C56.125 32.4085 56.4085 32.125 56.7583 32.125H57.8667C58.2165 32.125 58.5 32.4085 58.5 32.7583V33.8667C58.5 34.2165 58.2165 34.5 57.8667 34.5H56.7583C56.4085 34.5 56.125 34.2165 56.125 33.8667V32.7583ZM53.7895 29.1562C53.4398 29.1562 53.1562 29.4398 53.1562 29.7895V30.898C53.1562 31.2477 53.4398 31.5312 53.7895 31.5312H54.898C55.2477 31.5312 55.5312 31.2477 55.5312 30.898V29.7895C55.5312 29.4398 55.2477 29.1562 54.898 29.1562H53.7895ZM41.875 29.1958C41.875 28.846 42.1585 28.5625 42.5083 28.5625H44.8042C45.154 28.5625 45.4375 28.846 45.4375 29.1958V31.4917C45.4375 31.8415 45.154 32.125 44.8042 32.125H42.5083C42.1585 32.125 41.875 31.8415 41.875 31.4917V29.1958ZM41.2812 26.1875H46.0312C47.015 26.1875 47.8125 26.985 47.8125 27.9688V32.7188C47.8125 33.7025 47.015 34.5 46.0312 34.5H41.2812C40.2975 34.5 39.5 33.7025 39.5 32.7188V27.9688C39.5 26.985 40.2975 26.1875 41.2812 26.1875ZM41.2812 27.375C40.9533 27.375 40.6875 27.6408 40.6875 27.9688V32.7188C40.6875 33.0467 40.9533 33.3125 41.2812 33.3125H46.0312C46.3592 33.3125 46.625 33.0467 46.625 32.7188V27.9688C46.625 27.6408 46.3592 27.375 46.0312 27.375H41.2812ZM41.2812 15.5H46.0312C47.015 15.5 47.8125 16.2975 47.8125 17.2812V22.0312C47.8125 23.015 47.015 23.8125 46.0312 23.8125H41.2812C40.2975 23.8125 39.5 23.015 39.5 22.0312V17.2812C39.5 16.2975 40.2975 15.5 41.2812 15.5ZM41.2812 16.6875C40.9533 16.6875 40.6875 16.9533 40.6875 17.2812V22.0312C40.6875 22.3592 40.9533 22.625 41.2812 22.625H46.0312C46.3592 22.625 46.625 22.3592 46.625 22.0312V17.2812C46.625 16.9533 46.3592 16.6875 46.0312 16.6875H41.2812Z" fill="#2F3033"/>
            <rect x="11.5" y="6.90039" width="20.7" height="29.9" fill="white"/>
            <path fill-rule="evenodd" clip-rule="evenodd" d="M30.82 2.2998H12.88C10.8476 2.2998 9.20001 3.98283 9.20001 6.05894V42.2407C9.20001 44.3168 10.8476 45.9998 12.88 45.9998H30.82C32.8524 45.9998 34.5 44.3168 34.5 42.2407V6.05894C34.5 3.98283 32.8524 2.2998 30.82 2.2998ZM21.8499 42.6635C20.8337 42.6635 20.0099 41.822 20.0099 40.784C20.0099 39.7459 20.8337 38.9044 21.8499 38.9044C22.8662 38.9044 23.6899 39.7459 23.6899 40.784C23.6899 41.822 22.8662 42.6635 21.8499 42.6635ZM11.9599 36.414H31.7399V7.32767H11.9599V36.414Z" fill="#888C94"/>
        </svg>
    )
}

export function Mark() : typeof Node {
    // <img src="https://www.paypalobjects.com/paypal-ui/logos/svg/venmo-mark-monotone.svg" alt="Venmo Mark" />
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><
            path d="M42.3 2L28.5 4.8c.8 1.9 1.4 4.1 1.4 7.4 0 6-4.2 14.8-7.7 20.4L18.5 3 3.3 4.5l7 41.5h17.4c7.7-10 17-24.3 17-35.2 0-3.4-.8-6.1-2.4-8.8z" fill="#fff"/>
        </svg>
    )
}

export const cardStyle = `
    html, body {
        display: flex;
        position: fixed;
        width: 100%;
        height: 100%;
        top: 0;
        left: 0;
        align-items: center;
        justify-content: center;
    }
    #instructions {
        background-color: #F5F5F5;
        border-bottom-left-radius: 8px;
        border-bottom-right-radius: 8px;
        padding: 16px;
        display: flex;
        align-items: center;
        font-size: 12px;
        line-height: 16px;
        box-sizing: border-box;
        width: 100%;
    }
    .instruction-icon {
        min-width: 68px;
        min-height: 46px;
        margin-right: 16px;
    }

    #view-boxes-container {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        width: 100%;
        font-family: sans-serif;
        font-style: normal;
        font-weight: 100;
    }

    .card {
        border: 1px solid #888C94;
        border-radius: 8px;
        background-color: white;
        display: inline-flex;
        align-items: center;
        flex-direction: column;
        width: 280px;
        height: 320px; 
        font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
        backface-visibility: hidden;
        transition: transform 1s;
        transform-style: preserve-3d;
    }
    #view-boxes{
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        width: 100%;
    }
    #view-boxes.is-flipped #front-view {
        transform: rotateY(180deg);
        position: absolute;
    }
    #view-boxes.is-flipped #back-view {
        transform: rotateY(0deg);
        position: relative;
    }

    #front-view {
        z-index: 2;
        transform: rotateY(0deg);
        justify-content: space-between;
    }
    #front-view > svg,
    #front-view > img {
        padding: 16px 16px 8px;
    }
    #back-view {
        position: absolute;
        transform: rotateY(-180deg);
        background-color: #0074DE;
        justify-content: center;
    }
    #back-view > svg {
        width: 50%;
    }
    `;

export function DemoWrapper(component : typeof Node): typeof Node {
    return (
        <Fragment>
            <style>{`html{background-color: rgba(0, 0, 0, 0.4);}`}</style>
            <div style={`
                background: #2F3033;
                box-shadow: 0px 0px 8px rgba(0, 0, 0, 0.4);
                border-radius: 16px;                        
                width: 720px;
                height: 480px;  
                display: flex;
                align-items: center;
                justify-content: center;
                flex-direction: column;
                position: relative;
            }
            `}>
            {component}
            </div>
        </Fragment>



    )
    
} 
/*
    .card > img,
    .card > svg {${                
    // padding: 24px 24px 12px;
    // width: 100%;
    // height: 100%;        
}}
*/

