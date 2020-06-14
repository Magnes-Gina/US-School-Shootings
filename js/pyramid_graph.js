// SET UP DIMENSIONS
//global variables
var w = 800,
    h = 300;

// margin.middle is distance from center line to each y-axis
var margin = {
    top: 20,
    right: 40,
    bottom: 24,
    left: 40,
    middle: 60
};

// the width of each side of the chart
var regionWidth = w / 2 - margin.middle;

// these are the x-coordinates of the y-axes
var pointA = regionWidth,
    pointB = w - regionWidth;

var svg = d3.select('#pyramid #chart_container').append('svg')
    .attr('width', margin.left + w + margin.right)
    .attr('height', margin.top + h + margin.bottom)
    // ADD A GROUP FOR THE SPACE WITHIN THE MARGINS
    .append('g')
    .attr('transform', translation(margin.left, margin.top));


//defining all data required as global variables
var data;
var weaponData = [
    {
        group: 'Handgun',
        male: 79,
        female: 5
    },
    {
        group: 'Multiple Weapons',
        male: 5,
        female: 1
    },
    {
        group: 'Rifle',
        male: 6,
        female: 1
    },
    {
        group: 'Shotgun',
        male: 4,
        female: 0
    },

];
var totalData = [
    {
        group: 'Percent of Cases',
        male: 94,
        female: 6
    },
    {
        group: 'Average Age',
        male: 19,
        female: 23
    },
    {
        group: 'Youngest Age',
        male: 6,
        female: 12
    },
];

var assocData = [
    {
        group: 'Parent',
        male: 2,
        female: 1
    },
    {
        group: 'Student',
        male: 61,
        female: 3
    },
    {
        group: 'Teacher',
        male: 1,
        female: 0
    },
    {
        group: 'Relative',
        male: 2,
        female: 0
    },
    {
        group: 'No Relation',
        male: 13,
        female: 1
    }
];

function setWeapons() {
    data = weaponData;
    updateData();
    d3.select("#facts p").remove();
    d3.select("#facts")
        .append("p")
        .html("Firearms are the <b style='color:red'> second leading cause of death </b> among American children and adolescents, after car crashes. <br><br> Guns used in about <b>68% of gun-related </b> incidents at schools were taken from the home, a friend or a relative")
    d3.select('#weapon-btn').attr('class', 'chart-btn active')
    d3.select('#assoc-btn').attr('class', 'chart-btn')
    d3.select('#total-btn').attr('class', 'chart-btn')
}

function setTotal() {
    data = totalData;
    updateData();
    d3.select("#facts p").remove();
    d3.select("#facts")
        .append("p")
        .html("A school massacre is used as a way of asserting <b>masculinity</b> as much of Western culture associates violence with masculinity")
    d3.select('#total-btn').attr('class', 'chart-btn active')
    d3.select('#assoc-btn').attr('class', 'chart-btn')
    d3.select('#weapon-btn').attr('class', 'chart-btn')
}

function setAssoc() {
    data = assocData;
    updateData();
    d3.select("#facts p").remove();
    d3.select("#facts")
        .append("p")
        .html("An estimated <b>4.6 million American children </b> live in a home where at least one gun is kept loaded and unlocked")
    d3.select('#assoc-btn').attr('class', 'chart-btn active')
    d3.select('#total-btn').attr('class', 'chart-btn')
    d3.select('#weapon-btn').attr('class', 'chart-btn')
}

setTotal();

function updateData() {
    //remove all children of svg
    svg.selectAll("*").remove();
    svg.append('g')
        .attr('transform', translation(margin.left, margin.top));

    dataset = data.sort(function (a, b) {
        return a.male - b.male;
    }).reverse();

    var xScale = d3.scale.linear()
        .domain([0, 100])
        .range([0, regionWidth])
        .nice();

    var xScaleLeft = d3.scale.linear()
        .domain([0, 100])
        .range([regionWidth, 0]);

    var xScaleRight = d3.scale.linear()
        .domain([0, 100])
        .range([0, regionWidth]);

    var yScale = d3.scale.ordinal()
        .domain(dataset.map(function (d) {
            return d.group;
        }))
        .rangeRoundBands([h, 0], 0.1);


    // SET UP AXES
    var yAxisLeft = d3.svg.axis()
        .scale(yScale)
        .orient('right')
        .tickSize(6, 0)
        .tickPadding(margin.middle - 4);

    var yAxisRight = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .tickSize(4, 0)
        .tickFormat('');


    var xAxisRight = d3.svg.axis()
        .scale(xScale)
        .orient('bottom');

    var xAxisLeft = d3.svg.axis()
        // REVERSE THE X-AXIS SCALE ON THE LEFT SIDE BY REVERSING THE RANGE
        .scale(xScale.copy().range([pointA, 0]))
        .orient('bottom');

    // MAKE GROUPS FOR EACH SIDE OF CHART
    // scale(-1,1) is used to reverse the left side so the bars grow left instead of right
    var leftBarGroup = svg.append('g')
        .attr('transform', translation(pointA, 0) + 'scale(-1,1)');
    var rightBarGroup = svg.append('g')
        .attr('transform', translation(pointB, 0));

    // DRAW AXES
    svg.append('g')
        .attr('class', 'axis y left')
        .attr('transform', translation(pointA, 0))
        .call(yAxisLeft)
        .selectAll('text')
        .style('text-anchor', 'middle');

    svg.append('g')
        .attr('class', 'axis y right')
        .attr('transform', translation(pointB, 0))
        .call(yAxisRight);

    svg.append('g')
        .attr('class', 'axis x left')
        .attr('transform', translation(0, h))
        .call(xAxisLeft);

    svg.append('g')
        .attr('class', 'axis x right')
        .attr('transform', translation(pointB, h))
        .call(xAxisRight);

    // DRAW BARS
    leftBarGroup.selectAll('.bar.left')
        .data(dataset)
        .enter().append('rect')
        .attr('class', 'bar left')
        .attr('x', 0)
        .attr('y', function (d) {
            return yScale(d.group);
        })
        .attr('width', function (d) {
            return xScale(d.male);
        })
        .attr('height', yScale.rangeBand());

    leftBarGroup.selectAll('.text')
        .data(dataset)
        .enter().append('text')
        .text(function (d) {
            if (d.group === 'Average Age' || d.group === 'Youngest Age')
                return d.male;
            else
                return d.male + '%';
        })
        .attr('stroke', '#cdcdcd')
        .attr('transform', 'scale(-1,1)')
        .attr('x', function (d) {
            return -xScale(d.male) - 32
        })
        .attr('y', function (d) {
            return yScale(d.group) + 45;
        });

    rightBarGroup.selectAll('.bar.right')
        .data(dataset)
        .enter().append('rect')
        .attr('class', 'bar right')
        .attr('x', 0)
        .attr('y', function (d) {
            return yScale(d.group);
        })
        .attr('width', function (d) {
            return xScale(d.female);
        })
        .attr('height', yScale.rangeBand());

    rightBarGroup.selectAll('.text')
        .data(dataset)
        .enter().append('text')
        .text(function (d) {
            if (d.group === 'Average Age' || d.group === 'Youngest Age')
                return d.female;
            else
                return d.female + '%';
        })
        .attr('stroke', 'white')
        .attr('x', function (d) {
            return xScale(d.female) + 3;
        })
        .attr('y', function (d) {
            return yScale(d.group) + 40;
        });

}

function translation(x, y) {
    return 'translate(' + x + ',' + y + ')';
}

// showing total data
