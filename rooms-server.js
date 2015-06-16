if (Meteor.isServer) {
  Meteor.startup(function () {
        Meteor.methods({
          createRoom: function(name) {
            Gamestate.insert({ name: name, daytime: true, day: 1, winning_team: null });
          },
          joinGame: function(roomId) {
            Meteor.users.update({ _id: Meteor.userId() }, { $set: { 'profile.roomId': roomId } })
          }
      })
  })
}