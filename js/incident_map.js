/* By Bo Ericsson, https://www.linkedin.com/in/boeric00/ */

/* eslint-disable no-console, no-restricted-globals, func-names, quotes, no-multi-spaces,
   prefer-template, no-script-url, prefer-arrow-callback, no-param-reassign, no-use-before-define,
   no-nested-ternary, max-len, no-shadow, no-multi-assign, no-plusplus, object-curly-newline
*/
/* global d3, crossfilter, L */

console.log("d3.version", d3.version);
console.log("crossfilter.version", crossfilter.version);

// variables
let chart;

// formats
const fmt = d3.format("02d");
const fmt1dec = d3.format(".1f");
const fmtM = d3.format(",d");

// ensure at least 700px height if running in an iframe (bl.ocks)
// http://bl.ocks.org/mbostock/1093025
d3.select(self.frameElement)
    .transition()
    .duration(500)
    .style("height", "600px");

// build the map
const mapId = "boeric.omod7h1p"; // dark map
L.mapbox.accessToken =
    "pk.eyJ1IjoiYm9lcmljIiwiYSI6IkZEU3BSTjQifQ.XDXwKy2vBdzFEjndnE4N7Q";
const map = L.mapbox.map("mapDiv", mapId).setView([33, -100], 4);

// create layer to hold shooting events
const shootingsLayer = L.geoJson(null, {
    pointToLayer: scaledPoint
}).addTo(map);

// helper functions to set map marker attributes

function pointColor(feature) {
    return feature.properties.Killed > 0 ? "red" : "orange";
}

function pointRadius(feature) {
    return Math.max(feature.properties.Killed * 2, 6);
}

function scaledPoint(feature, latlng) {
    // generate html for popup
    let html = "<div class='marker-title'>Shooting Event</div>";
    html += "<div class='marker-description'>";
    html += "School: " + feature.properties.School + "<br>";
    html += "Location: " + feature.properties.City + "<br>";
    html += "Date: " + feature.properties.displayDate + "<br>";
    html += "Killed: " + feature.properties.Killed + "<br>";
    html += "Wounded: " + feature.properties.Wounded + "<br>";

    // return the marker
    return L.circleMarker(latlng, {
        radius: pointRadius(feature),
        fillColor: pointColor(feature),
        fillOpacity: 0.7,
        weight: 0.5,
        color: "darkred"
    }).bindPopup(html);
}

// get reference to chart div
const chartDiv = d3.select(".chart");

// add a reset anchor element
chartDiv
    .select(".title")
    .append("a")
    .attr("href", "javascript:reset()")
    .attr("class", "reset")
    .text("Reset filter")
    .style("margin-left", "10px")
    .style("display", "none");

// get the data
d3.json("../data/maps.geojson", function (error, data) {
    // process the data
    data.features.forEach(function (d) {
        const c = d.properties.Date.split("/");
        const year = +c[2];
        const month = +c[1] - 1;
        const day = +c[0];
        const date = new Date(year, month, day);
        d.properties.displayDate = date.toString().substring(0, 16);
        d.properties.date = date;
        d.properties.month = d3.time.month(date);
    });

    // get extent (earliest/latest) dates
    const dateExtent = d3.extent(data.features, function (d) {
        return d.properties.date;
    });
    // add one month to extent
    dateExtent[1].setDate(dateExtent[1].getDate() + 31);

    // sort the features in date order
    data.features.sort(function (a, b) {
        if (a.properties.date > b.properties.date) return 1;
        if (a.properties.date < b.properties.date) return -1;
        return 0;
    });

    // init crossfilter
    const cf = crossfilter(data.features);

    // add date dimension
    const byMonthDate = cf.dimension(function (d) {
        return d.properties.month;
    });

    // create groups from the date dimension
    const countGroup = byMonthDate.group();
    const killedGroup = byMonthDate.group().reduceSum(function (d) {
        return d.properties.Killed;
    });
    const woundedGroup = byMonthDate.group().reduceSum(function (d) {
        return d.properties.Wounded;
    });

    const monthTracker = cf.dimension(function (d) {
        return d.properties.month;
    });
    const countTracker = monthTracker.group();

    // add event handlers to toggle data series view (based on the groups defined above)
    d3.selectAll("input[type=radio][name=view]").on("change", function () {
        const elem = d3.select(this);
        const value = elem.property("value");
        const group =
            value === "events" ?
            countGroup :
            value === "killed" ?
            killedGroup :
            woundedGroup;

        // rebuild the svg bar chart with the new data series
        chart
            .removeContents()
            .brushDirty(true)
            .group(group);

        // refresh viz
        renderAll();
    });

    // create the bar chart
    chart = barChart()
        .dimension(byMonthDate)
        .group(countGroup)
        .round(d3.time.month.round) // ensures whole month
        .x(
            d3.time
            .scale()
            .domain(dateExtent)
            .rangeRound([0, 5 * countGroup.all().length + 1])
        )
        .filter([new Date(2010, 0, 1), new Date(2015, 0, 1)])
        // .filter([new Date(2013, 1, 1), new Date(2013, 5, 1)])
        // .filter(null)
        .on("brush", function () {
            renderAll();
        })
        .on("brushend", function () {
            renderAll();
        })
        .enableBrush(true);

    // init animator
    const anim = animator()
        .speed(1000)
        .chart(chart)
        .container(d3.select(".animControls"));

    // start the animator
    anim(countGroup.all());
    // window.anim = anim; // uncomment this to get access to the animator object from the browser console

    // called at init, by the brush event handlers and by filter reset "a" elem
    function renderAll() {
        // run the chart function (these three are equivalent functionally)
        // d3.select(".chart").call(chart);
        chartDiv.call(chart);
        // chart(chartDiv)

        // get the filtered data
        const selected = byMonthDate.top(Infinity);

        // create geojson structure (needed for mapbox api)
        const geoJson = {
            type: "FeatureCollection",
            features: selected
        };

        // clear the shootings layer and add the new filtered data
        shootingsLayer.clearLayers().addData(geoJson);

        // update info window
        const totalEvents = selected.length;
        const groups = countTracker.all();
        const months = groups.reduce(function (p, v, i) {
            return groups[i].value > 0 ? p + 1 : p + 0;
        }, 0);

        const killedWoundedCount = selected.reduce(
            function (p, c, i) {
                return {
                    killed: selected[i].properties.Killed + p.killed,
                    wounded: selected[i].properties.Wounded + p.wounded
                };
            }, {
                killed: 0,
                wounded: 0
            }
        );
        const avgKilled = killedWoundedCount.killed / months;
        const avgWounded = killedWoundedCount.wounded / months;

        // create html for info window
        let html = "";
        html += "<table>";
        html +=
            "  <tr><td>Number of Months</td><td class='data'>" +
            months +
            "</td></tr>";
        html +=
            "  <tr><td>Total Shootings</td><td class='data'>" +
            fmtM(totalEvents) +
            "</td></tr>";
        html +=
            "  <tr class='killed'><td>Total Killed</td><td class='data'>" +
            fmtM(killedWoundedCount.killed) +
            "</td></tr>";
        html +=
            "  <tr class='wounded'><td>Total Wounded</td><td class='data'>" +
            fmtM(killedWoundedCount.wounded) +
            "</td></tr>";
        if (months !== 1) {
            html +=
                "  <tr class='killed'><td>Killed per month</td><td class='data'>" +
                fmt1dec(avgKilled) +
                "</td></tr>";
            html +=
                "  <tr class='wounded'><td>Wounded per month</td><td class='data'>" +
                fmt1dec(avgWounded) +
                "</td></tr>";
        }
        html += "</table>";

        // set the html
        d3.select(".infoDiv").html(html);
    }

    // initial render
    renderAll();

    // resets the month filter (driven by the bar chart brush)
    window.reset = function () {
        if (anim) anim.exit();
        chart.filter(null);
        renderAll();
    };

    // setup the bar chart (used to filter months)
    function barChart() {
        // TODO: remove this instance counter (in this viz, there is only one instance)
        if (!barChart.id) barChart.id = 0;

        let margin = {
            top: 10,
            right: 10,
            bottom: 20,
            left: 10
        };
        let x;
        let y = d3.scale.linear().range([69, 0]);
        const id = barChart.id++;
        const axis = d3.svg.axis().orient("bottom");
        const brush = d3.svg.brush();
        let brushDirty;
        let dimension;
        let group;
        let round;
        let gBrush;
        let enableBrush;
        let theDiv;

        // main bar chart function; will be called repeatedly by renderAll
        function chart(div) {
            // determine dimensions of svg
            const width = x.range()[1];
            const height = y.range()[0];

            // update y scale domain
            y.domain([0, group.top(1)[0].value]); // set y domain to max value in this group

            // TODO: inefficient code; div is an array of one
            div.each(function () {
                const div = (theDiv = d3.select(this));
                let g = div.select("g");

                // if g is empty, reubild the svg
                if (g.empty()) {
                    // create svg and group
                    g = div
                        .append("svg")
                        .attr("width", width + margin.left + margin.right)
                        .attr("height", height + margin.top + margin.bottom)
                        .append("g")
                        .attr(
                            "transform",
                            "translate(" + margin.left + "," + margin.top + ")"
                        )
                        .on("click", function () {
                            // exit the animator
                            if (anim) anim.exit();
                            // TODO: need to handle the case of mouse drag as well...
                        });

                    // reset the clip path to full width
                    g.append("clipPath")
                        .attr("id", "clip-" + id)
                        .append("rect")
                        .attr("width", width)
                        .attr("height", height);

                    // generate two paths, one background, one foreground
                    g.selectAll(".bar")
                        .data(["background", "foreground"])
                        .enter()
                        .append("path")
                        .attr("class", function (d) {
                            return d + " bar";
                        })
                        // assign all the data in the group to the path
                        .datum(group.all());

                    // assign the clip path to the foreground bars
                    g.selectAll(".foreground.bar").attr(
                        "clip-path",
                        "url(#clip-" + id + ")"
                    );

                    // Initialize the brush component with pretty resize handles.
                    if (enableBrush) {
                        gBrush = g
                            .append("g")
                            .attr("class", "brush")
                            .call(brush);
                        gBrush.selectAll("rect").attr("height", height);
                        gBrush
                            .selectAll(".resize")
                            .append("path")
                            .attr("d", resizePath);
                    }

                    // add the x-axis last (so it's drawn on top of brush)
                    g.append("g")
                        .attr("class", "axis")
                        .attr("transform", "translate(0," + height + ")")
                        .call(axis);
                }

                // Only redraw the brush if set externally.
                // at init, the date chart has an externally set brush
                if (brushDirty) {
                    brushDirty = false;
                    g.selectAll(".brush").call(brush);
                    div
                        .select(".title a")
                        .style("display", brush.empty() ? "none" : null);

                    if (brush.empty()) {

                        g.selectAll("#clip-" + id + " rect")
                            .attr("x", 0)
                            .attr("width", width);
                    } else {

                        const extent = brush.extent();
                        g.selectAll("#clip-" + id + " rect")
                            .attr("x", x(extent[0]))
                            .attr("width", x(extent[1]) - x(extent[0]));
                    }
                }

                // set the d attribute on the path
                g.selectAll(".bar").attr("d", barPath);
            });

            // generate the bar chart path item
            function barPath(groups) {
                const path = [];
                let i = -1;
                const n = groups.length;
                let d;

                while (++i < n) {
                    d = groups[i];
                    path.push("M", x(d.key), ",", height, "V", y(d.value), "h4V", height);
                }
                return path.join("");
            }

            // generate pretty brush left and right "handles"
            function resizePath(d) {
                const e = +(d === "e");
                const x = e ? 1 : -1;
                const y = height / 3;

                return (
                    "M" +
                    0.5 * x +
                    "," +
                    y +
                    "A6,6 0 0 " +
                    e +
                    " " +
                    6.5 * x +
                    "," +
                    (y + 6) +
                    "V" +
                    (2 * y - 6) +
                    "A6,6 0 0 " +
                    e +
                    " " +
                    0.5 * x +
                    "," +
                    2 * y +
                    "Z" +
                    "M" +
                    2.5 * x +
                    "," +
                    (y + 8) +
                    "V" +
                    (2 * y - 8) +
                    "M" +
                    4.5 * x +
                    "," +
                    (y + 8) +
                    "V" +
                    (2 * y - 8)
                );
            }
        }

        // brush handlers
        brush.on("brushstart.chart", function () {
            // get the containing div
            const div = d3.select(this.parentNode.parentNode.parentNode);
            // remove the display property from the reset anchor elem
            div.select(".title a").style("display", null);
        });

        brush.on("brush.chart", function () {
            const g = d3.select(this.parentNode);
            let extent = brush.extent();

            // handle rounding of extent (only integers)
            if (round) {
                g.select(".brush")
                    .call(brush.extent((extent = extent.map(round)))) // set a rounded brush extent
                    .selectAll(".resize")
                    .style("display", null); // remove the resize handles (why?)
            }

            // update clip rectangle
            g.select("#clip-" + id + " rect")
                .attr("x", x(extent[0]))
                .attr("width", x(extent[1]) - x(extent[0]));

            // update the filter
            dimension.filterRange(extent);
        });

        brush.on("brushend.chart", function () {
            if (brush.empty()) {

                emptyBrush.call(this);
            }
        });

        // function to sync UI and crossfilter to an empty brush
        function emptyBrush() {
            console.log("emptyBrush", this);

            if (!brush.empty()) {
                console.error("brush not empty");
                return;
            }

            // get reference to containing div
            const div = d3.select(this.parentNode.parentNode.parentNode);

            // hide the reset anchor element
            div.select(".title a").style("display", "none");

            // remove the clip rectangle
            div
                .select("#clip-" + id + " rect")
                .attr("x", null) // remove the x attribute which will render the clipRect invalid
                .attr("width", "100%");

            // reset the filter
            dimension.filterAll();
        }

        // chart configuration functions
        chart.margin = function (_) {
            if (!arguments.length) return margin;
            margin = _;
            return chart;
        };
        chart.x = function (_) {
            if (!arguments.length) return x;
            x = _;
            axis.scale(x);
            brush.x(x);
            return chart;
        };
        chart.y = function (_) {
            if (!arguments.length) return y;
            y = _;
            return chart;
        };
        chart.dimension = function (_) {
            // console.log("chart.dimension..." + _)
            if (!arguments.length) return dimension;
            dimension = _;
            return chart;
        };
        chart.filter = function (_) {
            if (_) {
                brush.extent(_);
                dimension.filterRange(_);
            } else {
                brush.clear();
                dimension.filterAll();
            }
            brushDirty = true;
            return chart;
        };
        chart.group = function (_) {
            if (!arguments.length) return group;
            group = _;
            return chart;
        };
        chart.round = function (_) {
            if (!arguments.length) return round;
            round = _;
            return chart;
        };
        chart.removeContents = function () {
            theDiv.selectAll("svg").remove();
            // theDiv.selectAll("a").remove();
            // console.log("theDiv", theDiv)
            return chart;
        };
        chart.brushDirty = function (_) {
            if (!arguments.length) return brushDirty;
            brushDirty = _;
            return chart;
        };
        chart.enableBrush = function (_) {
            if (!arguments.length) return enableBrush;
            enableBrush = _;
            return chart;
        };
        chart.clearBrush = function () {
            // console.log("---", d3.select(".brush"))
            d3.select(".brush").call(brush.clear());
            emptyBrush.call(d3.select(".brush").node());
            return chart;
        };
        chart.brushExtent = function (_) {
            if (!arguments.length) return brush.extent();
            // console.log("setting brush extent...", _, "current", brush.extent())
            brush.extent(_);
            d3.select(".brush").call(brush);
            brush.event(d3.select(".brush"));
            return chart;
        };

        // copy "on" event handlers from "brush" to "chart"
        return d3.rebind(chart, brush, "on");
    }
});

// animator object/function
function animator() {
    let speed = 1000;
    let currPos = 0;
    let animating = false;
    let data;
    let ready = false;
    let inTimeout = false;
    let chart;
    let container;

    function main(_) {
        data = _;
        if (data.length > 0) ready = true;

        // data good?
        if (!ready) {
            console.error("bad data");
            return;
        }

        // container good?
        if (!container) {
            console.error("No animation control container provided");
            return;
        }

        // event handlers
        function startStop() {
            this.blur();
            const elem = d3.select(this);
            const value = elem.attr("value");

            // console.log("startStop...", this, value)
            if (value === "start") {
                // start the animation...
                main.resume();
                // change this button text
                elem.text("Exit Animation").attr("value", "stop");
                // show buttons
                d3.selectAll(".anim2").style("display", "inline-block");
                d3.selectAll(".anim4").style("display", "inline-block");
            } else {
                // stop the animation
                main.stop();
                // change this button text
                elem.text("Start Animation").attr("value", "start");
                // hide buttons
                d3.selectAll(".anim").style("display", "none");
                // ensure the halt/resume button says halt
                d3.select(".anim2")
                    .text("Halt")
                    .attr("value", "halt");
            }
        }

        function haltResume() {
            this.blur();
            const elem = d3.select(this);
            const value = elem.attr("value");
            // console.log("haltResume...", this, value)

            if (value === "halt") {
                // halt the animation
                main.stop();
                // change this button text
                elem.text("Resume").attr("value", "resume");
                // hide buttons
                d3.selectAll(".anim4").style("display", "none");
                // show buttons
                d3.selectAll(".anim3").style("display", "inline-block");
            } else {
                // resume the animation
                main.resume();
                // change this button text
                elem.text("Halt").attr("value", "halt");
                // hide buttons
                d3.selectAll(".anim3").style("display", "none");
                // show buttons
                d3.selectAll(".anim4").style("display", "inline-block");
            }
        }

        function fasterSlower() {
            this.blur();
            const elem = d3.select(this);
            const value = elem.attr("value");
            // console.log("fasterSlower...", this, value)
            if (value === "faster") main.faster();
            else main.slower();
        }

        function forwardBackward() {
            this.blur();
            const elem = d3.select(this);
            const value = elem.attr("value");
            // console.log("forwardBackward...", this, value, this.value)
            if (value === "forward") main.forward();
            else main.backward();
        }

        function reset() {
            this.blur();
            main.reset();
        }

        // animation controls
        const controls = [
            {
                text: "Start Animation",
                handler: startStop,
                id: "startStop",
                display: "inline-block",
                value: "start",
                class: "anim1",
                width: "110px"
      },
            {
                text: "Halt",
                handler: haltResume,
                display: "none",
                value: "halt",
                class: "anim anim2",
                width: "60px"
      },
            {
                text: "Backward",
                handler: forwardBackward,
                display: "none",
                value: "backward",
                class: "anim anim3"
      },
            {
                text: "Forward",
                handler: forwardBackward,
                display: "none",
                value: "forward",
                class: "anim anim3"
      },
            {
                text: "Faster",
                handler: fasterSlower,
                display: "none",
                value: "faster",
                class: "anim anim4"
      },
            {
                text: "Slower",
                handler: fasterSlower,
                display: "none",
                value: "slower",
                class: "anim anim4"
      },
            {
                text: "Reset",
                handler: reset,
                display: "none",
                class: "anim anim3 anim4"
      }
    ];

        container
            .selectAll("button")
            .data(controls)
            .enter()
            .append("button")
            .attr("id", function (d) {
                return d.id ? "anim_" + d.id : null;
            })
            .style("display", "inline-block")
            .style("cursor", "default")
            .style("width", function (d) {
                return d.width ? d.width : "70px";
            })
            .style("text-align", "center")
            .attr("class", function (d) {
                return d.class;
            })
            .style("display", function (d) {
                /* return "inline-block"; */
                return d.display;
            })
            .attr("value", function (d) {
                return d.value ? d.value : null;
            })
            // .attr("class", "reset")
            .text(function (d) {
                return d.text;
            })
            .on("click", function (d) {
                /* console.log("adfads", d.handler); */
                d.handler.call(this);
            });

        // set index
        currPos = data.length - 1;

        setInterval(function () {
            if (animating && !inTimeout) go(0);
        }, 100);

        function go(useSpeed) {
            inTimeout = true;
            setTimeout(function () {
                if (animating) {
                    currPos++;
                    if (currPos === data.length) currPos = 0;
                    oneCycle();
                }
                if (animating) go(speed);
                else inTimeout = false;
            }, useSpeed);
        }
    }

    function oneCycle() {
        // console.log("oneCycle")
        const dateExtent = [];
        dateExtent[0] = new Date(data[currPos].key);
        dateExtent[1] = new Date(data[currPos].key);
        dateExtent[1].setDate(dateExtent[1].getDate() + 31);
        chart.brushExtent(dateExtent);
    }

    // action functions
    main.reset = function () {
        speed = 1000;
        currPos = 0;
        oneCycle();
        // animating = false;
    };
    main.resume = function () {
        animating = true;
    };
    main.stop = function () {
        animating = false;
    };
    main.exit = function () {
        animating = false;
        // change this button text
        d3.select("#anim_startStop")
            .text("Start Animation")
            .attr("value", "start");
        // hide buttons
        d3.selectAll(".anim").style("display", "none");
        // ensure the halt/resume button says halt
        d3.select(".anim2")
            .text("Halt")
            .attr("value", "halt");
    };
    main.slower = function () {
        speed = Math.min(4000, speed * 2);
    };
    main.faster = function () {
        speed = Math.max(250, speed / 2);
    };
    main.forward = function () {
        if (ready && !animating) {
            currPos++;
            if (currPos === data.length) currPos = 0;
            oneCycle();
        } else console.log("not ready");
    };
    main.backward = function () {
        if (ready && !animating) {
            currPos--;
            if (currPos < 0) currPos = data.length - 1;
            oneCycle();
        } else console.log("not ready");
    };

    // configuration functions
    main.speed = function (_) {
        if (!arguments.length) return speed;
        speed = _;
        return main;
    };
    main.chart = function (_) {
        if (!arguments.length) return chart;
        chart = _;
        return main;
    };
    main.container = function (_) {
        if (!arguments.length) return container;
        container = _;
        return main;
    };

    return main;
} // end animator
