const express = require("express");
const app = express();

// Activate compression while serving static files
// + Fix a bug with Node v14 https://www.gitmemory.com/issue/dpskvn/express-sse/37/782771159
const compression = require("compression");
app.use(compression());

const fs = require("fs");
const moment = require("moment");

const logging = require("./logging.js");

var events = require("./events.js");

let config = require("./config.json");
const DOOR_DIRECTION = require("./constant/DOOR_DIRECTION");

const bootTimestamp = moment();
logging.setLogLevel(config.logLevel);

const skipGpio = {
  motor: config.skipGpio.motor,
  dht22: config.skipGpio.dht22,
  sensoren: config.skipGpio.sensoren,
  bme280: config.skipGpio.bme280,
  ir: config.skipGpio.ir,
  shelly: config.skipGpio.shelly,
};

var gpioRelais = require("./gpio-relais.js");
gpioRelais.configure(
  config.gpioPorts.out.hoch,
  config.gpioPorts.out.runter,
  config.gpioPorts.out.ir,
  skipGpio.motor,
  skipGpio.ir
);

if (!skipGpio.bme280) {
  logging.add("Initializing BME280 Temperature Sensor");
  var bme280 = require("./temperature-bme280.js");
  bme280.configure(config.gpioPorts.in.bme280, config.intervals.bme280);
  logging.add(
    `CONFIG BME Port ${config.gpioPorts.out.bme280}, Intervall ${config.intervals.bme280}`
  );
  bme280.readSensor();
} else {
  logging.add("Skipping BME280 Temperature Sensor");
}
getTemperature = () => {
  if (!skipGpio.bme280) {
    return bme280.status.values.temperature;
  }
  return null;
};
getHumidity = () => {
  if (!skipGpio.bme280) {
    return bme280.status.values.humidity;
  }
  return null;
};

if (!skipGpio.dht22) {
  logging.add("Initializing DHT22 Temperature Sensor");
  var dht22 = require("./temperature-dht22.js");
  dht22.configure(config.gpioPorts.out.dht22, config.intervals.dht22);
  dht22.readSensor();
} else {
  logging.add("Skipping DHT22 Temperature Sensor");
}

if (!skipGpio.cpuTemp) {
  logging.add("Initializing CPU Temperature Sensor");
  var cpuTemp = require("./temperature-cpu.js");
  cpuTemp.configure(config.intervals.cpu);
  cpuTemp.readSensor();
} else {
  logging.add("Skipping CPU Temperature Sensor");
}

const Door = require("./door.js");
logging.add("Door instance initialised");

sensoren = {
  sensorOben: {
    value: null,
    text: null,
    time: null,
    error: null,
  },
  sensorUnten: {
    value: null,
    text: null,
    time: null,
    error: null,
  },
  intervalSec: config.intervals.sensoren,
};

// Initialisiere die Sensoren
if (!skipGpio.sensoren) {
  sensorOben = new Gpio(config.gpioPorts.in.oben, "in", "both", {
    debounceTimeout: 10,
  });
  sensorUnten = new Gpio(config.gpioPorts.in.unten, "in", "both", {
    debounceTimeout: 10,
  });

  sensorOben.watch((err, value) => {
    sensorPressed("oben", value);
    //logging.add("sensorOben: " + value + sensorOben.readSync());
  });

  sensorUnten.watch((err, value) => {
    sensorPressed("unten", value);
    //logging.add("sensorUnen: "+value + sensorUnten.readSync());
  });
}

function sensorPressed(position, value) {
  logging.add(
    "sensorPressed: " +
      position +
      " " +
      (value == 1 ? "losgelassen" : "gedrückt") +
      "(" +
      value +
      ")"
  );

  if (position == "oben") {
    sensorObenWert(value, null);
  } else {
    sensorUntenWert(value, null);
  }
}

function sensorObenWert(value, err) {
  if (err) {
    sensoren.sensorOben.value = null;
    sensoren.sensorOben.text = "error";
  } else {
    sensoren.sensorOben.value = value;
    sensoren.sensorOben.text = (value == 1 ? "nicht" : "") + " betätigt";

    // Wenn der Motor gerade hoch fährt,
    // und der Sensor betätigt wird, halte den Motor an.
    if (value == 0) {
      doornModul.stoppeKlappe();
    }
  }
  sensoren.sensorOben.time = new Date();
  logging.add("leseSensoren Oben " + value);
}
function sensorUntenWert(value, err) {
  if (err) {
    sensoren.sensorUnten.value = null;
    sensoren.sensorUnten.text = "error";
  } else {
    sensoren.sensorUnten.value = value;
    sensoren.sensorUnten.text = (value == 1 ? "nicht" : "") + " betätigt";

    // Wenn der Motor gerade runter fährt,
    // und der Sensor betätigt wird, halte den Motor an.
    if (value == 0) {
      doornModul.stoppeKlappe();
    }
  }
  sensoren.sensorUnten.time = new Date();
  logging.add("leseSensoren Unten " + value);
}

function leseSensoren() {
  if (!skipGpio.sensoren) {
    sensorOben.read((err, value) => {
      // Asynchronous read
      sensorObenWert(value, err);
    });

    sensorUnten.read((err, value) => {
      // Asynchronous read
      sensorUntenWert(value, err);
    });
  } else {
    // Mockup-Werte
    sensoren.sensorUnten.value = 1;
    sensoren.sensorUnten.text = "nicht betätigt";
    sensoren.sensorUnten.time = new Date();
    sensoren.sensorUnten.error = "Optionaler Fehlertext";

    sensoren.sensorOben.value = 0;
    sensoren.sensorOben.text = "betätigt";
    sensoren.sensorOben.time = new Date();
    sensoren.sensorOben.error = "Optionaler Fehlertext";
  }
  if (sensoren.intervalSec) {
    setTimeout(function erneutLesen() {
      leseSensoren();
    }, sensoren.intervalSec * 1000);
  }
}
leseSensoren();

const camera = require("./camera.js");
camera.configure(
  config.camera.intervalSec,
  config.camera.maxAgeSec,
  config.camera.autoTakeSec
);
logging.add("Camera instance initialised");

var heating = require("./heating.js");
heating.configure(
  config.heating.heatBelowC,
  config.heating.minimumHeatingMins,
  config.heating.enabled
);

const cronTasks = require("./cron-tasks.js");
cronTasks.configure(
  config.location,
  config.hatchAutomation,
  config.heating.timeFrame
);

var shelly = require("./shelly.js");
shelly.configure(config.shelly.url, config.shelly.intervalSec);
shelly.getShellyStatus();

// Handle http requests
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );

  logging.add(
    `req ${req.method} ${req.originalUrl} from ${
      req.headers["x-forwarded-for"] || req.connection.remoteAddress
    }`,
    "debug"
  );
  next();
});

// Frontend delivery
app.get("/", express.static("frontend"));

app.get("/api/status", function (req, res) {
  res.send({
    doorState: Door.doorState,
    skipGpio: skipGpio,
    cpuTemp: cpuTemp.status,
    camera: {},
    cron: cronTasks.status,
    booted: bootTimestamp,
    heating: heating.status,
  });
});
app.get("/api/log", function (req, res) {
  res.send({ log });
});

// Moving door
app.get("/api/calibrate/up", function (req, res) {
  const action = Door.correctTop();
  res.send(action);
});
app.get("/api/calibrate/down", function (req, res) {
  const action = Door.correctBottom();
  res.send(action);
});

app.get("/api/up", function (req, res) {
  const action = Door.moveDoor(DOOR_DIRECTION.UP);
  if (!action.success) res.status(403);
  res.send(action);
});
app.get("/api/down", function (req, res) {
  const action = Door.moveDoor(DOOR_DIRECTION.DOWN);
  if (!action.success) res.status(403);
  res.send(action);
});

app.get("/api/cam/new", function (req, res) {
  let takeIt = camera.takePhoto(false);
  if (takeIt == true) {
    res.send({
      success: true,
      message: "foto in auftrag gegeben. abholen unter /cam",
    });
  } else {
    res.send({
      success: false,
      message: "foto nicht in auftrag gegeben - " + takeIt,
    });
  }
});
app.get("/api/cam/:timestamp?", function (req, res) {
  const image = camera.getJpg();

  if (image) {
    res.contentType("image/jpeg");
    res.send(image);
  } else {
    res.send({ message: "geht nicht" });
  }
});
app.get("/api/nightvision/new", function (req, res) {
  let takeIt = camera.queueNightvision();
  if (takeIt == true) {
    res.send({
      success: true,
      message: "nacht-foto kommt sofort. abholen unter /nightvision",
    });
  } else {
    res.send({
      success: false,
      message: "nacht-foto wird als nächstes aufgenommen - " + takeIt,
    });
  }
});
app.get("/api/nightvision/:timestamp?", function (req, res) {
  if (camera.getIRJpg()) {
    res.contentType("image/jpeg");
    res.send(camera.getIRJpg());
  } else {
    res.send({
      message: "Kein IR Foto. Bitte per /nightvision/new eins aufnehmen.",
    });
  }
});
app.get("/api/nightvisionsvg/:timestamp?", function (req, res) {
  res.contentType("image/svg+xml");
  res.send(camera.getSvg("nightvision"));
});
app.get("/api/camsvg/:timestamp?", function (req, res) {
  res.contentType("image/svg+xml");
  res.send(camera.getSvg());
});

app.get("/shelly/inform/:onoff", function (req, res) {
  shelly.setShellyRelayStatusOnOff(req.params.onoff);
  res.send({ message: "Thanks for sending Shelly Status" });
});
app.get("/shelly/turn/:onoff", function (req, res) {
  shelly.turnShellyRelay(req.params.onoff);
  res.send({ message: "Turning Shelly on/off" });
});
app.get("/shelly/update", function (req, res) {
  shelly.getShellyStatus(true);
  res.send({ message: "Updating Shelly Status" });
});
app.get("/api/heating/enable", function (req, res) {
  heating.setEnableHeating(true);
  res.send({ message: "Turning Heating on" });
});
app.get("/api/heating/disable", function (req, res) {
  heating.setEnableHeating(false);
  res.send({ message: "Turning Heating off" });
});

app.get("/api/events", events.sse.init);

app.listen(3000, function () {
  logging.add("Listening on port 3000!");
});
