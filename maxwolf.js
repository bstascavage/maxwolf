Roles = new Mongo.Collection("roles");
Players = new Mongo.Collection("players");
Gamestate = new Mongo.Collection("gamestate");

Meteor.startup(function () {
	Roles.remove({})
	Roles.insert({name: "Villager" });
	Roles.insert({ name: "Werewolf" });
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
      console.log(Meteor.user())
      return Meteor.users.find();
    }
  })
  
  Template.game.events({
    'click .reset-game-state': function(event) {
      Meteor.call('resetGameState',function(err, response) {

      });
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

        
        return "whatever";
      }
    })
  })
};
