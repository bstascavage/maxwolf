//game-server.js

if (Meteor.isServer) {
  Meteor.startup(function () {

    Teams.remove({});
    Teams.insert({ name: "Villagers", team_proportionality: 1, victory: "survive" });
    Teams.insert({ name: "Werewolves", team_proportionality: 2, victory: "outnumber" });

    Roles.remove({});
    Roles.insert({ name: "Villager", team: "Villagers", is_default_role: true });
    Roles.insert({ name: "Werewolf", team: "Werewolves", is_default_role: true });

    Events.remove({});

    Meteor.methods({
      resetGameState: function (roomId) {
        online_users = Meteor.users.find({ 'profile.online': true, 'profile.roomId': roomId }).fetch();
        console.log('resetting game state');

        //fisher-yates shuffle
        for (var i = 0; i < online_users.length - 1; i++) {
          j = getRandomIntBetween(i, online_users.length - 1);
          temp = online_users[j];
          online_users[j] = online_users[i];
          online_users[i] = temp;
        }

        //First third of users are werewolves, the rest are villagers
        //Assign everyone as villagers first to avoid seeing wolves
        for (var i = 0; i < online_users.length; i++) {
          Meteor.users.update({
            username: online_users[i].username
          }, {
            $set: {
              'profile.alive': true,
              'profile.role': "Villager",
              'profile.team': "Villagers",
              'profile.reveal_role': null,
              'profile.reveal_team': null
            }
          })
        }
        var third = Math.floor(online_users.length / 3);
        for (var i = 0; i < online_users.length; i++) {
          if (i < third) {
            Meteor.users.update({
              username: online_users[i].username
            }, {
              $set: {
                'profile.alive': true,
                'profile.role': "Werewolf",
                'profile.team': "Werewolves",
                'profile.reveal_role': null,
                'profile.reveal_team': null
              }
            });
          }
        }

        Gamestate.update({ _id: roomId }, {
          $set: {
            daytime: true,
            day: 1,
            winning_team: null
          }
        })
        //reset votes
        Votes.remove({})

        startGameCountdown(GLOBAL_GAME_DAY_LENGTH, roomId);

        return "whatever";
      },
      nextGameState: function (roomId) {
        console.log('moving to next game state user: ' + Meteor.user() + ' in room: ' + roomId)
        state = Gamestate.findOne({ _id: roomId })

        if (state.daytime) {
          //DAY ENDING

          Meteor.call('murder', playerIdWithMostVotes('village', roomId), 'Village', roomId);
          Votes.remove({ villageType: 'village' })
          var victoryHappened = checkTeamVictories(roomId);
          Gamestate.update({ _id: roomId }, {
            $set: {
              'daytime': false
            }
          })
          console.log('day ending reset countdown');
          if(!victoryHappened)
          {
            startGameCountdown(GLOBAL_GAME_NIGHT_LENGTH, roomId);
          }
        }
        else {
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
          var victoryHappened = checkTeamVictories(roomId);
          if(!victoryHappened)
          {
            startGameCountdown(GLOBAL_GAME_DAY_LENGTH, roomId);
          }

          Meteor.call('murder', playerIdWithMostVotes('wolf', roomId), 'Werewolf', roomId);
          Votes.remove({ villageType: 'wolf' })
          Gamestate.update({ _id: roomId }, {
            $inc: {
              day: 1
            }
          })
          Gamestate.update({ _id: roomId }, {
            $set: {
              'daytime': true
            }
          })
        }
      },
      murder: function (id, type, roomId) {
        console.log(id + ' is being killed by: ' + type + ' in room: ' + roomId)
        victim = Meteor.users.findOne({ _id: id })
        if (victim && victim.profile.alive) {
          Events.insert({
            text: "A murder happened bro",
            createdAt: new Date()
          })
          Meteor.users.update({ _id: id }, { $set: { 'profile.alive': false, 'profile.death': getDeath(type), 'profile.death_location': getLocation(), 'profile.reveal_role': victim.profile.role,  'profile.reveal_team': victim.profile.team} })
        }
      },
      castVote: function (voteFrom, voteFor, type, roomId) {
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
      tallyVote: function (id, type) {
        
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

/*
 * returns true if there was a victory
 */
function checkTeamVictories(roomId) {
  console.log('checking team victories for room ' + roomId)
  //Check if a team has fulfilled their victory conditions
  var total_alive = Meteor.users.find({ 'profile.alive': true, 'profile.online': true, 'profile.roomId': roomId }).count();
  console.log('total_alive: ' + total_alive)

  Teams.find({}).forEach(function (this_team) {
    var victory = this_team.victory;
    var teamCount = Meteor.users.find({ 'profile.alive': true, 'profile.online': true, 'profile.team': this_team.name, 'profile.roomId': roomId }).count();
    console.log("checking the " + this_team.name + " victory condition of " + this_team.victory + " - teamCount: " + teamCount);
    if ((victory === "outnumber" && teamCount / total_alive >= 0.5) || (victory === "survive" && teamCount === total_alive)) {
      console.log(this_team.name + " has won!");
      Gamestate.update({ _id: roomId },
        {
          $set:
           { 'winning_team': this_team.name }
        }
      )
      return true;
    }
  });
  return false;
}

function startGameCountdown(countdownTime, roomId) {
  /*
  console.log('starting countdown');

  var oldHandle = Gamestate.findOne({ _id: roomId }).timeoutHandle
  console.log('old handle is:' + oldHandle);
  if (oldHandle)
  {
    console.log('clearing old timer');
    Meteor.clearTimeout(oldHandle)
  }


  //set up the time for the first day end
  var date = new Date();
  date.setSeconds(date.getSeconds() + countdownTime);
  var timeoutHandle = Meteor.setTimeout(function () {
    Meteor.call('nextGameState', roomId);
  }, countdownTime * 1000)
  console.log('tiemout handle is ' + timeoutHandle.id);
  Gamestate.update({ _id: roomId }, {
    $set: {
      nextEvent: date//,
      //timeoutHandle: timeoutHandle
    }
  })
  */
}

function continueGame(roomId)
{
  if(Gamestate.findOne({ _id: roomId }).winning_team == null)
  {
    Meteor.call('nextGameState', roomId);
    var timeoutHandle = Meteor.setTimeout(function () {
      
    }, countdownTime * 1000)
  }
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