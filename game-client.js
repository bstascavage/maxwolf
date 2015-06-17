//game-client.js

if (Meteor.isClient) {

  Template.roleList.helpers({
    roles: function () {
      return Roles.find();
    }
  });

  /********* GAME *********/
  Template.game.helpers({
    alivePlayers: function () {
      if (!Meteor.user()) { return; }
      return Meteor.users.find(
      {
        'profile.alive': true,
        'profile.online': true,
        'profile.roomId': Meteor.user().profile.roomId
      });
    },
    deadPlayers: function () {
      if (!Meteor.user()) { return; }
      return Meteor.users.find(
      {
        'profile.alive': false,
        'profile.online': true,
        'profile.roomId': Meteor.user().profile.roomId
      });
    },
    hasElements: function (list) {
      if (!list) { return; }
      return list.count() > 0
    },
    players: function () {
      if (!Meteor.user()) { return; }
      return Meteor.users.find({ 'profile.online': true, 'profile.roomId': Meteor.user().profile.roomId });
    },
    voteCountVillage: function () {
      if (!Meteor.user()) { return; }
      return Votes.find({ votefor: this._id, voteType: 'village', 'roomId': Meteor.user().profile.roomId }).count()
    },
    voteCountWolf: function () {
      if (!Meteor.user()) { return; }
      return Votes.find({ votefor: this._id, voteType: 'wolf', 'roomId': Meteor.user().profile.roomId }).count()
    },
    voteLeader: function () {
      var id = playerIdWithMostVotes('village', Meteor.user().profile.roomId);
      return id
      if (id) {
        player = Meteor.users.findOne({
          _id: id,
          'profile.roomId': Meteor.user().profile.roomId
        })
        return player.username;
      }
    },
    day: function () {
      if (!Meteor.user()) { return; }
      return Gamestate.findOne({ _id: Meteor.user().profile.roomId }).day
    },
    daytime: function () {
      if (!Meteor.user()) { return; }
      return Gamestate.findOne({ _id: Meteor.user().profile.roomId }).daytime
    },
    villageVoteActive: function () {
      if (!Meteor.user()) { return; }
      return Meteor.user().profile.alive && Gamestate.findOne({ _id: Meteor.user().profile.roomId }).daytime
    },
    isGameOver: function () {
      if (!Meteor.user()) { return; }
      return Gamestate.findOne({ _id: Meteor.user().profile.roomId }).winning_team !== null;
    },
    winningTeam: function () {
      if (!Meteor.user()) { return; }
      return Gamestate.findOne({ _id: Meteor.user().profile.roomId }).winning_team;
    },
    isAlive: function () {
      if (!Meteor.user()) { return; }
      return Meteor.user().profile.alive
    },
    isWolf: function () {
      if (!Meteor.user()) { return; }
      var user = Meteor.user().profile

      if (user.role == 'Werewolf' && user.alive) {
        return Meteor.userId()
      }
    },
    isCurrentVillageVoteLeader: function () {
      return this._id == playerIdWithMostVotes('village', Meteor.user().profile.roomId);
    },
    isCurrentWolfVoteLeader: function () {
      return this._id == playerIdWithMostVotes('wolf', Meteor.user().profile.roomId);
    },
    GLOBAL_DEBUG: function () {
      return GLOBAL_DEBUG;
    },
    alertText: function () {
      //return Events.findOne({}, { sort: {createdAt: -1}})
    },
    playerIsWerewolf: function () {
      return this.profile.team == 'Werewolves';
    }
  })

  Template.game.events({
    'click .reset-game-state': function (event) {
      Meteor.call('resetGameState', Meteor.user().profile.roomId, function (err, response) { });
    },
    'click .next-game-state': function (event) {
      Meteor.call('nextGameState', Meteor.user().profile.roomId, function (err, response) {
      });
    },
    'click .villageVote': function (event) {
      console.log(Meteor.userId() + ' is voting for ' + this._id);
      Meteor.call('castVote', Meteor.userId(), this._id, 'village');
    },
    'click .wolfVote': function (event) {
      console.log(Meteor.userId() + ' is voting for ' + this._id);
      Meteor.call('castVote', Meteor.userId(), this._id, 'wolf');
    },
    'click .suicide': function (event) {
      Meteor.call('murder', Meteor.userId(), 'Suicide', Meteor.user().profile.roomId);
      var audio = new Audio('239900__thesubber13__scream-1.ogg');
      audio.play();
    },
  })

  Tracker.autorun(function () {
    if (Meteor.user() && Gamestate.findOne({ _id: Meteor.user().profile.roomId })) {
      var date = Gamestate.findOne({ _id: Meteor.user().profile.roomId }).nextEvent;
      if (date) {
        $('#state-timer').countdown(date, function (event) {
          $(this).html(event.strftime('%M:%S remaining'));
        });
      }
    }

  });
  /*
  var nextEventTime = Gamestate.findOne();
  nextEventTime.observeChanges({
    changed: function (id, fields) {
      console.log(fields);
    }
  })*/
}


function playerIdWithMostVotes(type, roomId) {
    console.log("Calculating votes of type: " + type + " in room: " + roomId);
    var v = [];
    Meteor.users.find().forEach(function (player) {
      v[player._id.toString()] = Votes.find({
        votefor: player._id,
        voteType: type,
        'roomId': roomId
      }).count()
    })
    leader = null;
    currentBest = 0;
    for (var userId in v) {
      //console.log(userId)
      if ((leader == null && v[userId] > 0) || v[userId] > currentBest) {
        leader = userId;
        currentBest = v[userId]
      }
    }
    return leader;
}
