/*global Ember */

var API_URL = 'http://174.129.230.228:7379';

var App = window.App = Em.Application.create();

/* Order and include as you please. */
// require('scripts/routes/*');
// require('scripts/controllers/*');
// require('scripts/models/*');
// require('scripts/views/*');

App.Router.map(function () {
  this.resource('timelines', { path: '/' }, function() {
    this.route('timeline', { path: '/:user/:id' });
  });
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
    return App.Timeline.find(params.user, params.id);
  },

  serialize: function(model) {
    return { user: model.user, id: model.id };
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
    var margin = { top: 40, right: 32, bottom: 32, left: 32 };
    var width = 700 - margin.left - margin.right,
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

    var timeAxis = d3.svg.axis().scale(timeAgoScale).orient('bottom')
      .tickFormat(function(value) {
        var year = now - value;
        return year > 0 ? year.toString() : (-1 * year + 1).toString() + ' BC';
      })
      .tickValues(function() {
        return timeAgoScale.ticks().filter(function(tick, i) {
          return !(i % 3);
        }).map(function(value) {
          var roundingPower = Math.floor(Math.log(value) / Math.log(10));
          var year = now - value;
          var roundingFactor = Math.pow(10, roundingPower);
          year = Math.round(year / roundingFactor) * roundingFactor;
          return now - year;
        }).concat(timeAgoScale.domain());
      });
     

    var event_dot = svg.append('g').selectAll('.event')
      .data(events)
      .enter().append('circle')
        .attr('class', 'event')
        .attr('r', 5)
        .attr('cx', function(d) {
          //return timeScale(d.get('median'));
          return timeAgoScale(now - d.get('median'));
        })
        .on('mouseover', function(d) {
          self.set('description', '%@ &mdash; %@'.fmt(d.get('year'), d.get('description')));
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
  find: function(user, id) {
    if (user === 'e.g.' && id === 'biology') {
      return $.getJSON(API_URL + '/SMEMBERS/schedge:timeline:biology').then(function(response) {
        return App.Timeline.create({
          user: user,
          id: id,
          title: 'Timeline of biology and organic chemistry',
          source: 'http://en.wikipedia.org/wiki/Timeline_of_biology_and_organic_chemistry',
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

