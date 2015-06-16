//start.js

if (Meteor.isClient) {
  Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
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
}
