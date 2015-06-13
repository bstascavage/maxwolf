Roles = new Mongo.Collection("roles");
Players = new Mongo.Collection("players");
Gamestate = new Mongo.Collection("gamestate");
Votes = new Mongo.Collection("votes");

Meteor.startup(function () {
	Roles.remove({})
	Roles.insert({name: "Villager" });
	Roles.insert({ name: "Werewolf" });
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
    players: function(){
      return Meteor.users.find();
    },
    voteCount: function(){
      return Votes.find({votefor: this._id}).count()
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
  })
  
  Template.game.events({
    'click .reset-game-state': function(event) {
      Meteor.call('resetGameState',function(err, response) {

      });
    },
    'click .next-game-state': function(event) {
      Meteor.call('nextGameState',function(err, response) {

      });
    },
    'click .vote': function(event) {
      console.log(Meteor.userId() + ' is voting for ' + this._id);
      Meteor.call('castVote', Meteor.userId(), this._id);
    },
    'click .suicide': function(event) {
      Meteor.call('suicide', Meteor.user());
    },
  })
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    Meteor.methods({
      resetGameState: function()
      {
        /*
        Meteor.users.update(
          {}, //todo: filter for users in game
          {$set: { profile: {alive : true} } }
         );
         */
        Meteor.users.find().forEach(function (row) {
          Meteor.users.update(
            {_id: row._id},
            {$set:
              { 
                'profile.alive' : true,
                'profile.role' : "Role_Goes_here"
              }
            }
           );
        });
        
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
      suicide: function()
      {
	Meteor.users.update( { _id: Meteor.userId() }, {$set: { 'profile': { 'alive': false } } } )
	console.log('TEST')
      },
      castVote:function(voteFrom, voteFor)
      {
        Votes.upsert(
        {
          voteFrom: voteFrom,
        },
        {
          voteFrom: voteFrom,
          votefor: voteFor
        })
      }
    })
  })
};
