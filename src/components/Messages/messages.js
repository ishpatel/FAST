import React from 'react'
import Header from '../Header/header'
import MessageSidebar from './MessageSidebar/message_sidebar'
import './messages.css'
import fire from '../Fire/fire'


const messageid = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const fromSender = [true, false, false, true, true, false, true, false, true, false]
const messages = ["Hello?","Hello!","Are you still interested in purchasing this banana?", "Yes I am.", "Where can we meet up?",
"How about we meet up in front of Geisel at 10 AM tomorrow?", "I can't make 10 AM, can you do 11 AM instead?", "Sure, that's fine!",
"Great, see you then!", "Yep, see you!"];
const timestamps = ["3:02:21 PM", "3:02:28 PM", "3:02:48 PM", "3:03:12 PM", "3:03:16 PM", "3:03:44 PM", "3:05:10 PM", "3:05:25 PM",
"3:05:31 PM", "3:05:34 PM"];
const recipient = "John";
const user = "You";
const getMessages = messageid.map((id) =>
  <div>
    {(fromSender[id]) ? (
      <div className="messages-sent">
        <div className = "messages-sent-text">
          {messages[id]}
        </div>
        <div className="hover">
          [{timestamps[id]}]
        </div>
      </div>)
      :
      (<div className="messages-received">
        <div className = "messages-received-text">
        {messages[id]}
        </div>
        <div className="hover">
          [{timestamps[id]}]
        </div>
      </div>)}
  </div>
);

export class Messages extends React.Component {
  constructor(props) {
    super(props);
    this.getConversations = this.getConversations.bind(this);
    this.getMessageSidebar = this.getMessageSidebar.bind(this);
    this.getActiveConversation = this.getActiveConversation.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.postMessage = this.postMessage.bind(this);
    this.addToConversationList = this.addToConversationList.bind(this);
    this.getMessages = this.getMessages.bind(this);
    this.getArrayFromList = this.getArrayFromList.bind(this);

    this.messagesDB = fire.database().ref("Message");
    this.conversationsDB = fire.database().ref("Conversation");
    this.constantsDB = fire.database().ref("Constants");
    this.usersDB = fire.database().ref("Users");
    this.listingsDB = fire.database().ref("Listing");

    this.state={};
  }

  getConversations(callbackFunction) {
    this.userDB = this.usersDB;
    this.conversationDB = this.conversationsDB;
    this.listingDB = this.listingsDB;

    // access conversations in list database
    this.userDB.child(this.state.user.uid).child("Conversations").once('value', listSnapshot => {

      // access conversation database
      this.conversationDB.once('value', convSnapshot => {

        // access listing database
        this.listingDB.once('value', listingSnapshot => {

          let conversations = [];
          let listings = [];

	  // go through each conversation
          let conv = listSnapshot.val();
	  console.log(conv);  
          conversations = this.getArrayFromList(conv);
	  if(conversations && conversations.length > 0) {    
            conversations.forEach((conv) => {
	    // get listing id from conversation database and get listing from listing database
	    let id = convSnapshot.child(conv).child("Listing_ID").val();
	    let listing = listingSnapshot.child(id).val();
	    listing['Conversation_ID'] = conv;
            console.log(listing);
	    listings.push(listing);

	    // set the current active conversation
	    if (!this.state.currID) {
	      this.setState({currID: conv}, () => {
                this.getMessages();
	      });
	    }
            });
          }
          this.setState({conversations: conversations}, () => {
	    console.log(this.state.conversations);
          });
          this.setState({listings: listings}, () => {
	    console.log(this.state.listings);
          });
        });
      });
    });
    callbackFunction();
  }

  getActiveConversation(id){
    this.setState({currID: id}, () => {
      console.log(this.state.currID);
      this.getMessages();
    });
  }

  // If the component gets mounted successfully, authenticate the user
  componentDidMount(){
    this.authListener(() => {
      this.getConversations(() => {
        this.getMessages();
      });
    });
  }

  // Create a method to authenticate the user with our existing database
  authListener(callback) {
    fire.auth().onAuthStateChanged((user) => {
      console.log(user);
      // If the user is detected, save it to the current state
      if(user) {
        this.setState({user});
        //localStorage.setItem('user',user.uid);
	callback();
      }
      // Otherwise set the current user to null
      else {
        this.setState({user: null});
        //localStorage.removeItem('user');
      }
    });
  } 

  getMessageSidebar() {
    if (this.state && this.state.listings && this.state.currID) {
      return <MessageSidebar listings={this.state.listings} currID={this.state.currID} callbackFunction={this.getActiveConversation}/>
    } else {
     return <MessageSidebar />
    }
  }

  handleChange(e) {
    this.setState({message: e.target.value});
  }

  postMessage(e) {
    if(this.state.message) {
    const Message = this.state.message;
    const Sender_ID = this.state.user.uid;
    const Conversation_ID = this.state.currID;

    var Sender_Name;
    var TimeStamp;
    var Message_ID;
    var idExists = true;
    var d = new Date();
    let messageDB = this.messagesDB;
    let constDB = this.constantsDB

    TimeStamp = "" + d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds();

    fire.database().ref().once("value").then((snapshot) => {
      Sender_Name = snapshot.child("Users/" + Sender_ID + "/Name").val();
      Message_ID = snapshot.child("Constants/Next_Message_ID").val();
      idExists = snapshot.child("Message/" + Message_ID).exists();
      while(idExists) {
	Message_ID += 1;
	idExists = snapshot.child(Message_ID).exists();
      }
      messageDB.child(Message_ID).set({Message, Sender_Name, TimeStamp, Message_ID}, () => {
        this.getMessages();
      });
      this.addToConversationList(Conversation_ID, Message_ID);

      constDB.child("Next_Message_ID").set(Message_ID + 1);
    });
    document.getElementById('messages-input').value = '';
    }
  }

  addToConversationList(convID, messageID) {
    var separator = ",";
    var list = "" + messageID;
    var db = this.conversationsDB.child(convID);
    var listName = "Message_List";

    db.once("value").then(function(snapshot) {
      // if other items in the list exist, concatenate to the list
      if (snapshot.child(listName).exists()){
        list = snapshot.child(listName).val().split(separator);

	// if this id is a duplicate, don't concatenate    
	if(list.indexOf("" + messageID) == -1) {
          list = list.concat(messageID);
        }

        //Filter the list to remove any empty items in the list
        list = list.filter(function (el) {
          return el != "";
        });
	list = list.join(separator);
      }
        db.child(listName).set(list);
    });
  }
 
  getMessages() {
    if (this.state && this.state.user && this.state.currID) {
      let convDB = this.conversationsDB;
      let userDB = this.usersDB;
      let messageDB = this.messagesDB;
      let messages = [];
      let convID = this.state.currID;
      let user = this.state.user.uid;

      // get user's name
      userDB.once('value', dataSnapshot => {
        let username = dataSnapshot.child(user).child("Name").val();
	this.setState({username: username});
      });

    convDB.on('value', dataSnapshot => {
      var messageList = dataSnapshot.child(convID).child("Message_List").val();
      var messageArray = this.getArrayFromList(messageList);
      
      messageDB.on('value', snapshot => {
	messageArray.forEach((item) => {
            messages.push(snapshot.child(item).val());
	    console.log("get Message" + item);
        });
      });
    });
    this.setState({messages: messages}, () => {
      this.forceUpdate();
      console.log(messages);
    });
   }
  }

  getArrayFromList(list) {
    let arr = [];
    var item = "";
    var separator = ",";
    console.log("List: " + list);
   
    if (list) {
      //get items from list
      for (var i = 0; i < list.length; i++) {
        var curr = list.charAt(i);
        if (curr !== separator) {
	  item = item + curr;
        } else {
	  arr.push(item);
          item = "";
        }
      }
    
      if (item) {
        arr.push(item);
      }
    }

    return arr;
  }

  render() {
    console.log(this.state.messages);
    return (
      <div className="messages">
        <Header />
        <div className="messages-content">
          {this.getMessageSidebar()}
          <div className="messages-messenger">
            <div className="messages-messages">
              {this.state && this.state.username && this.state.messages.map((item) => 
                <div>
                  {(this.state.username === item['Sender_Name']) ? 
                  (<div className="messages-sent">
                    <div className = "messages-sent-text">
                      {item['Message']}
                    </div>
                    <div className="hover">
                      {item['TimeStamps']}
                    </div>
                  </div>)
                  :
                  (<div className="messages-received">
                    <div className = "messages-received-text">
                      {item['Message']}
                    </div>
                    <div className="hover">
                      {item['TimeStamps']}
                    </div>
                  </div>)}
                </div> 
              )}
            </div>
            <div className="messages-messenger-container">
              <input className="messages-messenger-input" id="messages-input" onChange={this.handleChange}></input>
              <button className="messages-messenger-sender" onClick={this.postMessage}>Send</button>
              <button className="messages-confirmtransaction" onClick={this.confirmTransaction}>Confirm Transaction</button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
