var inherits = require('util').inherits;
var Service, Characteristic;
var request = require('request');
var FakeGatoHistoryService = require('fakegato-history');
const version = require('./package.json').version;

module.exports = function (homebridge) {
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;
	Accessory = homebridge.platformAccessory;
	UUIDGen = homebridge.hap.uuid;
	var defaultFormats = {
		BOOL: 'bool',
		INT: 'int',
		FLOAT: 'float',
		STRING: 'string',
		UINT8: 'uint8',
		UINT16: 'uint16',
		UINT32: 'uint32',
		UINT64: 'uint64',
		DATA: 'data',
		TLV8: 'tlv8'
	};
	var defaultPerms = {
		READ: 'pr',
		WRITE: 'pw',
		NOTIFY: 'ev',
		HIDDEN: 'hd',
		ADDITIONAL_AUTHORIZATION: 'aa',
		TIMED_WRITE: 'tw',
		WRITE_RESPONSE: 'wr'
	};
	if (!Characteristic.Formats) {
		Characteristic.Formats = {};
	}
	Object.keys(defaultFormats).forEach(function (key) {
		if (!Characteristic.Formats[key]) {
			Characteristic.Formats[key] = defaultFormats[key];
		}
	});
	if (!Characteristic.Perms) {
		Characteristic.Perms = {};
	}
	Object.keys(defaultPerms).forEach(function (key) {
		if (!Characteristic.Perms[key]) {
			Characteristic.Perms[key] = defaultPerms[key];
		}
	});
	FakeGatoHistoryService = require('fakegato-history')(homebridge);
	homebridge.registerAccessory("homebridge-3em-energy-meter", "3EMEnergyMeter", EnergyMeter);
}

function EnergyMeter (log, config) {
	this.log = log;
	this.ip = config["ip"] || "127.0.0.1";
	this.url = "http://" + this.ip + "/status/emeters?";
	this.auth = config["auth"];
	this.name = config["name"];
	this.displayName = config["name"];
	this.timeout = config["timeout"] || 5000;
	this.http_method = "GET";
	this.update_interval = Number(config["update_interval"] || 10000);
	this.use_em = config["use_em"] || false;
	this.use_em_mode = config["use_em_mode"] || 0; 
	this.negative_handling_mode = config["negative_handling_mode"] || 0; 	
	this.use_pf = config["use_pf"] || false;
	this.enable_consumption = config.hasOwnProperty('enable_consumption') ? config['enable_consumption'] : true;
	this.enable_total_consumption = config.hasOwnProperty('enable_total_consumption') ? config['enable_total_consumption'] : true;
	this.enable_voltage = config.hasOwnProperty('enable_voltage') ? config['enable_voltage'] : true;
	this.enable_ampere = config.hasOwnProperty('enable_ampere') ? config['enable_ampere'] : true;
	this.debug_log = config["debug_log"] || false;
	this.serial = config.serial || "9000000";

	// hap enums (fallback für neue Homebridge-Versionen ohne statische Eigenschaften)
	const Formats = (Characteristic && Characteristic.Formats) ? Characteristic.Formats : {
		UINT16: 'uint16',
		FLOAT: 'float'
	};
	const Perms = (Characteristic && Characteristic.Perms) ? Characteristic.Perms : {
		READ: 'pr',
		NOTIFY: 'ev'
	};

	if (!Characteristic || !Characteristic.Formats || !Characteristic.Perms) {
		this.log && this.log('WARN: Homebridge Characteristic metadata missing. Using fallback constants.');
	}

	// internal variables
	this.waiting_response = false;
	this.powerConsumption = 0;
	this.totalPowerConsumption = 0;
	this.voltage1 = 0;
	this.ampere1 = 0;
	this.pf0 = 1;
	this.pf1 = 1;
	this.pf2 = 1;

	class EvePowerConsumption extends Characteristic {
		constructor() {
			super('Consumption', EvePowerConsumption.UUID);
			this.setProps({
				format: Formats.UINT16,
				unit: "Watts",
				maxValue: 100000,
				minValue: 0,
				minStep: 1,
				perms: [Perms.READ, Perms.NOTIFY]
			});
			this.value = this.getDefaultValue();
		}
	}
	EvePowerConsumption.UUID = 'E863F10D-079E-48FF-8F27-9C2605A29F52';

	class EveTotalConsumption extends Characteristic {
		constructor() {
			super('Energy', EveTotalConsumption.UUID);
			this.setProps({
				format: Formats.FLOAT,
				unit: 'kWh',
				maxValue: 1000000000,
				minValue: 0,
				minStep: 0.001,
				perms: [Perms.READ, Perms.NOTIFY]
			});
			this.value = this.getDefaultValue();
		}
	}
	EveTotalConsumption.UUID = 'E863F10C-079E-48FF-8F27-9C2605A29F52';

	class EveVoltage1 extends Characteristic {
		constructor() {
			super('Volt', EveVoltage1.UUID);
			this.setProps({
				format: Formats.FLOAT,
				unit: 'Volt',
				maxValue: 1000000000,
				minValue: 0,
				minStep: 0.001,
				perms: [Perms.READ, Perms.NOTIFY]
			});
			this.value = this.getDefaultValue();
		}
	}
	EveVoltage1.UUID = 'E863F10A-079E-48FF-8F27-9C2605A29F52';

	class EveAmpere1 extends Characteristic {
		constructor() {
			super('Ampere', EveAmpere1.UUID);
			this.setProps({
				format: Formats.FLOAT,
				unit: 'Ampere',
				maxValue: 1000000000,
				minValue: 0,
				minStep: 0.001,
				perms: [Perms.READ, Perms.NOTIFY]
			});
			this.value = this.getDefaultValue();
		}
	}
	EveAmpere1.UUID = 'E863F126-079E-48FF-8F27-9C2605A29F52';

	class PowerMeterService extends Service {
		constructor(displayName, subtype) {
			super(displayName, PowerMeterService.UUID, subtype);
			this.addOptionalCharacteristic(EvePowerConsumption);
			this.addOptionalCharacteristic(EveTotalConsumption);
			this.addOptionalCharacteristic(EveVoltage1);
			this.addOptionalCharacteristic(EveAmpere1);
		}
	}
	PowerMeterService.UUID = '00000001-0000-1777-8000-775D67EC4377';

	// local vars
	this._EvePowerConsumption = EvePowerConsumption;
	this._EveTotalConsumption = EveTotalConsumption;
	this._EveVoltage1 = EveVoltage1;
  this._EveAmpere1 = EveAmpere1;
	this._charPowerConsumption = null;
	this._charTotalConsumption = null;
	this._charVoltage1 = null;
	this._charAmpere1 = null;

  // info
  this.informationService = new Service.AccessoryInformation();
	this.informationService
			.setCharacteristic(Characteristic.Manufacturer, "Shelly - produdegr")
			.setCharacteristic(Characteristic.Model, "Shelly 3EM")
			.setCharacteristic(Characteristic.FirmwareRevision, version)
			.setCharacteristic(Characteristic.SerialNumber, this.serial);

	// construct service
	this.service = new PowerMeterService(this.name);
	if (this.enable_consumption) {
		this._charPowerConsumption = this.service.addCharacteristic(this._EvePowerConsumption);
		this._charPowerConsumption.on('get', this.getPowerConsumption.bind(this));
	}
	if (this.enable_total_consumption) {
		this._charTotalConsumption = this.service.addCharacteristic(this._EveTotalConsumption);
		this._charTotalConsumption.on('get', this.getTotalConsumption.bind(this));
	}
	if (this.enable_voltage) {
		this._charVoltage1 = this.service.addCharacteristic(this._EveVoltage1);
		this._charVoltage1.on('get', this.getVoltage1.bind(this));
	}
	if (this.enable_ampere) {
		this._charAmpere1 = this.service.addCharacteristic(this._EveAmpere1);
		this._charAmpere1.on('get', this.getAmpere1.bind(this));
	}

  // add fakegato
  this.historyService = new FakeGatoHistoryService("energy", this,{storage:'fs'});
}

EnergyMeter.prototype.updateState = function () {
	if (this.waiting_response) {
		this.log('Please select a higher update_interval value. Http command may not finish!');
		return;
	}
	this.waiting_response = true;
	this.last_value = new Promise((resolve, reject) => {
		var ops = {
			uri:		this.url,
			method:		this.http_method,
			timeout:	this.timeout
		};
		if (this.debug_log) { this.log('Requesting energy values from Shelly 3EM(EM) ...'); }
		if (this.auth) {
			ops.auth = {
				user: this.auth.user,
				pass: this.auth.pass
			};
		}
		request(ops, (error, res, body) => {
			var json = null;
			if (error) {
				this.log('Bad http response! (' + ops.uri + '): ' + error.message);
			}
			else {
				try {
					json = JSON.parse(body);
					
					if ((this.use_pf) && (this.use_em==false)) {
						this.pf0 = parseFloat(json.emeters[0].pf);
						this.pf1 = parseFloat(json.emeters[1].pf);
						this.pf2 = parseFloat(json.emeters[2].pf);
					}
					else {
						this.pf0 = 1;
						this.pf1 = 1;
						this.pf2 = 1;
					}
					
					if (this.use_em) {
						
						if (this.use_em_mode == 0) {
					   if (this.negative_handling_mode == 0) {
					   	this.powerConsumption = (parseFloat(json.emeters[0].power)+parseFloat(json.emeters[1].power));
					    this.totalPowerConsumption = ((parseFloat(json.emeters[0].total)+parseFloat(json.emeters[1].total))/1000);
					    this.voltage1 = (((parseFloat(json.emeters[0].voltage)+parseFloat(json.emeters[1].voltage))/2));
				    	this.ampere1 = ((this.powerConsumption/this.voltage1));
				    	if (this.powerConsumption < 0) { this.powerConsumption = 0 }
				    	if (this.totalPowerConsumption < 0) { this.totalPowerConsumption = 0 }
				    	if (this.voltage1 < 0) { this.voltage1 = 0 }
				    	if (this.ampere1 < 0) { this.ampere1 = 0 }
					  } else if (this.negative_handling_mode == 1) {
					    this.powerConsumption = Math.abs(parseFloat(json.emeters[0].power)+parseFloat(json.emeters[1].power));
					    this.totalPowerConsumption = Math.abs((parseFloat(json.emeters[0].total)+parseFloat(json.emeters[1].total))/1000);
					    this.voltage1 = Math.abs(((parseFloat(json.emeters[0].voltage)+parseFloat(json.emeters[1].voltage))/2));
				    	    this.ampere1 = Math.abs((this.powerConsumption/this.voltage1));
				    	}
						  	
					  } else
					  	{ if (this.use_em_mode == 1) {
					        if (this.negative_handling_mode == 0) {
					        this.powerConsumption = (parseFloat(json.emeters[0].power));
					        this.totalPowerConsumption = (parseFloat(json.emeters[0].total)/1000);
					        this.voltage1 = (parseFloat(json.emeters[0].voltage));
				        	this.ampere1 = ((this.powerConsumption/this.voltage1));
				    	    if (this.powerConsumption < 0) { this.powerConsumption = 0 }
				    	    if (this.totalPowerConsumption < 0) { this.totalPowerConsumption = 0 }
				    	    if (this.voltage1 < 0) { this.voltage1 = 0 }
				    	    if (this.ampere1 < 0) { this.ampere1 = 0 }
					        } else if (this.negative_handling_mode == 1) {
					        this.powerConsumption = Math.abs(parseFloat(json.emeters[0].power));
					        this.totalPowerConsumption = Math.abs(parseFloat(json.emeters[0].total)/1000);
					        this.voltage1 = Math.abs(parseFloat(json.emeters[0].voltage));
				        	this.ampere1 = Math.abs((this.powerConsumption/this.voltage1));
				      }
						  	
					    } else 
					      { if (this.use_em_mode == 2) {
					        if (this.negative_handling_mode == 0) {
					        this.powerConsumption = (parseFloat(json.emeters[1].power));
					        this.totalPowerConsumption = (parseFloat(json.emeters[1].total)/1000);
					        this.voltage1 = (parseFloat(json.emeters[1].voltage));
				          this.ampere1 = ((this.powerConsumption/this.voltage1));
				    	    if (this.powerConsumption < 0) { this.powerConsumption = 0 }
				    	    if (this.totalPowerConsumption < 0) { this.totalPowerConsumption = 0 }
				    	    if (this.voltage1 < 0) { this.voltage1 = 0 }
				    	    if (this.ampere1 < 0) { this.ampere1 = 0 }
					        } else if (this.negative_handling_mode == 1) {
					          this.powerConsumption = Math.abs(parseFloat(json.emeters[1].power));
					          this.totalPowerConsumption = Math.abs(parseFloat(json.emeters[1].total)/1000);
					          this.voltage1 = Math.abs(parseFloat(json.emeters[1].voltage));
				          	this.ampere1 = Math.abs((this.powerConsumption/this.voltage1));
				          	}
						  	
					        }
					        }	
					  	} 
						} 
						else {
						 			if (this.negative_handling_mode == 0) {
				           this.powerConsumption = (parseFloat(json.emeters[0].power)+parseFloat(json.emeters[1].power)+parseFloat(json.emeters[2].power));
				           this.totalPowerConsumption = ((parseFloat(json.emeters[0].total)+parseFloat(json.emeters[1].total)+parseFloat(json.emeters[2].total))/1000);
			             this.voltage1 = (((parseFloat(json.emeters[0].voltage)+parseFloat(json.emeters[1].voltage)+parseFloat(json.emeters[2].voltage))/3));
				           this.ampere1 = (((parseFloat(json.emeters[0].current)*this.pf0)
					          +(parseFloat(json.emeters[1].current)*this.pf1)
					          +(parseFloat(json.emeters[2].current)*this.pf2)));
				    	    if (this.powerConsumption < 0) { this.powerConsumption = 0 }
				    	    if (this.totalPowerConsumption < 0) { this.totalPowerConsumption = 0 }
				    	    if (this.voltage1 < 0) { this.voltage1 = 0 }
				    	    if (this.ampere1 < 0) { this.ampere1 = 0 }
					        } else if (this.negative_handling_mode == 1) {	
				             this.powerConsumption = Math.abs(parseFloat(json.emeters[0].power)+parseFloat(json.emeters[1].power)+parseFloat(json.emeters[2].power));
				             this.totalPowerConsumption = Math.abs((parseFloat(json.emeters[0].total)+parseFloat(json.emeters[1].total)+parseFloat(json.emeters[2].total))/1000);
			               this.voltage1 = Math.abs(((parseFloat(json.emeters[0].voltage)+parseFloat(json.emeters[1].voltage)+parseFloat(json.emeters[2].voltage))/3));
				             this.ampere1 = Math.abs(((parseFloat(json.emeters[0].current)*this.pf0)
					            +(parseFloat(json.emeters[1].current)*this.pf1)
					            +(parseFloat(json.emeters[2].current)*this.pf2)));
					          }
							
						}
							
							
					
					if (this.debug_log) { this.log('Successful http response. [ voltage: ' + this.voltage1.toFixed(0) + 'V, current: ' + this.ampere1.toFixed(1) + 'A, consumption: ' + this.powerConsumption.toFixed(0) + 'W, total consumption: ' + this.totalPowerConsumption.toFixed(2) + 'kWh ]'); }
				}
				catch (parseErr) {
					this.log('Error processing data: ' + parseErr.message);
					error = parseErr;
				}
			}
			if (!error) {
					resolve(this.powerConsumption,this.totalPowerConsumption,this.voltage1,this.ampere1)
			}
			else {
				reject(error);
			}
			this.waiting_response = false;
		});
	})
	.then((value_current, value_total, value_voltage1, value_ampere1) => {
		if (value_current != null && this._charPowerConsumption) {
				this._charPowerConsumption.setValue(value_current, undefined, undefined);
				if (this.enable_consumption) {
					this.historyService.addEntry({time: Math.round(new Date().valueOf() / 1000), power: value_current});
				}
		}
		if (value_total != null && this._charTotalConsumption) {
				this._charTotalConsumption.setValue(value_total, undefined, undefined);
		}
		if (value_voltage1 != null && this._charVoltage1) {
				this._charVoltage1.setValue(value_voltage1, undefined, undefined);
		}
		if (value_ampere1 != null && this._charAmpere1) {
				this._charAmpere1.setValue(value_ampere1, undefined, undefined);
		}
		return true;
	}, (error) => {
		return error;
	});
};

EnergyMeter.prototype.getPowerConsumption = function (callback) {
	callback(null, this.powerConsumption);
};

EnergyMeter.prototype.getTotalConsumption = function (callback) {
	callback(null, this.totalPowerConsumption);
};

EnergyMeter.prototype.getVoltage1 = function (callback) {
	callback(null, this.voltage1);
};

EnergyMeter.prototype.getAmpere1 = function (callback) {
	callback(null, this.ampere1);
};

EnergyMeter.prototype.getServices = function () {
	this.log("getServices: " + this.name);
	if (this.update_interval > 0) {
		this.timer = setInterval(this.updateState.bind(this), this.update_interval);
	}
	return [this.informationService, this.service, this.historyService];
};
