Roles = new Mongo.Collection("roles");
Players = new Mongo.Collection("players");
Gamestate = new Mongo.Collection("gamestate");
Votes = new Mongo.Collection("votes");

Meteor.startup(function () {
	Roles.remove({})
	Roles.insert({name: "Villager" });
	Roles.insert({ name: "Werewolf" });
	Gamestate.insert({ day: 1 });
	Gamestate.insert({ state: "day" });
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
    }
  })
  
  Template.game.events({
    'click .reset-game-state': function(event) {
      Meteor.call('resetGameState',function(err, response) {

      });
    },
    'click .reset-game-state': function(event) {
      Meteor.call('nextGameState',function(err, response) {

      });
    },
    'click .vote': function(event) {
      console.log('voting for' + this._id);
      Votes.upsert(
      {
        _id: Meteor.user()._id,
      },
      {
        votefor: this._id
      })
    }
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
        
        //reset votes
        Votes.remove({})
        
        return "whatever";
      }
    })
  })
};
