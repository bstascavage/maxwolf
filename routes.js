//routes.js

/****** Routes ******/
Router.route('/', function () {
  this.render('Home');
});

Router.route('/game', function () {
  this.render('game');
  Meteor.subscribe("votes");
  Meteor.subscribe("gamestate");
  Meteor.subscribe("allUsers");
});

Router.route('/rooms', function () {
  this.render('rooms');
  Meteor.call('clearData')
});