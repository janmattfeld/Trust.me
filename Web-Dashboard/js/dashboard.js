(function ($) {
    $(function () {
        initialize();
    }); // end of document ready
})(jQuery); // end of jQuery name space

var BANKING_THRESHOLD = 0.8;
var EMAIL_THRESHOLD = 0.6;
var TWITTER_THRESHOLD = 0.4;

var deviceKeyId;

function initialize() {
    deviceKeyId = getUrlParam("deviceKeyId");
    if (deviceKeyId == null) {
        deviceKeyId = "6202012634972160";
    }

    initializeChannel();
    initializeCharts();

    requestTrustLevels(deviceKeyId);

    //sendRandomTrustLevels();
}

function sendRandomTrustLevels() {
    window.setInterval(function () {
        var trustLevel = {};
        trustLevel.totalTrustLevel = (Math.random() * 0.8) + "";
        trustLevel.specificTrustLevel = (Math.random() * 0.8) + "";
        trustLevel.genericTrustLevel = (Math.random() * 0.8) + "";

        var message = {};
        message.data = JSON.stringify(trustLevel);

        onChannelMessage(message);
    }, 3000);
}

function initializeChannel() {
    try {
        if (channelToken == null || channelKey == null) {
            throw("Token or key is missing");
            return;
        }

        if (typeof goog === 'undefined') {
            throw("Google App Engine library not available");
        }

        channel = new goog.appengine.Channel(channelToken);
        console.log(channel);

        socket = channel.open();
        socket.onopen = onChannelOpened;
        socket.onmessage = onChannelMessage;
        socket.onerror = onChannelError;
        socket.onclose = onChannelClosed;

        console.log(socket);
    } catch (ex) {
        console.log("Unable to initialize channel API: " + ex);
        Materialize.toast("Channel setup failed", 3000);
    }
}

function onChannelOpened() {
    console.log("onChannelOpened");
    Materialize.toast("Channel connection opened", 3000);
}

function onChannelClosed() {
    console.log("onChannelClosed");
    Materialize.toast("Channel connection closed", 3000);
}

function onChannelMessage(message) {
    var data = JSON.parse(message.data);
    console.log("Channel received a message:");
    console.log(data);

    updateTotalTrustLevel(data.totalTrustLevel);
    updateSpecificTrustLevel(data.specificTrustLevel);
    updateGenericTrustLevel(data.genericTrustLevel);
}

function onChannelError(error) {
    console.log("onChannelError");
    console.log(error);
    Materialize.toast("Channel connection error", 3000);
}

function requestTrustLevels(deviceKeyId) {
    requestLineChartData(deviceKeyId);
    requestBinsChartData(deviceKeyId);
}

function requestLineChartData(deviceKeyId) {
    var name = "Total";

    var endDate = roundDate(new Date(), 1000 * 60);
    var endTimestamp = endDate.getTime();

    var startTimestamp = endTimestamp - (1000 * 60 * 60 * 6);
    var startDate = new Date(startTimestamp);

    dataRequest = API.getTrustLevels()
        .fromDevice(deviceKeyId)
        .withName(name)
        .since(startTimestamp)
        .until(endTimestamp);

    dataRequest.send().then(function (data) {
        console.log("Line chart data received:");
        console.log(data);

        var mappedTrustLevels = mapTrustLevelsToTimeRange(data.trustLevels, startTimestamp, endTimestamp, 24);


        lastUpdateTimestamp:1475381820000
        value:null
        valueCount
            :
            0
        valueSum
            :
            0


        console.log("Mapped Trust Levels:");
        console.log(mappedTrustLevels);
        var chartData = getChartDataFromTrustLevels(mappedTrustLevels);
        console.log(chartData);
        drawLineChart(chartData);
    }).catch(function (error) {
        console.log("Unable to get data");
        Materialize.toast("Failed to load data: " + error, 5000);
    });

    // update labels
    var rounding = 1000 * 60 * 10;
    var startText = formatToAmPm(roundDate(startDate, rounding));
    var endText = formatToAmPm(roundDate(endDate, rounding));

    var leftLabel = $("#graph-container").parent().find("#chart-label-left");
    var rightLabel = $("#graph-container").parent().find("#chart-label-right");

    leftLabel.text(startText);
    rightLabel.text(endText);
}

function requestBinsChartData(deviceKeyId, days, offset) {
    if (days == null) {
        days = 7;
    }

    if (offset == null) {
        offset = 0;
    }

    var name = "Total";
    var startTimestamp = getDayStartTimestamp(offset);
    var endTimestamp = getDayEndTimestamp(offset);

    var now = new Date();
    now.setMilliseconds(0);
    now.setSeconds(0);
    now = now.getTime();
    endTimestamp = Math.min(now, endTimestamp);

    dataRequest = API.getTrustLevels()
        .fromDevice(deviceKeyId)
        .withName(name)
        .since(startTimestamp)
        .until(endTimestamp);

    dataRequest.send().then(function (data) {
        console.log("Bins chart data received:");
        console.log(data);

        if (data == null || data.trustLevels == null || data.trustLevels.length < 1) {
            //throw "No trust levels received";
        }

        var mappedTrustLevels = mapTrustLevelsToTimeRange(data.trustLevels, getDayStartTimestamp(offset), getDayEndTimestamp(offset), 24);
        addBinsToChart(mappedTrustLevels);

        // request the previous day
        if (days > offset + 1) {
            requestBinsChartData(deviceKeyId, days, offset + 1);
        }
    }).catch(function (error) {
        console.log("Unable to get data");
        Materialize.toast("Failed to load data: " + error, 5000);
    });
}

function initializeCharts() {
    drawBinsChart();
    // TODO: update container height
}

function updateTotalTrustLevel(value) {
    updateIndicatorChart($("#total-container"), value);
}

function updateGenericTrustLevel(value) {
    updateIndicatorChart($("#generic-container"), value);
}

function updateSpecificTrustLevel(value) {
    updateIndicatorChart($("#specific-container"), value);
}

function updateIndicatorChart(container, value) {
    var percentagValue = getPercentageString(value).replace("%", "");
    var heading = container.find(".pie-value");
    heading.text(percentagValue);

    var pie = container.find(".pie");
    var left = pie.find(".left-side");
    var right = pie.find(".right-side");

    var deg = 360 * value;
    var leftRotation;
    var rightRotation;
    var pieRotation;
    var clip;

    if (deg < 180) {
        leftRotation = 0;
        rightRotation = deg;
        clip = "rect(0, 10em, 10em, 5em)";
    } else {
        leftRotation = deg;
        rightRotation = 180;
        clip = "rect(0, 10em, 10em, 0)";
    }

    pieRotation = 180 - (deg / 2);

    pie.css({
        "clip": clip,
        "-webkit-transform": "rotate(" + pieRotation + "deg)",
        "transform": "rotate(" + pieRotation + "deg)"
    });

    left.css({
        "-webkit-transform": "rotate(" + leftRotation + "deg)",
        "transform": "rotate(" + leftRotation + "deg)"
    });

    right.css({
        "-webkit-transform": "rotate(" + rightRotation + "deg)",
        "transform": "rotate(" + rightRotation + "deg)"
    });
}

function drawBinsChart() {
    $("#cards-container").empty();

    var ns = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(ns, "svg");
    svg.setAttributeNS(null, "width", "100%");
    svg.setAttributeNS(null, "height", "100%");
    //svg.setAttributeNS(null, "style", "border: 1px solid black");

    $("#cards-container").append(svg);
}

function addBinsToChart(mappedTrustLevels) {
    var svg = $("#cards-container").find("svg");
    var existingBins = svg.find("> g");
    var ns = "http://www.w3.org/2000/svg";

    // calculate needed dimens
    var margin = 1;
    var size = Math.floor(svg.width() / mappedTrustLevels.length) - (2 * margin);
    var whiteSpace = svg.width() - (mappedTrustLevels.length * (size + (2 * margin)));
    var horizontalOffset = Math.floor(whiteSpace / 2);
    var verticalOffset = existingBins.length * (size + (2 * margin));

    var textSize = 10;
    var horizontalTextOffset = (size / 2) - (textSize / 2) + 2;
    var verticalTextOffset = (size / 2) + (textSize / 2) - 2;

    // create a group that holds all rects
    var g = document.createElementNS(ns, "g");
    g.setAttributeNS(null, "transform", "translate(" + horizontalOffset + ", " + verticalOffset + ")");

    var setHoverEvents = function (element) {
        var indicator = $("#indicator-container");
        $(element).on("mouseover", function () {
            // update position
            indicator.css({
                top: event.clientY,
                left: event.clientX
            })

            // update text
            var timestamp = Number($(element).attr("data-timestamp"));
            var value = Number($(element).attr("data-trustlevel"));
            var text = getPercentageString(value) + "<br />" + formatToAmPm(new Date(timestamp));
            indicator.html(text);

            // show div
            indicator.fadeIn();
            indicator.attr("hide-scheduled", "false");
        }).on("mouseout", function () {
            // hide div after a timeout
            window.setTimeout(function () {
                if (indicator.attr("hide-scheduled") == "true") {
                    indicator.fadeOut();
                }
            }, 500);
            indicator.attr("hide-scheduled", "true");
        });
    }

    var appendCharToBin = function (content, div) {
        if (content == null || content.length < 1) {
            return;
        }
        var text = document.createElementNS(ns, "text");
        text.setAttributeNS(null, "class", "trustlevel-bin-label");
        text.setAttributeNS(null, "x", horizontalTextOffset);
        text.setAttributeNS(null, "y", verticalTextOffset);
        text.innerHTML = content;

        div.appendChild(text);
    }

    var startDate = new Date(mappedTrustLevels[0].lastUpdateTimestamp);
    //var label = getReadableDayFromDate(startDate).toUpperCase();
    var label = getWeekDayFromDate(startDate).substr(0, 3).toUpperCase();

    // add a rect for each trust level
    for (var i = 0; i < mappedTrustLevels.length; i++) {
        // caclulate a color indicator based on the trust level
        var color = getColorByTrustLevelValue(mappedTrustLevels[i].value);

        var group = document.createElementNS(ns, "g");
        //group.setAttributeNS(null, "width", size);
        //group.setAttributeNS(null, "height", size);
        group.setAttributeNS(null, "transform", "translate(" + i * (size + (2 * margin)) + ", 0)");

        // create a rect
        var rect = document.createElementNS(ns, "rect");
        rect.setAttributeNS(null, "class", "trustlevel-bin");
        rect.setAttributeNS(null, "width", size);
        rect.setAttributeNS(null, "height", size);
        // rect.setAttributeNS(null, "x", i * (size + (2 * margin)));
        rect.setAttributeNS(null, "fill", color);
        rect.setAttributeNS(null, "data-trustlevel", mappedTrustLevels[i].value != null ? mappedTrustLevels[i].value : 0);
        rect.setAttributeNS(null, "data-timestamp", mappedTrustLevels[i].lastUpdateTimestamp);

        // register event listeners
        setHoverEvents(rect);

        group.appendChild(rect);
        appendCharToBin(label.charAt(i), group);

        g.appendChild(group);
    }
    ;

    svg.append(g);
}

function drawLineChart(chartData) {
    var chartOptions = {
        showArea: false,
        fullWidth: true,
        showLine: true,
        showPoint: false,
        showLabel: false,
        lineSmooth: Chartist.Interpolation.cardinal({
            fillHoles: true,
            tension: 1
        }),
        axisX: {
            showGrid: false,
            showLabel: false,
            offset: 0
        },
        axisY: {
            showGrid: false,
            showLabel: false,
            offset: 0
        },
        chartPadding: 0,
        high: 1.1,
        low: -0.1
    }

    var chart = new Chartist.Line("#chart-container", chartData, chartOptions);

    var showLabels = function () {
        var labels = $("#chart-container").parent().find(".chart-label");
        labels.fadeIn();
    }

    chart.on("draw", function (data) {
        if (data.type === 'line') {
            data.element.animate({
                d: {
                    begin: 2000 * data.index,
                    dur: 2000,
                    from: data.path.clone().scale(1, 0).translate(0, data.chartRect.height()).stringify(),
                    to: data.path.clone().stringify(),
                    easing: Chartist.Svg.Easing.easeOutQuint
                }
            });

            data.element.attr({
                'style': 'stroke: #607D8B'
            });

            window.setTimeout(showLabels, 1000);
        }
    });
}

function mapTrustLevelsToTimeRange(trustLevels, startTimestamp, endTimestamp, intervals) {
    var mappedTrustLevels = [];

    var totalRange = endTimestamp - startTimestamp
    var intervalRange = totalRange / intervals;

    // add null objects
    for (var i = 0; i < intervals; i++) {
        var trustLevel = {};
        trustLevel.value = null;
        trustLevel.valueSum = 0;
        trustLevel.valueCount = 0;
        trustLevel.lastUpdateTimestamp = Math.round(startTimestamp + (i * intervalRange));

        if (trustLevel.lastUpdateTimestamp > 1475337600000 && trustLevel.lastUpdateTimestamp < 1475366400000) {
            trustLevel.value = 0.64;
        }

        if (trustLevel.lastUpdateTimestamp >= 1475386140000 && trustLevel.lastUpdateTimestamp <= 1475431200000) {
            var roundedTimestamp = Math.round(trustLevel.lastUpdateTimestamp / 60000) * 60000;
            console.log("rounded lastUpdateTimestamp: " + roundedTimestamp);

            switch (roundedTimestamp) {
                case 1475386560000:
                    trustLevel.value = 0.1;
                    break;
                case (1475387400000):
                    trustLevel.value = 0.31;
                    console.log("between lastUpdateTimestamp: " + trustLevel.lastUpdateTimestamp);
                    break;
                case (1475388300000):
                    trustLevel.value = 0.64;
                    console.log("between lastUpdateTimestamp: " + trustLevel.lastUpdateTimestamp);
                    break;
                case (1475389200000):
                    trustLevel.value = 0.64;
                    break;
                case (1475390100000):
                    trustLevel.value = 0.9;
                    break;
                case (1475391900000):
                    trustLevel.value = 0.8;
                    break;
                case (1475392800000):
                    trustLevel.value = 0.6;
                    break;
                case (1475393700000):
                    trustLevel.value = 0.4;
                    break;
                case (1475394600000):
                    trustLevel.value = 0;
                    break;
                case (1475395500000):
                    trustLevel.value = 0;
                    break;
                case (1475396400000):
                    trustLevel.value = 0;
                    break;
                case (1475397300000):
                    trustLevel.value = 0.8;
                    break;
                default:
                    trustLevel.value = 1.0;
            }

        }
        mappedTrustLevels.push(trustLevel);
    }

    // Fixed timestamps and values for past days since this a prototype
    var staticTimestampsSunday = [1475379120000, 1475380020000, 1475380920000, 1475381820000, 1475382720000, 1475383620000, 1475384520000,
        1475385420000, 1475386320000, 1475387220000, 1475388120000, 1475389020000, 1475389920000, 1475390820000, 1475391720000,
        1475392620000, 1475393520000, 1475394420000, 1475395320000, 1475396220000, 1475397120000, 1475398020000, 1475398920000, 1475399820000];

    var staticValues = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    /*    for (var i = 0; i < staticTimestamps.length; i++) {
     var trustLevel = {};
     trustLevel.value = staticValues[i];
     trustLevel.valueSum = 0;
     trustLevel.valueCount = 0;
     trustLevel.lastUpdateTimestamp = staticTimestamps[i];
     mappedTrustLevels.push(trustLevel);
     }*/


    var getIntervalIndexForTimestamp = function (timestamp) {
        return Math.floor((timestamp - startTimestamp) / intervalRange);
    }

    var addTrustLevelToInterval = function (trustLevel, intervalIndex) {
        mappedTrustLevels[intervalIndex].valueSum += trustLevels[i].value;
        mappedTrustLevels[intervalIndex].valueCount += 1;
    }

    if (trustLevels == null || trustLevels.length < 1) {
        return mappedTrustLevels;
    }

    // map all trustlevels
    for (var i = 0; i < trustLevels.length; i++) {
        var intervalIndex = getIntervalIndexForTimestamp(trustLevels[i].lastUpdateTimestamp);
        addTrustLevelToInterval(trustLevels[i], intervalIndex);
    }

    // compute average values
    var lastSetValue = null;
    for (var i = 0; i < intervals; i++) {
        if (mappedTrustLevels[i].valueCount > 0) {
            var average = mappedTrustLevels[i].valueSum / mappedTrustLevels[i].valueCount;
            mappedTrustLevels[i].value = average;
            lastSetValue = average;
        } else {
            if (lastSetValue == null) {
                // no other values available yet, start at 0
                mappedTrustLevels[i].value = 0;
            } else {
                // let chartist fill this value based on neighbors
                mappedTrustLevels[i].value = null;
            }
        }
    }

    return mappedTrustLevels;
}

function getChartDataFromTrustLevels(trustLevels) {
    var labels = [];
    var values = [];

    for (var i = 0; i < trustLevels.length; i++) {
        labels.push(trustLevels[i].lastUpdateTimestamp);
        values.push(Math.max(0, trustLevels[i].value));
    }

    var chartData = {
        labels: labels,
        series: [
            values
        ]
    };

    return chartData;
}

function getColorByTrustLevelValue(trustLevelValue) {
    if (trustLevelValue == null) {
        trustLevelValue = 0;
    }

    var maximumTrustLevel = 0.6;
    var minimumTrustLevel = 0.25;

    if (trustLevelValue < minimumTrustLevel) {
        var adjustedTrustLevel = 0;
    } else {
        var numerator = maximumTrustLevel / minimumTrustLevel;
        var denominator = (maximumTrustLevel - minimumTrustLevel) / minimumTrustLevel;
        var adjustedTrustLevel = (trustLevelValue - minimumTrustLevel) * (numerator / denominator);
    }

    adjustedTrustLevel = Math.max(0.1, adjustedTrustLevel);
    adjustedTrustLevel = Math.min(1, adjustedTrustLevel);

    var hue = 200;
    var saturation = 18;
    var lightness = 46;
    var alpha = adjustedTrustLevel;

    return color = "hsla(" + hue + ", " + saturation + "%, " + lightness + "%, " + alpha + ")";
}

function getDayStartTimestamp(offset) {
    if (offset == null) {
        offset = 0;
    }

    var date = new Date();
    date.setHours(0);
    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);

    var timestamp = date.getTime();
    timestamp -= 1000 * 60 * 60 * 24 * offset;
    return timestamp;
}

function getDayEndTimestamp(offset) {
    var timestamp = getDayStartTimestamp(offset);
    timestamp += 1000 * 60 * 60 * 24
    return timestamp;
}

function getPercentageString(trustLevelValue) {
    if (trustLevelValue == null) {
        trustLevelValue = 0;
    }
    return Math.round(trustLevelValue * 100) + "%";
}

function formatToAmPm(date) {
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    minutes = minutes < 10 ? '0' + minutes : minutes;
    var strTime = hours + ':' + minutes + ' ' + ampm;
    return strTime;
}

function roundDate(date, ms) {
    return new Date(Math.round(date.getTime() / ms) * ms);
}

function dateIsToday(date) {
    return date.setHours(0, 0, 0, 0) == (new Date()).setHours(0, 0, 0, 0);
}

function getReadableDayFromDate(date) {
    if (dateIsToday(date)) {
        return "Today";
    } else {
        return getWeekDayFromDate(date);
    }
}

function getWeekDayFromDate(date) {
    var weekday = new Array(7);
    weekday[0] = "Sunday";
    weekday[1] = "Monday";
    weekday[2] = "Tuesday";
    weekday[3] = "Wednesday";
    weekday[4] = "Thursday";
    weekday[5] = "Friday";
    weekday[6] = "Saturday";

    return weekday[date.getDay()];
}
