const logging = require("./logging.js");
const events = require("./events.js");
const config = require("./config.json");
const DOOR_STATE = require("./constant/DOOR_STATE");
const DOOR_DIRECTION = require("./constant/DOOR_DIRECTION");
const fs = require("fs");
const { motorInstance } = require("./modules/motor");

let door = {
  status: "stop",
};

const initialState = {
  durationUpSec: 0,
  durationDownSec: 0,
  state: DOOR_STATE.BOTTOM,
};

const filePathState = "doorState.json";
const doorState = fs.existsSync(filePathState)
  ? JSON.parse(fs.readFileSync(filePathState).toString())
  : initialState;

const setDoorState = (key, value) => {
  doorState[key] = value;

  fs.writeFileSync("./doorState.json", JSON.stringify(doorState));
};

const setDoorStatus = (status) => {
  // Remember old values
  door.previous = {
    status: door.status,
  };

  door.status = status;

  events.send("doorStatus", status);
};

const correctTop = () => {
  logging.add(
    `[Door] Try to apply correction for up (${config.door.correctionSec}s)`
  );

  const response = moveDoor(DOOR_DIRECTION.UP, config.door.correctionSec);

  if (response.success) {
    setDoorState(
      "durationUpSec",
      doorState.durationUpSec + config.door.correctionSec
    );
    setDoorState("state", DOOR_STATE.TOP);
  }

  return response;
};

const correctBottom = () => {
  logging.add(
    `[Door] Apply correction for down (${config.door.correctionSec}s)`
  );

  const response = moveDoor(DOOR_DIRECTION.DOWN, config.door.correctionSec);

  if (response.success) {
    setDoorState(
      "durationDownSec",
      doorState.durationDownSec + config.door.correctionSec
    );
    setDoorState("state", DOOR_STATE.BOTTOM);
  }

  return response;
};

const makeResponse = (success, message, logType = "info") => {
  const response = {
    success,
    message,
  };

  logging.add(message, logType);

  return response;
};

const moveDoor = (direction, forceDuration = null) => {
  // Check if the motor can move
  if (direction !== DOOR_DIRECTION.UP && direction !== DOOR_DIRECTION.DOWN)
    return makeResponse(false, "[Door] Invalid parameter (up/down)", "warn");

  if (
    direction === DOOR_DIRECTION.UP &&
    doorState.state === DOOR_STATE.TOP &&
    !forceDuration
  )
    return makeResponse(
      false,
      "[Door] You ask to open the door : it's already open",
      "warn"
    );

  if (
    direction === DOOR_DIRECTION.DOWN &&
    doorState.state === DOOR_STATE.BOTTOM &&
    !forceDuration
  )
    return makeResponse(
      false,
      "[Door] You ask to close the door : it's already close",
      "warn"
    );

  if (
    direction === DOOR_DIRECTION.UP &&
    doorState.state === DOOR_STATE.BOTTOM &&
    forceDuration
  )
    return makeResponse(
      false,
      "[Door] You ask to calibrate the door to the up : it's impossible for the moment. Please end the bottom calibration then ask open the door. After the door has moved, you will start the up calibration",
      "warn"
    );

  if (
    direction === DOOR_DIRECTION.DOWN &&
    doorState.state === DOOR_STATE.TOP &&
    forceDuration
  )
    return makeResponse(
      false,
      "[Door] You ask to calibrate the door to the down : it's impossible for the moment. Please end the top calibration then ask close the door. After the door has moved, you will start the down calibration",
      "warn"
    );

  if (door.status !== "stop")
    return makeResponse(false, `[Door] Already moving ...`);

  // Ok, we pass securities : start the engine now
  const duration = forceDuration
    ? forceDuration
    : direction === DOOR_DIRECTION.UP
    ? doorState.durationUpSec
    : doorState.durationDownSec;

  if (duration <= 0)
    return makeResponse(false, `[Door] Cant move for ${duration}s ...`);

  if (direction === DOOR_DIRECTION.UP) motorInstance.moveUp();
  else if (direction === DOOR_DIRECTION.DOWN) motorInstance.moveDown();

  setDoorStatus("moving " + direction, duration);

  // Switch off the motor later
  setTimeout(() => {
    stopDoor();

    if (!forceDuration)
      setDoorState(
        "state",
        direction === DOOR_DIRECTION.UP ? DOOR_STATE.TOP : DOOR_STATE.BOTTOM
      );

    logging.add(`[Door] Stopping…`);
  }, duration * 1000);

  return makeResponse(
    true,
    `[Door] Moving ${direction} for ${duration}s ${
      forceDuration ? "(forced/calibration)" : "(classical)"
    }`
  );
};

stopDoor = () => {
  motorInstance.stop();
  setDoorStatus("stop", null);
};

exports.moveDoor = moveDoor;
exports.correctBottom = correctBottom;
exports.correctTop = correctTop;
exports.doorState = doorState;
