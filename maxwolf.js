Roles = new Mongo.Collection("roles");
Teams = new Mongo.Collection("teams");
Players = new Mongo.Collection("players");
Gamestate = new Mongo.Collection("gamestate");
Votes = new Mongo.Collection("votes");

var GLOBAL_DEBUG = false;

Meteor.startup(function () {
  Teams.remove({});
  Teams.insert({name: "Villagers",  team_proportionality: 2});
  Teams.insert({name: "Werewolves", team_proportionality: 1});

	Roles.remove({})
	Roles.insert({name: "Villager", team: "Villagers" , is_default_role: true});
	Roles.insert({name: "Werewolf", team: "Werewolves", is_default_role: true});

	Gamestate.remove({})
	Gamestate.insert({ daytime: true, day: 1 });
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
	roles: function(){
		return Roles.find();
	}
  });
  /********* STARTGAME *********/

  Template.startGame.helpers({
  });
  
  Template.startGame.events({
	  'submit .pickname': function(event) {
      Router.go('/game');
      return false;
	  }
  });
  
  /********* GAME *********/
  Template.game.helpers({
    alivePlayers: function(){
      return Meteor.users.find(
      {
        'profile.alive': true 
      });
    },
    deadPlayers: function(){
      return Meteor.users.find(
      {
        'profile.alive': false 
      });
    },
    hasElements: function(list){
      return list.count() > 0
    },
    players: function(){
      return Meteor.users.find();
    },
    voteCountVillage: function(){
      return Votes.find({votefor: this._id, voteType: 'village'}).count()
    },
    voteCountWolf: function(){
      return Votes.find({votefor: this._id, voteType: 'wolf'}).count()
    },
    voteLeader: function(){
      var id = playerIdWithMostVotes('village');
      player = Meteor.users.findOne({
        _id: id
      })
      return player.username;
    },
    day: function(){
      return Gamestate.findOne({}).day
    },
    daytime: function(){
      return Gamestate.findOne({}).daytime
    },
    isAlive: function(){
      return currentUser.profile.alive
    },
    isWolf: function(){
      var user = Meteor.user().profile

      if (user.role == 'Werewolf' && user.alive) {
        return Meteor.userId()
      }
    },
    GLOBAL_DEBUG: function(){
      return GLOBAL_DEBUG;
    }
  })
  
  Template.game.events({
    'click .reset-game-state': function(event) {
      Meteor.call('resetGameState',function(err, response) {

      });
    },
    'click .next-game-state': function(event) {
      Meteor.call('nextGameState',function(err, response) {
      var audio = new Audio('239900__thesubber13__scream-1.ogg');
      audio.play();
      });
    },
    'click .villageVote': function(event) {
      console.log(Meteor.userId() + ' is voting for ' + this._id);
      Meteor.call('castVote', Meteor.userId(), this._id, 'village');
    },
    'click .wolfVote': function(event) {
      console.log(Meteor.userId() + ' is voting for ' + this._id);
      Meteor.call('castVote', Meteor.userId(), this._id, 'wolf');
    },
    'click .suicide': function(event) {
      Meteor.call('murder', Meteor.userId(), Meteor.userId());
      var audio = new Audio('239900__thesubber13__scream-1.ogg');
      audio.play();
    },
  })

  function playerIdWithMostVotes(type)
  {
    var v = [];
    Meteor.users.find().forEach(function (player){
      v[player._id.toString()] = Votes.find({
        votefor: player._id,
	voteType: type
      }).count()
    })
    leader = null;
    currentBest = 0;
    for(var userId in v)
    {
      if((leader == null && v[userId] > 0 ) || v[userId] > currentBest)
      {
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
      resetGameState: function()
      {
        /*Meteor.users.find().forEach(function (row) {
          Meteor.users.update(
            {_id: row._id},
            {$set:
              { 
                'profile.alive' : true,
                'profile.role' : "Role_Goes_here"
              }
            }
          );
        });*/
        
        all_users = Meteor.users.find().fetch();

        //fisher-yates shuffle
        for(var i = 0; i < all_users.length - 1; i++){
          j = getRandomIntBetween(i,all_users.length-1);
          temp = all_users[j];
          all_users[j] = all_users[i];
          all_users[i] = temp;
        }

        //First third of users are werewolves, the rest are villagers
        var third = Math.floor(all_users.length / 3);
        for(var i = 0; i < all_users.length; i++){
          if (i < third) {
            tempRole = "Werewolf";
            tempTeam = "Werewolves";
          } else {
            tempRole = "Villager";
            tempTeam = "Villagers";
          }
          Meteor.users.update(
              {username: all_users[i].username},
              {$set:
                {
                  'profile.alive' : true,
                  'profile.role' : tempRole,
                  'profile.team' : tempTeam
                }
              }
          );
        }
        
	Gamestate.update(
          {},
          {$set:
            {
	      daytime: true,
              day: 1
            }
          }
        )
        //reset votes
        Votes.remove({})
        
        return "whatever";
      },
      nextGameState: function()
      {
        state = Gamestate.findOne()
	if (state.daytime) {
	  Gamestate.update(
	    {}, 
	    {$set: 
	      { 
		'daytime': false 
	      } 
	    }
	  )

	  Meteor.call('murder', playerIdWithMostVotes('village'), playerIdWithMostVotes('village'));
          Meteor.call('murder', playerIdWithMostVotes('wolf'), playerIdWithMostVotes('wolf'));
	  Votes.remove({})
	} else {
	  Gamestate.update(
	    {}, 
	    {$inc: 
	      { 
		day: 1 
	      } 
	    }
	  )
	  Gamestate.update(
	    {}, 
	    {$set: 
	      {
		 'daytime': true
	      }
	    }
	  )
	}
      },
      murder: function(id)
      {
	Meteor.users.update( { _id: id }, {$set: { 'profile.alive': false  } } )
      },
      castVote:function(voteFrom, voteFor, type)
      {
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
      tallyVote:function()
      {
        
      }
    })
  })
};

// Returns a random integer between min and max, inclusive
function getRandomIntBetween (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
