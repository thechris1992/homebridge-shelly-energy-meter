[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)
[![npm version](https://badge.fury.io/js/homebridge-3em-energy-meter.svg)](https://www.npmjs.com/package/homebridge-3em-energy-meter)

# Homebridge 3EM Energy Meter Platform

[Homebridge 3em Energy Meter](https://www.npmjs.com/package/homebridge-3em-energy-meter) is a platform plugin for [Homebridge](https://github.com/homebridge/homebridge) that implements Shelly 3EM energy metering functionality in Homekit. **Now supports multiple devices!**

This plugin uses HTTP requests to Shelly 3EM (or EM*) devices, making it possible to retain the native Shelly cloud statistics (which use MQTT) and at the same time allow you to monitor energy consumption from multiple devices via Homekit. 

Please note that due to the fact that Apple does not support energy characteristics in Homekit, this plugin's accessories will only show values in the third-party homekit application "EVE".

![Status](screenshots/homebridge-3em-energy-meter-eve-app.png)

## Features

- **Multiple Device Support**: Configure and monitor multiple Shelly 3EM devices simultaneously
- **Full Energy Monitoring**: Voltage, Current, Power Consumption, and Total Energy for each device
- **Shelly EM Support**: Works with both Shelly 3EM and Shelly EM devices
- **Flexible Configuration**: Extensive configuration options for each device
- **History Support**: Integration with fakegato-history for historical data
- **Authentication Support**: Works with password-protected devices
- **Auto-Generated Serials**: Unique identification for each device

Each device will show in the EVE application the following values:
- **Voltage**: Average voltage of all phases (3EM) or single phase (EM)
- **Current**: Accumulated amperage of all phases
- **Consumption**: Current power consumption in Watts
- **Total Consumption**: Accumulated energy in kWh (as calculated by Shelly API)

Total Cost and Projected Cost will show if you have specified the Energy Cost in the settings section of your EVE application. Total Consumption and Total Cost will feature the fakegato-history graph.

This application uses the cool fakegato plugin ([simont77/fakegato-history](https://github.com/simont77/fakegato-history)).

## Important Notes

The sole purpose of this plugin is the energy metering feature of the Shelly 3EM in order to monitor your installations. The Shelly 3EM features also an actuator (switch) which is not implemented in this plugin. 

If you need to use the switch in Homekit please use other plugins, like for example:
- homebridge-shelly (1st. gen) ([tritter/homebridge-shelly](https://github.com/tritter/homebridge-shelly))
- homebridge-shelly-ds9 (plus & pro) ([cubi1337/homebridge-shelly-ds9](https://github.com/cubi1337/homebridge-shelly-ds9))

## Installation Instructions

You can install this plugin via the build in homebridge console:

```bash
cd node_modules 
git --git-dir=/dev/null clone --depth=1 https://github.com/thechris1992/homebridge-3em-energy-meter
cd homebridge-3em-energy-meter && npm install
```

## Configuration

⚠️ **Breaking Change**: This plugin has been converted from an accessory plugin to a platform plugin to support multiple devices. If you're upgrading from a previous version, you'll need to update your configuration.

### Platform Configuration

Edit your Homebridge's config.json to include the following in the platforms section:

```json
{
    "platform": "3EMEnergyMeter",
    "name": "3EM Energy Meters",
    "devices": [
        {
            "name": "Main House Meter",
            "ip": "192.168.1.100",
            "auth": {
                "user": "",
                "pass": ""
            },
            "timeout": 5000,
            "update_interval": 10000,
            "use_em": false,
            "use_em_mode": 0,
            "negative_handling_mode": 0,
            "use_pf": false,
            "enable_consumption": true,
            "enable_total_consumption": true,
            "enable_voltage": true,
            "enable_ampere": true,
            "debug_log": false,
            "serial": ""
        },
        {
            "name": "Garage Meter",
            "ip": "192.168.1.101",
            "timeout": 5000,
            "update_interval": 10000,
            "use_em": false,
            "debug_log": false
        },
        {
            "name": "Solar Inverter Meter",
            "ip": "192.168.1.102",
            "use_em": true,
            "use_em_mode": 0,
            "negative_handling_mode": 1,
            "debug_log": true
        }
    ]
}
```

### Configuration Parameters

#### Platform Level
- **"platform"**: Must be `"3EMEnergyMeter"`
- **"name"**: Name for the platform instance (shows in logs)
- **"devices"**: Array of device configurations

#### Device Level
- **"name"** (required): The Homekit Accessory Name for this device
- **"ip"** (required): The IP address of your Shelly 3EM/EM device
- **"auth"** (optional): Authentication if your device web page is password protected
  - **"user"**: Username for device authentication
  - **"pass"**: Password for device authentication
- **"timeout"** (optional): HTTP request timeout in milliseconds (default: 5000)
- **"update_interval"** (optional): Polling interval in milliseconds (default: 10000, must be > timeout)
- **"use_em"** (optional): Set to `true` for Shelly EM devices (default: false)
- **"use_em_mode"** (optional): Shelly EM channel mode (default: 0)
  - `0`: Combine both channels
  - `1`: Use only channel 1
  - `2`: Use only channel 2
- **"negative_handling_mode"** (optional): How to handle negative values (default: 0)
  - `0`: Set negative values to zero
  - `1`: Show absolute values
- **"use_pf"** (optional): Use Power Factor when calculating amperage (default: false)
- **"enable_consumption"** (optional): Show instant power consumption (default: true)
- **"enable_total_consumption"** (optional): Show total energy consumption (default: true)
- **"enable_voltage"** (optional): Show voltage readings (default: true)
- **"enable_ampere"** (optional): Show current readings (default: true)
- **"debug_log"** (optional): Enable detailed logging for this device (default: false)
- **"serial"** (optional): Custom serial number (auto-generated if empty)

### Migration from Accessory Plugin

If you're upgrading from the old accessory-based version, change your configuration from:

```json
// OLD (Accessory)
{
    "accessories": [
        {
            "accessory": "3EMEnergyMeter",
            "name": "Energy Meter",
            "ip": "192.168.1.100",
            // ... other settings
        }
    ]
}
```

To:

```json
// NEW (Platform)
{
    "platforms": [
        {
            "platform": "3EMEnergyMeter",
            "name": "3EM Energy Meters",
            "devices": [
                {
                    "name": "Energy Meter",
                    "ip": "192.168.1.100",
                    // ... other settings
                }
            ]
        }
    ]
}
```

## Usage Examples

### Single 3EM Device (Basic)
```json
{
    "platform": "3EMEnergyMeter",
    "name": "Energy Monitoring",
    "devices": [
        {
            "name": "House Energy Meter",
            "ip": "192.168.1.100"
        }
    ]
}
```

### Multiple 3EM Devices
```json
{
    "platform": "3EMEnergyMeter",
    "name": "Multi-Location Energy Monitoring",
    "devices": [
        {
            "name": "Main House",
            "ip": "192.168.1.100",
            "debug_log": true
        },
        {
            "name": "Guest House",
            "ip": "192.168.1.101"
        },
        {
            "name": "Workshop",
            "ip": "192.168.1.102",
            "update_interval": 15000
        }
    ]
}
```

### Mixed 3EM and EM Devices
```json
{
    "platform": "3EMEnergyMeter",
    "name": "Energy Monitoring System",
    "devices": [
        {
            "name": "Main Panel (3EM)",
            "ip": "192.168.1.100",
            "use_em": false
        },
        {
            "name": "Solar Input (EM)",
            "ip": "192.168.1.101",
            "use_em": true,
            "use_em_mode": 0,
            "negative_handling_mode": 1
        },
        {
            "name": "Heat Pump (EM Ch1)",
            "ip": "192.168.1.102",
            "use_em": true,
            "use_em_mode": 1
        }
    ]
}
```

### With Authentication
```json
{
    "platform": "3EMEnergyMeter",
    "name": "Secure Energy Monitoring",
    "devices": [
        {
            "name": "Protected Meter",
            "ip": "192.168.1.100",
            "auth": {
                "user": "admin",
                "pass": "your-password"
            }
        }
    ]
}
```

## Troubleshooting

1. **Device not showing up**: Check that IP address is correct and device is reachable
2. **Authentication errors**: Verify username/password if device is protected
3. **No data updates**: Ensure `update_interval` is greater than `timeout`
4. **Multiple devices with same name**: Each device name should be unique
5. **History not working**: Ensure each device has a unique serial number (auto-generated if not specified)

## Notes

- Shelly EM functionality is tested and supported
- Serial numbers are auto-generated based on device name and IP if not specified
- Each device operates independently with its own polling cycle
- Debug logging can be enabled per device for troubleshooting
- The creator of this plugin is not affiliated with [Shelly(Allterco)](https://shelly.cloud/) or [EVE](https://www.evehome.com/)

## Changelog

### v2.0.0
- **Breaking Change**: Converted from accessory to platform plugin
- Added support for multiple devices
- Improved error handling and validation
- Auto-generated unique serial numbers
- Enhanced logging with device identification
- Better configuration schema with validation

### Previous Versions
- Single device accessory support
- Basic 3EM and EM functionality