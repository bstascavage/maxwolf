//Rooms.js

if (Meteor.isClient) {
  /********* ROOMS *********/
  Template.rooms.helpers({
    rooms: function () {
      return Gamestate.find({});
    },
  });

  Template.rooms.events({
    'submit .createRoom': function (event) {
      //console.log(event.target.room.value)
      Meteor.call('createRoom', event.target.room.value);
    },
    'click .joinGame': function (event) {
      Meteor.call('joinGame', this._id);
      Router.go('/game');
      return false;
    }
  });
}

