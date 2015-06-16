/****** Routes ******/
Router.route('/', function () {
  this.render('Home');
});

Router.route('/game', function () {
  this.render('game');
});

Router.route('/rooms', function () {
  this.render('rooms');
});