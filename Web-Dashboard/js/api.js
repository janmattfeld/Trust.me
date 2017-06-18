var API = function(){

	var API_VERSION = 1;
	var USE_LOCAL_DEV_SERVER = true;

	var api = {
		lastRequestTimestamp: -1,
	};

	function log(message) {
		console.log("SDL API: " + message);
	}

	api.getRootEndpoint = function() {
		var baseUrl = location.protocol + "//" + location.hostname + (location.port && ":" + location.port) + "";
		var requestUrl;
		if (USE_LOCAL_DEV_SERVER && baseUrl.indexOf("localhost") > -1) {
			requestUrl = baseUrl + "/_ah/api/logger/v" + API_VERSION + "/";
		} else {
			requestUrl = "https://sensor-data-logger.appspot.com/_ah/api/logger/v" + API_VERSION + "/";
		}
		return requestUrl;
	}

	api.request = function(endpoint) {
		var request = {};

		request.endpoint = endpoint;

		request.addParameters = function(params) {
			for (var i = 0; i < params.length; i++) {
				request.addParameter(params[i]);
			}
			return request;
		}

		request.addParameter = function(key, value) {
			if (request.params == null) {
				request.params = [];
			}

			// type-check the passed argument
			var param;
			if (typeof key == 'string') {
				param = [key, value];
			} else {
				param = key;
			}

			// make sure that key & value are not null
			if (param == null || param[0] == null || param[1] == null) {
				return request;
			}

			// avoid dublicate keys
			for (var i = 0; i < request.params.length; i++) {
				if (request.params[i][0] == param[0]) {
					//log("Overwriting dublicate parameter: " + request.params[i][0]);
					request.params.splice(i, 1);
				}
			}

			request.params.push(param);
			return request;
		}

		request.setInterval = function(intervalTimeout) {
			request.intervalTimeout = intervalTimeout;
			if (request.intervalTimeout != null ) {
				log("Scheduling request with interval: " + request.intervalTimeout + " at " + request.endpoint);
				request.interval = window.setInterval(request.send, request.intervalTimeout);
			}
			return request;
		}

		request.clearInterval = function() {
			if (request.interval != null ) {
				log("Clearing interval at: " + request.endpoint);
				window.clearInterval(request.interval);
			}
			return request;
		}

		request.onSuccess = function(callback) {
			request.onSuccessCallback = callback;
			return request;
		}

		request.onError = function(callback) {
			request.onErrorCallback = callback;
			return request;
		}

		request.buildRequestUrl = function() {
			var requestUrl = api.getRootEndpoint() + request.endpoint;
			if (request.params) {
				requestUrl += "?";
				for (var i = 0; i < request.params.length; i++) {
					requestUrl += request.params[i][0] + "=" + encodeURIComponent(request.params[i][1]) + "&";
				}
				requestUrl = requestUrl.substring(0, requestUrl.length - 1);
			}
			return requestUrl;
		}

		request.send = function() {
			request.url = request.buildRequestUrl();
			return api.sendRequest(request);
		}

		request.post = function(data) {
			request.url = request.buildRequestUrl();
			request.postData = data;
			return api.sendPostRequest(request);
		}

		request.reload = function() {
			if (request.data != null && request.onSuccessCallback != null) {
				request.onSuccessCallback(request.data);
				return request;
			} else {
				return request.send();
			}
		}
		
		return request;
	}

	api.sendRequest = function(request) {
		var promise = new Promise(function(resolve, reject) {
			if (request.completed != null && !request.completed) {
				reject("Previous request has not completed yet.");
				return;
			}
			$.ajax({
				url : request.url,
				type : 'GET',
				data : {},
				dataType : 'json',
				beforeSend : function(xhr) {
					log("Requesting: " + request.url);
					request.completed = false;
					lastRequestTimestamp = (new Date()).getTime();
					// xhr.setRequestHeader("key", "value");
				},
				success : function(data) {
					request.data = data;
					if (request.onSuccessCallback != null) {
						request.onSuccessCallback(data);
					}
					resolve(data);
				},
				error : function(error) {
					request.error = error;
					log(error);
					if (request.onErrorCallback != null) {
						request.onErrorCallback(error);
					}
					reject(error);
				},
				complete : function (){
					request.completed = true;
				}
			});
		});
		return promise;
	}

	api.sendPostRequest = function(request) {
		var promise = new Promise(function(resolve, reject) {
			if (request.completed != null && !request.completed) {
				reject("Previous request has not completed yet.");
				return;
			}
			$.ajax({
				url : request.url,
				type : "POST",
				data : request.postData,
				processData: false,
				contentType: "application/json; charset=utf-8",
				dataType : "json",
				beforeSend : function(xhr) {
					log("Requesting: " + request.url + " with data:");
					console.log(request.postData);
					request.completed = false;
					lastRequestTimestamp = (new Date()).getTime();
					// xhr.setRequestHeader("key", "value");
				},
				success : function(data) {
					request.data = data;
					if (request.onSuccessCallback != null) {
						request.onSuccessCallback(data);
					}
					resolve(data);
				},
				error : function(error) {
					request.error = error;
					log(error);
					if (request.onErrorCallback != null) {
						request.onErrorCallback(error);
					}
					reject(error);
				},
				complete : function (){
					request.completed = true;
				}
			});
		});
		return promise;
	}

	api.getUser = function(userKeyId) {
		var request = api.request("user/get/");

		request.addParameter("userKeyId", userKeyId);

		request.withKeyId = function(userKeyId) {
			request.addParameter("userKeyId", userKeyId);
			return request;
		}

		return request;
	}

	api.getAllUsers = function() {
		var request = api.request("user/get/all/");
		return request;
	}

	api.getDataSets = function(sensorType, includeEntries, startTimestamp, endTimestamp) {
		var request = api.request("dataset/get/");

		// add default params
		request.addParameter("includeEntries", "false");
		request.addParameter("startTimestamp", 0);
		request.addParameter("endTimestamp", new Date());

		// overwrite params with passed arguments (may be null)
		request.addParameter("sensorType", sensorType);
		request.addParameter("includeEntries", includeEntries ? "true" : "false");
		request.addParameter("startTimestamp", startTimestamp);
		request.addParameter("endTimestamp", endTimestamp);

		request.fromSensor = function(sensorType) {
			request.addParameter("sensorType", sensorType);
			return request;
		}

		request.since = function(startDate) {
			if (startDate instanceof Date) {
				request.startTimestamp = startDate.getTime();
			} else {
				request.startTimestamp = startDate;
			}
			request.addParameter("startTimestamp", request.startTimestamp);
			return request;
		}

		request.until = function(endDate) {
			if (endDate instanceof Date) {
				request.endTimestamp = endDate.getTime();
			} else {
				request.endTimestamp = endDate;
			}
			request.addParameter("endTimestamp", request.endTimestamp);
			return request;
		}

		request.withEntries = function() {
			request.addParameter("includeEntries", "true");
			return request;
		}

		request.withoutEntries = function() {
			request.addParameter("includeEntries", "false");
			return request;
		}
		
		return request;
	}

	api.getTrustLevels = function(deviceKeyId, name, startTimestamp, endTimestamp) {
		var request = api.request("trustlevel/get/");

		// add default params
		request.addParameter("name", "Total");
		request.addParameter("startTimestamp", 0);
		request.addParameter("endTimestamp", new Date());

		// overwrite params with passed arguments (may be null)
		request.addParameter("deviceKeyId", deviceKeyId);
		request.addParameter("startTimestamp", startTimestamp);
		request.addParameter("endTimestamp", endTimestamp);

		request.fromDevice = function(deviceKeyId) {
			request.addParameter("deviceKeyId", deviceKeyId);
			return request;
		}

		request.since = function(startDate) {
			if (startDate instanceof Date) {
				request.startTimestamp = startDate.getTime();
			} else {
				request.startTimestamp = startDate;
			}
			request.addParameter("startTimestamp", request.startTimestamp);
			return request;
		}

		request.until = function(endDate) {
			if (endDate instanceof Date) {
				request.endTimestamp = endDate.getTime();
			} else {
				request.endTimestamp = endDate;
			}
			request.addParameter("endTimestamp", request.endTimestamp);
			return request;
		}

		request.withName = function(name) {
			request.addParameter("name", name);
			return request;
		}
		
		return request;
	}

	api.updateTrustLevels = function() {
		var request = api.request("trustlevel/update/");
		return request;
	}

	api.updateDashboard = function() {
		var request = api.request("dashboard/update/");
		return request;
	}

	return api;
}();