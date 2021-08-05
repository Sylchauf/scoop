var logging = require('./logging.js');
const performance = require('perf_hooks').performance;

var motorConfig = {
    configured: false,
    gpioInit: false,
    gpioInitIR: false,
    pinIR: null,
    skipGpio: false
}

var nightVisionStatus = {
    value: null,
    time: null
}

configure = (pinIR, skipGpio, skipGpioIR) => {
    motorConfig.configured = true;
    motorConfig.pinIR = pinIR;
    motorConfig.skipGpio = skipGpio;
    motorConfig.skipGpioIR = skipGpioIR;

    logging.add("Motor Configure: " +
        "  configured " + motorConfig.configured +
        ", pinIR " + motorConfig.pinIR +
        ", skipGpio " + motorConfig.skipGpio +
        ", skipGpioIR " + motorConfig.skipGpioIR
    );

    init();
};

init = () => {
    if(!motorConfig.skipGpio || !motorConfig.skipGpioIR) {
        global.Gpio = require('onoff').Gpio;
    }

    if (motorConfig.skipGpioIR) {
	      global.gpioIR = null
        logging.add("Skipping real gpioIR init due to skipGpio");
    }
    else {
        global.gpioIR = new Gpio(motorConfig.pinIR, 'high');
        motorConfig.gpioIRInit = true;
        logging.add("gpioIR initialized");
    }
};

setNightVision = (onoff) => {
    if(onoff) {
        logging.add("gpio-relais.setNightVision(true) Motor is running, cannot turn on IR!","debug");
        return false;
    }
    else if (onoff == true || onoff == false) {

        let newStatus = (onoff == true ? motorConfig.motorEin : motorConfig.motorAus);
        logging.add("gpio-relais.setNightVision(true) Turning Night Vision "+(onoff ? "on" : "off"),"debug");
        if (gpioIR) gpioIR.writeSync(newStatus);
        IRlogChange(onoff);
        return true;
    }
    else {
        logging.add("gpio-relais.setNightVision(onoff) invalid argument true/false",'warn');
        return false;
    }
}

IRIsOn = () => {
    if (!gpioIR) return false;

    let status = gpioIR.readSync() == motorConfig.motorEin;
    logging.add(`IR on:  ${status}`);
    return status;
}

IRlogChange = (newStatus) => {
    let now = performance.now();
    if(nightVisionStatus.value !== null) {
        logging.add('Night vision changed from '+ nightVisionStatus.value +' to '+ newStatus +' after '+ Math.floor((now - nightVisionStatus.time) / 1000) + 's');
    }
    nightVisionStatus.time = now;
    nightVisionStatus.value = newStatus;
}

exports.configure = configure;
exports.setNightVision = setNightVision;
exports.IRIsOn = IRIsOn;
