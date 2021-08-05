var Gpio = require('onoff').Gpio;
const motorAus = 1;
const motorEin = 0;

const gpioPorts = {
    out: {
        hoch: 23,
        runter: 24
    }
};

doorHoch = new Gpio(gpioPorts.out.hoch, 'high');
doorRunter = new Gpio(gpioPorts.out.runter, 'high');
stopMotor();

console.log("Starte Motor");
doorHoch.writeSync(motorEin);

function stopMotor() {
    doorHoch.writeSync(motorAus);
    doorRunter.writeSync(motorAus);
}

const seconds = 1;
setTimeout(function motorSpaeterAnhalten() {
    console.log("Stoppe Motor");
    stopMotor();
}, seconds * 1000);
