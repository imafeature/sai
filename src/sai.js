'use strict';

var APP_ID = "amzn1.echo-sdk-ams.app.cad10f38-2f37-4d9a-8fcc-1ab1791ce3e4";
var https = require( 'https' );

function AlexaSkill(appId) {
    this._appId = appId;
}

AlexaSkill.prototype.requestHandlers = {
    LaunchRequest: function (event, context, response) {
        this.eventHandlers.onLaunch.call(this, event.request, event.session, response);
    },

    IntentRequest: function (event, context, response) {
        this.eventHandlers.onIntent.call(this, event.request, event.session, response);
    },

    SessionEndedRequest: function (event, context) {
        this.eventHandlers.onSessionEnded(event.request, event.session);
        context.succeed();
    }
};

/**
 * Override any of the eventHandlers as needed
 */
AlexaSkill.prototype.eventHandlers = {
    /**
     * Called when the session starts.
     * Subclasses could have overriden this function to open any necessary resources.
     */
    onSessionStarted: function (sessionStartedRequest, session) {
    },

    /**
     * Called when the user launches the skill without specifying what they want.
     * The subclass must override this function and provide feedback to the user.
     */
    onLaunch: function (launchRequest, session, response) {
        throw "onLaunch should be overriden by subclass";
    },

    /**
     * Called when the user specifies an intent.
     */
    onIntent: function (intentRequest, session, response) {
        var intent = intentRequest.intent,
            intentName = intentRequest.intent.name,
            intentHandler = this.intentHandlers[intentName];
        if (intentHandler) {
            console.log('dispatch intent = ' + intentName);
            intentHandler.call(this, intent, session, response);
        } else {
            throw 'Unsupported intent = ' + intentName;
        }
    },

    /**
     * Called when the user ends the session.
     * Subclasses could have overriden this function to close any open resources.
     */
    onSessionEnded: function (sessionEndedRequest, session) {
    }
};

/**
 * Subclasses should override the intentHandlers with the functions to handle specific intents.
 */
AlexaSkill.prototype.intentHandlers = {};

AlexaSkill.prototype.execute = function (event, context) {
    try {
        console.log("session applicationId: " + event.session.application.applicationId);

        // Validate that this request originated from authorized source.
        if (this._appId && event.session.application.applicationId !== this._appId) {
            console.log("The applicationIds don't match : " + event.session.application.applicationId + " and "
                + this._appId);
            throw "Invalid applicationId";
        }

        if (!event.session.attributes) {
            event.session.attributes = {};
        }

        if (event.session.new) {
            this.eventHandlers.onSessionStarted(event.request, event.session);
        }

        // Route the request to the proper handler which may have been overriden.
        var requestHandler = this.requestHandlers[event.request.type];
        requestHandler.call(this, event, context, new Response(context, event.session));
    } catch (e) {
        console.log("Unexpected exception " + e);
        context.fail(e);
    }
};

var Response = function (context, session) {
    this._context = context;
    this._session = session;
};

Response.prototype = (function () {
    var buildSpeechletResponse = function (options) {
        var alexaResponse = {
            outputSpeech: {
                type: 'PlainText',
                text: options.output
            },
            shouldEndSession: options.shouldEndSession
        };
        if (options.reprompt) {
            alexaResponse.reprompt = {
                outputSpeech: {
                    type: 'PlainText',
                    text: options.reprompt
                }
            };
        }
        if (options.cardTitle && options.cardContent) {
            alexaResponse.card = {
                type: "Simple",
                title: options.cardTitle,
                content: options.cardContent
            };
        }
        var returnResult = {
            version: '1.0',
            response: alexaResponse
        };
        if (options.session && options.session.attributes) {
            returnResult.sessionAttributes = options.session.attributes;
        }
        return returnResult;
    };

    return {
        say: function (speechOutput) {
            this._context.succeed(buildSpeechletResponse({
                session: this._session,
                output: speechOutput,
                shouldEndSession: false
            }));
        },
        tell: function (speechOutput) {
            this._context.succeed(buildSpeechletResponse({
                session: this._session,
                output: speechOutput,
                shouldEndSession: true
            }));
        },
        tellWithCard: function (speechOutput, cardTitle, cardContent) {
            this._context.succeed(buildSpeechletResponse({
                session: this._session,
                output: speechOutput,
                cardTitle: cardTitle,
                cardContent: cardContent,
                shouldEndSession: true
            }));
        },
        ask: function (speechOutput, repromptSpeech) {
            this._context.succeed(buildSpeechletResponse({
                session: this._session,
                output: speechOutput,
                reprompt: repromptSpeech,
                shouldEndSession: false
            }));
        },
        askWithCard: function (speechOutput, repromptSpeech, cardTitle, cardContent) {
            this._context.succeed(buildSpeechletResponse({
                session: this._session,
                output: speechOutput,
                reprompt: repromptSpeech,
                cardTitle: cardTitle,
                cardContent: cardContent,
                shouldEndSession: false
            }));
        }
    };
})();

module.exports = AlexaSkill;

var Sai = function() {
    AlexaSkill.call(this, APP_ID);
};

Sai.prototype = Object.create(AlexaSkill.prototype);
Sai.prototype.constructor = Sai;


Sai.prototype.eventHandlers.onSessionStarted = function (sessionStartedRequest, session) {
    console.log("Sai onSessionStarted requestId: " + sessionStartedRequest.requestId
        + ", sessionId: " + session.sessionId);

    session.attributes.requestInfo = {};
};

Sai.prototype.eventHandlers.onLaunch = function (launchRequest, session, response) {
    console.log("Sai onLaunch requestId: " + launchRequest.requestId + ", sessionId: " + session.sessionId);

    getWelcomeResponse(response);
};

Sai.prototype.eventHandlers.onSessionEnded = function (sessionEndedRequest, session) {
    console.log("onSessionEnded requestId: " + sessionEndedRequest.requestId
        + ", sessionId: " + session.sessionId);
};

Sai.prototype.intentHandlers = {

    "TechEventsIntent": function (intent, session, response) {

        handleTechEventsIntent(intent, session, response);
    },

    "WorldEventsIntent": function (intent, session, response) {

        handleWorldEventsIntent(intent, session, response);
    },

    "AllEventsIntent": function (intent, session, response) {

        handleAllEventsIntent(intent, session, response);
    },

    "AMAZON.HelpIntent": function (intent, session, response) {
        var speechOutput = "Use this skill to get Business Insider's daily digests of that day's most important tech and world events. " +
            "Just ask for the tech events or the world events. " + 
            "You can also say never mind to exit. So, which category of events are you interested in?";
        var repromptOutput = "Would you like to hear tech events or world events?";
        var cardTitle = "About 10 Things To Know";
        var cardContent = speechOutput;

        response.askWithCard(speechOutput, repromptOutput, cardTitle, cardContent);
    },

    "AMAZON.YesIntent": function (intent, session, response) {
        var speechOutput = "Closing Today's Ten. You can find this list of events in the Echo app.";
        response.tell(speechOutput);
    },

    "AMAZON.NoIntent": function (intent, session, response) {
        var speechOutput = "Closing Today's Ten. You can find this list of events in the Echo app.";
        response.tell(speechOutput);
    },

    "AMAZON.StopIntent": function (intent, session, response) {
        var speechOutput = "Closing Today's Ten. You can find this list of events in the Echo app.";
        response.tell(speechOutput);
    },

    "AMAZON.CancelIntent": function (intent, session, response) {
        var speechOutput = "Closing Today's Ten. You can find this list of events in the Echo app.";
        response.tell(speechOutput);
    }
};
    
function getWelcomeResponse(response) {
       
    var repromptOutput = "I'm sorry. Would you like to hear tech events or world events?";
    var speechOutput = "I have opened Today's Ten. Would you like to hear tech events or world events?";

    response.ask(speechOutput, repromptOutput);
}

function stripRSS(response){
    
  var tags = /<\/?([a-z]+)[^>]*>/img;
  var excess = /And finally.*|Join the conversation.*|Now watch.*/img;
  var ordinals = /\D[1-9]0?\.\s+/ig;
  
  var pubDate = response.responseData.feed.entries[0].publishedDate;
  var html = response.responseData.feed.entries[0].content.split(excess)[0];
  var content = html.replace(tags, "");
  var events = content;
  var headlines = events.split(ordinals);  
      headlines.shift();
    
  var strippedFeed = {};
      strippedFeed.pubDate = pubDate;
      strippedFeed.events = headlines;

    return strippedFeed;
}


function getEvents(url, title, intent, session, response){
  
  https.get( url, function( res ) {
      
      var rss = '';
      
      res.on( 'data', function( d ) { rss += d; } );

      res.on( 'end', function() {

        if (rss != " ") {
            
            var strippedRSS = stripRSS(JSON.parse(rss));
            session.attributes.requestInfo = strippedRSS;
            
            var today = new Date();
            var pubDate = new Date(strippedRSS.pubDate);
            var speechPrefix = (pubDate.getDate() == today.getDate()) ? "" : "Business Insider has not released a list today.";
            var date = pubDate.toDateString().substring(4);
            var link = url.split(".rss")[0].replace("https://ajax.googleapis.com/ajax/services/feed/load?v=2.0&q=","")

            var cardTitle = "Business Insider's " + title + " (" + date + ")";
            var events = "";

            for (var i = 0; i < strippedRSS.events.length; i++)  
              events += Number.parseInt(i+1) + ". " + strippedRSS.events[i];

            var speechOutput =  speechPrefix + " As of " + date + ", the following are " + title + ". \n";
                speechOutput += events;
            var cardContent = speechOutput + "\n " + link;
            
            var repromptOutput = "Use this skill to get Business Insider's daily digests of that day's most important tech and world events. " +
              "Just ask for the tech events or the world events. You can also say never mind to exit. " + 
              "So, which category of events are you interested in?";
            
            response.tellWithCard(speechOutput, cardTitle, cardContent, repromptOutput);
            
            
        } else {
            response.tell("I'm sorry. There was a problem retrieving the requested events.");
        }
                  
      });
      
  });

}
    
function handleTechEventsIntent(intent, session, response) {
    
    var url = "https://ajax.googleapis.com/ajax/services/feed/load?v=2.0&q=http://www.businessinsider.com/category/10-things-you-need-to-know-sai.rss";
    var title = "10 Things in Tech you Need to Know Today";
    
    getEvents(url, title, intent, session, response);

}

function handleWorldEventsIntent(intent, session, response) {

    var url = "https://ajax.googleapis.com/ajax/services/feed/load?v=2.0&q=http://www.businessinsider.com/category/10-most-important-things-in-the-world.rss";
    var title = "The 10 Most Important Things in the World Right Now";

    getEvents(url, title, intent, session, response);

}
   

function handleAllEventsIntent(intent, session, response) {
    
    response.tell("I'm sorry. This feature has not yet been implemented. I'm not even sure how you got here but feel free to try again in a later release.");

}

// Create the handler that responds to the Alexa Request.
exports.handler = function (event, context) {
    var sai = new Sai();
    sai.execute(event, context);
};