// set the height and width of the map svg
var width = 960,
    height = 500;

// set the projection

// create an empty dataset variable
var dataset;

// load the data

// now build a bar graph to look at shootings based on time of year

// set dimensions of svg

var marginBar = {
        top: 20,
        right: 20,
        bottom: 30,
        left: 50
    },
    widthBar = 1200 - marginBar.left - marginBar.right,
    heightBar = 350 - marginBar.top - marginBar.bottom;

// set a variable to parse the date for both days (parseDay) and months (parseMonth)
var parseDay = d3.time.format("%d-%b-%y").parse;
var parseMonth = d3.time.format("%Y-%m").parse;

// set the scales
var xScaleBar = d3.time.scale().range([0, widthBar]);

var yScaleBar = d3.scale.linear().range([heightBar, 0]);

var week_day = d3.time.format('%a, %b %Y');
var day_tip = d3.tip()
    .attr('class', 'd3-tip')
    .offset([-10, 0])
    .html(function (d) {
        return "<span style='color:red'>" + week_day(d.date) + "<br><strong>Killed: </strong>" +
            d.count + "</span>";
    });

// add the svg
var svgBar = d3
    .select("#bar-chart")
    .append("svg")
    .attr("width", widthBar + marginBar.left + marginBar.right)
    .attr("height", heightBar + marginBar.top + marginBar.bottom)
    .append("g")
    .attr("transform", "translate(" + marginBar.left + "," + marginBar.top + ")");

svgBar.call(day_tip);

// load the data
d3.csv("data/by_day.csv", function (error, data) {
    if (error) throw error;
    console.log(data);

    // format the date
    data.forEach(function (d) {
        d.date = parseDay(d.date);
        d.count = +d.count;
    });

    // scale the domain of the data
    xScaleBar.domain(
        d3.extent(data, function (d) {
            return d.date;
        })
    );
    yScaleBar.domain([
    0,
    d3.max(data, function (d) {
            return d.count;
        })
  ]);

    // set the colors of the bars based on height
    var barColors = [
    "#f2f0f7",
    "#dadaeb",
    "#bcbddc",
    "#9e9ac8",
    "#756bb1",
    "#54278f"
  ];

    // add the bars
    svgBar
        .selectAll("rect")
        .data(data)
        .enter()
        .append("rect")
        .attr("x", function (d) {
            return xScaleBar(d.date);
        })
        .attr("width", widthBar / data.length)
        .attr("y", function (d) {
            return yScaleBar(d.count);
        })
        .attr("height", function (d) {
            return heightBar - yScaleBar(d.count);
        })
        .attr("fill", function (d) {
            if (d.count < 2) {
                return "#ee8679";
            } else if (d.count < 4) {
                return "#ee5d44";
            } else if (d.count < 6) {
                return "#ee4c31";
            } else {
                return "#95160b";
            }
        })
        .on('mouseover', day_tip.show)
        .on('mouseout', day_tip.hide);

    // add the x axis
    svgBar
        .append("g")
        .attr("transform", "translate(0," + heightBar + ")")
        .call(d3.svg.axis().scale(xScaleBar).orient("bottom").tickSize([3]))
        .attr("text-anchor", "start")
        .attr("class", "xaxis");

    // add the y axis
    svgBar
        .append("g")
        .call(d3.svg.axis().scale(yScaleBar).orient("left").tickSize([3]))
        .attr("text-anchor", "end")
        .attr("class", "yaxis");

    svgBar.call(day_tip);
});

// transition the bar on button click
d3.select("#button-month").on("click", function () {
    var month = d3.time.format('%b, %Y');
    var month_tip = d3.tip()
        .attr('class', 'd3-tip')
        .offset([-10, 0])
        .html(function (d) {
            return "<span style='color:red'>" + month(d.date) + "<br><strong>Killed: </strong>" +
                d.count + "</span>";
        });

    // start by applying the new class to the day button
    $("#button-day")
        .removeClass("button-active-date")
        .addClass("button-inactive-date");

    // update the dataset
    d3.csv("data/by_month.csv", function (error, data) {
        if (error) throw error;

        // format the date
        data.forEach(function (d) {
            d.date = parseMonth(d.date);
            d.count = +d.count;
        });

        console.log(data);

        // update the scale domains
        xScaleBar.domain(
            d3.extent(data, function (d) {
                return d.date;
            })
        );
        yScaleBar.domain([
      0,
      d3.max(data, function (d) {
                return d.count;
            })
    ]);

        // select all the bars and bind the data
        var bars = svgBar.selectAll("rect").data(data);

        // get rid of unnecessary bars
        bars
            .exit()
            .transition()
            .duration(1000)
            .attr("height", 0)
            .remove();

        // transition the data
        bars
            .transition()
            .duration(2000)
            .delay(function (d, i) {
                return i * 50 + 300;
            })
            .attr("x", function (d) {
                return xScaleBar(d.date);
            })
            .attr("width", widthBar / data.length)
            .attr("y", function (d) {
                return yScaleBar(d.count);
            })
            .attr("height", function (d) {
                return heightBar - yScaleBar(d.count);
            })
            .attr("fill", function (d) {
                if (d.count < 5) {
                    return "#ee8679";
                } else if (d.count < 13) {
                    return "#ee5d44";
                } else if (d.count < 20) {
                    return "#ee4c31";
                } else {
                    return "#95160b";
                }
            });

        bars
            .on('mouseover', month_tip.show)
            .on('mouseout', month_tip.hide);

        // update the axes
        d3.select(".xaxis")
            .transition()
            .duration(2000)
            .call(d3.svg.axis().scale(xScaleBar).orient("bottom").tickSize([3]));

        d3.select(".yaxis")
            .transition()
            .duration(2000)
            .call(d3.svg.axis().scale(yScaleBar).orient("left").tickSize([3]));

        svgBar.call(month_tip);
    });


});

// reset the bar chart
d3.select("#button-day").on("click", function () {
    // start by applying the new class to the day button
    $("#button-month")
        .removeClass("button-active-date")
        .addClass("button-inactive-date");


    // update the dataset
    d3.csv("data/by_day.csv", function (error, data) {
        if (error) throw error;

        // format the date
        data.forEach(function (d) {
            d.date = parseDay(d.date);
            d.count = +d.count;
        });

        // update the scale domains
        xScaleBar.domain(
            d3.extent(data, function (d) {
                return d.date;
            })
        );
        yScaleBar.domain([
      0,
      d3.max(data, function (d) {
                return d.count;
            })
    ]);

        // select all the bars and bind the data
        var bars = svgBar.selectAll("rect").data(data);

        // update the bars
        bars
            .transition()
            .delay(function (d, i) {
                return i * 50 + 300;
            })
            .duration(2000)
            .attr("x", function (d) {
                return xScaleBar(d.date);
            })
            .attr("width", widthBar / data.length)
            .attr("y", function (d) {
                return yScaleBar(d.count);
            })
            .attr("height", function (d) {
                return heightBar - yScaleBar(d.count);
            })
            .attr("fill", function (d) {
                if (d.count < 2) {
                    return "#ee8679";
                } else if (d.count < 4) {
                    return "#ee5d44";
                } else if (d.count < 6) {
                    return "#ee4c31";
                } else {
                    return "#95160b";
                }
            });

        // enter the new bars
        bars
            .enter()
            .append("rect")
            .attr("class", "new")
            .attr("x", function (d) {
                return xScaleBar(d.date);
            })
            .attr("width", widthBar / data.length)
            .attr("y", function (d) {
                return yScaleBar(d.count);
            })
            .attr("height", 0)
            .attr("fill", function (d) {
                if (d.count < 2) {
                    return "#ee8679";
                } else if (d.count < 4) {
                    return "#ee5d44";
                } else if (d.count < 6) {
                    return "#ee4c31";
                } else {
                    return "#95160b";
                }
            });

        bars
            .on('mouseover', day_tip.show)
            .on('mouseout', day_tip.hide);

        // transition the data
        var newBars = svgBar
            .selectAll(".new")
            .transition()
            .duration(2000)
            .attr("height", function (d) {
                return heightBar - yScaleBar(d.count);
            });

        // update the axes
        d3.select(".xaxis")
            .transition()
            .duration(2000)
            .call(d3.svg.axis().scale(xScaleBar).orient("bottom").tickSize([3]));

        d3.select(".yaxis")
            .transition()
            .duration(2000)
            .call(d3.svg.axis().scale(yScaleBar).orient("left").tickSize([3]));

        svgBar.call(day_tip);
    });
});
