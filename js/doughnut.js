function donutChart() {
    console.log("last one");
    var width,
        height,
        margin = {
            top: 10,
            right: 10,
            bottom: 10,
            left: 10
        },
        colour = d3.scale.category20c(), // colour scheme
        variable, // value in data that will dictate proportions on chart
        category, // compare data by
        padAngle, // effectively dictates the gap between slices
        floatFormat = d3.format('.4r'),
        cornerRadius, // sets how rounded the corners are on each slice
        percentFormat = d3.format(',.2%');

    function chart(selection) {
        selection.each(function (data) {
            console.log(data);
            console.log(width);
            var radius = Math.min(width, height) / 2;

            // creates a new pie generator
            var pie = d3.layout.pie()
                .value(function (d) {
                    return d[variable];
                })
                .sort(null);
            console.log(pie);

            // contructs and arc generator. This will be used for the donut. The difference between outer and inner
            // radius will dictate the thickness of the donut
            var arc = d3.svg.arc()
                .outerRadius(radius * 0.8)
                .innerRadius(radius * 0.6)
                .cornerRadius(cornerRadius)
                .padAngle(padAngle);

            // this arc is used for aligning the text labels
            var outerArc = d3.svg.arc()
                .outerRadius(radius * 0.8)
                .innerRadius(radius * 0.8);

            // append the svg object to the selection
            var svg = selection.append('svg')
                .attr('width', width + margin.left + margin.right)
                .attr('height', height + margin.top + margin.bottom)
                .append('g')
                .attr('transform', 'translate(' + width / 2 + ',' + height / 2 + ')');

            // g elements to keep elements within svg modular
            svg.append('g').attr('class', 'slices');
            svg.append('g').attr('class', 'labelName');
            svg.append('g').attr('class', 'lines');

            // add and colour the donut slices
            var path = svg.select('.slices')
                .datum(data).selectAll('path')
                .data(pie)
                .enter().append('path')
                .attr('fill', function (d) {
                    return colour(d.data[category]);
                })
                .attr('d', arc);

            // add text labels
            var label = svg.select('.labelName').selectAll('text')
                .data(pie)
                .enter().append('text')
                .attr('dy', '.35em')
                .html(function (d) {

                    return d.data[category] + ': <tspan>' + d.data[variable] + '</tspan>';
                })
                .attr('transform', function (d) {


                    var pos = outerArc.centroid(d);

                    // changes the point to be on left or right depending on where label is.
                    pos[0] = radius * 0.90 * (midAngle(d) < 3 ? 1 : -1);
                    return 'translate(' + pos + ')';
                })
                .style('text-anchor', function (d) {
                    // if slice centre is on the left, anchor text to start, otherwise anchor to end
                    return (midAngle(d)) < Math.PI ? 'start' : 'end';
                });

            // add lines connecting labels to slice. A polyline creates straight lines connecting several points
            var polyline = svg.select('.lines')
                .selectAll('polyline')
                .data(pie)
                .enter().append('polyline')
                .attr('points', function (d) {

                    // see label transform function for explanations of these three lines.
                    var pos = outerArc.centroid(d);
                    pos[0] = radius * 0.90 * (midAngle(d) < Math.PI ? 1 : -1);
                    return [arc.centroid(d), outerArc.centroid(d), pos]
                });
            // ===========================================================================================

            // ===========================================================================================
            // add tooltip to mouse events on slices and labels
            d3.selectAll('.labelName text, .slices path').call(toolTip);

            // Functions

            // calculates the angle for the middle of a slice
            function midAngle(d) {
                return d.startAngle + (d.endAngle - d.startAngle) / 2;
            }

            // function that creates and adds the tool tip to a selected element
            function toolTip(selection) {

                // add tooltip (svg circle element) when mouse enters label or slice
                selection.on('mouseenter', function (data) {

                    svg.append('text')
                        .attr('class', 'toolCircle')
                        .attr('dy', -15) // hard-coded. can adjust this to adjust text vertical alignment in tooltip
                        .html(toolTipHTML(data)) // add text to the circle.
                        .style('font-size', '.8em')
                        .style('text-anchor', 'middle') // centres text in tooltip
                        .style("opacity", 0)
                        .transition()
                        .duration(400)
                        .style("opacity", 1)

                    svg.append('circle')
                        .attr('class', 'toolCircle')
                        .attr('r', radius * 0.55) // radius of tooltip circle
                        .style('fill', colour(data.data[category])) // colour based on category mouse is over
                        .style("fill-opacity", 0)
                        .transition()
                        .duration(400)
                        .style("fill-opacity", 0.35)

                });

                // remove the tooltip when mouse leaves the slice/label
                selection.on('mouseout', function () {
                    d3.selectAll('.toolCircle').remove();
                });
            }

            // function to create the HTML string for the tool tip. Loops through each key in data object
            // and returns the html string key: value
            function toolTipHTML(data) {

                var tip = '',
                    i = 0;

                for (var key in data.data) {


                    var value = data.data[key];

                    // leave off 'dy' attr for first tspan so the 'dy' attr on text element works. The 'dy' attr on
                    // tspan effectively imitates a line break.
                    if (i === 0) tip += '<tspan x="0">' + key + ': ' + value + '</tspan>';
                    else tip += '<tspan x="0" dy="1.2em">' + key + ': ' + value + '</tspan>';
                    i++;
                }

                return tip;
            }
            // ===========================================================================================

        });
    }

    // getter and setter functions. 
    chart.width = function (value) {
        if (!arguments.length) return width;
        width = value;
        return chart;
    };

    chart.height = function (value) {
        if (!arguments.length) return height;
        height = value;
        return chart;
    };

    chart.margin = function (value) {
        if (!arguments.length) return margin;
        margin = value;
        return chart;
    };

    chart.radius = function (value) {
        if (!arguments.length) return radius;
        radius = value;
        return chart;
    };

    chart.padAngle = function (value) {
        if (!arguments.length) return padAngle;
        padAngle = value;
        return chart;
    };

    chart.cornerRadius = function (value) {
        if (!arguments.length) return cornerRadius;
        cornerRadius = value;
        return chart;
    };

    chart.colour = function (value) {
        if (!arguments.length) return colour;
        colour = value;
        return chart;
    };

    chart.variable = function (value) {
        if (!arguments.length) return variable;
        variable = value;
        return chart;
    };

    chart.category = function (value) {
        if (!arguments.length) return category;
        category = value;
        return chart;
    };

    return chart;
}

var donut = donutChart()
    .width(1200)
    .height(400)
    .cornerRadius(3) // sets how rounded the corners are on each slice
    .padAngle(0.030) // effectively dictates the gap between slices
    .variable('Total Fatalities')
    .category('Reason');

d3.tsv('data/shootings_reasons.tsv', function (error, data) {
    if (error) throw error;
    d3.select('#doughnut_chart')
        .datum(data) // bind data to the div
        .call(donut); // draw chart in div
});
