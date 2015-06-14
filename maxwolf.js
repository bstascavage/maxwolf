Roles = new Mongo.Collection("roles");
Teams = new Mongo.Collection("teams");
Players = new Mongo.Collection("players");
Gamestate = new Mongo.Collection("gamestate");
Votes = new Mongo.Collection("votes");
Events = new Mongo.Collection("events");

var GLOBAL_DEBUG = false;
var GLOBAL_GAME_DAY_LENGTH = 10; //in seconds
var GLOBAL_GAME_NIGHT_LENGTH = 5; //in seconds

Meteor.startup(function () {
  Teams.remove({});
  Teams.insert({ name: "Villagers", team_proportionality: 1, victory: "survive" });
  Teams.insert({ name: "Werewolves", team_proportionality: 2, victory: "outnumber" });

  Roles.remove({});
  Roles.insert({ name: "Villager", team: "Villagers", is_default_role: true });
  Roles.insert({ name: "Werewolf", team: "Werewolves", is_default_role: true });

  //Gamestate.remove({});
  //Gamestate.insert({ daytime: true, day: 1, winning_team: null });

  Events.remove({});
});

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

if (Meteor.isClient) {
  Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
  });

  Template.roleList.helpers({
    roles: function () {
      return Roles.find();
    }
  });
  /********* STARTGAME *********/

  Template.startGame.helpers({
  });

  Template.startGame.events({
    'submit .pickname': function (event) {
      Router.go('/rooms');
      return false;
    }
  });

    
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
    
  /********* GAME *********/
  Template.game.helpers({
    alivePlayers: function () {
      return Meteor.users.find(
      {
        'profile.alive': true,
        'profile.online': true,
        'profile.roomId': Meteor.user().profile.roomId
      });
    },
    deadPlayers: function () {
      return Meteor.users.find(
      {
        'profile.alive': false,
        'profile.online': true,
        'profile.roomId': Meteor.user().profile.roomId
      });
    },
    hasElements: function (list) {
      return list.count() > 0
    },
    players: function () {
      return Meteor.users.find({ 'profile.online': true, 'profile.roomId': Meteor.user().profile.roomId });
    },
    voteCountVillage: function () {
      return Votes.find({ votefor: this._id, voteType: 'village', 'roomId': Meteor.user().profile.roomId }).count()
    },
    voteCountWolf: function () {
      return Votes.find({ votefor: this._id, voteType: 'wolf', 'roomId': Meteor.user().profile.roomId }).count()
    },
    voteLeader: function () {
      var id = playerIdWithMostVotes('village');
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
      return Gamestate.findOne({_id: Meteor.user().profile.roomId}).day
    },
    daytime: function () {
      return Gamestate.findOne({_id: Meteor.user().profile.roomId}).daytime
    },
    villageVoteActive: function () {
      return Meteor.user().profile.alive && Gamestate.findOne({_id: Meteor.user().profile.roomId}).daytime
    },
    isGameOver: function () {
      return Gamestate.findOne({_id: Meteor.user().profile.roomId}).winning_team !== null;
    },
    winningTeam: function () {
      return Gamestate.findOne({_id: Meteor.user().profile.roomId}).winning_team;
    },
    isAlive: function () {
      return Meteor.user().profile.alive
    },
    isWolf: function () {
      var user = Meteor.user().profile

      if (user.role == 'Werewolf' && user.alive) {
        return Meteor.userId()
      }
    },
    isCurrentVillageVoteLeader: function () {
      return this._id == playerIdWithMostVotes('village');
    },
    isCurrentWolfVoteLeader: function () {
      return this._id == playerIdWithMostVotes('wolf');
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
      Meteor.call('resetGameState', function (err, response) {});
    },
    'click .next-game-state': function (event) {
      Meteor.call('nextGameState', function (err, response) {
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
      Meteor.call('murder', Meteor.userId(), 'Suicide');
      var audio = new Audio('239900__thesubber13__scream-1.ogg');
      audio.play();
    },
  })

  Tracker.autorun(function (){
    console.log('autorunning timer function')
    if (Gamestate.findOne())
    {
      var date = Gamestate.findOne().nextEvent;
      $('#state-timer').countdown(date, function (event) {
        $(this).html(event.strftime('%M:%S remaining'));
      });
    }
    
  });
  /*
  var nextEventTime = Gamestate.findOne();
  nextEventTime.observeChanges({
    changed: function (id, fields) {
      console.log(fields);
    }
  })*/

  function playerIdWithMostVotes(type) {
    var v = [];
    Meteor.users.find().forEach(function (player) {
      v[player._id.toString()] = Votes.find({
        votefor: player._id,
        voteType: type,
        'roomId': Meteor.user().profile.roomId
      }).count()
    })
    leader = null;
    currentBest = 0;
    for (var userId in v) {
      if ((leader == null && v[userId] > 0) || v[userId] > currentBest) {
        leader = userId;
        currentBest = v[userId]
      }
    }
    return leader;
  }
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    Meteor.methods({
      resetGameState: function () {
        online_users = Meteor.users.find({ 'profile.online': true, 'profile.roomId': Meteor.user().profile.roomId }).fetch();
        console.log('resetting game state');

        //fisher-yates shuffle
        for (var i = 0; i < online_users.length - 1; i++) {
          j = getRandomIntBetween(i, online_users.length - 1);
          temp = online_users[j];
          online_users[j] = online_users[i];
          online_users[i] = temp;
        }

        //First third of users are werewolves, the rest are villagers
        var third = Math.floor(online_users.length / 3);
        for (var i = 0; i < online_users.length; i++) {
          if (i < third) {
            tempRole = "Werewolf";
            tempTeam = "Werewolves";
          } else {
            tempRole = "Villager";
            tempTeam = "Villagers";
          }
          Meteor.users.update({
            username: online_users[i].username
          }, {
            $set: {
              'profile.alive': true,
              'profile.role': tempRole,
              'profile.team': tempTeam
            }
          });
        }

        Gamestate.update({}, {
          $set: {
            daytime: true,
            day: 1,
            winning_team: null
          }
        })
        //reset votes
        Votes.remove({})

        startGameCountdown(GLOBAL_GAME_DAY_LENGTH);

        return "whatever";
      },
      nextGameState: function () {
        state = Gamestate.findOne({_id: Meteor.user().profile.roomId})

        console.log(state)
        if (state.daytime) {
          //DAY ENDING
          Gamestate.update({}, {
            $set: {
              'daytime': false
            }
          })

          Meteor.call('murder', playerIdWithMostVotes('village'), 'Village');
          Votes.remove({ villageType: 'village' })
          checkTeamVictories();
          console.log('day ending reset countdown');
          startGameCountdown(GLOBAL_GAME_NIGHT_LENGTH);
        }
        else {
          //NIGHT ENDING
          Gamestate.update({}, {
            $inc: {
              day: 1
            }
          })
          Gamestate.update({}, {
            $set: {
              'daytime': true
            }
          })

          //Check if a team has fulfilled their victory conditions
          /*var total_alive = Meteor.users.find({'profile.alive' : true,  'profile.online' : true}).count();
          
          Teams.find({}).forEach(function (this_team){
            var victory = this_team.victory;
            var teamCount = Meteor.users.find({'profile.alive' : true, 'profile.online' : true, 'profile.team' : this_team.name}).count();
            if ((victory === "outnumber" && teamCount / total_alive >= 0.5) || (victory === "survive" && teamCount === total_alive)) {
              Gamestate.update({}, 
                {$set: 
                  { 'winning_team': this_team.name }
                }
              )
            }
          });*/
          checkTeamVictories();
          console.log('going to call countdwon again');
          startGameCountdown(GLOBAL_GAME_DAY_LENGTH);

          Meteor.call('murder', playerIdWithMostVotes('wolf'), 'Werewolf');
          Votes.remove({ villageType: 'wolf' })
        }
      },
      murder: function (id, type) {
        console.log(id + ' is being killed by: ' + type)
        victim = Meteor.users.findOne({ _id: id, 'profile.roomId': Meteor.user().profile.roomId })
        console.log(victim.profile.alive)
        if (victim.profile.alive) {
          Events.insert({
            text: "A murder happened bro",
            createdAt: new Date()
          })
          Meteor.users.update({ _id: id }, { $set: { 'profile.alive': false, 'profile.death': getDeath(type), 'profile.death_location': getLocation() } })
        }
      },
      createRoom: function (name) {
        Gamestate.insert({ name: name, daytime: true, day: 1, winning_team: null });
      },
      joinGame: function (roomId) {
        Meteor.users.update({ _id: Meteor.userId() }, {$set: { 'profile.roomId': roomId }}) 
      },
      castVote: function (voteFrom, voteFor, type) {
        Votes.upsert(
        {
          voteFrom: voteFrom,
          voteType: type,
          roomId: Meteor.user().profile.roomId
        },
        {
          voteFrom: voteFrom,
          votefor: voteFor,
          voteType: type,
          roomId: Meteor.user().profile.roomId
        })
      },
      tallyVote: function () {

      }
    })
  })
};

// Returns a random integer between min and max, inclusive
function getRandomIntBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getDeath(type) {
  deaths = flavor_text[type]
  return deaths[getRandomIntBetween(0, deaths.length - 1)]
}

function getLocation() {
  location = flavor_text['Location']
  return location[getRandomIntBetween(0, location.length - 1)]
}

function checkTeamVictories() {
  //Check if a team has fulfilled their victory conditions
  var total_alive = Meteor.users.find({ 'profile.alive': true, 'profile.online': true, 'profile.roomId': Meteor.user().profile.roomId }).count();
  console.log('total_alive: ' + total_alive)

  Teams.find({'profile.roomId': Meteor.user().profile.roomId}).forEach(function (this_team) {
    var victory = this_team.victory;
    var teamCount = Meteor.users.find({ 'profile.alive': true, 'profile.online': true, 'profile.team': this_team.name, 'profile.roomId': Meteor.user().profile.roomId }).count();
    console.log("checking the " + this_team.name + " victory condition of " + this_team.victory + " - teamCount: " + teamCount);
    if ((victory === "outnumber" && teamCount / total_alive >= 0.5) || (victory === "survive" && teamCount === total_alive)) {
      console.log(this_team.name + " has won!");
      Gamestate.update({_id: Meteor.user().profile.roomId },
        {
          $set:
           { 'winning_team': this_team.name }
        }
      )
    }
  });
}

function startGameCountdown(countdownTime)
{
  /*
  var oldHandle = Gamestate.findOne().timeoutHandle;
  if (oldHandle)
  {
    console.log('clearing old timer');
    Meteor.clearTimeout(oldHandle)
  }*/
  
  //set up the time for the first day end
  /*var date = new Date();
  date.setSeconds(date.getSeconds() + countdownTime);

  var timeoutHandle = Meteor.setTimeout(function () {
    Meteor.call('nextGameState');
  }, countdownTime * 1000)
  console.log('tiemout handle is ' + timeoutHandle.id);
  Gamestate.update({}, {
    $set: {
      nextEvent: date//,
      //timeoutHandle: timeoutHandle
    }
  })*/
}
