# schicke-chicks 🐔
This is our smart chicken coop server. It is providing a web-based backend and (somewhat limited and hacky) frontend to control the coop's hatch and view its webcam and sensor data.

- [schicke-chicks 🐔](#schicke-chicks-)
  - [Hardware](#hardware)
  - [Configuration File](#configuration-file)
    - [Hatch Automation](#hatch-automation)
  - [Web Endpoints](#web-endpoints)
  - [`/events` Coop Event Stream](#events-coop-event-stream)
  - [Shelly Integration](#shelly-integration)

## Hardware
The control unit consists of:

* Raspberry Pi as control unit
* 12V DC power supply
* 12V motor (an old Ford window lifter) to wind the nylon thread that is lifting the hatch
* Relay to control motor and LED
* Webcam (Wide-Angle Raspberry Pi webcam)
* Infrared LED lamp for night vision (powered separately via 12V DC)
* BME280 Sensor (Temperature, Humidity, Pressure)
* Tactile Sensors to determine the hatch's final positions
* Shelly v1 230V relay for a light bulb

## Configuration File
Parameters are configured in `config.json`.

### Hatch Automation
You can maintain fixed times and times relative to `sunset`, `sunrise`, or any other [suncalc](https://github.com/mourner/suncalc) object like `dusk` or `dawn`. For relative times to work, location needs to be maintained in `config.json`. You always have to specify an offset.

```json
"location": {
    "lat": 52.00, 
    "lon": 8.00
},
"hatchAutomation": {
    "openTimes": ["06:30", "08:00", "sunrise+30","sunrise+60","sunrise+120","sunrise+180","sunrise+240","sunrise+300","sunrise+360","sunrise+420"],
    "closeTimes": ["22:00","sunset-30"]
}
```

## Web Endpoints

## `/events` Coop Event Stream
A [server-sent events](https://www.npmjs.com/package/express-sse) (SSE) stream informing about things happening in the coop:
* newWebcamPic
* newWebcamPicIR
* klappenStatus
* klappenPosition
* shellyRelayIsOn


## Shelly Integration
A Shelly v1 230V relay is used to control the light bulb inside the coop.
It can be controlled from the coop:

* `shelly/turn/on` turns the relay/bulb on.
* `shelly/turn/off` turns it off.
* `/shelly/update` can be used to poll the current Shelly state from its web endpoint.

In case the Shelly app/web interface is used, shelly also informs the coop if it was triggered by using *I/O URL actions*:

* OUTPUT SWITCHED ON URL: `http://<coop>/shelly/inform/on`
* *OUTPUT SWITCHED OFF URL: `http://<coop>/shelly/inform/off`

