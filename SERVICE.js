var parse = require('parse');
var request = require('request');
var https = require('https'); //Use NodeJS https module
var zlib = require("zlib");
var urlBase ="https://api.stackexchange.com/2.2/"
var token = "cyeY7*SAuVnB9vw3UV73Lw((";
var http = require("http");
var Botkit = require('botkit');


///////////////////////////////////////////////////////////////////////////////////////////////////Prepocessing.

	function getGzipped(url, callback) {
	    // buffer to store the streamed decompression
	    var buffer = [];

	    https.get(url, function(res) {
	        // pipe the response into the gunzip to decompress
	        var gunzip = zlib.createGunzip();            
	        res.pipe(gunzip);

	        gunzip.on('data', function(data) {
	            // decompression chunk ready, add it to the buffer
	            buffer.push(data.toString())

	        }).on("end", function() {
	            // response and decompression complete, join the buffer and return
	            callback(null, buffer.join("")); 

	        }).on("error", function(e) {
	            callback(e);
	        })
	    }).on('error', function(e) {
	        callback(e)
	    });
	}

	function siteList() {	
		dict = [];
		var options = {
			url: urlBase +"sites?filter=" + "!6Oe*vJ1yH*GZ3",
			method: 'GET',
			headers: 
			{
				"Authorization": token,
				"content-type": "application/json"
			}	
		};
		
		getGzipped(options.url, function(err, data){
			var obj = JSON.parse(data);
			for(var i=0;i< obj.items.length; i++){
				//console.log("site param: "+ obj.items[i].api_site_parameter);
				dict.push(obj.items[i].api_site_parameter);
			//	console.log("PARSED JSON: " + dict);

			}
			
		});
		return dict;
	}
	

var dict = siteList();
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function validSite(site) {
				var exist = false;
				for(var i=0;i< dict.length;i++)	
				{
					if (site == dict[i])
				       	{
						exist = true;
					}
				}
				return exist;
			}
			
function validReturn(format) {
				var format = format;
				var bool = false;
				if (format == 'BQBA' || format == 'BQAA' || format == 'BQAAC') {
					bool=true;
				}
				return bool;
}

function validTags(tagList, site) 
			{
				console.log(tagList); 
				 var matches2 = tagList.split(" ");	
				var tags = "";
	 			 //allow for an infinite number of arguments
				for (var i=0; i< matches2.length; i++){
					console.log(matches2[i]);
					tags = tags.concat(matches2[i]);
					tags = tags.concat(";");
				}

				var options = {
					url: urlBase + "tags/" + tagList + "/info?order=desc&sort=popular&site=" + site,
					method: 'GET',
					headers: {
						"Authorization": token,
						"content-type": "application/json"
					}
				};

			/*	request(options, function (error, response, items) 
			  	{
				    var tagArray = JSON.parse(items);
				    //wipe value of tagList
				    tagList = "";
				    for( var i = 0; i < tagArray.length; i++ )
				    {
				      	tagList = tagList.concat(tagArray[i].name);
				     	tagList = tagList.concat(";");
				    }
				}); */
				
	//			getGzipped(options.url, function(err, data){
	//			var tagArray = JSON.parse(data);
	//			    //wipe value of tagList
	//			    tagList = "";
	//			    for( var i = 0; i < tagArray.length; i++ )
	//			    {
	//			      	tagList = tagList.concat(tagArray[i].name);
	//			     	tagList = tagList.concat(";");
	//			    }	
	//				
	//			});
				return tags;
			}	
			
function makeGenericQuestionRequest(site, tagList, returnFormat, bot, message) {
				var validsite = validSite(site);
				var validtags = validTags(tagList, site);
				var validreturn = validReturn(returnFormat);

				if ( validsite == true && validtags != "" && validreturn == true) {
					var options = {
						url:  urlBase + "search/advanced?page=1&order=desc&sort=votes&answers=1&tagged=" + validtags + "&site=" + site + "&filter=" + "!D5BB6nZKDNvzEH.5vx5DDxrrtfGzQ3MgH2dOnH7lv6Fj3I8*WB1",
						method: 'GET',
						headers:{
							"Authorization":token,
							"content-type": "application/json",
						}
					};
					sendRequest(options, returnFormat, site, bot, message);

				} else 
				{
					if (validsite == false) {
						var reply = {
							text: "Please examine your {site} parameter. I cannot find the site you specified.",
							attachment:[]
						};
						bot.reply(message, reply);
					}

					if (validtags == "") {
						var reply = {
							text: "Your list of tags weren't recognized by Stack Exchange. Please check your spelling or refine your query.",
							attachment: []
						};
						bot.reply(message, reply);
					}

					if (validreturn == false) {
						var reply = {
							text: "Your return format wasn't recognized. Please use BQBA, BQAA, or BQAAC.",
							attachment: []
						};
						bot.reply(message, reply);
					}
				}
			}


			function sendRequest(options, returnFormat, site, bot, message) {
			//	console.log("Sending request to " + options.url);	
				getGzipped(options.url, function (err, data) {
					//console.log("parsing: " + data);
					var questionArray = JSON.parse(data);
					    //because the options tag specifies that the json is going to have the top voted question first
					    var questext = 'Question: ' + questionArray.items[0].title + '\n' + questionArray.items[0].body;
					    var bestanswer;
					    var bestquestion = questionArray.items[0];
//						console.log("question " + questionArray.items[0].title);
					    switch(returnFormat) 
					    {
					    	case 'BQBA':
							// if we can find an accepted answer use it.  If not, use the one with the
							// highest score
//							console.log("before:" + bestanswer);
//							console.log("questionArray: " + bestquestion.answer_count);
					    		for (var i = 0; i < questionArray.answer_count; i++) 
					    		{
					    			if (bestquestion.is_accepted == true) 
								{
					    				bestanswer = bestquestion.answers[i];
//									console.log("I found an accepted one: " + bestanswer);
					    			}
					    		}
							if(bestanswer == null)
							{
								var bestanswerscore = 0;
					    			for (var i = 0; i < bestquestion.answer_count; i++) 
					    			{
					    				if (bestquestion.answers[i].score > bestanswerscore) 
									{
					    					bestanswerscore = bestquestion.answers[i].score;
										bestanswer = bestquestion.answers[i];
//										console.log("New best: "+ bestanswer);
					    				}
					    			}
					    		}
//							console.log("End:" +bestanswer);
							bot.reply(message, questext + '\n' + 'Best answer: \n' + bestanswer.body);
					    	break;
	
					    	case 'BQAA':
					    		var answerstring = "";
					    		for (var i = 0; i < bestquestion.answer_count; i++) 
					    		{
					    			answerstring = answerstring + '\n NEXT ANSWER: \n' +bestquestion.answers[i].body;
					    		}
							bot.reply(message, questext + '\n' + 'All answers: \n' + answerstring);
	
					    	break;
	
					    	case 'BQAAC':
	
					    		var answerstring = "";
				    			for (var i = 0; i < bestquestion.answer_count; i++) 
				    			{
					    			answerstring = answerstring + '\n NEXT ANSWER: \n' + bestquestion.answers[i].body;
								if (bestquestion.answers[i].comment_count > 0)
								{
									answerstring = answerstring + 'Comments:\n';
				    					for (var j = 0; j < bestquestion.answers[i].comment_count; j++) 
				    					{
				    						answerstring = answerstring + '\t' + bestquestion.answers[i].comments[j].body + '\n';
				    					}
								}
							}
							bot.reply(message, questext + '\n' + 'All answers and comments: \n' + answerstring);
	
					    	break;
	
					    	default:
					    		bot.reply("You shouldn't ever see this?");
					}
				});
				}			

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
var controller = Botkit.slackbot({
  debug: false
  //include "log: false" to disable logging
  //or a "logLevel" integer from 0 to 7 to adjust logging verbosity
});

// connect the bot to a stream of messages
controller.spawn({
 	token: process.env.CSBOT, //"xoxb-89253886358-IxZLwVzoQ3pmnO0DYgZbE5uv",

}).startRTM()

var acceptCount = 0;
var rejectCount = 0;
var timer;
var inProg = 0;

controller.hears('start',['mention', 'direct_mention', 'direct_message'], function(bot,message)
{
	if(inProg ==  0)
	{
		inProg = 1;
		timer = setTimeout(function()
		{       
	       		 bot.reply(message, 'Voting time expired!');
        	  	 performSearch(bot, message);

		}, 20000);
		acceptCount = 0;
		rejectCount = 0;

	}else
	{
		bot.reply(message, 'You cannot start a new discussion now.');
	}
});

//bot behavior when someone wants to modify the currect query discussion
controller.hears('modify',['mention', 'direct_mention', 'direct_message'], function(bot,message)
{
	clearTimeout(timer);
	timer = setTimeout(function()
	{       
	        bot.reply(message, 'Voting time expired!');
        	performSearch(bot, message);

	}, 20000);
	acceptCount = 0;
	rejectCount = 0;
});

//bot behavior when it hears someone accept
controller.hears('accept',['mention', 'direct_mention', 'direct_message'], function(bot,message)
{

	acceptCount = acceptCount +1;

	bot.reply(message, 'accept: ' + acceptCount + ' reject: ' + rejectCount);
});

//bot behavior when it hears someone reject
controller.hears('reject',['mention', 'direct_mention', 'direct_message'], function(bot,message)
{

	rejectCount = rejectCount +1;
	bot.reply(message, 'accept: ' + acceptCount + ' reject: ' + rejectCount);
});

//bot behavior when it hears a search request.
controller.hears('search',['mention', 'direct_mention', 'direct_message'], function(bot,message) {
 
	performSearch(bot, message);
});

function performSearch(bot, message)
{
	inProg = 0;
  var msg = message.text;
  var initUser = message.user;

  var regExp = /\(([^)]+)\)/;
  var matches = regExp.exec(msg);
  var returnFormat = '';

  regExp = /\{([^)]+)\}/;
  var matches2 = regExp.exec(msg);

  regExp = /\[([^)]+)\]/;
  var matchesTags = regExp.exec(msg);
  //clear the timer
  clearTimeout(timer);

  // bot.reply(message, initUser + " is trying to search something...");
  makeGenericQuestionRequest(matches2[1], matchesTags[1], matches[1], bot, message); 
  
}
