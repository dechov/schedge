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

  now: 2013,
  margin: { top: 52, right: 32, bottom: 36, left: 32 },
  width: function() {
    return 960 - this.get('margin.left') - this.get('margin.right');
  }.property('margin'),
  height: function() {
    return 100 - this.get('margin').top - this.get('margin').bottom;
  }.property('margin'),
  eventsBinding: 'controller.model.events',

  timeScale: function() {
    var now = this.get('now'),
        width = this.get('width');
    return d3.scale.log()
      .domain([now - -999, now - 2003])
      .range([0, width]);
  }.property('now'),

  timeAxis: function() {
    var now = this.get('now'),
        timeScale = this.get('timeScale');
    return d3.svg.axis()
      .scale(timeScale)
      .orient('bottom')
      .tickFormat(function(value) {
        var year = now - value;
        return year > 0 ? year.toString() : (-1 * year + 1).toString() + ' BC';
      })
      .tickValues(function() {
        return timeScale.ticks().filter(function(tick, i) {
          return !(i % 3);
        }).map(function(value) {
          var roundingPower = Math.floor(Math.log(value * 3/2) / Math.log(10));
          var year = now - value;
          var roundingFactor = Math.pow(10, roundingPower);
          year = Math.round(year / roundingFactor) * roundingFactor;
          return now - year;
        }).concat(timeScale.domain());
      });
  }.property('timeScale'),

  representData: function(dataSelection) {
    var self = this,
        now = this.get('now'),
        timeScale = self.get('timeScale');

    dataSelection.enter().append('rect')
      .attr('class', 'event')
      /*.attr('x', function(d) {
        var timeAgo = now - d.get('median');
        var timeAgoStart = timeAgo + d.get('resolution')/365.25/2;
        return timeScale(timeAgoStart);
      })
      .attr('width', function(d) {
        var timeAgo = now - d.get('median');
        var timeAgoStart = timeAgo - d.get('resolution')/365.25/2;
        var timeAgoEnd = timeAgoStart + d.get('resolution')/365.25;
        return timeScale(timeAgoStart) - timeScale(timeAgoEnd);
      })*/
      .attr('y', -24)
      .attr('height', 24)

    dataSelection  // update
      .transition()
      .attr('x', function(d) {
        var timeAgo = now - d.get('median');
        var timeAgoStart = timeAgo + d.get('resolution')/365.25/2;
        return timeScale(timeAgoStart);
      })
      .attr('width', function(d) {
        var timeAgo = now - d.get('median');
        var timeAgoStart = timeAgo - d.get('resolution')/365.25/2;
        var timeAgoEnd = timeAgoStart + d.get('resolution')/365.25;
        return timeScale(timeAgoStart) - timeScale(timeAgoEnd);
      });
  },

  didInsertElement: function() {
    var self = this,
        margin = this.get('margin'),
        width = this.get('width'),
        height = this.get('height'),
        timeAxis = this.get('timeAxis');

    var svg = d3.select(this.$('svg').get(0))
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform", 'translate(' + margin.left + ', ' + margin.top + ')');

    /*var timeScale = d3.scale.linear()
      .domain([d3.min(events, function(d) { return d.get('median'); }), now])
      .range([0, width]);*/

    var zoom = d3.behavior.zoom()
      .on('zoom', function() {
        d3.select('.axis').call(timeAxis);
        self.representData(svg.selectAll('.event').data(self.get('events')));
      });
     
    var event_selection = svg.append('g')
        .attr('class', 'events')
      .selectAll('.event')
        .data(this.get('events'));

    self.representData(event_selection);

    svg.append('rect')
      .attr('class', 'mousetrap')
      .style('fill', 'none')
      .style('pointer-events', 'all')
      .attr('width', width)
      .attr('height', 24)
      .attr('y', -24)
      .call(zoom)
      .on('mousemove', function(d) {
        var x = d3.mouse(this)[0];
        var timeAgo = self.get('timeScale').invert(x);
        var description = self.get('events').filter(function(event) {
          return event.get('median') === Math.round(self.get('now') - timeAgo);
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

