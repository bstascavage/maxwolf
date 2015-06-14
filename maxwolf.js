Roles = new Mongo.Collection("roles");
Teams = new Mongo.Collection("teams");
Players = new Mongo.Collection("players");
Gamestate = new Mongo.Collection("gamestate");
Votes = new Mongo.Collection("votes");
Events = new Mongo.Collection("events");

var GLOBAL_DEBUG = false;

Meteor.startup(function () {
  Teams.remove({});
  Teams.insert({ name: "Villagers", team_proportionality: 1, victory: "survive" });
  Teams.insert({ name: "Werewolves", team_proportionality: 2, victory: "outnumber" });

  Roles.remove({});
  Roles.insert({ name: "Villager", team: "Villagers", is_default_role: true });
  Roles.insert({ name: "Werewolf", team: "Werewolves", is_default_role: true });

  Gamestate.remove({});
  Gamestate.insert({ daytime: true, day: 1, winning_team: null });

  Events.remove({});
});

/****** Routes ******/
Router.route('/', function () {
  this.render('Home');
});

Router.route('/game', function () {
  this.render('game');
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
        'profile.online': true
      });
    },
    deadPlayers: function () {
      return Meteor.users.find(
      {
        'profile.alive': false,
        'profile.online': true
      });
    },
    hasElements: function (list) {
      return list.count() > 0
    },
    players: function () {
      return Meteor.users.find({ 'profile.online': true });
    },
    voteCountVillage: function () {
      return Votes.find({ votefor: this._id, voteType: 'village' }).count()
    },
    voteCountWolf: function () {
      return Votes.find({ votefor: this._id, voteType: 'wolf' }).count()
    },
    voteLeader: function () {
      var id = playerIdWithMostVotes('village');
      return id
      if (id) {
        player = Meteor.users.findOne({
          _id: id
        })
        return player.username;
      }
    },
    day: function () {
      return Gamestate.findOne({}).day
    },
    daytime: function () {
      return Gamestate.findOne({}).daytime
    },
    villageVoteActive: function () {
      return Meteor.user().profile.alive && Gamestate.findOne({}).daytime
    },
    isGameOver: function () {
      return Gamestate.findOne({}).winning_team !== null;
    },
    winningTeam: function () {
      return Gamestate.findOne({}).winning_team;
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
      Meteor.call('resetGameState', function (err, response) {

      });
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

  function playerIdWithMostVotes(type) {
    var v = [];
    Meteor.users.find().forEach(function (player) {
      v[player._id.toString()] = Votes.find({
        votefor: player._id,
        voteType: type
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
        online_users = Meteor.users.find({ 'profile.online': true }).fetch();

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

        return "whatever";
      },
      nextGameState: function () {
        state = Gamestate.findOne()

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

          Meteor.call('murder', playerIdWithMostVotes('wolf'), 'Werewolf');
          Votes.remove({ villageType: 'wolf' })
        }
      },
      murder: function (id, type) {
        victim = Meteor.users.findOne({ _id: id })
        console.log(victim.profile.alive)
        if (victim.profile.alive) {
          Events.insert({
            text: "A murder happened bro",
            createdAt: new Date()
          })
          Meteor.users.update({ _id: id }, { $set: { 'profile.alive': false, 'profile.death': getDeath(type), 'profile.death_location': getLocation() } })
        }
      },
      castVote: function (voteFrom, voteFor, type) {
        Votes.upsert(
        {
          voteFrom: voteFrom,
          voteType: type
        },
        {
          voteFrom: voteFrom,
          votefor: voteFor,
          voteType: type
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
  var total_alive = Meteor.users.find({ 'profile.alive': true, 'profile.online': true }).count();
  console.log('total_alive: ' + total_alive)

  Teams.find({}).forEach(function (this_team) {
    var victory = this_team.victory;
    var teamCount = Meteor.users.find({ 'profile.alive': true, 'profile.online': true, 'profile.team': this_team.name }).count();
    console.log("checking the " + this_team.name + " victory condition of " + this_team.victory + " - teamCount: " + teamCount);
    if ((victory === "outnumber" && teamCount / total_alive >= 0.5) || (victory === "survive" && teamCount === total_alive)) {
      console.log(this_team.name + " has won!");
      Gamestate.update({},
        {
          $set:
           { 'winning_team': this_team.name }
        }
      )
    }
  });
}
