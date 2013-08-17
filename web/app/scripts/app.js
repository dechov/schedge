/*global Ember */

var API_URL = 'http://schedge.net:7379';

var App = window.App = Em.Application.create({
  location: 'hash'
});

/* Order and include as you please. */
// require('scripts/routes/*');
// require('scripts/controllers/*');
// require('scripts/models/*');
// require('scripts/views/*');

App.Router.map(function () {
  this.resource('timelines', { path: '/' }, function() {
    this.route('timeline', { path: '/:group/:id' });
  });
});

App.ApplicationView = Em.View.extend({
  classNames: 'application'
});

App.TimelinesIndexRoute = Em.Route.extend({
  redirect: function() {
    var self = this;
    App.Timeline.find('e.g.', 'biology').then(function(timeline) {
      self.transitionTo('timelines.timeline', timeline);
    });
  }
});

App.TimelinesTimelineRoute = Em.Route.extend({
  model: function(params) {
    return App.Timeline.find(params.group, params.id);
  },

  serialize: function(model) {
    return { group: model.group, id: model.id };
  }
});


/*
App.TimelineController = Em.Controller.extend({
  init: function() {
    this._super();
    this.set('observation', App.Event.create({
      median: 1953,
      resolution: 365,
      description: 'sticks and balls'
    }));
  }
});*/
  
App.TimelinesTimelineView = Em.View.extend({
  templateName: 'timeline',
  classNames: 'timeline',

  didInsertElement: function() {
    var self = this;

    var now = 2013;

    var events = this.get('controller.model.events');
    var margin = { top: 52, right: 32, bottom: 36, left: 32 };
    var width = 960 - margin.left - margin.right,
        height = 100 - margin.top - margin.bottom;

    var svg = d3.select(this.$('svg').get(0))
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform", 'translate(' + margin.left + ', ' + margin.top + ')');

    var timeScale = d3.scale.linear()
      .domain([d3.min(events, function(d) { return d.get('median'); }), now])
      .range([0, width]);

    var timeAgoScale = d3.scale.log()
      .domain([now - -999, now - 2003])
      .range([0, width]);
    tas = timeAgoScale

    var timeAxis = d3.svg.axis()
      .scale(timeAgoScale)
      .orient('bottom')
      .tickFormat(function(value) {
        var year = now - value;
        return year > 0 ? year.toString() : (-1 * year + 1).toString() + ' BC';
      })
      .tickValues(function() {
        return timeAgoScale.ticks().filter(function(tick, i) {
          return !(i % 3);
        }).map(function(value) {
          var roundingPower = Math.floor(Math.log(value * 3/2) / Math.log(10));
          var year = now - value;
          var roundingFactor = Math.pow(10, roundingPower);
          year = Math.round(year / roundingFactor) * roundingFactor;
          return now - year;
        }).concat(timeAgoScale.domain());
      });
     
    var event_selection = svg.append('g')
        .attr('class', 'events')
      .selectAll('.event')
        .data(events);

    event_selection.enter().append('rect')
      .attr('class', 'event')
      .attr('x', function(d) {
        var timeAgo = now - d.get('median');
        var timeAgoStart = timeAgo + d.get('resolution')/365.25/2;
        return timeAgoScale(timeAgoStart);
      })
      .attr('width', function(d) {
        var timeAgo = now - d.get('median');
        var timeAgoStart = timeAgo - d.get('resolution')/365.25/2;
        var timeAgoEnd = timeAgoStart + d.get('resolution')/365.25;
        return timeAgoScale(timeAgoStart) - timeAgoScale(timeAgoEnd);
      })
      .attr('y', -24)
      .attr('height', 24)

    svg.append('rect')
      .attr('class', 'mousetrap')
      .style('fill', 'none')
      .style('pointer-events', 'all')
      .attr('width', width)
      .attr('height', 24)
      .attr('y', -24)
      .on('mousemove', function(d) {
        var x = d3.mouse(this)[0];
        var timeAgo = timeAgoScale.invert(x);
        var description = events.filter(function(event) {
          return event.get('median') === Math.round(now - timeAgo);
        })/*.forEach(function(event) {
          self.set('description', '%@<br/>%@ &mdash; %@'.fmt(self.get('description'), event.get('year'), event.get('description')))
        });*/
        .map(function(d) { return '%@ &mdash; %@'.fmt(d.get('year'), d.get('description')); })
        .join('<br/>');
        self.set('description', description);

      });

    svg.append('g')
      .attr('class', 'axis')
      .call(timeAxis);
  }
});

// App.EventView = Em.View.extend({});

App.Event = Em.Object.extend({
  median: null,
  resolution: null,
  description: null,
  year: null
});

App.Timeline = Em.Object.extend({
  title: null,
  source: null,
  events: null
});
App.Timeline.reopenClass({
  find: function(group, id) {
    if (group === 'e.g.' && id === 'biology') {
      return $.getJSON(API_URL + '/SMEMBERS/schedge:timeline:biology').then(function(response) {
        return App.Timeline.create({
          group: group,
          id: id,
          title: 'Timeline of biology and organic chemistry',
          source: {
            url: 'http://en.wikipedia.org/wiki/Timeline_of_biology_and_organic_chemistry',
            description: 'parsed June 2013'
          },
          events: response['SMEMBERS'].map(function(event_json) {
            return App.Event.create(JSON.parse(event_json));
          })
        });
      });
    }
    else {
      console.error('undefined url');
    }
  }
});

