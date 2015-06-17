//room-server.js

if (Meteor.isServer) {
  Meteor.startup(function () {
        Meteor.methods({
          createRoom: function(name) {
            Gamestate.insert({ name: name, daytime: true, day: 1, winning_team: null });
          },
          joinGame: function(roomId) {
            Meteor.users.update({ _id: Meteor.userId() }, { $set: { 'profile.roomId': roomId } })
          },
          clearData: function () {
            Meteor.users.update({ _id: Meteor.userId() }, { $set: { 'profile.roomId': null, 'profile.alive': false, 'profile.role': null, 'profile.team': null, 'profile.death': null, 'profile.death_location': null, 'profile.reveal_role': null, 'profile.reveal_team': null } })
          },
      })
  })
}