# Change Log

## 2.0.0 (2025-11-05)

### 🚨 BREAKING CHANGES
- **Plugin Type Change**: Converted from accessory plugin to platform plugin to support multiple devices
- **Configuration Update Required**: Existing configurations must be migrated from `accessories` to `platforms` section

### ✨ New Features
- **Multiple Device Support**: Configure and monitor multiple Shelly 3EM/EM devices simultaneously
- **Auto-Generated Serial Numbers**: Unique serials generated automatically based on device name and IP
- **Enhanced Device Identification**: Improved logging with device-specific prefixes for better debugging
- **Better Configuration Validation**: Comprehensive validation of device configurations with helpful error messages
- **Flexible Device Options**: Each device can have individual settings and configurations

### 🛠️ Improvements
- **Enhanced Error Handling**: Better error messages and validation for individual devices
- **Improved Logging**: Device-specific logging prefixes for easier troubleshooting in multi-device setups
- **Configuration Schema**: Updated schema to support array of devices with proper validation
- **UUID Generation**: Improved UUID generation for unique device identification
- **Code Organization**: Better structured platform and accessory management

### 📋 Migration Guide
**Old Configuration (v1.x)**:
```json
{
    "accessories": [
        {
            "accessory": "3EMEnergyMeter",
            "name": "Energy Meter",
            "ip": "192.168.1.100"
        }
    ]
}
```

**New Configuration (v2.0)**:
```json
{
    "platforms": [
        {
            "platform": "3EMEnergyMeter",
            "name": "3EM Energy Meters",
            "devices": [
                {
                    "name": "Energy Meter",
                    "ip": "192.168.1.100"
                }
            ]
        }
    ]
}
```

---

## 1.1.4 (2025-10-03)

### Changes

* Added support for Homebridge V2
* Added a selection for what Energy Data is show
* updated dependencies


## 1.1.3 (2021-05-18)

### Changes

* Added a mode selection in order to specify what to do when negative values appear (Power returns etc.).


## 1.1.2 (2021-11-02)

### Changes

* Added correct absolute ( abs() ) to calculations in order to comply to Homekit ranges (no negative values allowed).

## 1.1.1 (2021-11-02)

### Changes

* Added absolute ( abs() ) to calculations in order to comply to Homekit ranges (no negative values allowed).

## 1.1.0 (2021-08-02)

### Changes

* Added support for Shelly EM devices (beta)
* Please set config flag use_em to true and 
  use use_em_mode to get combined, channel1 or channel2 (setting 0,1,2)
  to use this plugin with a Shelly EM.

## 1.0.0 (2021-06-11)

### Changes

* Bumped stable and tested release to major version 1.0.0
* Just added donation button ;)

## 0.1.3 (2021-04-21)

### Changes

* Added option to use the Power Factor (pf) when calculating Total Ampere.


## 0.1.2 (2021-04-10)

### Changes

* Added returned metered values to debug log.

